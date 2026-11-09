import axios, { AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "@/stores/auth-store";

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "/api/proxy",
  timeout: 20_000,
});

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const { accessToken } = useAuthStore.getState();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

/**
 * Some endpoints return 401 for reasons that have nothing to do with the
 * caller's own session — e.g. PosAuthorizationController.verify-supervisor
 * deliberately 401s on a wrong supervisor PIN without touching the
 * cashier's own login. Pass this to skip the global "session is gone,
 * bounce to login" handling for that one call.
 */
export function skipAuthRedirect(config: AxiosRequestConfig = {}): AxiosRequestConfig {
  return { ...config, headers: { ...config.headers, "X-Skip-Auth-Redirect": "1" } };
}

// BCorDFWebApi issues a plain 1-day token with no refresh endpoint (see
// TokenService.CreateToken) — a 401 here just means the session is gone,
// so we clear it and send the user back to login rather than attempting
// a silent refresh that the backend has no route for.
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const skip = error.config?.headers?.["X-Skip-Auth-Redirect"] === "1";
    // A wrong password on the login call itself is a 401 too - that must show the form's own "invalid credentials"
    // message, not bounce the user to another page.
    const isLoginCall = /\/Account\/login\/?$/i.test(error.config?.url ?? "");
    if (error.response?.status === 401 && !skip && !isLoginCall) {
      useAuthStore.getState().clearSession();
      if (typeof window !== "undefined") {
        // Back to the login the user came from: the waiter app has its own phone-shaped one, and the language is kept.
        const [, first, second] = window.location.pathname.split("/");
        const locale = first === "ar" || first === "en" ? first : "en";
        const inWaiterApp = (first === locale ? second : first) === "mobile";
        window.location.href = `/${locale}${inWaiterApp ? "/mobile/login" : "/login"}`;
      }
    }
    return Promise.reject(error);
  },
);
