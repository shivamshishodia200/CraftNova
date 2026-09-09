import { Response } from 'express';
import { AuthenticatedRequest } from './auth';
import { DEFAULT_ORG_ID } from '../database/migration';

/**
 * Resolves the authenticated user's organizationId
 */
export function getAuthenticatedOrgId(req: AuthenticatedRequest): string | null {
  if (!req.user) return null;
  if (req.user.role === 'SUPER_ADMIN') return null;
  return req.user.organizationId || DEFAULT_ORG_ID;
}

/**
 * Determines if a given entity matches the current authenticated user's organization / workspace
 */
export function isItemInWorkspace(item: any, req: AuthenticatedRequest): boolean {
  if (!item || !req.user) return false;
  
  // Platform Super Admin has unrestricted visibility across all client tenants
  if (req.user.role === 'SUPER_ADMIN') {
    return true;
  }

  const userOrgId = req.user.organizationId || DEFAULT_ORG_ID;
  const itemOrgId = item.organizationId;

  // Strict tenant match
  if (itemOrgId) {
    return itemOrgId === userOrgId;
  }

  // Fallback for default tenant historical items lacking organizationId
  if (!itemOrgId && userOrgId === DEFAULT_ORG_ID) {
    return true;
  }

  return false;
}

/**
 * Asserts that a given resource belongs to the requesting user's tenant.
 * If not, sends a standardized HTTP 404 / 403 response and returns false.
 */
export function assertTenantOwnership(
  resource: any,
  req: AuthenticatedRequest,
  res: Response,
  resourceName: string = 'Resource'
): boolean {
  if (!resource) {
    res.status(404).json({
      success: false,
      code: 'NOT_FOUND',
      message: `${resourceName} not found`
    });
    return false;
  }

  if (!isItemInWorkspace(resource, req)) {
    res.status(403).json({
      success: false,
      code: 'FORBIDDEN_TENANT_ACCESS',
      message: `Access denied: ${resourceName} does not belong to your organization workspace.`
    });
    return false;
  }

  return true;
}

/**
 * Safely fetches a resource by ID from a collection and asserts tenant ownership in one step.
 */
export function requireTenantResource<T extends { _id: string; organizationId?: string }>(
  collection: { findById: (id: string) => T | null },
  id: string,
  req: AuthenticatedRequest,
  res: Response,
  resourceName: string = 'Resource'
): T | null {
  const item = collection.findById(id);
  if (!assertTenantOwnership(item, req, res, resourceName)) {
    return null;
  }
  return item;
}

/**
 * Filters any collection of documents according to the current user's organization isolation
 */
export function filterByWorkspace<T>(items: T[], req: AuthenticatedRequest): T[] {
  if (!Array.isArray(items)) return [];
  return items.filter(item => isItemInWorkspace(item, req));
}

/**
 * Injects strict organizationId into a new document before saving to database.
 * NEVER trusts organizationId from frontend request bodies for non-Super-Admin users.
 */
export function attachWorkspaceContext(doc: any, req: AuthenticatedRequest): any {
  const user = req.user;

  let targetOrgId = DEFAULT_ORG_ID;
  if (user?.role === 'SUPER_ADMIN') {
    targetOrgId = doc.organizationId || req.body?.organizationId || DEFAULT_ORG_ID;
  } else if (user?.organizationId) {
    targetOrgId = user.organizationId;
  }

  return {
    ...doc,
    organizationId: targetOrgId,
    adminId: user?.userId || 'usr_admin_main',
    createdBy: user?.userId || 'usr_admin_main'
  };
}
