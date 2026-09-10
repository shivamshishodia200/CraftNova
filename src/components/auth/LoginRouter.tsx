import React, { useState, useEffect } from 'react';
import { parseRoute, navigateTo, ParsedRoute } from '../../utils/routeUtils';
import { SuperAdminLogin } from './SuperAdminLogin';
import { AdminLogin } from './AdminLogin';
import { EmployeeLogin } from './EmployeeLogin';
import { UnifiedLogin } from './UnifiedLogin';
import { api } from '../../services/api';
import { OrganizationBranding, DEFAULT_PLATFORM_BRANDING } from '../../context/OrganizationContext';
import {
  Shield,
  Building2,
  Users,
  ArrowRight,
  Sparkles,
  Search,
  AlertCircle
} from 'lucide-react';

export const LoginRouter: React.FC = () => {
  const [route, setRoute] = useState<ParsedRoute>(() => parseRoute());
  const [clientBranding, setClientBranding] = useState<OrganizationBranding | null>(null);
  const [orgName, setOrgName] = useState<string>('');
  const [loadingBrand, setLoadingBrand] = useState<boolean>(false);
  const [brandError, setBrandError] = useState<string | null>(null);
  const [manualSlug, setManualSlug] = useState<string>('');

  // Listen for browser popstate events
  useEffect(() => {
    const handleLocationChange = () => {
      setRoute(parseRoute());
    };

    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  // Fetch public branding if an organization slug is present in route
  useEffect(() => {
    if (route.organizationSlug) {
      setLoadingBrand(true);
      setBrandError(null);

      // Persist last visited organization slug for logout redirect
      localStorage.setItem('craftmedia_last_org_slug', route.organizationSlug);
      if (route.portal) {
        localStorage.setItem('craftmedia_last_portal', route.portal);
      }

      // Check local cache first for 0ms render
      const cacheKey = `theme:${route.organizationSlug}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed.branding) {
            setClientBranding(parsed.branding);
            setOrgName(parsed.branding.companyName || route.organizationSlug);
          }
        } catch {}
      }

      // Fetch fresh branding from server
      api
        .get(`/public/organization-branding/${encodeURIComponent(route.organizationSlug)}`)
        .then(res => {
          if (res.success && res.data) {
            const b = res.data.branding || DEFAULT_PLATFORM_BRANDING;
            const name = res.data.organization?.name || res.data.name || b.companyName || route.organizationSlug;
            setClientBranding(b);
            setOrgName(name);

            // Update cache
            localStorage.setItem(
              cacheKey,
              JSON.stringify({
                branding: b,
                brandingVersion: b.brandingVersion || 1
              })
            );
          } else {
            setBrandError(res.message || `Client workspace '${route.organizationSlug}' not found.`);
          }
        })
        .catch(err => {
          setBrandError(`Unable to reach workspace server: ${err.message}`);
        })
        .finally(() => {
          setLoadingBrand(false);
        });
    } else {
      setClientBranding(null);
      setOrgName('');
      setLoadingBrand(false);
    }
  }, [route.organizationSlug]);

  // 1. SUPER ADMIN LOGIN
  if (route.portal === 'SUPER_ADMIN') {
    return <SuperAdminLogin />;
  }

  // 2. ADMIN LOGIN (with organization slug)
  if (route.portal === 'ADMIN' && route.organizationSlug) {
    if (loadingBrand && !clientBranding) {
      return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white font-sans">
          <div className="w-10 h-10 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-xs text-slate-400 font-medium tracking-wide">
            Resolving {route.organizationSlug} workspace branding...
          </p>
        </div>
      );
    }

    if (brandError) {
      return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-white font-sans">
          <div className="max-w-md w-full p-6 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Client Workspace Not Found</h3>
            <p className="text-xs text-slate-400">{brandError}</p>
            <div className="pt-2">
              <button
                onClick={() => navigateTo('/login')}
                className="px-4 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Back to Login
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <AdminLogin
        organizationSlug={route.organizationSlug}
        organizationName={orgName}
        branding={clientBranding || DEFAULT_PLATFORM_BRANDING}
      />
    );
  }

  // 3. EMPLOYEE LOGIN (with organization slug)
  if (route.portal === 'EMPLOYEE' && route.organizationSlug) {
    if (loadingBrand && !clientBranding) {
      return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white font-sans">
          <div className="w-10 h-10 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-xs text-slate-400 font-medium tracking-wide">
            Connecting to {route.organizationSlug} workstation...
          </p>
        </div>
      );
    }

    if (brandError) {
      return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-white font-sans">
          <div className="max-w-md w-full p-6 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Company Workspace Not Found</h3>
            <p className="text-xs text-slate-400">{brandError}</p>
            <div className="pt-2">
              <button
                onClick={() => navigateTo('/login')}
                className="px-4 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Back to Login
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <EmployeeLogin
        organizationSlug={route.organizationSlug}
        organizationName={orgName}
        branding={clientBranding || DEFAULT_PLATFORM_BRANDING}
      />
    );
  }

  // 4. DIRECT UNIFIED LOGIN (No workspace directory selector anywhere)
  return <UnifiedLogin />;
};
