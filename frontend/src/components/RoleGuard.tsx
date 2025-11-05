import { ReactNode } from 'react'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { hasRole, hasRoleLevel, RoleLevel, isAdmin, isSuperAdmin } from '@/lib/utils/role.util'

interface RoleGuardProps {
  children: ReactNode
  allowedRoles?: string[]
  minRoleLevel?: RoleLevel
  requireAdmin?: boolean
  requireSuperAdmin?: boolean
  fallback?: ReactNode
  showError?: boolean
}

/**
 * RoleGuard component - conditionally renders children based on user roles
 * 
 * @example
 * // Only show for admins and super admins
 * <RoleGuard requireAdmin>
 *   <AdminPanel />
 * </RoleGuard>
 * 
 * @example
 * // Show for specific roles
 * <RoleGuard allowedRoles={['admin', 'super_admin']}>
 *   <AdminOnlyContent />
 * </RoleGuard>
 * 
 * @example
 * // Show for minimum role level (admin or super_admin)
 * <RoleGuard minRoleLevel={RoleLevel.ADMIN}>
 *   <ElevatedContent />
 * </RoleGuard>
 */
export function RoleGuard({
  children,
  allowedRoles,
  minRoleLevel,
  requireAdmin = false,
  requireSuperAdmin = false,
  fallback = null,
  showError = false,
}: RoleGuardProps) {
  const { user } = useAuth()

  if (!user || !user.roles || user.roles.length === 0) {
    if (showError) {
      return (
        <div className="p-4 bg-destructive/10 text-destructive rounded-md">
          Access denied: No roles assigned
        </div>
      )
    }
    return <>{fallback}</>
  }

  const userRoles = user.roles

  // Check super admin requirement
  if (requireSuperAdmin && !isSuperAdmin(userRoles)) {
    if (showError) {
      return (
        <div className="p-4 bg-destructive/10 text-destructive rounded-md">
          Access denied: Super admin privileges required
        </div>
      )
    }
    return <>{fallback}</>
  }

  // Check admin requirement
  if (requireAdmin && !isAdmin(userRoles)) {
    if (showError) {
      return (
        <div className="p-4 bg-destructive/10 text-destructive rounded-md">
          Access denied: Admin privileges required
        </div>
      )
    }
    return <>{fallback}</>
  }

  // Check minimum role level
  if (minRoleLevel !== undefined && !hasRoleLevel(userRoles, minRoleLevel)) {
    if (showError) {
      return (
        <div className="p-4 bg-destructive/10 text-destructive rounded-md">
          Access denied: Insufficient role level
        </div>
      )
    }
    return <>{fallback}</>
  }

  // Check specific roles
  if (allowedRoles && allowedRoles.length > 0 && !hasRole(userRoles, allowedRoles)) {
    if (showError) {
      return (
        <div className="p-4 bg-destructive/10 text-destructive rounded-md">
          Access denied: Required role not found
        </div>
      )
    }
    return <>{fallback}</>
  }

  return <>{children}</>
}

