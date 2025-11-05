/**
 * Role hierarchy and permissions utilities
 */

export enum RoleHierarchy {
  MEMBER = 1,
  ADMIN = 2,
  SUPER_ADMIN = 3,
}

export const roleHierarchy: Record<string, number> = {
  member: RoleHierarchy.MEMBER,
  admin: RoleHierarchy.ADMIN,
  super_admin: RoleHierarchy.SUPER_ADMIN,
};

/**
 * Check if a user has at least one of the required roles
 */
export function hasRole(userRoles: string[], requiredRoles: string[]): boolean {
  if (requiredRoles.length === 0) return true;
  return requiredRoles.some((role) => userRoles.includes(role));
}

/**
 * Check if a user has a role with at least the specified hierarchy level
 */
export function hasRoleLevel(userRoles: string[], minLevel: RoleHierarchy): boolean {
  return userRoles.some((role) => {
    const roleLevel = roleHierarchy[role] || 0;
    return roleLevel >= minLevel;
  });
}

/**
 * Check if a user has exactly a specific role
 */
export function hasExactRole(userRoles: string[], role: string): boolean {
  return userRoles.includes(role);
}

/**
 * Check if a user has admin privileges (admin or super_admin)
 */
export function isAdmin(userRoles: string[]): boolean {
  return hasRole(userRoles, ['admin', 'super_admin']);
}

/**
 * Check if a user has super admin privileges
 */
export function isSuperAdmin(userRoles: string[]): boolean {
  return hasExactRole(userRoles, 'super_admin');
}

