import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';
import { db } from '../database/db';
import { DEFAULT_ORG_ID } from '../database/migration';

/**
 * Middleware: Enforces that an organization-level feature flag is enabled.
 * e.g. requireFeature('hr.workRecording'), requireFeature('crm.leads')
 * Super Admin bypasses feature restrictions.
 */
export function requireFeature(featurePath: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    // Platform Super Admin has unrestricted access to all modules
    if (user.role === 'SUPER_ADMIN') {
      return next();
    }

    const orgId = user.organizationId || DEFAULT_ORG_ID;
    const org = db.organizations.findById(orgId);

    if (!org) {
      return res.status(403).json({
        success: false,
        code: 'ORGANIZATION_NOT_FOUND',
        message: 'Your organization profile could not be found'
      });
    }

    // Resolve dotted feature path: e.g. 'hr.workRecording' -> org.features.hr?.workRecording
    const parts = featurePath.split('.');
    let current: any = org.features;
    for (const part of parts) {
      if (current === undefined || current === null) {
        current = undefined;
        break;
      }
      current = current[part];
    }

    if (current === false) {
      return res.status(403).json({
        success: false,
        code: 'FEATURE_DISABLED',
        message: `The feature '${featurePath}' is disabled for your organization. Contact your administrator to enable it.`
      });
    }

    next();
  };
}
