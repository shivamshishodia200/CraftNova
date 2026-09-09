import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';
import { RoleType } from '../database/types';

/**
 * Middleware to enforce granular RBAC permission codes
 */
export function requirePermission(permissionCode: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const role = String(req.user.role || '').toUpperCase();
    if (role === 'SUPER_ADMIN' || role === 'ADMIN') {
      return next();
    }

    const permissions = req.user.permissions || [];
    const hasPerm = permissions.includes(permissionCode) || permissions.includes('*');

    if (!hasPerm) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: You lack permission '${permissionCode}' to perform this action.`,
        requiredPermission: permissionCode
      });
    }

    next();
  };
}

/**
 * Middleware to enforce role requirements (e.g. SUPER_ADMIN only)
 */
export function requireRole(allowedRoles: RoleType | RoleType[]) {
  const rolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (req.user.role === 'SUPER_ADMIN' || rolesArray.includes(req.user.role)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: `Forbidden: Access restricted to roles: ${rolesArray.join(', ')}`
    });
  };
}
