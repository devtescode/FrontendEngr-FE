import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type ClientPagination<T> = {
  page: number;
  setPage: (page: number) => void;
  totalPages: number;
  totalItems: number;
  pageItems: T[];
  rangeStart: number;
  rangeEnd: number;
};

/**
 * Slices an already-loaded list into pages on the client.
 *
 * - Resets to page 1 whenever `resetKey` changes (compared by JSON value, so
 *   arrays such as `[search, stockFilter]` are safe to pass inline).
 * - Clamps the page when the list shrinks (e.g. after a delete or refetch).
 */
export function useClientPagination<T>(
  items: T[],
  pageSize: number,
  resetKey?: unknown,
): ClientPagination<T> {
  const [rawPage, setRawPage] = useState(1);

  const totalItems = items.length;
  const size = Math.max(1, Math.floor(pageSize) || 1);
  const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / size);
  const maxPage = Math.max(totalPages, 1);

  const serializedKey = JSON.stringify(resetKey ?? null) ?? "";
  const previousKey = useRef(serializedKey);

  useEffect(() => {
    if (previousKey.current === serializedKey) return;
    previousKey.current = serializedKey;
    setRawPage(1);
  }, [serializedKey]);

  // Keep stored state in range too, so a later growth of the list doesn't
  // jump back to a stale page.
  useEffect(() => {
    if (rawPage > maxPage) setRawPage(maxPage);
  }, [rawPage, maxPage]);

  // Clamp during render so consumers never see an out-of-range page, even on
  // the render before the effects above run.
  const keyChanged = previousKey.current !== serializedKey;
  const page = keyChanged ? 1 : Math.min(Math.max(1, rawPage), maxPage);

  const pageItems = useMemo(() => items.slice((page - 1) * size, page * size), [items, page, size]);

  const rangeStart = totalItems === 0 ? 0 : (page - 1) * size + 1;
  const rangeEnd = totalItems === 0 ? 0 : Math.min(page * size, totalItems);

  const setPage = useCallback((next: number) => {
    if (!Number.isFinite(next)) return;
    setRawPage(Math.max(1, Math.floor(next)));
  }, []);

  return { page, setPage, totalPages, totalItems, pageItems, rangeStart, rangeEnd };
}
