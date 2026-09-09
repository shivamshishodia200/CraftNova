/**
 * 360CRM Enterprise - Path-Based Routing Utilities
 * Handles single-page app pathname parsing, route detection,
 * and seamless navigation without hard page refreshes.
 */

export type LoginPortalType = 'SUPER_ADMIN' | 'ADMIN' | 'EMPLOYEE';

export interface ParsedRoute {
  isLoginRoute: boolean;
  portal: LoginPortalType | null;
  organizationSlug: string | null;
  rawPath: string;
}

/**
 * Extracts normalized path from either window.location.pathname or window.location.hash
 */
export function getNormalizedPath(): string {
  if (typeof window === 'undefined') return '/';

  // Check hash-based routing first if present (e.g. #/admin/login/craft-media-hub)
  const hash = window.location.hash;
  if (hash && hash.startsWith('#/')) {
    return hash.slice(1);
  }

  // Otherwise check standard pathname
  const path = window.location.pathname || '/';
  return path;
}

/**
 * Parses current route to detect login portal and organization slug
 */
export function parseRoute(path?: string): ParsedRoute {
  const currentPath = (path || getNormalizedPath()).toLowerCase().replace(/\/+$/, '');

  // 1. Super Admin Login: /super-admin/login or /superadmin/login or /login
  if (
    currentPath === '/super-admin/login' ||
    currentPath === '/superadmin/login' ||
    currentPath === '/login'
  ) {
    return {
      isLoginRoute: true,
      portal: 'SUPER_ADMIN',
      organizationSlug: null,
      rawPath: currentPath
    };
  }

  // 2. Admin Login: /admin/login/:organizationSlug or /admin/:organizationSlug/login
  const adminMatch =
    currentPath.match(/^\/admin\/login\/([a-z0-9-_]+)/) ||
    currentPath.match(/^\/admin\/([a-z0-9-_]+)\/login/);

  if (adminMatch) {
    return {
      isLoginRoute: true,
      portal: 'ADMIN',
      organizationSlug: adminMatch[1],
      rawPath: currentPath
    };
  }

  // 3. Employee Login: /employee/login/:organizationSlug or /employee/:organizationSlug/login
  const empMatch =
    currentPath.match(/^\/employee\/login\/([a-z0-9-_]+)/) ||
    currentPath.match(/^\/employee\/([a-z0-9-_]+)\/login/);

  if (empMatch) {
    return {
      isLoginRoute: true,
      portal: 'EMPLOYEE',
      organizationSlug: empMatch[1],
      rawPath: currentPath
    };
  }

  // 4. Query param fallback: ?org=craft-media-hub or ?portal=admin
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const orgParam = params.get('org') || params.get('client');
    const portalParam = (params.get('portal') || '').toUpperCase();

    if (orgParam) {
      const isEmp = portalParam === 'EMPLOYEE' || currentPath.includes('employee');
      return {
        isLoginRoute: true,
        portal: isEmp ? 'EMPLOYEE' : 'ADMIN',
        organizationSlug: orgParam.toLowerCase(),
        rawPath: currentPath
      };
    }

    if (portalParam === 'SUPER_ADMIN') {
      return {
        isLoginRoute: true,
        portal: 'SUPER_ADMIN',
        organizationSlug: null,
        rawPath: currentPath
      };
    }
  }

  // 5. Explicit login route /login (generic portal chooser)
  const isExplicitLogin = currentPath === '/login';
  return {
    isLoginRoute: isExplicitLogin,
    portal: null,
    organizationSlug: null,
    rawPath: currentPath
  };
}

/**
 * Navigate cleanly to a new route updating both URL and dispatching popstate
 */
export function navigateTo(path: string, options?: { replace?: boolean }) {
  if (typeof window === 'undefined') return;

  if (options?.replace) {
    window.history.replaceState({}, '', path);
  } else {
    window.history.pushState({}, '', path);
  }

  // Dispatch event so React components re-render immediately
  window.dispatchEvent(new PopStateEvent('popstate'));
}

/**
 * Generate canonical login URLs
 */
export function getSuperAdminLoginUrl(): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/super-admin/login`;
}

export function getAdminLoginUrl(orgSlug: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/admin/login/${encodeURIComponent(orgSlug)}`;
}

export function getEmployeeLoginUrl(orgSlug: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/employee/login/${encodeURIComponent(orgSlug)}`;
}
