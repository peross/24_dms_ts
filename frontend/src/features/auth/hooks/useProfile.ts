import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '@/lib/api/auth.api';
import type { User } from '@/lib/api/auth.api';

const AUTH_QUERY_KEY = ['auth', 'profile'] as const;

export function useProfile() {
  const queryClient = useQueryClient();

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: (data: { email?: string; username?: string; firstName?: string; lastName?: string }) =>
      authApi.updateProfile(data),
    onSuccess: (response) => {
      // Update the cached user data
      queryClient.setQueryData<User | null>(AUTH_QUERY_KEY, response.user);
      queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY });
    },
  });

  // Update password mutation
  const updatePasswordMutation = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      authApi.updatePassword(data),
  });

  return {
    updateProfile: updateProfileMutation.mutateAsync,
    updateProfileLoading: updateProfileMutation.isPending,
    updatePassword: updatePasswordMutation.mutateAsync,
    updatePasswordLoading: updatePasswordMutation.isPending,
  };
}

