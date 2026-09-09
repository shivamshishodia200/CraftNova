import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../database/db';
import { RoleType } from '../database/types';

export const JWT_SECRET = process.env.JWT_SECRET || '360crm_enterprise_secret_key_2026_shiva';

export interface AuthenticatedUser {
  userId: string;
  email: string;
  name: string;
  role: RoleType;
  roleId: string;
  permissions: string[];
  organizationId?: string | null;
  organization?: string;
  avatar?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export function generateToken(user: AuthenticatedUser): string {
  return jwt.sign(
    {
      userId: user.userId,
      email: user.email,
      name: user.name,
      role: user.role,
      roleId: user.roleId,
      permissions: user.permissions,
      organizationId: user.organizationId,
      organization: user.organization,
      avatar: user.avatar
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function generateMediaToken(user: AuthenticatedUser, workSessionId: string, segmentId?: string): string {
  return jwt.sign(
    {
      userId: user.userId,
      email: user.email,
      name: user.name,
      role: user.role,
      roleId: user.roleId,
      permissions: user.permissions,
      organizationId: user.organizationId,
      workSessionId,
      segmentId,
      type: 'MEDIA_STREAM'
    },
    JWT_SECRET,
    { expiresIn: '2h' } // 2 hour playback token
  );
}

export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  let token: string | null = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.query.token && typeof req.query.token === 'string') {
    // Authenticate HTML5 media elements or signed URLs
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access token missing or invalid. Please login.'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthenticatedUser;
    
    // Verify user still exists in DB and is active
    const userDoc = db.users.findById(decoded.userId);
    if (userDoc) {
      if (userDoc.status === 'INACTIVE' || userDoc.status === 'SUSPENDED') {
        return res.status(403).json({
          success: false,
          message: 'Account is deactivated. Contact Administrator.'
        });
      }

      // Check organization suspension (unless SUPER_ADMIN)
      if (userDoc.role !== 'SUPER_ADMIN' && userDoc.organizationId) {
        const org = db.organizations.findById(userDoc.organizationId);
        if (org && org.status === 'SUSPENDED') {
          return res.status(403).json({
            success: false,
            code: 'ORGANIZATION_SUSPENDED',
            message: 'Your organization has been suspended. Please contact platform administrator.'
          });
        }
      }

      // Re-fetch role permissions in real-time
      const roleDoc = db.roles.findById(userDoc.roleId) || db.roles.findOne(r => r.code === userDoc.role);
      const rolePerms = userDoc.permissionMode === 'REPLACE' ? [] : (roleDoc?.permissions || []);
      const customPerms = userDoc.customPermissions || [];
      const mergedPerms = Array.from(new Set([...rolePerms, ...customPerms]));

      req.user = {
        userId: userDoc._id,
        email: userDoc.email,
        name: userDoc.name,
        role: userDoc.role,
        roleId: userDoc.roleId,
        permissions: mergedPerms,
        organizationId: userDoc.role === 'SUPER_ADMIN' ? null : (userDoc.organizationId || null),
        organization: userDoc.organization,
        avatar: userDoc.avatar
      };
    } else {
      req.user = decoded;
    }

    next();
  } catch (err: any) {
    return res.status(403).json({
      success: false,
      message: 'Invalid or expired session token. Please sign in again.'
    });
  }
}

