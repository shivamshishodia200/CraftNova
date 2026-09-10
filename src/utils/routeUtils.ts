/**
 * 360CRM Enterprise - Universal Routing Utilities
 * Handles single-page app pathname parsing, route detection,
 * and universal static-host compatibility (never gives 404 on Render / static hosts).
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
  if (typeof window === 'undefined') {
    return {
      isLoginRoute: false,
      portal: null,
      organizationSlug: null,
      rawPath: '/'
    };
  }

  const currentPath = (path || getNormalizedPath()).toLowerCase().replace(/\/+$/, '');
  const searchParams = new URLSearchParams(window.location.search);
  const hash = window.location.hash || '';

  // 1. Check Query Parameters First (?org=craft-media-hub or ?portal=admin or ?portal=super_admin)
  const orgQuery = searchParams.get('org') || searchParams.get('client');
  const portalQuery = (searchParams.get('portal') || '').toUpperCase();

  if (orgQuery) {
    const isEmp = portalQuery === 'EMPLOYEE' || currentPath.includes('employee');
    return {
      isLoginRoute: true,
      portal: isEmp ? 'EMPLOYEE' : 'ADMIN',
      organizationSlug: orgQuery.toLowerCase(),
      rawPath: window.location.search
    };
  }

  if (portalQuery === 'SUPER_ADMIN' || portalQuery === 'SUPERADMIN') {
    return {
      isLoginRoute: true,
      portal: 'SUPER_ADMIN',
      organizationSlug: null,
      rawPath: window.location.search
    };
  }

  // 2. Check Hash Route (e.g. #/admin/login/:slug, #/employee/login/:slug, #/super-admin/login)
  if (hash.startsWith('#/')) {
    const hashPath = hash.slice(1).toLowerCase().replace(/\/+$/, '');

    if (hashPath === '/super-admin/login' || hashPath === '/superadmin/login' || hashPath === '/login') {
      return {
        isLoginRoute: true,
        portal: 'SUPER_ADMIN',
        organizationSlug: null,
        rawPath: hashPath
      };
    }

    const hashAdminMatch = hashPath.match(/^\/admin\/login\/([a-z0-9-_]+)/) || hashPath.match(/^\/admin\/([a-z0-9-_]+)\/login/);
    if (hashAdminMatch) {
      return {
        isLoginRoute: true,
        portal: 'ADMIN',
        organizationSlug: hashAdminMatch[1],
        rawPath: hashPath
      };
    }

    const hashEmpMatch = hashPath.match(/^\/employee\/login\/([a-z0-9-_]+)/) || hashPath.match(/^\/employee\/([a-z0-9-_]+)\/login/);
    if (hashEmpMatch) {
      return {
        isLoginRoute: true,
        portal: 'EMPLOYEE',
        organizationSlug: hashEmpMatch[1],
        rawPath: hashPath
      };
    }
  }

  // 3. Super Admin Direct Path
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

  // 4. Admin Direct Path (/admin/login/:slug)
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

  // 5. Employee Direct Path (/employee/login/:slug)
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

  return {
    isLoginRoute: false,
    portal: null,
    organizationSlug: null,
    rawPath: currentPath
  };
}

/**
 * Get active application origin (supports live base URL override via VITE_APP_URL)
 */
export function getAppOrigin(): string {
  const metaEnv = (typeof import.meta !== 'undefined' && import.meta.env) as any;
  const envAppUrl = (
    metaEnv?.VITE_APP_URL ||
    metaEnv?.VITE_PUBLIC_URL ||
    ''
  ).trim().replace(/\/+$/, '');

  if (envAppUrl) {
    return envAppUrl;
  }

  return typeof window !== 'undefined' ? window.location.origin : '';
}

/**
 * Universal Login URLs (Universal ?org= and ?portal= parameters to guarantee 100% 200 OK without 404 on Render/static hosts)
 */
export function getSuperAdminLoginUrl(): string {
  const origin = getAppOrigin();
  return `${origin}/?portal=super_admin`;
}

export function getAdminLoginUrl(orgSlug: string): string {
  const origin = getAppOrigin();
  return `${origin}/?org=${encodeURIComponent(orgSlug)}`;
}

export function getEmployeeLoginUrl(orgSlug: string): string {
  const origin = getAppOrigin();
  return `${origin}/?org=${encodeURIComponent(orgSlug)}&portal=employee`;
}

/**
 * Navigate cleanly to a new route updating both URL and dispatching popstate
 */
export function navigateTo(path: string, options?: { replace?: boolean }) {
  if (typeof window === 'undefined') return;

  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  let targetUrl = cleanPath;
  const adminMatch = cleanPath.match(/^\/admin\/login\/([a-z0-9-_]+)/);
  const empMatch = cleanPath.match(/^\/employee\/login\/([a-z0-9-_]+)/);
  const superMatch = cleanPath === '/super-admin/login' || cleanPath === '/superadmin/login';

  if (adminMatch) {
    targetUrl = `/?org=${encodeURIComponent(adminMatch[1])}`;
  } else if (empMatch) {
    targetUrl = `/?org=${encodeURIComponent(empMatch[1])}&portal=employee`;
  } else if (superMatch) {
    targetUrl = `/?portal=super_admin`;
  }

  if (options?.replace) {
    window.location.replace(targetUrl);
  } else {
    window.location.href = targetUrl;
  }

  window.dispatchEvent(new PopStateEvent('popstate'));
}
