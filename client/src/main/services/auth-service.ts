import { apiClient } from '../api/client';
import { configStore, AuthState } from '../config-store';
import { normalizeApiBaseUrl } from '../utils/url';
import { setApiBaseUrl as configureSocketBaseUrl, setAuthToken as configureSocketAuthToken, disconnectSocket, requestResync } from './socket-service';

interface LoginParams {
  identifier: string;
  password: string;
  twoFactorToken?: string;
}

interface LoginResponse {
  success: boolean;
  requiresTwoFactor?: boolean;
  message?: string;
  user?: {
    userId: number;
    email: string;
    username?: string;
    firstName?: string;
    lastName?: string;
  };
}

class AuthService {
  initialize(apiBaseUrl?: string): void {
    const storedBaseUrl = apiBaseUrl ?? configStore.getApiBaseUrl();
    if (storedBaseUrl) {
      apiClient.setBaseUrl(normalizeApiBaseUrl(storedBaseUrl));
      configureSocketBaseUrl(storedBaseUrl);
    }

    const authState = configStore.getAuthState();
    if (authState?.accessToken) {
      apiClient.setAccessToken(authState.accessToken);
      configureSocketAuthToken(authState.accessToken);
      requestResync();
    }

    apiClient.setRefreshHandler(async () => this.refreshAccessToken());
  }

  setApiBaseUrl(apiBaseUrl: string): void {
    const normalized = normalizeApiBaseUrl(apiBaseUrl);
    configStore.setApiBaseUrl(normalized);
    apiClient.setBaseUrl(normalized);
    configureSocketBaseUrl(normalized);
  }

  async login(params: LoginParams): Promise<LoginResponse> {
    const response = await apiClient.axios.post('/auth/login', {
      emailOrUsername: params.identifier,
      password: params.password,
      twoFactorToken: params.twoFactorToken,
    });

    if (response.data?.requiresTwoFactor) {
      return {
        success: false,
        requiresTwoFactor: true,
        message: response.data.message,
      };
    }

    const { accessToken, user } = response.data ?? {};

    if (!accessToken || !user) {
      return {
        success: false,
        message: 'Invalid login response from server',
      };
    }

    const authState: AuthState = {
      accessToken,
      userId: user.userId,
      email: user.email,
      displayName: user.firstName ? `${user.firstName} ${user.lastName ?? ''}`.trim() : user.username,
    };

    configStore.setAuthState(authState);
    apiClient.setAccessToken(accessToken);
    configureSocketAuthToken(accessToken);
    requestResync();

    return {
      success: true,
      user,
    };
  }

  async refreshAccessToken(): Promise<string | undefined> {
    const authState = configStore.getAuthState();
    if (!authState?.accessToken) {
      return undefined;
    }

    try {
      const response = await apiClient.axios.post('/auth/refresh');
      const { accessToken } = response.data ?? {};
      if (!accessToken) {
        return undefined;
      }

      const existing = configStore.getAuthState() ?? {};
      const updated: AuthState = {
        ...existing,
        accessToken,
      };

      configStore.setAuthState(updated);
      apiClient.setAccessToken(accessToken);

      return accessToken;
    } catch (error) {
      console.warn('Failed to refresh access token', error);
      this.clearAuth();
      return undefined;
    }
  }

  async logout(): Promise<void> {
    try {
      await apiClient.axios.post('/auth/logout');
    } catch (error: any) {
      if (error?.response?.status !== 401) {
        console.warn('Logout request failed', error);
      }
    } finally {
      this.clearAuth();
    }
  }

  clearAuth(): void {
    configStore.setAuthState(undefined);
    apiClient.reset();
    disconnectSocket();
  }
}

export const authService = new AuthService();

