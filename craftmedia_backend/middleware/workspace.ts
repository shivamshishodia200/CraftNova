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
