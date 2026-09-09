import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { useAuth } from './AuthContext';

export interface OrganizationBranding {
  companyName: string;
  logoUrl?: string;
  logoDarkUrl?: string;
  faviconUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor?: string;
  surfaceColor?: string;
  sidebarBackground: string;
  sidebarTextColor?: string;
  sidebarActiveColor?: string;
  headerBackground?: string;
  headerTextColor?: string;
  successColor?: string;
  warningColor?: string;
  dangerColor?: string;
  loginBackgroundUrl?: string;
  loginTitle?: string;
  loginSubtitle?: string;
  footerText?: string;
  borderRadius?: string;
  themeMode: 'LIGHT' | 'DARK' | 'SYSTEM' | 'CUSTOM';
  brandingVersion?: number;
  loginGradientStart?: string;
  loginGradientEnd?: string;
}

export interface OrganizationFeatures {
  dashboard?: boolean;
  crm?: {
    leads?: boolean;
    customers?: boolean;
    followUps?: boolean;
  };
  sales?: {
    quotations?: boolean;
    salesOrders?: boolean;
    reports?: boolean;
  };
  inventory?: {
    products?: boolean;
    categories?: boolean;
    warehouses?: boolean;
    stockInOut?: boolean;
    purchases?: boolean;
    suppliers?: boolean;
  };
  accounts?: {
    invoices?: boolean;
    payments?: boolean;
    expenses?: boolean;
    creditNotes?: boolean;
    reports?: boolean;
  };
  hr?: {
    employees?: boolean;
    attendance?: boolean;
    liveTracking?: boolean;
    workRecording?: boolean;
    leave?: boolean;
    salary?: boolean;
    performance?: boolean;
  };
  marketing?: {
    campaigns?: boolean;
    tradeIndia?: boolean;
    whatsApp?: boolean;
    reports?: boolean;
  };
  integrations?: boolean;
  reports?: boolean;
  [key: string]: any;
}

export interface OrganizationInfo {
  id: string;
  _id?: string;
  name: string;
  slug: string;
  clientCode: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'TRIAL' | 'INACTIVE';
}

export const DEFAULT_PLATFORM_BRANDING: OrganizationBranding = {
  companyName: '360CRM Enterprise',
  logoUrl: '',
  logoDarkUrl: '',
  faviconUrl: '',
  primaryColor: '#F59E0B',
  secondaryColor: '#111827',
  accentColor: '#EA580C',
  backgroundColor: '#F8FAFC',
  surfaceColor: '#FFFFFF',
  sidebarBackground: '#080D1A',
  sidebarTextColor: '#94A3B8',
  sidebarActiveColor: '#F59E0B',
  headerBackground: '#FFFFFF',
  headerTextColor: '#0F172A',
  successColor: '#10B981',
  warningColor: '#F59E0B',
  dangerColor: '#EF4444',
  loginTitle: 'Welcome to Enterprise Workspace',
  loginSubtitle: 'Unified business platform for Sales, Inventory, Accounts & Telemetry',
  footerText: '360CRM Enterprise Suite • Secure Multi-Tenant Architecture',
  borderRadius: '12px',
  themeMode: 'LIGHT'
};

interface OrganizationContextType {
  organization: OrganizationInfo | null;
  branding: OrganizationBranding;
  features: OrganizationFeatures;
  isSuperAdmin: boolean;
  isLoading: boolean;
  previewOrg: OrganizationInfo | null;
  setPreviewOrg: (org: any | null) => void;
  refreshBootstrap: () => Promise<void>;
  canAccessFeature: (featurePath: string) => boolean;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

import { deriveThemeTokens } from '../utils/colorUtils';

/**
 * Injects dynamic CSS variables into document.documentElement based on the active client's branding
 */
export function applyBrandingToDOM(branding: OrganizationBranding, isSuperAdmin = false) {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  const tokens = deriveThemeTokens(branding);

  // Primary & Derived Variants
  root.style.setProperty('--brand-primary', tokens.brandPrimary);
  root.style.setProperty('--brand-primary-hover', tokens.brandPrimaryHover);
  root.style.setProperty('--brand-primary-light', tokens.brandPrimaryLight);
  root.style.setProperty('--brand-primary-soft', tokens.brandPrimarySoft);
  root.style.setProperty('--brand-primary-border', tokens.brandPrimaryBorder);

  // Secondary & Accent
  root.style.setProperty('--brand-secondary', tokens.brandSecondary);
  root.style.setProperty('--brand-accent', tokens.brandAccent);

  // Sidebar
  root.style.setProperty('--sidebar-bg', tokens.sidebarBg);
  root.style.setProperty('--sidebar-text', tokens.sidebarText);
  root.style.setProperty('--sidebar-muted', tokens.sidebarMuted);
  root.style.setProperty('--sidebar-active-bg', tokens.sidebarActiveBg);
  root.style.setProperty('--sidebar-active-text', tokens.sidebarActiveText);

  // Header
  root.style.setProperty('--header-bg', tokens.headerBg);
  root.style.setProperty('--header-text', tokens.headerText);

  // Surface & Page Background
  root.style.setProperty('--page-bg', tokens.pageBg);
  root.style.setProperty('--surface-bg', tokens.surfaceBg);
  root.style.setProperty('--surface-border', tokens.surfaceBorder);

  // Text Hierarchy
  root.style.setProperty('--text-primary', tokens.textPrimary);
  root.style.setProperty('--text-secondary', tokens.textSecondary);

  // Primary Button Tokens
  root.style.setProperty('--button-primary-bg', tokens.buttonPrimaryBg);
  root.style.setProperty('--button-primary-text', tokens.buttonPrimaryText);

  // Focus Ring & Border Radius
  root.style.setProperty('--focus-ring', tokens.focusRing);
  root.style.setProperty('--brand-radius', branding.borderRadius || '12px');

  // Semantic Status Colors (Fixed & Preserved)
  root.style.setProperty('--semantic-success', tokens.semanticSuccess);
  root.style.setProperty('--semantic-warning', tokens.semanticWarning);
  root.style.setProperty('--semantic-danger', tokens.semanticDanger);
  root.style.setProperty('--semantic-info', tokens.semanticInfo);

  // Dynamic Document Title
  if (isSuperAdmin) {
    document.title = '360CRM Enterprise | Super Admin';
  } else if (branding.companyName) {
    document.title = `${branding.companyName} | CRM`;
  } else {
    document.title = '360CRM Enterprise Suite';
  }

  // Dynamic Favicon
  if (branding.faviconUrl) {
    let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.getElementsByTagName('head')[0].appendChild(link);
    }
    link.href = branding.faviconUrl;
  }
}

