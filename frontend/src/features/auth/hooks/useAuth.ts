import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import { authApi } from '@/lib/api/auth.api';
import type { LoginData, RegisterData, LoginResponse, User } from '@/lib/api/auth.api';

const AUTH_QUERY_KEY = ['auth', 'profile'] as const;

export function useAuth() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';

  // Get current user profile
  const {
    data: user,
    isLoading,
    error,
  } = useQuery<User | null>({
    queryKey: AUTH_QUERY_KEY,
    queryFn: async () => {
      // The interceptor will handle token refresh automatically
      // If the request fails with 401, the interceptor will:
      // 1. Try to refresh using refresh token from cookie
      // 2. If refresh succeeds, retry the original request
      // 3. If refresh fails, throw the error
      // So we should only get an error here if refresh failed (no refresh token)
      try {
        const response = await authApi.getProfile();
        return response.user;
      } catch (error: any) {
        // If we get here, it means:
        // - The interceptor tried to refresh (if it was a 401)
        // - Refresh failed (no refresh token) OR it's a different error
        // Return null for auth errors (401/403) - user is not authenticated
        if (error?.response?.status === 401 || error?.response?.status === 403) {
          return null;
        }
        // Re-throw other errors
        throw error;
      }
    },
    retry: false, // Don't retry - interceptor handles refresh
    // Always refetch on mount when not on login page
    refetchOnMount: !isLoginPage,
    // Enable the query - it should always run unless on login page
    enabled: !isLoginPage,
    // Don't use stale data - always check authentication status
    staleTime: 0,
    // Cache time - keep data for a short time
    gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
  });

        // Login mutation
        const loginMutation = useMutation({
          mutationFn: async (data: LoginData) => {
            const response = await authApi.login(data);
            // Check if 2FA is required - return it so LoginForm can handle it
            if (response && 'requiresTwoFactor' in response) {
              return response;
            }
            // Normal login success - navigate and update cache
            const loginResponse = response as LoginResponse;
            queryClient.setQueryData(AUTH_QUERY_KEY, loginResponse.user);
            queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY });
            navigate('/');
            return response;
          },
        });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: (data: RegisterData) => authApi.register(data),
    onSuccess: (response) => {
      queryClient.setQueryData(AUTH_QUERY_KEY, response.user);
      queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY });
      navigate('/');
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      queryClient.setQueryData(AUTH_QUERY_KEY, null);
      queryClient.clear();
      navigate('/login', { replace: true });
    },
  });

  // Logout all devices mutation
  const logoutAllMutation = useMutation({
    mutationFn: () => authApi.logoutAll(),
    onSuccess: () => {
      queryClient.setQueryData(AUTH_QUERY_KEY, null);
      queryClient.clear();
      navigate('/login', { replace: true });
    },
  });

  return {
    user,
    isLoading,
    error,
    isAuthenticated: !!user,
    login: loginMutation.mutateAsync,
    loginLoading: loginMutation.isPending,
    register: registerMutation.mutateAsync,
    registerLoading: registerMutation.isPending,
    logout: logoutMutation.mutateAsync,
    logoutLoading: logoutMutation.isPending,
    logoutAll: logoutAllMutation.mutateAsync,
    logoutAllLoading: logoutAllMutation.isPending,
  };
}

