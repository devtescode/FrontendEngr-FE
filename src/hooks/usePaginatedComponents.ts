import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import {
  componentApi,
  type BackendComponent,
  type ComponentSortField,
  type PaginationMeta,
  type SortOrder,
} from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";
import { socket } from "@/lib/socket";

const DEFAULT_PAGE_SIZE = 6;
const SEARCH_DEBOUNCE_MS = 350;
const REALTIME_REFRESH_DELAY_MS = 150;

const EMPTY_PAGINATION: PaginationMeta = {
  currentPage: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  totalItems: 0,
  totalPages: 0,
  hasNextPage: false,
  hasPreviousPage: false,
};

type UsePaginatedComponentsOptions = {
  pageSize?: number;
  sort?: ComponentSortField;
  order?: SortOrder;
  search?: string;
  category?: string;
  /**
   * Landing-page behavior: when a component is created, jump back to page 1
   * so the newest upload is immediately visible.
   */
  resetPageOnCreate?: boolean;
};

type UsePaginatedComponentsResult = {
  components: BackendComponent[];
  pagination: PaginationMeta;
  page: number;
  setPage: (page: number) => void;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refresh: () => void;
};

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

/**
 * Server-backed component pagination.
 *
 * Only the current page is ever requested. React Query owns the request
 * lifecycle: it cancels obsolete requests when the key changes, ignores
 * out-of-order responses, and caches each visited page.
 */
export function usePaginatedComponents({
  pageSize = DEFAULT_PAGE_SIZE,
  sort = "createdAt",
  order = "desc",
  search = "",
  category = "All",
  resetPageOnCreate = false,
}: UsePaginatedComponentsOptions = {}): UsePaginatedComponentsResult {
  const safePageSize = Math.min(48, Math.max(1, Math.floor(pageSize)));
  const queryClient = useQueryClient();

  const debouncedSearch = useDebouncedValue(search.trim(), SEARCH_DEBOUNCE_MS);
  const activeCategory = category === "All" ? undefined : category;

  // A search, category or sort change always restarts the list at page 1.
  // The page is derived from the filter signature, so the change costs a
  // single request instead of one for the old page and one for the new one.
  // JSON keeps the signature unambiguous even when a search contains "|".
  const signature = JSON.stringify([sort, order, debouncedSearch, activeCategory ?? ""]);

  const [pageState, setPageState] = useState<{
    signature: string;
    page: number;
  }>({ signature, page: 1 });

  // Persist the reset after the new-signature render. Without this, going
  // page 3 -> search -> clear search would restore page 3 from the old state.
  useEffect(() => {
    setPageState((current) => (current.signature === signature ? current : { signature, page: 1 }));
  }, [signature]);

  const page = pageState.signature === signature ? pageState.page : 1;

  const pageRef = useRef(page);

  const listParams = useMemo(
    () => ({
      page,
      limit: safePageSize,
      sort,
      order,
      search: debouncedSearch,
      category: activeCategory,
    }),
    [page, safePageSize, sort, order, debouncedSearch, activeCategory],
  );

  const latestQueryRef = useRef({ page, signature, listParams });

  useEffect(() => {
    pageRef.current = page;
    latestQueryRef.current = { page, signature, listParams };
  }, [page, signature, listParams]);

  const query = useQuery({
    queryKey: queryKeys.components.list(listParams),
    queryFn: ({ signal }) =>
      componentApi.getPage({
        page: listParams.page,
        limit: listParams.limit,
        sort: listParams.sort,
        order: listParams.order,
        search: listParams.search,
        category: listParams.category,
        signal,
      }),
    staleTime: 15_000,
  });

  // React Query keeps the previous data after a failed background refetch of
  // the same key, but it never leaks data from a different page or filter into
  // a failed query. That is exactly the behaviour the list needs.
  const data = query.data;

  // The server clamps an out-of-range page (for example after the last card
  // on a page is deleted). Follow it, and seed the clamped page's cache
  // entry so the resulting key change does not trigger a second request.
  useEffect(() => {
    const meta = data?.pagination;

    if (!meta) return;
    if (meta.currentPage === listParams.page) return;

    queryClient.setQueryData(
      queryKeys.components.list({ ...listParams, page: meta.currentPage }),
      data,
    );

    setPageState({ signature, page: meta.currentPage });
  }, [data, listParams, queryClient, signature]);

  const setPage = useCallback(
    (nextPage: number) => {
      const next = Number.isFinite(nextPage) ? Math.floor(nextPage) : 1;
      setPageState({ signature, page: Math.max(1, next) });
    },
    [signature],
  );

  const refresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.components.all });
  }, [queryClient]);

  // Realtime updates: the backend broadcasts whenever the catalog changes.
  useEffect(() => {
    let hasConnected = socket.connected;

    if (!socket.connected) {
      socket.connect();
    }

    let refreshTimer: ReturnType<typeof setTimeout> | null = null;

    const scheduleRefresh = () => {
      if (refreshTimer) clearTimeout(refreshTimer);

      refreshTimer = setTimeout(() => {
        refreshTimer = null;
        void queryClient.invalidateQueries({
          queryKey: queryKeys.components.all,
        });
      }, REALTIME_REFRESH_DELAY_MS);
    };

    const handleConnect = () => {
      // The first connection is covered by the initial query. Only resync
      // after a reconnect, otherwise events missed while offline stay missed.
      if (hasConnected) scheduleRefresh();
      hasConnected = true;
    };

    const handleCreated = () => {
      if (resetPageOnCreate) {
        const latest = latestQueryRef.current;

        // Invalidate only page 1. Invalidating every list would also refetch
        // the page that is about to be unmounted.
        void queryClient.invalidateQueries({
          queryKey: queryKeys.components.list({
            ...latest.listParams,
            page: 1,
          }),
          exact: true,
        });

        if (latest.page !== 1) {
          setPageState({ signature: latest.signature, page: 1 });
        }

        return;
      }

      scheduleRefresh();
    };

    const handleUpdated = () => {
      scheduleRefresh();
    };

    const handleDeleted = () => {
      scheduleRefresh();
    };

    socket.on("connect", handleConnect);
    socket.on("component:created", handleCreated);
    socket.on("component:updated", handleUpdated);
    socket.on("component:deleted", handleDeleted);
    // The backend broadcasts this after a payment changes stock levels.
    socket.on("components:refreshed", handleUpdated);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("component:created", handleCreated);
      socket.off("component:updated", handleUpdated);
      socket.off("component:deleted", handleDeleted);
      socket.off("components:refreshed", handleUpdated);

      if (refreshTimer) clearTimeout(refreshTimer);
    };
  }, [queryClient, resetPageOnCreate]);

  // Memoised so the identity only changes when the data does.
  const components = useMemo(() => data?.data ?? [], [data]);

  const pagination = useMemo<PaginationMeta>(() => {
    const meta = data?.pagination;

    return meta ? meta : { ...EMPTY_PAGINATION, pageSize: safePageSize };
  }, [data, safePageSize]);

  // Debouncing is part of loading: while the user is typing, the rendered
  // cards still belong to the previous search term and must not be treated as
  // a settled empty/no-results result.
  const loading = query.isPending || debouncedSearch !== search.trim();
  const refreshing = !loading && query.isFetching;

  const error = query.isError
    ? "We couldn't load the components right now. Check your connection and try again."
    : null;

  return {
    components,
    pagination,
    page,
    setPage,
    loading,
    refreshing,
    error,
    refresh,
  };
}
