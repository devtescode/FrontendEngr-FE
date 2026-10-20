const getBaseURL = (): string => {
  const envUrl = import.meta.env.VITE_API_URL;
  const isHttps = typeof window !== "undefined" && window.location.protocol === "https:";
  const isProdHost =
    typeof window !== "undefined" &&
    window.location.hostname !== "localhost" &&
    window.location.hostname !== "127.0.0.1";

  // Never allow http in https context (prevents mixed content)
  if (isHttps && envUrl && envUrl.startsWith("http://")) {
    console.warn("VITE_API_URL is http on https page, ignoring and using production backend");
    if (isProdHost || isHttps) {
      return "https://backendengr-be.onrender.com";
    }
    return "http://localhost:4500";
  }

  if (envUrl) {
    return envUrl;
  }

  if (isProdHost || isHttps) {
    return "https://backendengr-be.onrender.com";
  }

  return "http://localhost:4500";
};

export const API_BASE_URL = getBaseURL();
export const baseURL = API_BASE_URL;
