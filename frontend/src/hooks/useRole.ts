import { useAuth } from '@/features/auth/hooks/useAuth'
import { hasRole, hasRoleLevel, RoleLevel, isAdmin, isSuperAdmin } from '@/lib/utils/role.util'

/**
 * Hook for role-based access control
 * Provides utilities to check user roles and permissions
 */
export function useRole() {
  const { user } = useAuth()

  const userRoles = user?.roles || []

  return {
    roles: userRoles,
    hasRole: (requiredRoles: string[]) => hasRole(userRoles, requiredRoles),
    hasRoleLevel: (minLevel: RoleLevel) => hasRoleLevel(userRoles, minLevel),
    isAdmin: () => isAdmin(userRoles),
    isSuperAdmin: () => isSuperAdmin(userRoles),
    isMember: () => userRoles.length > 0,
  }
}

