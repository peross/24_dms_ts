import axios, { AxiosError } from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Store access token in memory
let accessToken: string | null = null;

export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

export const getAccessToken = (): string | null => {
  return accessToken;
};

// Create axios instance
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Important: Send cookies with requests (for refresh token)
  headers: {
    'Content-Type': 'application/json',
  },
});

// Flag to prevent multiple refresh attempts
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: AxiosError | null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(null);
    }
  });

  failedQueue = [];
};

// Request interceptor - add access token to headers
apiClient.interceptors.request.use(
  (config) => {
    // Add access token to Authorization header if available
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    // If there's no config, we can't retry
    if (!error.config) {
      return Promise.reject(error);
    }

    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    const requestUrl = originalRequest?.url || '';

    // Don't try to refresh on auth endpoints (login, register, refresh itself)
    // These should fail normally when there's no token
    const isAuthEndpoint = requestUrl.includes('/auth/login') || 
                          requestUrl.includes('/auth/register') || 
                          requestUrl.includes('/auth/refresh');

    // If error is 401 and we haven't tried to refresh yet, and it's not an auth endpoint
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => {
            // When refresh completes, retry the request
            // The access token is now in memory, so request interceptor will add it
            // Clear retry flag for the queued request
            delete originalRequest._retry;
            return apiClient(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Try to refresh token (refresh token is in httpOnly cookie)
        // This request doesn't need an access token - it uses refresh token from cookie
        const refreshResponse = await apiClient.post<{ accessToken: string }>('/auth/refresh');
        
        // Store new access token in memory
        const newAccessToken = refreshResponse.data.accessToken;
        if (!newAccessToken) {
          throw new Error('No access token received from refresh');
        }
        setAccessToken(newAccessToken);
        
        // Process queued requests
        processQueue(null);
        
        // Create a completely fresh request config for retry
        // Don't modify originalRequest as it might cause issues
        const retryConfig = {
          ...originalRequest,
          headers: {
            ...originalRequest.headers,
            Authorization: `Bearer ${newAccessToken}`,
          },
        } as InternalAxiosRequestConfig;
        
        // Clear the retry flag
        delete (retryConfig as any)._retry;
        
        // Retry the request with new token
        // The request interceptor will also add the token from memory as a backup
        return apiClient(retryConfig);
      } catch (refreshError: any) {
        // Refresh failed - this means no valid refresh token exists
        // Clear access token
        setAccessToken(null);
        
        // Reject all queued requests
        processQueue(refreshError as AxiosError);
        
        // Return the original error (401) so components know auth failed
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }

    // For all other errors, just reject
    return Promise.reject(error);
  }
);

export default apiClient;
