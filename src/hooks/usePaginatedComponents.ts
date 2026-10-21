import { useCallback, useEffect, useRef, useState } from "react";

import {
  componentApi,
  type BackendComponent,
  type ComponentSortField,
  type PaginationMeta,
  type SortOrder,
} from "@/lib/api";
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
 * The hook only ever asks the API for the current page. Requests are aborted
 * when the query changes, and a sequence guard prevents a late response from
 * overwriting a newer page or filter selection.
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

  const [page, setPageState] = useState(1);
  const [components, setComponents] = useState<BackendComponent[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    ...EMPTY_PAGINATION,
    pageSize: safePageSize,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const debouncedSearch = useDebouncedValue(search.trim(), SEARCH_DEBOUNCE_MS);

  const requestIdRef = useRef(0);
  const activeRequestRef = useRef<AbortController | null>(null);
  const skipNextFetchKeyRef = useRef<string | null>(null);
  const lastSignatureRef = useRef("");
  const componentsRef = useRef<BackendComponent[]>([]);
  const pageRef = useRef(page);

  pageRef.current = page;

  const setPage = useCallback((nextPage: number) => {
    const next = Number.isFinite(nextPage) ? Math.floor(nextPage) : 1;
    setPageState(Math.max(1, next));
  }, []);

  const refresh = useCallback(() => {
    setReloadToken((token) => token + 1);
  }, []);

  const activeCategory = category === "All" ? undefined : category;

  useEffect(() => {
    // A search, category or sort change always restarts the list at page 1.
    // Deriving the requested page from the filter signature keeps that to a
    // single request instead of one for the old page and one for the new one.
    const signature = [
      sort,
      order,
      debouncedSearch,
      activeCategory ?? "",
    ].join("|");

    const signatureChanged = lastSignatureRef.current !== signature;
    lastSignatureRef.current = signature;

    const requestedPage = signatureChanged ? 1 : page;

    const queryKey = [
      requestedPage,
      safePageSize,
      sort,
      order,
      debouncedSearch,
      activeCategory ?? "",
    ].join("|");

    // A server-clamped response already contains the correct page. Skip the
    // follow-up request that would otherwise be triggered by the page change.
    if (skipNextFetchKeyRef.current === queryKey) {
      skipNextFetchKeyRef.current = null;
      return;
    }

    const controller = new AbortController();

    activeRequestRef.current?.abort();
    activeRequestRef.current = controller;

    const requestId = ++requestIdRef.current;

    if (signatureChanged) {
      // A new filter makes the visible cards irrelevant, so they are cleared
      // and the skeleton takes over.
      componentsRef.current = [];
      setComponents([]);
      setRefreshing(false);
      setLoading(true);
    } else {
      // A page change or a plain refresh keeps the current cards on screen
      // (dimmed) so the controls stay usable and rapid page changes can be
      // made without waiting for the previous request to settle.
      setLoading(false);
      setRefreshing(true);
    }

    setError(null);

    componentApi
      .getPage({
        page: requestedPage,
        limit: safePageSize,
        sort,
        order,
        search: debouncedSearch,
        category: activeCategory,
        signal: controller.signal,
      })
      .then((response) => {
        if (
          controller.signal.aborted ||
          requestId !== requestIdRef.current
        ) {
          return;
        }

        const meta = response.pagination;
        const servedKey = [
          meta.currentPage,
          safePageSize,
          sort,
          order,
          debouncedSearch,
          activeCategory ?? "",
        ].join("|");

        // The page shown to the user has to follow the server when it clamps
        // an out-of-range request, and it has to follow the filter reset when
        // a new signature restarted the list at page 1.
        const pageNeedsSync =
          meta.currentPage !== requestedPage || requestedPage !== page;

        if (pageNeedsSync) {
          // Suppress the request that the page-state update would trigger.
          skipNextFetchKeyRef.current = servedKey;
        }

        componentsRef.current = response.data;
        setComponents(response.data);
        setPagination(meta);

        if (pageNeedsSync) {
          setPageState(meta.currentPage);
        }
      })
      .catch((err: unknown) => {
        if (
          controller.signal.aborted ||
          requestId !== requestIdRef.current
        ) {
          return;
        }

        console.error("Failed to load component page:", err);
        setError(
          "We couldn't load the components right now. Check your connection and try again."
        );
      })
      .finally(() => {
        if (requestId !== requestIdRef.current) return;

        setLoading(false);
        setRefreshing(false);

        if (activeRequestRef.current === controller) {
          activeRequestRef.current = null;
        }
      });

    return () => {
      controller.abort();
    };
  }, [
    page,
    safePageSize,
    sort,
    order,
    debouncedSearch,
    activeCategory,
    reloadToken,
  ]);

  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
    }

    let refreshTimer: ReturnType<typeof setTimeout> | null = null;

    const scheduleRefresh = () => {
      if (refreshTimer) clearTimeout(refreshTimer);

      refreshTimer = setTimeout(() => {
        refreshTimer = null;
        setReloadToken((token) => token + 1);
      }, REALTIME_REFRESH_DELAY_MS);
    };

    const handleCreated = () => {
      if (resetPageOnCreate) {
        // If we are not already on page 1, the page change itself triggers the
        // fetch. Scheduling another refresh here would duplicate the request.
        if (pageRef.current !== 1) {
          setPageState(1);
          return;
        }
      }

      scheduleRefresh();
    };

    const handleUpdated = () => {
      scheduleRefresh();
    };

    const handleDeleted = () => {
      scheduleRefresh();
    };

    socket.on("component:created", handleCreated);
    socket.on("component:updated", handleUpdated);
    socket.on("component:deleted", handleDeleted);
    // The backend broadcasts this after a payment changes stock levels.
    socket.on("components:refreshed", handleUpdated);

    return () => {
      socket.off("component:created", handleCreated);
      socket.off("component:updated", handleUpdated);
      socket.off("component:deleted", handleDeleted);
      socket.off("components:refreshed", handleUpdated);

      if (refreshTimer) clearTimeout(refreshTimer);
    };
  }, [resetPageOnCreate]);

  useEffect(() => {
    return () => {
      activeRequestRef.current?.abort();
    };
  }, []);

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