export function resetThemeToPlatformDefault() {
  applyBrandingToDOM(DEFAULT_PLATFORM_BRANDING, false);
}

export const OrganizationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, token, user } = useAuth();
  const [organization, setOrganization] = useState<OrganizationInfo | null>(null);
  const [branding, setBranding] = useState<OrganizationBranding>(DEFAULT_PLATFORM_BRANDING);
  const [features, setFeatures] = useState<OrganizationFeatures>({});
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [previewOrg, setPreviewOrgState] = useState<OrganizationInfo | null>(() => {
    try {
      const saved = sessionStorage.getItem('craftmedia_preview_org');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const refreshBootstrap = useCallback(async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const res = await api.get('/app/bootstrap');
      if (res.success && res.data) {
        const { organization: org, branding: b, features: f, isSuperAdmin: isa } = res.data;

        // Check if there is an active previewOrg restored or in session
        let activePreview: any = null;
        try {
          const saved = sessionStorage.getItem('craftmedia_preview_org');
          if (saved) activePreview = JSON.parse(saved);
        } catch {}

        if (activePreview && activePreview.branding) {
          setOrganization(activePreview);
          setIsSuperAdmin(Boolean(isa));
          const previewBranding: OrganizationBranding = {
            ...DEFAULT_PLATFORM_BRANDING,
            ...activePreview.branding,
            companyName: activePreview.branding?.companyName || activePreview.name
          };
          setBranding(previewBranding);
          setFeatures(activePreview.features || {});
          applyBrandingToDOM(previewBranding, false);
          return;
        }

        setOrganization(org);
        setIsSuperAdmin(Boolean(isa));

        const effectiveBranding: OrganizationBranding = {
          ...DEFAULT_PLATFORM_BRANDING,
          ...(b || {})
        };
        setBranding(effectiveBranding);
        setFeatures(f || {});

        // Cache safe branding per tenant slug
        if (org?.slug) {
          const cacheKey = `theme:${org.slug}`;
          localStorage.setItem(
            cacheKey,
            JSON.stringify({
              branding: effectiveBranding,
              brandingVersion: effectiveBranding.brandingVersion || 1
            })
          );
        }

        // Apply dynamic CSS variables to DOM
        applyBrandingToDOM(effectiveBranding, Boolean(isa));
      }
    } catch (err) {
      console.error('[Tenant Bootstrap] Failed to fetch organization config:', err);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  // Refresh bootstrap whenever authentication status changes
  useEffect(() => {
    if (isAuthenticated) {
      refreshBootstrap();
    } else {
      try {
        sessionStorage.removeItem('craftmedia_preview_org');
      } catch {}
      setOrganization(null);
      setBranding(DEFAULT_PLATFORM_BRANDING);
      setFeatures({});
      setIsSuperAdmin(false);
      setPreviewOrgState(null);
      resetThemeToPlatformDefault();
      setIsLoading(false);
    }
  }, [isAuthenticated, refreshBootstrap]);

  // Set Super Admin Preview Org mode
  const setPreviewOrg = useCallback((org: any | null) => {
    setPreviewOrgState(org);
    if (org && org.branding) {
      try {
        sessionStorage.setItem('craftmedia_preview_org', JSON.stringify(org));
      } catch {}
      const previewBranding: OrganizationBranding = {
        ...DEFAULT_PLATFORM_BRANDING,
        ...org.branding,
        companyName: org.branding?.companyName || org.name
      };
      setOrganization(org);
      setBranding(previewBranding);
      setFeatures(org.features || {});
      applyBrandingToDOM(previewBranding, false);
    } else {
      try {
        sessionStorage.removeItem('craftmedia_preview_org');
      } catch {}
      // Revert to Super Admin platform default
      refreshBootstrap();
    }
  }, [refreshBootstrap]);

  // Feature permission helper
  const canAccessFeature = useCallback((featurePath: string): boolean => {
    if (isSuperAdmin && !previewOrg) return true;

    const parts = featurePath.split('.');
    let current: any = features;
    for (const part of parts) {
      if (current === undefined || current === null) return false;
      current = current[part];
    }

    return current !== false;
  }, [isSuperAdmin, previewOrg, features]);

  return (
    <OrganizationContext.Provider
      value={{
        organization,
        branding,
        features,
        isSuperAdmin,
        isLoading,
        previewOrg,
        setPreviewOrg,
        refreshBootstrap,
        canAccessFeature
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
};

export const useOrganization = () => {
  const ctx = useContext(OrganizationContext);
  if (!ctx) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return ctx;
};
