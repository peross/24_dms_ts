import apiClient, { setAccessToken } from './client';

export interface User {
  userId: number;
  email: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  roles: string[];
}

export interface LoginData {
  emailOrUsername: string; // Can be either email or username
  password: string;
  twoFactorToken?: string; // Optional 2FA code
}

export interface RegisterData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface LoginResponse {
  user: User;
  accessToken: string;
}

export const authApi = {
  login: async (data: LoginData): Promise<LoginResponse | { requiresTwoFactor: boolean; message?: string }> => {
    // Send as emailOrUsername for new API, but also support email for backward compatibility
    const response = await apiClient.post<LoginResponse | { requiresTwoFactor: boolean; message?: string }>('/auth/login', {
      emailOrUsername: data.emailOrUsername,
      password: data.password,
      twoFactorToken: data.twoFactorToken,
    });
    
    // Check if 2FA is required
    if ('requiresTwoFactor' in response.data && response.data.requiresTwoFactor) {
      return response.data;
    }
    
    // Store access token in memory
    const loginResponse = response.data as LoginResponse;
    setAccessToken(loginResponse.accessToken);
    return loginResponse;
  },

  register: async (data: RegisterData): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>('/auth/register', data);
    // Store access token in memory
    setAccessToken(response.data.accessToken);
    return response.data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout');
    // Clear access token from memory
    setAccessToken(null);
  },

  logoutAll: async (): Promise<void> => {
    await apiClient.post('/auth/logout-all');
    // Clear access token from memory
    setAccessToken(null);
  },

  getProfile: async (): Promise<{ user: User }> => {
    const response = await apiClient.get<{ user: User }>('/auth/profile');
    return response.data;
  },

  refreshToken: async (): Promise<{ accessToken: string }> => {
    const response = await apiClient.post<{ accessToken: string }>('/auth/refresh');
    // Store new access token in memory
    setAccessToken(response.data.accessToken);
    return response.data;
  },

  updateProfile: async (data: { email?: string; username?: string; firstName?: string; lastName?: string }): Promise<{ user: User }> => {
    const response = await apiClient.put<{ user: User }>('/auth/profile', data);
    return response.data;
  },

  updatePassword: async (data: { currentPassword: string; newPassword: string }): Promise<{ message: string }> => {
    const response = await apiClient.put<{ message: string }>('/auth/profile/password', data);
    return response.data;
  },

  getActiveSessions: async (): Promise<{ sessions: Session[] }> => {
    const response = await apiClient.get<{ sessions: Session[] }>('/auth/sessions');
    return response.data;
  },

  revokeSession: async (refreshTokenId: number): Promise<{ message: string }> => {
    const response = await apiClient.post<{ message: string }>('/auth/sessions/revoke', { refreshTokenId });
    return response.data;
  },

  getTwoFactorStatus: async (): Promise<{ enabled: boolean; setupInProgress: boolean }> => {
    const response = await apiClient.get<{ enabled: boolean; setupInProgress: boolean }>('/auth/two-factor/status');
    return response.data;
  },

  setupTwoFactor: async (): Promise<{ secret: string; qrCodeUrl: string; backupCodes: string[] }> => {
    const response = await apiClient.post<{ secret: string; qrCodeUrl: string; backupCodes: string[] }>('/auth/two-factor/setup');
    return response.data;
  },

  verifyTwoFactorSetup: async (token: string): Promise<{ message: string }> => {
    const response = await apiClient.post<{ message: string }>('/auth/two-factor/verify', { token });
    return response.data;
  },

  disableTwoFactor: async (password: string): Promise<{ message: string }> => {
    const response = await apiClient.post<{ message: string }>('/auth/two-factor/disable', { password });
    return response.data;
  },
};

export interface Session {
  refreshTokenId: number;
  userAgent?: string;
  ipAddress?: string;
  createdAt: string;
  expiresAt: string;
  isCurrent: boolean;
}
