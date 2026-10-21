/* ============================================================
   API CLIENT
   ------------------------------------------------------------
   One place that knows how to talk to the backend:

     • base url resolution (src/lib/config.ts)
     • auth header scoping (student vs admin realm)
     • request timeout
     • AbortSignal plumbing, so React Query can cancel
       obsolete requests when the query key changes
     • a typed error carrying the HTTP status, so the query
       retry policy can tell "retryable" from "fatal"
   ============================================================ */

import { API_BASE_URL } from "./config";
import { adminAuthHeaders, userAuthHeaders } from "./auth";

export const DEFAULT_TIMEOUT_MS = 15_000;

export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }

  /** 4xx responses are a client problem — never worth retrying. */
  get isClientError(): boolean {
    return this.status >= 400 && this.status < 500;
  }
}

export class ApiTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiTimeoutError";
  }
}

export type ApiAuth = "none" | "user" | "admin";

export type ApiRequestOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  headers?: HeadersInit;
  body?: BodyInit | null;
  signal?: AbortSignal;
  timeoutMs?: number;
  auth?: ApiAuth;
  query?: Record<
    string,
    string | number | boolean | null | undefined
  >;
};

function buildUrl(
  path: string,
  query?: ApiRequestOptions["query"]
): string {
  let url = path.startsWith("http")
    ? path
    : `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;

  if (query) {
    const params = new URLSearchParams();

    Object.entries(query).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") return;
      params.set(key, String(value));
    });

    const qs = params.toString();

    if (qs) url += `${url.includes("?") ? "&" : "?"}${qs}`;
  }

  return url;
}

/**
 * Combines the caller's AbortSignal with a timeout signal.
 * `timedOut` flips to true when the timeout (not the caller)
 * was the reason the request was aborted.
 */
function withTimeout(
  timeoutMs: number,
  external?: AbortSignal
): { signal: AbortSignal; timedOut: () => boolean; clear: () => void } {
  const controller = new AbortController();
  let timedOut = false;

  const onExternalAbort = () => controller.abort();

  if (external) {
    if (external.aborted) {
      controller.abort();
    } else {
      external.addEventListener("abort", onExternalAbort, { once: true });
    }
  }

  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  return {
    signal: controller.signal,
    timedOut: () => timedOut,
    clear: () => {
      clearTimeout(timer);
      external?.removeEventListener("abort", onExternalAbort);
    },
  };
}

function authHeadersFor(auth: ApiAuth): HeadersInit {
  if (auth === "user") return userAuthHeaders();
  if (auth === "admin") return adminAuthHeaders();
  return {};
}

/**
 * Performs a request and returns the parsed JSON body.
 * Throws `ApiError` for non-2xx responses and `ApiTimeoutError`
 * when the request exceeds the timeout. A caller-initiated abort
 * re-throws the original `AbortError` so React Query can treat it
 * as a cancellation rather than a failure.
 */
export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const {
    method = "GET",
    headers,
    body,
    signal,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    auth = "none",
    query,
  } = options;

  const timeout = withTimeout(timeoutMs, signal);

  try {
    const response = await fetch(buildUrl(path, query), {
      method,
      headers: {
        Accept: "application/json",
        ...authHeadersFor(auth),
        ...headers,
      },
      // FormData bodies must not have their Content-Type set — the
      // browser needs to add the multipart boundary itself.
      body: body ?? null,
      signal: timeout.signal,
    });

    const contentType = response.headers.get("content-type") ?? "";
    const isJson = contentType.includes("application/json");

    let parsed: unknown = null;

    if (response.status !== 204) {
      const text = await response.text();

      if (text) {
        if (isJson) {
          try {
            parsed = JSON.parse(text);
          } catch {
            if (response.ok) {
              throw new ApiError(
                "The server returned a response we could not read.",
                response.status,
                text
              );
            }
          }
        } else {
          parsed = text;
        }
      }
    }

    if (!response.ok) {
      const message =
        (parsed &&
          typeof parsed === "object" &&
          "message" in parsed &&
          typeof (parsed as { message?: unknown }).message === "string"
            ? (parsed as { message: string }).message
            : typeof parsed === "string" && parsed
              ? parsed
              : `Request failed with status ${response.status}`);

      throw new ApiError(message, response.status, parsed);
    }

    return parsed as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;

    if ((error as { name?: string })?.name === "AbortError") {
      // A timeout is a failure; a caller abort is a cancellation.
      if (timeout.timedOut()) {
        throw new ApiTimeoutError(
          `Request timed out after ${Math.round(timeoutMs / 1000)}s.`
        );
      }

      throw error;
    }

    if (error instanceof TypeError) {
      throw new Error(
        "Network error. Please check your connection and try again."
      );
    }

    throw error;
  } finally {
    timeout.clear();
  }
}
