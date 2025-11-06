import { Navigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useRole } from '@/hooks/useRole'
import { hasRole, hasRoleLevel, RoleLevel } from '@/lib/utils/role.util'

interface RoleProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: string[]
  minRoleLevel?: RoleLevel
  requireAdmin?: boolean
  requireSuperAdmin?: boolean
  fallbackPath?: string
}

/**
 * Route protection based on user roles
 * Redirects to fallback path or dashboard if user doesn't have required permissions
 */
export function RoleProtectedRoute({
  children,
  allowedRoles,
  minRoleLevel,
  requireAdmin = false,
  requireSuperAdmin = false,
  fallbackPath = '/',
}: RoleProtectedRouteProps) {
  const { user, isLoading } = useAuth()
  const { roles } = useRole()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (!user || !user.roles || user.roles.length === 0) {
    return <Navigate to={fallbackPath} replace />
  }

  // Check super admin requirement
  if (requireSuperAdmin && !hasRole(roles, ['super_admin'])) {
    return <Navigate to={fallbackPath} replace />
  }

  // Check admin requirement
  if (requireAdmin && !hasRole(roles, ['admin', 'super_admin'])) {
    return <Navigate to={fallbackPath} replace />
  }

  // Check minimum role level
  if (minRoleLevel !== undefined && !hasRoleLevel(roles, minRoleLevel)) {
    return <Navigate to={fallbackPath} replace />
  }

  // Check specific roles
  if (allowedRoles && allowedRoles.length > 0 && !hasRole(roles, allowedRoles)) {
    return <Navigate to={fallbackPath} replace />
  }

  return <>{children}</>
}

