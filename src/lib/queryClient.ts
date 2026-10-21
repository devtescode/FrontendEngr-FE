import { QueryClient } from "@tanstack/react-query";

import { ApiError, ApiTimeoutError } from "./apiClient";

/* ============================================================
   QUERY CLIENT
   ------------------------------------------------------------
   The client lives in the router context (src/router.tsx) and
   is handed to <QueryClientProvider> in src/routes/__root.tsx.

   Defaults are tuned for a lab inventory app: a catalog page
   should not re-hit the database on every window focus, but a
   failed request should be retried once or twice before the
   user is shown an error.
   ============================================================ */

const DEFAULT_STALE_TIME = 30_000;
const DEFAULT_GC_TIME = 5 * 60_000;

/**
 * 4xx responses mean the request itself was wrong (bad id,
 * expired session, conflict). Retrying them just repeats the
 * mistake, so they fail immediately. Network failures and 5xx
 * responses are worth another attempt.
 */
function shouldRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError && error.isClientError) return false;

  return failureCount < 2;
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: DEFAULT_STALE_TIME,
        gcTime: DEFAULT_GC_TIME,
        retry: shouldRetry,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        refetchOnMount: true,
        // Errors are surfaced per-page, not thrown to an error boundary.
        throwOnError: false,
      },
      mutations: {
        // A mutation is never retried automatically — the user
        // decides whether to try again.
        retry: false,
      },
    },
  });
}

/**
 * Turns any thrown value into a message that is safe to show
 * to a user.
 */
export function toErrorMessage(
  error: unknown,
  fallback = "Something went wrong. Please try again."
): string {
  if (error instanceof ApiTimeoutError) return error.message;
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.message) return error.message;

  return fallback;
}
