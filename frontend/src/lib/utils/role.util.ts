/**
 * Frontend role utilities for checking user permissions
 */

export enum RoleLevel {
  MEMBER = 1,
  ADMIN = 2,
  SUPER_ADMIN = 3,
}

export const roleHierarchy: Record<string, RoleLevel> = {
  member: RoleLevel.MEMBER,
  admin: RoleLevel.ADMIN,
  super_admin: RoleLevel.SUPER_ADMIN,
};

export interface RoleCheckOptions {
  requireAll?: boolean; // If true, user must have ALL roles, otherwise ANY role
}

/**
 * Check if a user has at least one of the required roles
 */
export function hasRole(userRoles: string[], requiredRoles: string[], options?: RoleCheckOptions): boolean {
  if (requiredRoles.length === 0) return true;
  if (options?.requireAll) {
    return requiredRoles.every((role) => userRoles.includes(role));
  }
  return requiredRoles.some((role) => userRoles.includes(role));
}

/**
 * Check if a user has a role with at least the specified hierarchy level
 */
export function hasRoleLevel(userRoles: string[], minLevel: RoleLevel): boolean {
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

/**
 * Check if a user has member privileges or higher
 */
export function isMember(userRoles: string[]): boolean {
  return userRoles.length > 0; // Any authenticated user has at least member role
}

