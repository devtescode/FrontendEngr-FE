import { API_BASE_URL } from "./config";

/**
 * Ensure API URLs use HTTPS in production environments
 * to avoid mixed content issues on mobile browsers
 */
export function ensureHttps(url: string): string {
  if (typeof window === "undefined") {
    return url;
  }

  const isHttps = window.location.protocol === "https:";
  if (isHttps && url.startsWith("http://")) {
    if (url.includes("localhost") || url.includes("127.0.0.1")) {
      return url;
    }
    return url.replace("http://", "https://");
  }

  return url;
}

export function getApiUrl(): string {
  return ensureHttps(API_BASE_URL);
}
