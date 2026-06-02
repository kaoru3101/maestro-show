import axios from "axios";
import { getAccessToken, getRefreshToken, getUser, saveTokens, clearTokens } from "./auth";
import { ep } from "./endpoints";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let failedQueue: { resolve: (value: unknown) => void; reject: (reason?: unknown) => void }[] = [];

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });
  failedQueue = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // ログイン・リフレッシュ自体の 401 はセッション切れではなく認証失敗なので素通し
    if (originalRequest.url?.includes(ep.auth.login) || originalRequest.url?.includes(ep.auth.refresh)) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((token) => {
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return api(originalRequest);
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      clearTokens();
      window.dispatchEvent(new Event("session-expired"));
      // モーダルで UX を処理するためエラーを伝播させない
      return new Promise(() => {});
    }

    try {
      const { data } = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}${ep.auth.refresh}`,
        { refreshToken: refreshToken }
      );
      const newAccessToken = data.access_token;
      saveTokens(newAccessToken, refreshToken, getUser() ?? {});
      processQueue(null, newAccessToken);
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      clearTokens();
      window.dispatchEvent(new Event("session-expired"));
      return new Promise(() => {});
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;

export function getErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error) && error.response?.data?.message) {
    return error.response.data.message;
  }
  return fallback;
}

export function getErrorStatus(error: unknown): number | undefined {
  if (axios.isAxiosError(error)) return error.response?.status;
  return undefined;
}

// 認証不要のエンドポイント（公開ビューなど）用の素のaxiosインスタンス
export const publicApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: { "Content-Type": "application/json" },
});
