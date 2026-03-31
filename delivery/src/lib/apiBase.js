const trimTrailingSlash = (value) => String(value || "").replace(/\/+$/, "");

export const resolveApiBaseUrl = () => {
  const envUrl = trimTrailingSlash(import.meta.env.VITE_API_URL);
  if (envUrl) return envUrl;

  if (typeof window !== "undefined" && import.meta.env.DEV) {
    return `${window.location.protocol}//${window.location.hostname}:5000`;
  }

  if (typeof window !== "undefined") {
    return trimTrailingSlash(window.location.origin);
  }

  return "http://localhost:5000";
};
