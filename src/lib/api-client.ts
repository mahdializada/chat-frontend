import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/store/auth-store';
import type { ApiEnvelope, ApiErrorBody, AuthResponse, SelfUser } from '@/types/api';
import { API_URL } from './env';

export const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

/** Extracts a human-readable message from any API error. */
export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const body = error.response?.data as ApiErrorBody | undefined;
    if (body?.errors?.length) return body.errors.join(', ');
    if (body?.message) return body.message;
    if (error.code === 'ERR_NETWORK') return 'Cannot reach the server. Check your connection.';
  }
  if (error instanceof Error) return error.message;
  return 'Something went wrong';
}

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── silent token refresh (single-flight) ─────────────────────────────────────

let refreshPromise: Promise<string | null> | null = null;

/**
 * Exchanges the httpOnly refresh cookie for a fresh access token and loads the
 * full profile (privacy + appearance settings) in one go.
 * Used on app start and transparently whenever a request hits a 401.
 */
export async function refreshSession(): Promise<string | null> {
  refreshPromise ??= axios
    .post<ApiEnvelope<AuthResponse>>(`${API_URL}/auth/refresh`, undefined, {
      withCredentials: true,
    })
    .then(async (res) => {
      const { accessToken } = res.data.data;
      useAuthStore.getState().setAccessToken(accessToken);

      const me = await axios.get<ApiEnvelope<SelfUser>>(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        withCredentials: true,
      });
      useAuthStore.getState().setAuth(me.data.data, accessToken);
      return accessToken;
    })
    .catch(() => {
      useAuthStore.getState().clear();
      return null;
    })
    .finally(() => {
      refreshPromise = null;
    });
  return refreshPromise;
}

const AUTH_PATHS = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'];

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as (AxiosRequestConfig & { _retried?: boolean }) | undefined;
    const isAuthPath = AUTH_PATHS.some((path) => config?.url?.includes(path));

    if (error.response?.status === 401 && config && !config._retried && !isAuthPath) {
      config._retried = true;
      const token = await refreshSession();
      if (token) {
        config.headers = { ...config.headers, Authorization: `Bearer ${token}` };
        return apiClient.request(config);
      }
    }
    return Promise.reject(error);
  },
);
