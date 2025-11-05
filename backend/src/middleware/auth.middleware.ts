import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, JWTPayload } from '../utils/jwt.util';
import UserService from '../services/user.service';
import { hasRole, hasRoleLevel, RoleHierarchy, isAdmin, isSuperAdmin } from '../utils/role.util';

export interface AuthRequest extends Request {
  user?: JWTPayload;
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    const token = authHeader.substring(7);

    // Verify token
    const decoded = verifyAccessToken(token);

    // Verify user still exists
    const user = await UserService.findById(decoded.userId);
    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    // Attach user to request
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

/**
 * Authorize middleware - checks if user has at least one of the required roles
 * @param requiredRoles - Array of role names (user needs at least one)
 */
export const authorize = (...requiredRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (requiredRoles.length > 0) {
      const userRoles = req.user.roles || [];
      if (!hasRole(userRoles, requiredRoles)) {
        res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
        return;
      }
    }

    next();
  };
};

/**
 * Require admin privileges (admin or super_admin)
 */
export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const userRoles = req.user.roles || [];
  if (!isAdmin(userRoles)) {
    res.status(403).json({ error: 'Forbidden: Admin privileges required' });
    return;
  }

  next();
};

/**
 * Require super admin privileges
 */
export const requireSuperAdmin = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const userRoles = req.user.roles || [];
  if (!isSuperAdmin(userRoles)) {
    res.status(403).json({ error: 'Forbidden: Super admin privileges required' });
    return;
  }

  next();
};

/**
 * Require minimum role level
 */
export const requireRoleLevel = (minLevel: RoleHierarchy) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const userRoles = req.user.roles || [];
    if (!hasRoleLevel(userRoles, minLevel)) {
      res.status(403).json({ error: 'Forbidden: Insufficient role level' });
      return;
    }

    next();
  };
};
