import React, { useState, useEffect, useRef } from 'react';
import { api } from '@/src/services/api';
import { useOrganization } from '@/src/context/OrganizationContext';
import { useAuth } from '@/src/context/AuthContext';
import { DynamicBrandLogo } from '@/src/components/common/DynamicBrandLogo';
import {
  Building2,
  Shield,
  Plus,
  Edit2,
  Search,
  Check,
  X,
  ExternalLink,
  RefreshCw,
  Eye,
  Palette,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Layers,
  Globe,
  Mail,
  Phone,
  Lock,
  UserCheck,
  Settings,
  Copy,
  CheckCheck,
  UploadCloud,
  Image as ImageIcon,
  Trash2,
  Link as LinkIcon
} from 'lucide-react';
import { getContrastRatio, getAccessibleTextColor, isContrastAccessible, deriveThemeTokens } from '@/src/utils/colorUtils';
import { getAdminLoginUrl, getEmployeeLoginUrl } from '@/src/utils/routeUtils';


interface Organization {
  _id?: string;
  id: string;
  name: string;
  slug: string;
  clientCode: string;
  contactEmail?: string;
  contactPhone?: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'TRIAL' | 'INACTIVE';
  branding: {
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
    loginTitle?: string;
    loginSubtitle?: string;
    footerText?: string;
    borderRadius?: string;
    themeMode: 'LIGHT' | 'DARK' | 'SYSTEM' | 'CUSTOM';
  };
  features: {
    dashboard?: boolean;
    crm?: { leads?: boolean; customers?: boolean; followUps?: boolean };
    sales?: { quotations?: boolean; salesOrders?: boolean; reports?: boolean };
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
  };
  createdAt?: string;
  userCount?: number;
}

const DEFAULT_THEMES = [
  {
    name: 'Craft Gold & Noir (Default)',
    primaryColor: '#F59E0B',
    secondaryColor: '#111827',
    accentColor: '#EA580C',
    sidebarBackground: '#080D1A',
    sidebarTextColor: '#94A3B8',
    sidebarActiveColor: '#F59E0B',
    headerBackground: '#FFFFFF',
    headerTextColor: '#0F172A',
    borderRadius: '12px'
  },
  {
    name: 'Royal Sapphire',
    primaryColor: '#2563EB',
    secondaryColor: '#0F172A',
    accentColor: '#06B6D4',
    sidebarBackground: '#0F172A',
    sidebarTextColor: '#94A3B8',
    sidebarActiveColor: '#38BDF8',
    headerBackground: '#FFFFFF',
    headerTextColor: '#0F172A',
    borderRadius: '10px'
  },
  {
    name: 'Emerald Enterprise',
    primaryColor: '#059669',
    secondaryColor: '#064E3B',
    accentColor: '#10B981',
    sidebarBackground: '#062C22',
    sidebarTextColor: '#A7F3D0',
    sidebarActiveColor: '#34D399',
    headerBackground: '#FFFFFF',
    headerTextColor: '#064E3B',
    borderRadius: '12px'
  },
  {
    name: 'Crimson Tech',
    primaryColor: '#E11D48',
    secondaryColor: '#18181B',
    accentColor: '#F43F5E',
    sidebarBackground: '#18181B',
    sidebarTextColor: '#A1A1AA',
    sidebarActiveColor: '#FB7185',
    headerBackground: '#FFFFFF',
    headerTextColor: '#18181B',
    borderRadius: '14px'
  },
  {
    name: 'Deep Amethyst',
    primaryColor: '#7C3AED',
    secondaryColor: '#1E1B4B',
    accentColor: '#A855F7',
    sidebarBackground: '#131127',
    sidebarTextColor: '#C4B5FD',
    sidebarActiveColor: '#C084FC',
    headerBackground: '#FFFFFF',
    headerTextColor: '#1E1B4B',
    borderRadius: '12px'
  }
];

export const OrganizationManagementView: React.FC = () => {
  const { setPreviewOrg } = useOrganization();
  const { setActivePortal } = useAuth();

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  // Wizard / Edit Modals
  const [isWizardOpen, setIsWizardOpen] = useState<boolean>(false);
  const [wizardStep, setWizardStep] = useState<number>(1);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    clientCode: '',
    slug: '',
    contactEmail: '',
    contactPhone: '',
    industry: 'Technology / Media',
    branding: {
      companyName: '',
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
      loginTitle: 'Sign In to Workspace',
      loginSubtitle: 'Unified Multi-Tenant CRM & Telemetry Suite',
      footerText: 'Secure Enterprise Cloud Infrastructure',
      borderRadius: '12px',
      themeMode: 'LIGHT' as 'LIGHT' | 'DARK' | 'SYSTEM' | 'CUSTOM'
    },
    features: {
      dashboard: true,
      crm: { leads: true, customers: true, followUps: true },
      sales: { quotations: true, salesOrders: true, reports: true },
      inventory: {
        products: true,
        categories: true,
        warehouses: true,
        stockInOut: true,
        purchases: true,
        suppliers: true
      },
      accounts: {
        invoices: true,
        payments: true,
        expenses: true,
        creditNotes: true,
        reports: true
      },
      hr: {
        employees: true,
        attendance: true,
        liveTracking: true,
        workRecording: true,
        leave: true,
        salary: true,
        performance: true
      },
      marketing: {
        campaigns: true,
        tradeIndia: true,
        whatsApp: true,
        reports: true
      },
      integrations: true,
      reports: true
    },
    initialAdmin: {
      name: '',
      email: '',
      password: '',
      phone: ''
    }
  });

  // Logo & Favicon Upload Refs and States
  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);
  const [uploadingLogo, setUploadingLogo] = useState<boolean>(false);
  const [uploadingFavicon, setUploadingFavicon] = useState<boolean>(false);
  const [showLogoUrlInput, setShowLogoUrlInput] = useState<boolean>(false);
  const [showFaviconUrlInput, setShowFaviconUrlInput] = useState<boolean>(false);
  const [activeMockupTab, setActiveMockupTab] = useState<'dashboard' | 'admin_login' | 'employee_login' | 'employee_desk'>('dashboard');
  const [copiedUrlType, setCopiedUrlType] = useState<'admin' | 'employee' | null>(null);
  const [createdOrgSuccess, setCreatedOrgSuccess] = useState<{
    orgName: string;
    slug: string;
    adminName?: string;
    adminEmail?: string;
    adminLoginUrl: string;
    employeeLoginUrl: string;
    palette: { primary: string; secondary: string; sidebar: string };
  } | null>(null);

  const processLogoFile = async (file: File) => {
    if (!file) return;

    // Instant local preview
    const localPreview = URL.createObjectURL(file);
    setFormData(prev => ({
      ...prev,
      branding: { ...prev.branding, logoUrl: localPreview }
    }));

    try {
      setUploadingLogo(true);
      const form = new FormData();
      form.append('file', file);
      form.append('type', 'logo');

      const res = await api.postFormData<any>('/superadmin/upload-asset', form);
      if (res.success && res.data?.url) {
        setFormData(prev => ({
          ...prev,
          branding: { ...prev.branding, logoUrl: res.data.url }
        }));
      }
    } catch (err: any) {
      console.error('Logo upload error:', err);
      // Fallback: convert to base64 data URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          branding: { ...prev.branding, logoUrl: reader.result as string }
        }));
      };
      reader.readAsDataURL(file);
    } finally {
      setUploadingLogo(false);
    }
  };

  const processFaviconFile = async (file: File) => {
    if (!file) return;

    const localPreview = URL.createObjectURL(file);
    setFormData(prev => ({
      ...prev,
      branding: { ...prev.branding, faviconUrl: localPreview }
    }));

    try {
      setUploadingFavicon(true);
      const form = new FormData();
      form.append('file', file);
      form.append('type', 'favicon');

      const res = await api.postFormData<any>('/superadmin/upload-asset', form);
      if (res.success && res.data?.url) {
        setFormData(prev => ({
          ...prev,
          branding: { ...prev.branding, faviconUrl: res.data.url }
        }));
      }
    } catch (err: any) {
      console.error('Favicon upload error:', err);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          branding: { ...prev.branding, faviconUrl: reader.result as string }
        }));
      };
      reader.readAsDataURL(file);
    } finally {
      setUploadingFavicon(false);
    }
  };

  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processLogoFile(file);
  };

  const handleFaviconFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFaviconFile(file);
  };


  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await api.get('/superadmin/organizations');
      if (res.success && res.data) {
        setOrganizations(res.data);
      }
    } catch (err: any) {
      console.error('Failed to load organizations:', err);
      setErrorMsg(err.message || 'Error fetching client organizations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const openCreateWizard = () => {
    setIsEditing(false);
    setSelectedOrgId(null);
    setWizardStep(1);
    setErrorMsg(null);
    setFormData({
      name: '',
      clientCode: '',
      slug: '',
      contactEmail: '',
      contactPhone: '',
      industry: 'Technology / Media',
      branding: {
        companyName: '',
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
        loginTitle: 'Sign In to Workspace',
        loginSubtitle: 'Unified Multi-Tenant CRM & Telemetry Suite',
        footerText: 'Secure Enterprise Cloud Infrastructure',
        borderRadius: '12px',
        themeMode: 'LIGHT'
      },
      features: {
        dashboard: true,
        crm: { leads: true, customers: true, followUps: true },
        sales: { quotations: true, salesOrders: true, reports: true },
        inventory: {
          products: true,
          categories: true,
          warehouses: true,
          stockInOut: true,
          purchases: true,
          suppliers: true
        },
        accounts: {
          invoices: true,
          payments: true,
          expenses: true,
          creditNotes: true,
          reports: true
        },
        hr: {
          employees: true,
          attendance: true,
          liveTracking: true,
          workRecording: true,
          leave: true,
          salary: true,
          performance: true
        },
        marketing: {
          campaigns: true,
          tradeIndia: true,
          whatsApp: true,
          reports: true
        },
        integrations: true,
        reports: true
      },
      initialAdmin: {
        name: '',
        email: '',
        password: '',
        phone: ''
      }
    });
    setIsWizardOpen(true);
  };

  const openEditModal = (org: Organization) => {
    setIsEditing(true);
    setSelectedOrgId(org.id || org._id || '');
    setWizardStep(1);
    setErrorMsg(null);
    setFormData({
      name: org.name,
      clientCode: org.clientCode,
      slug: org.slug,
      contactEmail: org.contactEmail || '',
      contactPhone: org.contactPhone || '',
      industry: 'Technology / Media',
      branding: {
        companyName: org.branding?.companyName || org.name,
        logoUrl: org.branding?.logoUrl || '',
        logoDarkUrl: org.branding?.logoDarkUrl || '',
        faviconUrl: org.branding?.faviconUrl || '',
        primaryColor: org.branding?.primaryColor || '#F59E0B',
        secondaryColor: org.branding?.secondaryColor || '#111827',
        accentColor: org.branding?.accentColor || '#EA580C',
        backgroundColor: org.branding?.backgroundColor || '#F8FAFC',
        surfaceColor: org.branding?.surfaceColor || '#FFFFFF',
        sidebarBackground: org.branding?.sidebarBackground || '#080D1A',
        sidebarTextColor: org.branding?.sidebarTextColor || '#94A3B8',
        sidebarActiveColor: org.branding?.sidebarActiveColor || '#F59E0B',
        headerBackground: org.branding?.headerBackground || '#FFFFFF',
        headerTextColor: org.branding?.headerTextColor || '#0F172A',
        loginTitle: org.branding?.loginTitle || 'Sign In to Workspace',
        loginSubtitle: org.branding?.loginSubtitle || 'Unified Multi-Tenant CRM & Telemetry Suite',
        footerText: org.branding?.footerText || 'Secure Enterprise Cloud Infrastructure',
        borderRadius: org.branding?.borderRadius || '12px',
        themeMode: org.branding?.themeMode || 'LIGHT'
      },
      features: {
        dashboard: org.features?.dashboard ?? true,
        crm: {
          leads: org.features?.crm?.leads ?? true,
          customers: org.features?.crm?.customers ?? true,
          followUps: org.features?.crm?.followUps ?? true
        },
        sales: {
          quotations: org.features?.sales?.quotations ?? true,
          salesOrders: org.features?.sales?.salesOrders ?? true,
          reports: org.features?.sales?.reports ?? true
        },
        inventory: {
          products: org.features?.inventory?.products ?? true,
          categories: org.features?.inventory?.categories ?? true,
          warehouses: org.features?.inventory?.warehouses ?? true,
          stockInOut: org.features?.inventory?.stockInOut ?? true,
          purchases: org.features?.inventory?.purchases ?? true,
          suppliers: org.features?.inventory?.suppliers ?? true
        },
        accounts: {
          invoices: org.features?.accounts?.invoices ?? true,
          payments: org.features?.accounts?.payments ?? true,
          expenses: org.features?.accounts?.expenses ?? true,
          creditNotes: org.features?.accounts?.creditNotes ?? true,
          reports: org.features?.accounts?.reports ?? true
        },
        hr: {
          employees: org.features?.hr?.employees ?? true,
          attendance: org.features?.hr?.attendance ?? true,
          liveTracking: org.features?.hr?.liveTracking ?? true,
          workRecording: org.features?.hr?.workRecording ?? true,
          leave: org.features?.hr?.leave ?? true,
          salary: org.features?.hr?.salary ?? true,
          performance: org.features?.hr?.performance ?? true
        },
        marketing: {
          campaigns: org.features?.marketing?.campaigns ?? true,
          tradeIndia: org.features?.marketing?.tradeIndia ?? true,
          whatsApp: org.features?.marketing?.whatsApp ?? true,
          reports: org.features?.marketing?.reports ?? true
        },
        integrations: org.features?.integrations ?? true,
        reports: org.features?.reports ?? true
      },
      initialAdmin: {
        name: '',
        email: '',
        password: '',
        phone: ''
      }
    });
    setIsWizardOpen(true);
  };

  const handleToggleStatus = async (org: Organization) => {
    const isSuspended = org.status === 'SUSPENDED';
    const confirmText = isSuspended
      ? `Re-activate client "${org.name}"? Users will immediately regain access.`
      : `SUSPEND client "${org.name}"? All users under this client will be locked out immediately!`;

    if (!window.confirm(confirmText)) return;

    try {
      const res = await api.put(`/superadmin/organizations/${org.id || org._id}/status`, {
        status: isSuspended ? 'ACTIVE' : 'SUSPENDED'
      });
      if (res.success) {
        fetchOrganizations();
      }
    } catch (err: any) {
      alert(`Status update failed: ${err.message || 'Unknown error'}`);
    }
  };

  const handlePreviewWorkspace = (org: Organization) => {
    setPreviewOrg(org);
    setActivePortal('admin');
  };

  const handleApplyThemePreset = (preset: typeof DEFAULT_THEMES[0]) => {
    setFormData(prev => ({
      ...prev,
      branding: {
        ...prev.branding,
        primaryColor: preset.primaryColor,
        secondaryColor: preset.secondaryColor,
        accentColor: preset.accentColor,
        sidebarBackground: preset.sidebarBackground,
        sidebarTextColor: preset.sidebarTextColor,
        sidebarActiveColor: preset.sidebarActiveColor,
        headerBackground: preset.headerBackground,
        headerTextColor: preset.headerTextColor,
        borderRadius: preset.borderRadius
      }
    }));
  };

  const handleFormSubmit = async () => {
    try {
      setSaving(true);
      setErrorMsg(null);

      // Validate
      if (!formData.name.trim()) {
        setErrorMsg('Organization name is required');
        setWizardStep(1);
        return;
      }
      if (!formData.slug.trim()) {
        setErrorMsg('Client slug is required');
        setWizardStep(1);
        return;
      }

      if (!isEditing && formData.initialAdmin.email) {
        if (!formData.initialAdmin.password || formData.initialAdmin.password.length < 6) {
          setErrorMsg('Initial Admin password must be at least 6 characters');
          setWizardStep(5);
          return;
        }
      }

      if (isEditing && selectedOrgId) {
        // Update
        const payload = {
          name: formData.name,
          contactEmail: formData.contactEmail,
          contactPhone: formData.contactPhone,
          branding: {
            ...formData.branding,
            companyName: formData.branding.companyName || formData.name
          },
          features: formData.features
        };
        const res = await api.put(`/superadmin/organizations/${selectedOrgId}`, payload);
        if (res.success) {
          setIsWizardOpen(false);
          fetchOrganizations();
        } else {
          setErrorMsg(res.message || 'Failed to update organization');
        }
      } else {
        // Create
        const payload = {
          name: formData.name,
          clientCode: formData.clientCode,
          slug: formData.slug,
          contactEmail: formData.contactEmail,
          contactPhone: formData.contactPhone,
          branding: {
            ...formData.branding,
            companyName: formData.branding.companyName || formData.name
          },
          features: formData.features,
          initialAdmin: formData.initialAdmin.email ? formData.initialAdmin : undefined
        };
        const res = await api.post('/superadmin/organizations', payload);
        if (res.success) {
          setIsWizardOpen(false);
          fetchOrganizations();
          const createdOrg = res.data;
          const slug = createdOrg?.slug || formData.slug;
          setCreatedOrgSuccess({
            orgName: createdOrg?.name || formData.name,
            slug: slug,
            adminName: formData.initialAdmin.name || undefined,
            adminEmail: formData.initialAdmin.email || undefined,
            adminLoginUrl: getAdminLoginUrl(slug),
            employeeLoginUrl: getEmployeeLoginUrl(slug),
            palette: {
              primary: formData.branding.primaryColor,
              secondary: formData.branding.secondaryColor,
              sidebar: formData.branding.sidebarBackground
            }
          });
        } else {
          setErrorMsg(res.message || 'Failed to create organization');
        }
      }
    } catch (err: any) {
      console.error('Error saving organization:', err);
      setErrorMsg(err.message || 'An error occurred while saving.');
    } finally {
      setSaving(false);
    }
  };

  // Filtered organizations
  const filteredOrgs = organizations.filter(org => {
    const matchesSearch =
      org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      org.clientCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      org.slug.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || org.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const activeCount = organizations.filter(o => o.status === 'ACTIVE').length;
  const suspendedCount = organizations.filter(o => o.status === 'SUSPENDED').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Header & Metrics */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-gradient-to-tr from-amber-500 to-orange-600 rounded-xl text-white shadow-lg shadow-orange-500/20">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-tight">
                Client Organizations & White-Label Management
              </h2>
              <p className="text-xs text-slate-400">
                Single-codebase multi-tenant architecture. Manage branding, color palettes, module feature flags and tenant isolation.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchOrganizations}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700 transition-all shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={openCreateWizard}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 via-orange-600 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Create Client Organization</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700/80 shadow-md">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Client Tenants</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{organizations.length}</span>
            <span className="text-xs text-amber-400 font-semibold">Single Codebase</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Multi-tenant isolation active</p>
        </div>

        <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700/80 shadow-md">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Organizations</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-400">{activeCount}</span>
            <span className="text-xs text-emerald-400/80 font-medium">Serving traffic</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Full feature inheritance</p>
        </div>

        <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700/80 shadow-md">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Suspended Clients</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-rose-400">{suspendedCount}</span>
            <span className="text-xs text-rose-400/80 font-medium">Access blocked</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Instant 403 enforcement</p>
        </div>

        <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700/80 shadow-md">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Dynamic CSS Theming</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-300">100%</span>
            <span className="text-xs text-amber-400/80 font-medium">No rebuild required</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Realtime variable injection</p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/70">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, code or slug..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-900/80 text-white text-xs rounded-lg border border-slate-700 focus:outline-none focus:border-amber-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-slate-400 font-medium whitespace-nowrap">Status:</span>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-900 text-xs text-slate-200 rounded-lg border border-slate-700 focus:outline-none focus:border-amber-500"
          >
            <option value="ALL">All Clients</option>
            <option value="ACTIVE">Active Only</option>
            <option value="SUSPENDED">Suspended Only</option>
          </select>
        </div>
      </div>

      {/* Clients Cards Grid */}
      {loading ? (
        <div className="p-12 flex flex-col items-center justify-center text-slate-400 bg-slate-800/30 rounded-xl border border-slate-800">
          <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mb-3" />
          <p className="text-xs font-semibold">Loading client organizations...</p>
        </div>
      ) : filteredOrgs.length === 0 ? (
        <div className="p-12 text-center bg-slate-800/30 rounded-xl border border-slate-800">
          <Building2 className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-sm font-bold text-white">No client organizations found</p>
          <p className="text-xs text-slate-400 mt-1">Try adjusting your search criteria or create a new client.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredOrgs.map(org => {
            const isSuspended = org.status === 'SUSPENDED';
            const primaryColor = org.branding?.primaryColor || '#F59E0B';
            const sidebarBg = org.branding?.sidebarBackground || '#080D1A';
            const loginUrl = `${window.location.origin}/?org=${org.slug}`;

            return (
              <div
                key={org.id || org._id}
                className={`flex flex-col justify-between bg-slate-800/90 rounded-2xl border transition-all duration-200 overflow-hidden shadow-lg ${
                  isSuspended
                    ? 'border-rose-500/40 opacity-75'
                    : 'border-slate-700/80 hover:border-slate-600 hover:shadow-xl'
                }`}
              >
                {/* Card Header with Theme Preview Banner */}
                <div>
                  <div
                    className="h-2.5 w-full transition-all"
                    style={{
                      background: `linear-gradient(90deg, ${primaryColor} 0%, ${org.branding?.accentColor || '#EA580C'} 100%)`
                    }}
                  />

                  <div className="p-5">
                    {/* Top Row: Logo & Status Badge */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <DynamicBrandLogo
                          logoUrl={org.branding?.logoUrl}
                          companyName={org.branding?.companyName || org.name}
                          className="h-10"
                        />
                        <div>
                          <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                            {org.name}
                          </h3>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="px-1.5 py-0.5 rounded bg-slate-900 text-amber-400 text-[10px] font-mono font-bold tracking-wide border border-slate-700">
                              {org.clientCode}
                            </span>
                            <span className="text-[11px] text-slate-400 font-mono">
                              /{org.slug}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Status */}
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${
                          isSuspended
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        }`}
                      >
                        {org.status}
                      </span>
                    </div>

                    {/* Theme Palette Swatches */}
                    <div className="mt-4 pt-3.5 border-t border-slate-700/60">
                      <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
                        <span className="font-semibold">Brand Palette:</span>
                        <span className="font-mono text-[10px] text-slate-500">{primaryColor}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-5 h-5 rounded-md border border-white/20 shadow-sm"
                          style={{ backgroundColor: primaryColor }}
                          title={`Primary: ${primaryColor}`}
                        />
                        <div
                          className="w-5 h-5 rounded-md border border-white/20 shadow-sm"
                          style={{ backgroundColor: org.branding?.secondaryColor || '#111827' }}
                          title={`Secondary: ${org.branding?.secondaryColor}`}
                        />
                        <div
                          className="w-5 h-5 rounded-md border border-white/20 shadow-sm"
                          style={{ backgroundColor: org.branding?.accentColor || '#EA580C' }}
                          title={`Accent: ${org.branding?.accentColor}`}
                        />
                        <div
                          className="w-5 h-5 rounded-md border border-white/20 shadow-sm"
                          style={{ backgroundColor: sidebarBg }}
                          title={`Sidebar: ${sidebarBg}`}
                        />
                        <div
                          className="w-5 h-5 rounded-md border border-white/20 shadow-sm"
                          style={{ backgroundColor: org.branding?.headerBackground || '#FFFFFF' }}
                          title={`Header: ${org.branding?.headerBackground}`}
                        />
                      </div>
                    </div>

                    {/* Enabled Modules Badges */}
                    <div className="mt-3.5 pt-3 border-t border-slate-700/60">
                      <span className="text-[11px] font-semibold text-slate-400 block mb-1.5">
                        Enabled Modules:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {org.features?.crm?.leads !== false && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-500/10 text-blue-300 border border-blue-500/20 font-medium">
                            CRM
                          </span>
                        )}
                        {org.features?.sales?.quotations !== false && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-300 border border-amber-500/20 font-medium">
                            Sales
                          </span>
                        )}
                        {org.features?.inventory?.products !== false && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-medium">
                            Inventory
                          </span>
                        )}
                        {org.features?.accounts?.invoices !== false && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-medium">
                            Accounts
                          </span>
                        )}
                        {org.features?.hr?.employees !== false && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-500/10 text-purple-300 border border-purple-500/20 font-medium">
                            HR
                          </span>
                        )}
                        {org.features?.hr?.workRecording !== false && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-rose-500/10 text-rose-300 border border-rose-500/20 font-medium">
                            Recording
                          </span>
                        )}
                        {org.features?.marketing?.campaigns !== false && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-medium">
                            Marketing
                          </span>
                        )}
                      </div>
                    </div>

                    {/* White-Label Login URL */}
                    <div className="mt-3.5 pt-3 border-t border-slate-700/60 flex items-center justify-between text-[11px] text-slate-400">
                      <span className="truncate mr-2 font-mono text-[10px] text-slate-400">
                        ?org={org.slug}
                      </span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(loginUrl);
                          setCopiedSlug(org.slug);
                          setTimeout(() => setCopiedSlug(null), 2000);
                        }}
                        className="flex items-center gap-1 text-amber-400 hover:text-amber-300 font-semibold shrink-0"
                        title="Copy direct client login link"
                      >
                        {copiedSlug === org.slug ? (
                          <>
                            <CheckCheck className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400 text-[10px]">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span className="text-[10px]">Copy Link</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="px-4 py-3 bg-slate-900/60 border-t border-slate-700/70 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handlePreviewWorkspace(org)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-semibold rounded-lg border border-amber-500/30 transition-colors"
                    title="Preview workspace with this client's branding & feature matrix"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Preview</span>
                  </button>

                  <button
                    onClick={() => openEditModal(org)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Configure</span>
                  </button>

                  <button
                    onClick={() => handleToggleStatus(org)}
                    className={`p-1.5 rounded-lg border transition-colors ${
                      isSuspended
                        ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                        : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/30'
                    }`}
                    title={isSuspended ? 'Activate Client' : 'Suspend Client'}
                  >
                    {isSuspended ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ============================================================== */}
      {/* 7-STEP CREATE CLIENT / EDIT CLIENT WIZARD MODAL */}
      {/* ============================================================== */}
      {isWizardOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-tr from-amber-500 to-orange-600 rounded-lg text-white">
                  <Palette className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {isEditing ? `Edit Client: ${formData.name}` : 'Create Client Organization Wizard'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Step {wizardStep} of 6 • Single Codebase White-Label SaaS Architecture
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsWizardOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Stepper Navigation */}
            <div className="px-6 py-3 bg-slate-950/30 border-b border-slate-800 flex items-center justify-between overflow-x-auto text-xs">
              {[
                { step: 1, label: '1. Identity' },
                { step: 2, label: '2. Branding' },
                { step: 3, label: '3. Theme Builder' },
                { step: 4, label: '4. Feature Matrix' },
                { step: 5, label: '5. Admin User' },
                { step: 6, label: '6. Review & Save' }
              ].map(s => (
                <button
                  key={s.step}
                  onClick={() => setWizardStep(s.step)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-semibold transition-all whitespace-nowrap ${
                    wizardStep === s.step
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                      : wizardStep > s.step
                      ? 'text-amber-400 bg-amber-500/10'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>{s.label}</span>
                </button>
              ))}
            </div>

            {/* Modal Body */}
            <div className="flex-1 p-6 overflow-y-auto space-y-6">
              {errorMsg && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* STEP 1: ORGANIZATION PROFILE & IDENTITY */}
              {wizardStep === 1 && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider text-amber-400">
                    Step 1: Client Organization Details
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Company Name *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. DeliveryPlus Logistics"
                        value={formData.name}
                        onChange={e => {
                          const val = e.target.value;
                          setFormData(prev => ({
                            ...prev,
                            name: val,
                            branding: { ...prev.branding, companyName: val },
                            // auto-generate slug & code if empty
                            slug: prev.slug || val.toLowerCase().replace(/[^a-z0-9]/g, ''),
                            clientCode:
                              prev.clientCode ||
                              val
                                .split(' ')
                                .map(w => w[0])
                                .join('')
                                .toUpperCase()
                                .slice(0, 6)
                          }));
                        }}
                        className="w-full px-3 py-2 bg-slate-800 text-white text-xs rounded-xl border border-slate-700 focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Client Code (Unique Identifier) *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. DELIV"
                        value={formData.clientCode}
                        disabled={isEditing}
                        onChange={e =>
                          setFormData(prev => ({
                            ...prev,
                            clientCode: e.target.value.toUpperCase()
                          }))
                        }
                        className="w-full px-3 py-2 bg-slate-800 text-white text-xs rounded-xl border border-slate-700 focus:outline-none focus:border-amber-500 font-mono"
                      />
                      <span className="text-[10px] text-slate-500 mt-1 block">
                        Used for document numbers (e.g. INV-DELIV-001)
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Client Slug / Subdomain *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. deliveryplus"
                        value={formData.slug}
                        disabled={isEditing}
                        onChange={e =>
                          setFormData(prev => ({
                            ...prev,
                            slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')
                          }))
                        }
                        className="w-full px-3 py-2 bg-slate-800 text-white text-xs rounded-xl border border-slate-700 focus:outline-none focus:border-amber-500 font-mono"
                      />
                      <span className="text-[10px] text-slate-500 mt-1 block">
                        White-label access link: /?org={formData.slug || 'client'}
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Industry / Sector
                      </label>
                      <select
                        value={formData.industry}
                        onChange={e => setFormData(prev => ({ ...prev, industry: e.target.value }))}
                        className="w-full px-3 py-2 bg-slate-800 text-white text-xs rounded-xl border border-slate-700 focus:outline-none focus:border-amber-500"
                      >
                        <option>Technology / Media</option>
                        <option>Supply Chain & Logistics</option>
                        <option>Manufacturing & Industrial</option>
                        <option>Retail & E-Commerce</option>
                        <option>Real Estate & Construction</option>
                        <option>Healthcare & Pharma</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Contact Official Email
                      </label>
                      <input
                        type="email"
                        placeholder="admin@deliveryplus.com"
                        value={formData.contactEmail}
                        onChange={e => setFormData(prev => ({ ...prev, contactEmail: e.target.value }))}
                        className="w-full px-3 py-2 bg-slate-800 text-white text-xs rounded-xl border border-slate-700 focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Contact Phone Number
                      </label>
                      <input
                        type="text"
                        placeholder="+91 98765 43210"
                        value={formData.contactPhone}
                        onChange={e => setFormData(prev => ({ ...prev, contactPhone: e.target.value }))}
                        className="w-full px-3 py-2 bg-slate-800 text-white text-xs rounded-xl border border-slate-700 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: BRAND IDENTITY & LOGOS */}
              {wizardStep === 2 && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider text-amber-400">
                    Step 2: Brand Identity, Assets & Login Screen
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Brand Display Name
                      </label>
                      <input
                        type="text"
                        placeholder="Company display name"
                        value={formData.branding.companyName}
                        onChange={e =>
                          setFormData(prev => ({
                            ...prev,
                            branding: { ...prev.branding, companyName: e.target.value }
                          }))
                        }
                        className="w-full px-3 py-2 bg-slate-800 text-white text-xs rounded-xl border border-slate-700 focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    {/* Primary Logo Upload Dropzone */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-semibold text-slate-300">
                          Primary Brand Logo
                        </label>
                        <span className="text-[10px] text-amber-400 font-medium">
                          PNG, JPG, SVG, WebP
                        </span>
                      </div>

                      <input
                        type="file"
                        ref={logoInputRef}
                        accept="image/png,image/jpeg,image/svg+xml,image/webp,image/gif"
                        className="hidden"
                        onChange={handleLogoFileUpload}
                      />

                      {formData.branding.logoUrl ? (
                        <div className="p-3 bg-slate-800/90 rounded-xl border border-slate-700 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-14 h-14 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center p-1.5 overflow-hidden shrink-0">
                              <img
                                src={formData.branding.logoUrl}
                                alt="Logo Preview"
                                className="max-h-full max-w-full object-contain"
                              />
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-white truncate flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                <span>Logo Image Ready</span>
                              </div>
                              <span className="text-[10px] text-slate-400 block truncate">
                                {uploadingLogo ? 'Uploading to cloud...' : 'Active on Header & Login'}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => logoInputRef.current?.click()}
                              disabled={uploadingLogo}
                              className="px-2.5 py-1 text-[11px] font-medium bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg border border-slate-600 transition-colors"
                            >
                              Change
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setFormData(prev => ({
                                  ...prev,
                                  branding: { ...prev.branding, logoUrl: '' }
                                }))
                              }
                              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                              title="Remove logo"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          onClick={() => logoInputRef.current?.click()}
                          onDragOver={e => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          onDrop={e => {
                            e.preventDefault();
                            e.stopPropagation();
                            const file = e.dataTransfer.files?.[0];
                            if (file) processLogoFile(file);
                          }}
                          className="border-2 border-dashed border-slate-700 hover:border-amber-500/80 bg-slate-800/40 hover:bg-slate-800/70 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all duration-200 group text-center"
                        >
                          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform mb-2">
                            {uploadingLogo ? (
                              <RefreshCw className="w-5 h-5 animate-spin" />
                            ) : (
                              <UploadCloud className="w-5 h-5" />
                            )}
                          </div>
                          <p className="text-xs font-semibold text-slate-200 group-hover:text-amber-400 transition-colors">
                            {uploadingLogo ? 'Uploading logo...' : 'Click to upload Logo or drag & drop'}
                          </p>
                          <span className="text-[10px] text-slate-400 mt-0.5">
                            PNG, JPG, SVG, WebP up to 5MB
                          </span>
                        </div>
                      )}

                      <div className="pt-0.5">
                        <button
                          type="button"
                          onClick={() => setShowLogoUrlInput(!showLogoUrlInput)}
                          className="text-[11px] text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1 transition-colors"
                        >
                          <LinkIcon className="w-3 h-3" />
                          {showLogoUrlInput ? 'Hide URL input' : 'Or paste direct logo image URL'}
                        </button>
                        {showLogoUrlInput && (
                          <input
                            type="text"
                            placeholder="https://.../logo.png"
                            value={formData.branding.logoUrl}
                            onChange={e =>
                              setFormData(prev => ({
                                ...prev,
                                branding: { ...prev.branding, logoUrl: e.target.value }
                              }))
                            }
                            className="w-full mt-1.5 px-3 py-2 bg-slate-800 text-white text-xs rounded-xl border border-slate-700 focus:outline-none focus:border-amber-500"
                          />
                        )}
                      </div>
                    </div>

                    {/* Favicon Upload Dropzone */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-semibold text-slate-300">
                          Favicon (.ico or .png)
                        </label>
                        <span className="text-[10px] text-slate-400">
                          32×32 or 64×64 px
                        </span>
                      </div>

                      <input
                        type="file"
                        ref={faviconInputRef}
                        accept="image/x-icon,image/vnd.microsoft.icon,image/png,image/svg+xml"
                        className="hidden"
                        onChange={handleFaviconFileUpload}
                      />

                      {formData.branding.faviconUrl ? (
                        <div className="p-3 bg-slate-800/90 rounded-xl border border-slate-700 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center p-1 overflow-hidden shrink-0">
                              <img
                                src={formData.branding.faviconUrl}
                                alt="Favicon"
                                className="w-6 h-6 object-contain"
                              />
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-white truncate flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                <span>Favicon Active</span>
                              </div>
                              <span className="text-[10px] text-slate-400 block truncate">
                                {uploadingFavicon ? 'Uploading...' : 'Browser tab icon'}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => faviconInputRef.current?.click()}
                              disabled={uploadingFavicon}
                              className="px-2.5 py-1 text-[11px] font-medium bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg border border-slate-600 transition-colors"
                            >
                              Change
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setFormData(prev => ({
                                  ...prev,
                                  branding: { ...prev.branding, faviconUrl: '' }
                                }))
                              }
                              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                              title="Remove favicon"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          onClick={() => faviconInputRef.current?.click()}
                          onDragOver={e => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          onDrop={e => {
                            e.preventDefault();
                            e.stopPropagation();
                            const file = e.dataTransfer.files?.[0];
                            if (file) processFaviconFile(file);
                          }}
                          className="border-2 border-dashed border-slate-700 hover:border-amber-500/80 bg-slate-800/40 hover:bg-slate-800/70 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all duration-200 group text-center"
                        >
                          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-105 transition-transform mb-2">
                            {uploadingFavicon ? (
                              <RefreshCw className="w-5 h-5 animate-spin" />
                            ) : (
                              <ImageIcon className="w-5 h-5" />
                            )}
                          </div>
                          <p className="text-xs font-semibold text-slate-200 group-hover:text-blue-400 transition-colors">
                            {uploadingFavicon ? 'Uploading favicon...' : 'Click to upload Favicon'}
                          </p>
                          <span className="text-[10px] text-slate-400 mt-0.5">
                            .ico or .png recommended
                          </span>
                        </div>
                      )}

                      <div className="pt-0.5">
                        <button
                          type="button"
                          onClick={() => setShowFaviconUrlInput(!showFaviconUrlInput)}
                          className="text-[11px] text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1 transition-colors"
                        >
                          <LinkIcon className="w-3 h-3" />
                          {showFaviconUrlInput ? 'Hide URL input' : 'Or paste direct favicon URL'}
                        </button>
                        {showFaviconUrlInput && (
                          <input
                            type="text"
                            placeholder="https://.../favicon.ico"
                            value={formData.branding.faviconUrl}
                            onChange={e =>
                              setFormData(prev => ({
                                ...prev,
                                branding: { ...prev.branding, faviconUrl: e.target.value }
                              }))
                            }
                            className="w-full mt-1.5 px-3 py-2 bg-slate-800 text-white text-xs rounded-xl border border-slate-700 focus:outline-none focus:border-amber-500"
                          />
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Login Page Title
                      </label>
                      <input
                        type="text"
                        placeholder="Welcome to DeliveryPlus Enterprise Portal"
                        value={formData.branding.loginTitle}
                        onChange={e =>
                          setFormData(prev => ({
                            ...prev,
                            branding: { ...prev.branding, loginTitle: e.target.value }
                          }))
                        }
                        className="w-full px-3 py-2 bg-slate-800 text-white text-xs rounded-xl border border-slate-700 focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Login Page Subtitle
                      </label>
                      <input
                        type="text"
                        placeholder="Sign in with your verified company credentials"
                        value={formData.branding.loginSubtitle}
                        onChange={e =>
                          setFormData(prev => ({
                            ...prev,
                            branding: { ...prev.branding, loginSubtitle: e.target.value }
                          }))
                        }
                        className="w-full px-3 py-2 bg-slate-800 text-white text-xs rounded-xl border border-slate-700 focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Custom Footer Text
                      </label>
                      <input
                        type="text"
                        placeholder="DeliveryPlus Logistics Suite • Powered by 360CRM Enterprise"
                        value={formData.branding.footerText}
                        onChange={e =>
                          setFormData(prev => ({
                            ...prev,
                            branding: { ...prev.branding, footerText: e.target.value }
                          }))
                        }
                        className="w-full px-3 py-2 bg-slate-800 text-white text-xs rounded-xl border border-slate-700 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  {/* Logo Preview */}
                  <div className="mt-4 p-4 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-slate-400 block mb-1">
                        Brand Logo Live Preview:
                      </span>
                      <p className="text-[11px] text-slate-500">
                        {formData.branding.logoUrl
                          ? 'Using custom uploaded logo image'
                          : 'Using auto-generated SVG emblem with company initials'}
                      </p>
                    </div>
                    <DynamicBrandLogo
                      logoUrl={formData.branding.logoUrl}
                      companyName={formData.branding.companyName || formData.name || 'Client Logo'}
                      className="h-10"
                    />
                  </div>
                </div>
              )}

              {/* STEP 3: LIVE THEME & COLOR PALETTE BUILDER */}
              {wizardStep === 3 && (
                <div className="space-y-5 animate-in fade-in duration-150">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <h4 className="text-sm font-bold text-white uppercase tracking-wider text-amber-400">
                      Step 3: Live Theme & CSS Variable Builder
                    </h4>
                    <span className="text-xs text-slate-400">
                      Changes immediately previewed on the right canvas
                    </span>
                  </div>

                  {/* Theme Presets */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-2">
                      Quick Theme Presets:
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                      {DEFAULT_THEMES.map(preset => (
                        <button
                          key={preset.name}
                          type="button"
                          onClick={() => handleApplyThemePreset(preset)}
                          className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 text-left transition-all hover:scale-[1.02]"
                        >
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <span
                              className="w-3.5 h-3.5 rounded-full"
                              style={{ backgroundColor: preset.primaryColor }}
                            />
                            <span
                              className="w-3.5 h-3.5 rounded-full"
                              style={{ backgroundColor: preset.sidebarBackground }}
                            />
                            <span
                              className="w-3.5 h-3.5 rounded-full"
                              style={{ backgroundColor: preset.accentColor }}
                            />
                          </div>
                          <span className="text-[10px] font-bold text-slate-200 block truncate">
                            {preset.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Two-Column: Color Controls + Real-Time Live Preview Canvas */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                    {/* Left: Color Inputs */}
                    <div className="lg:col-span-6 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                            Primary Color
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={formData.branding.primaryColor}
                              onChange={e =>
                                setFormData(prev => ({
                                  ...prev,
                                  branding: { ...prev.branding, primaryColor: e.target.value }
                                }))
                              }
                              className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                            />
                            <input
                              type="text"
                              value={formData.branding.primaryColor}
                              onChange={e =>
                                setFormData(prev => ({
                                  ...prev,
                                  branding: { ...prev.branding, primaryColor: e.target.value }
                                }))
                              }
                              className="w-full px-2 py-1 bg-slate-800 text-white text-xs font-mono rounded-lg border border-slate-700"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                            Accent Color
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={formData.branding.accentColor}
                              onChange={e =>
                                setFormData(prev => ({
                                  ...prev,
                                  branding: { ...prev.branding, accentColor: e.target.value }
                                }))
                              }
                              className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                            />
                            <input
                              type="text"
                              value={formData.branding.accentColor}
                              onChange={e =>
                                setFormData(prev => ({
                                  ...prev,
                                  branding: { ...prev.branding, accentColor: e.target.value }
                                }))
                              }
                              className="w-full px-2 py-1 bg-slate-800 text-white text-xs font-mono rounded-lg border border-slate-700"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                            Sidebar Background
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={formData.branding.sidebarBackground}
                              onChange={e =>
                                setFormData(prev => ({
                                  ...prev,
                                  branding: { ...prev.branding, sidebarBackground: e.target.value }
                                }))
                              }
                              className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                            />
                            <input
                              type="text"
                              value={formData.branding.sidebarBackground}
                              onChange={e =>
                                setFormData(prev => ({
                                  ...prev,
                                  branding: { ...prev.branding, sidebarBackground: e.target.value }
                                }))
                              }
                              className="w-full px-2 py-1 bg-slate-800 text-white text-xs font-mono rounded-lg border border-slate-700"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                            Sidebar Active Color
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={formData.branding.sidebarActiveColor || formData.branding.primaryColor}
                              onChange={e =>
                                setFormData(prev => ({
                                  ...prev,
                                  branding: { ...prev.branding, sidebarActiveColor: e.target.value }
                                }))
                              }
                              className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                            />
                            <input
                              type="text"
                              value={formData.branding.sidebarActiveColor || formData.branding.primaryColor}
                              onChange={e =>
                                setFormData(prev => ({
                                  ...prev,
                                  branding: { ...prev.branding, sidebarActiveColor: e.target.value }
                                }))
                              }
                              className="w-full px-2 py-1 bg-slate-800 text-white text-xs font-mono rounded-lg border border-slate-700"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                            Header Background
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={formData.branding.headerBackground || '#FFFFFF'}
                              onChange={e =>
                                setFormData(prev => ({
                                  ...prev,
                                  branding: { ...prev.branding, headerBackground: e.target.value }
                                }))
                              }
                              className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                            />
                            <input
                              type="text"
                              value={formData.branding.headerBackground || '#FFFFFF'}
                              onChange={e =>
                                setFormData(prev => ({
                                  ...prev,
                                  branding: { ...prev.branding, headerBackground: e.target.value }
                                }))
                              }
                              className="w-full px-2 py-1 bg-slate-800 text-white text-xs font-mono rounded-lg border border-slate-700"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                            Border Radius
                          </label>
                          <select
                            value={formData.branding.borderRadius || '12px'}
                            onChange={e =>
                              setFormData(prev => ({
                                ...prev,
                                branding: { ...prev.branding, borderRadius: e.target.value }
                              }))
                            }
                            className="w-full px-2 py-1.5 bg-slate-800 text-white text-xs rounded-lg border border-slate-700 focus:outline-none"
                          >
                            <option value="6px">Subtle (6px)</option>
                            <option value="10px">Clean (10px)</option>
                            <option value="12px">Modern (12px)</option>
                            <option value="16px">Curved (16px)</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Right: Real-Time Interactive Multi-Preview Canvas */}
                    <div className="lg:col-span-6 bg-slate-950 p-4 rounded-xl border border-slate-800 shadow-inner flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Live Canvas Preview
                          </span>
                          <span className="text-[10px] font-mono text-slate-500">
                            Auto-syncing
                          </span>
                        </div>

                        {/* Contrast Warning Banner */}
                        {(() => {
                          const contrast = getContrastRatio(formData.branding.primaryColor, '#FFFFFF');
                          const accessible = isContrastAccessible(formData.branding.primaryColor, '#FFFFFF');
                          if (!accessible) {
                            return (
                              <div className="mb-3 p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center gap-2 text-amber-300 text-[11px]">
                                <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                                <span>Contrast warning ({contrast.toFixed(1)}:1). Primary text will automatically invert to dark slate for readability.</span>
                              </div>
                            );
                          }
                          return null;
                        })()}

                        {/* Preview Mode Switcher Tabs */}
                        <div className="flex items-center gap-1 p-1 bg-slate-900 rounded-lg border border-slate-800 mb-3 overflow-x-auto">
                          <button
                            type="button"
                            onClick={() => setActiveMockupTab('dashboard')}
                            className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all whitespace-nowrap ${
                              activeMockupTab === 'dashboard'
                                ? 'bg-amber-500 text-slate-950 shadow-xs'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            Admin Dashboard
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveMockupTab('admin_login')}
                            className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all whitespace-nowrap ${
                              activeMockupTab === 'admin_login'
                                ? 'bg-amber-500 text-slate-950 shadow-xs'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            Admin Login
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveMockupTab('employee_login')}
                            className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all whitespace-nowrap ${
                              activeMockupTab === 'employee_login'
                                ? 'bg-amber-500 text-slate-950 shadow-xs'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            Employee Login
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveMockupTab('employee_desk')}
                            className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all whitespace-nowrap ${
                              activeMockupTab === 'employee_desk'
                                ? 'bg-amber-500 text-slate-950 shadow-xs'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            Employee Desk
                          </button>
                        </div>
                      </div>

                      {/* Dynamic Preview Container */}
                      <div
                        className="rounded-xl overflow-hidden border border-slate-700 shadow-md h-64 text-xs relative bg-slate-900"
                        style={{
                          borderRadius: formData.branding.borderRadius || '12px'
                        }}
                      >
                        {/* TAB 1: ADMIN DASHBOARD */}
                        {activeMockupTab === 'dashboard' && (
                          <div className="flex h-full">
                            {/* Mini Sidebar */}
                            <div
                              className="w-36 p-3 flex flex-col justify-between shrink-0"
                              style={{
                                backgroundColor: formData.branding.sidebarBackground,
                                color: formData.branding.sidebarTextColor || '#94A3B8'
                              }}
                            >
                              <div>
                                <div className="flex items-center gap-1.5 pb-2 mb-2 border-b border-white/10">
                                  {formData.branding.logoUrl ? (
                                    <img src={formData.branding.logoUrl} alt="Logo" className="w-4 h-4 object-contain rounded" />
                                  ) : (
                                    <span
                                      className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white shadow-xs shrink-0"
                                      style={{ backgroundColor: formData.branding.primaryColor }}
                                    >
                                      {formData.clientCode ? formData.clientCode[0] : 'C'}
                                    </span>
                                  )}
                                  <span className="text-[11px] font-black text-white truncate">
                                    {formData.branding.companyName || formData.name || 'Client'}
                                  </span>
                                </div>

                                <div className="space-y-1">
                                  <div
                                    className="px-2 py-1 rounded text-[10px] font-bold shadow-xs flex items-center justify-between"
                                    style={{
                                      backgroundColor: formData.branding.sidebarActiveColor || formData.branding.primaryColor,
                                      color: getAccessibleTextColor(formData.branding.sidebarActiveColor || formData.branding.primaryColor)
                                    }}
                                  >
                                    <span>Dashboard</span>
                                    <Check className="w-3 h-3" />
                                  </div>
                                  <div className="px-2 py-1 rounded text-[10px] opacity-70">Leads</div>
                                  <div className="px-2 py-1 rounded text-[10px] opacity-70">Inventory</div>
                                  <div className="px-2 py-1 rounded text-[10px] opacity-70">Sessions</div>
                                </div>
                              </div>

                              <div className="text-[9px] opacity-50 truncate">
                                {formData.clientCode || 'ORG'} v1.0
                              </div>
                            </div>

                            {/* Mini Content Area */}
                            <div className="flex-1 bg-slate-100 flex flex-col">
                              {/* Mini Header */}
                              <div
                                className="px-3 py-2 border-b border-slate-200 flex items-center justify-between"
                                style={{
                                  backgroundColor: formData.branding.headerBackground || '#FFFFFF',
                                  color: formData.branding.headerTextColor || '#0F172A'
                                }}
                              >
                                <span className="font-bold text-[11px]">Workspace Overview</span>
                                <span
                                  className="px-2 py-0.5 rounded text-[9px] font-bold shadow-xs"
                                  style={{
                                    backgroundColor: formData.branding.primaryColor,
                                    color: getAccessibleTextColor(formData.branding.primaryColor)
                                  }}
                                >
                                  Active
                                </span>
                              </div>

                              {/* Mini Body */}
                              <div className="p-3 space-y-2 flex-1 overflow-hidden">
                                <div className="bg-white p-2 rounded-lg shadow-2xs border border-slate-200">
                                  <span className="text-[9px] text-slate-500 font-semibold block">
                                    Today's Telemetry
                                  </span>
                                  <div className="flex items-baseline gap-1 mt-0.5">
                                    <span className="text-sm font-black text-slate-800">1,482</span>
                                    <span
                                      className="text-[9px] font-bold"
                                      style={{ color: formData.branding.accentColor }}
                                    >
                                      +12%
                                    </span>
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  className="w-full py-1 text-center font-bold text-[10px] rounded-lg shadow-sm transition-opacity hover:opacity-90"
                                  style={{
                                    backgroundColor: formData.branding.primaryColor,
                                    color: getAccessibleTextColor(formData.branding.primaryColor),
                                    borderRadius: formData.branding.borderRadius || '8px'
                                  }}
                                >
                                  Execute Action
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* TAB 2: ADMIN LOGIN (Split Screen) */}
                        {activeMockupTab === 'admin_login' && (
                          <div className="flex h-full">
                            {/* Left Brand Panel */}
                            <div
                              className="w-1/2 p-3 text-white flex flex-col justify-between"
                              style={{
                                background: `linear-gradient(135deg, ${formData.branding.secondaryColor} 0%, #0B1220 100%)`
                              }}
                            >
                              <div className="space-y-1">
                                <span
                                  className="inline-block px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider"
                                  style={{ backgroundColor: formData.branding.primaryColor, color: getAccessibleTextColor(formData.branding.primaryColor) }}
                                >
                                  Admin Portal
                                </span>
                                <p className="text-[11px] font-bold truncate">
                                  {formData.branding.companyName || formData.name || 'Organization'}
                                </p>
                              </div>
                              <div className="text-[8px] text-slate-400">
                                Single Sign-On Enabled
                              </div>
                            </div>

                            {/* Right Sign-in Form */}
                            <div className="w-1/2 bg-white p-3 flex flex-col justify-center space-y-2">
                              <span className="text-[10px] font-bold text-slate-800">Administrator Sign In</span>
                              <div className="h-4 bg-slate-100 rounded border border-slate-200 px-1.5 flex items-center text-[8px] text-slate-400">
                                admin@{formData.slug || 'org'}.com
                              </div>
                              <div className="h-4 bg-slate-100 rounded border border-slate-200 px-1.5 flex items-center text-[8px] text-slate-400">
                                ••••••••
                              </div>
                              <button
                                type="button"
                                className="w-full py-1 text-[9px] font-bold rounded shadow-xs"
                                style={{
                                  backgroundColor: formData.branding.primaryColor,
                                  color: getAccessibleTextColor(formData.branding.primaryColor)
                                }}
                              >
                                Sign In
                              </button>
                            </div>
                          </div>
                        )}

                        {/* TAB 3: EMPLOYEE LOGIN (Centered Card with Workday Focus) */}
                        {activeMockupTab === 'employee_login' && (
                          <div className="h-full bg-slate-900 p-3 flex items-center justify-center">
                            <div className="w-48 bg-slate-800/90 border border-slate-700 p-3 rounded-lg text-center space-y-2 shadow-lg">
                              <div className="flex items-center justify-between">
                                <span className="text-[8px] text-slate-400 font-medium">Today: Mon, Sep 5</span>
                                <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[7px] font-bold rounded-full">
                                  Clock-In Ready
                                </span>
                              </div>
                              <div className="text-[10px] font-bold text-white truncate">
                                {formData.branding.companyName || formData.name || 'Organization'}
                              </div>
                              <div className="h-4 bg-slate-900 rounded border border-slate-700 px-1.5 flex items-center text-[8px] text-slate-400">
                                EMP-0102 / Email
                              </div>
                              <button
                                type="button"
                                className="w-full py-1 text-[9px] font-bold rounded shadow-xs"
                                style={{
                                  backgroundColor: formData.branding.primaryColor,
                                  color: getAccessibleTextColor(formData.branding.primaryColor)
                                }}
                              >
                                Punch In & Start Day
                              </button>
                            </div>
                          </div>
                        )}

                        {/* TAB 4: EMPLOYEE DESK */}
                        {activeMockupTab === 'employee_desk' && (
                          <div className="h-full bg-slate-900 p-3 flex flex-col justify-between">
                            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                              <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[10px] font-bold text-white">Active Shift (03:45:12)</span>
                              </div>
                              <span
                                className="text-[8px] font-black px-1.5 py-0.5 rounded"
                                style={{ backgroundColor: formData.branding.primaryColor, color: getAccessibleTextColor(formData.branding.primaryColor) }}
                              >
                                Screen + Mic On
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 my-auto">
                              <div className="bg-slate-800 p-2 rounded border border-slate-700">
                                <span className="text-[8px] text-slate-400 block">Today's Keystrokes</span>
                                <span className="text-xs font-bold text-white">4,821</span>
                              </div>
                              <div className="bg-slate-800 p-2 rounded border border-slate-700">
                                <span className="text-[8px] text-slate-400 block">Activity Score</span>
                                <span className="text-xs font-bold text-emerald-400">96.4%</span>
                              </div>
                            </div>
                            <div className="text-[8px] text-slate-500 truncate">
                              Connected to {formData.branding.companyName || formData.name || 'Tenant'} Telemetry Gateway
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 4: MODULE & FEATURE MATRIX */}
              {wizardStep === 4 && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <h4 className="text-sm font-bold text-white uppercase tracking-wider text-amber-400">
                      Step 4: Module & Feature Access Matrix
                    </h4>
                    <span className="text-xs text-slate-400">
                      Toggle exact functional modules enabled for this client
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* CRM Module */}
                    <div className="p-4 bg-slate-800/80 rounded-xl border border-slate-700">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                          <h5 className="text-xs font-bold text-white">Sales & CRM Module</h5>
                        </div>
                        <input
                          type="checkbox"
                          checked={
                            formData.features.crm.leads &&
                            formData.features.crm.customers &&
                            formData.features.crm.followUps
                          }
                          onChange={e => {
                            const c = e.target.checked;
                            setFormData(prev => ({
                              ...prev,
                              features: {
                                ...prev.features,
                                crm: { leads: c, customers: c, followUps: c }
                              }
                            }));
                          }}
                          className="rounded text-amber-500"
                        />
                      </div>
                      <div className="space-y-2 text-xs text-slate-300">
                        <label className="flex items-center justify-between cursor-pointer">
                          <span>Lead Management & Pipeline</span>
                          <input
                            type="checkbox"
                            checked={formData.features.crm.leads}
                            onChange={e =>
                              setFormData(prev => ({
                                ...prev,
                                features: {
                                  ...prev.features,
                                  crm: { ...prev.features.crm, leads: e.target.checked }
                                }
                              }))
                            }
                          />
                        </label>
                        <label className="flex items-center justify-between cursor-pointer">
                          <span>Customers & Accounts</span>
                          <input
                            type="checkbox"
                            checked={formData.features.crm.customers}
                            onChange={e =>
                              setFormData(prev => ({
                                ...prev,
                                features: {
                                  ...prev.features,
                                  crm: { ...prev.features.crm, customers: e.target.checked }
                                }
                              }))
                            }
                          />
                        </label>
                        <label className="flex items-center justify-between cursor-pointer">
                          <span>Sales Follow-ups & Reminders</span>
                          <input
                            type="checkbox"
                            checked={formData.features.crm.followUps}
                            onChange={e =>
                              setFormData(prev => ({
                                ...prev,
                                features: {
                                  ...prev.features,
                                  crm: { ...prev.features.crm, followUps: e.target.checked }
                                }
                              }))
                            }
                          />
                        </label>
                      </div>
                    </div>

                    {/* Quotations & Orders */}
                    <div className="p-4 bg-slate-800/80 rounded-xl border border-slate-700">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                          <h5 className="text-xs font-bold text-white">Quotations & Orders</h5>
                        </div>
                      </div>
                      <div className="space-y-2 text-xs text-slate-300">
                        <label className="flex items-center justify-between cursor-pointer">
                          <span>Quotations Creation & PDF</span>
                          <input
                            type="checkbox"
                            checked={formData.features.sales.quotations}
                            onChange={e =>
                              setFormData(prev => ({
                                ...prev,
                                features: {
                                  ...prev.features,
                                  sales: { ...prev.features.sales, quotations: e.target.checked }
                                }
                              }))
                            }
                          />
                        </label>
                        <label className="flex items-center justify-between cursor-pointer">
                          <span>Sales Orders & Dispatches</span>
                          <input
                            type="checkbox"
                            checked={formData.features.sales.salesOrders}
                            onChange={e =>
                              setFormData(prev => ({
                                ...prev,
                                features: {
                                  ...prev.features,
                                  sales: { ...prev.features.sales, salesOrders: e.target.checked }
                                }
                              }))
                            }
                          />
                        </label>
                        <label className="flex items-center justify-between cursor-pointer">
                          <span>Sales Analytics & Reports</span>
                          <input
                            type="checkbox"
                            checked={formData.features.sales.reports}
                            onChange={e =>
                              setFormData(prev => ({
                                ...prev,
                                features: {
                                  ...prev.features,
                                  sales: { ...prev.features.sales, reports: e.target.checked }
                                }
                              }))
                            }
                          />
                        </label>
                      </div>
                    </div>

                    {/* Inventory & ERP */}
                    <div className="p-4 bg-slate-800/80 rounded-xl border border-slate-700">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
                          <h5 className="text-xs font-bold text-white">Inventory & Warehousing</h5>
                        </div>
                      </div>
                      <div className="space-y-2 text-xs text-slate-300">
                        <label className="flex items-center justify-between cursor-pointer">
                          <span>Products & Categories</span>
                          <input
                            type="checkbox"
                            checked={formData.features.inventory.products}
                            onChange={e =>
                              setFormData(prev => ({
                                ...prev,
                                features: {
                                  ...prev.features,
                                  inventory: { ...prev.features.inventory, products: e.target.checked }
                                }
                              }))
                            }
                          />
                        </label>
                        <label className="flex items-center justify-between cursor-pointer">
                          <span>Stock In / Stock Out Movements</span>
                          <input
                            type="checkbox"
                            checked={formData.features.inventory.stockInOut}
                            onChange={e =>
                              setFormData(prev => ({
                                ...prev,
                                features: {
                                  ...prev.features,
                                  inventory: { ...prev.features.inventory, stockInOut: e.target.checked }
                                }
                              }))
                            }
                          />
                        </label>
                        <label className="flex items-center justify-between cursor-pointer">
                          <span>Purchases & Suppliers</span>
                          <input
                            type="checkbox"
                            checked={formData.features.inventory.purchases}
                            onChange={e =>
                              setFormData(prev => ({
                                ...prev,
                                features: {
                                  ...prev.features,
                                  inventory: { ...prev.features.inventory, purchases: e.target.checked }
                                }
                              }))
                            }
                          />
                        </label>
                      </div>
                    </div>

                    {/* HR & Telemetry */}
                    <div className="p-4 bg-slate-800/80 rounded-xl border border-slate-700">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                          <h5 className="text-xs font-bold text-white">HR & Telemetry Surveillance</h5>
                        </div>
                      </div>
                      <div className="space-y-2 text-xs text-slate-300">
                        <label className="flex items-center justify-between cursor-pointer">
                          <span>Employees, Leave & Attendance</span>
                          <input
                            type="checkbox"
                            checked={formData.features.hr.employees}
                            onChange={e =>
                              setFormData(prev => ({
                                ...prev,
                                features: {
                                  ...prev.features,
                                  hr: { ...prev.features.hr, employees: e.target.checked }
                                }
                              }))
                            }
                          />
                        </label>
                        <label className="flex items-center justify-between cursor-pointer">
                          <span>Live GPS Tracking</span>
                          <input
                            type="checkbox"
                            checked={formData.features.hr.liveTracking}
                            onChange={e =>
                              setFormData(prev => ({
                                ...prev,
                                features: {
                                  ...prev.features,
                                  hr: { ...prev.features.hr, liveTracking: e.target.checked }
                                }
                              }))
                            }
                          />
                        </label>
                        <label className="flex items-center justify-between cursor-pointer">
                          <span className="text-rose-300 font-semibold">
                            Work Session Audio/Screen Recording
                          </span>
                          <input
                            type="checkbox"
                            checked={formData.features.hr.workRecording}
                            onChange={e =>
                              setFormData(prev => ({
                                ...prev,
                                features: {
                                  ...prev.features,
                                  hr: { ...prev.features.hr, workRecording: e.target.checked }
                                }
                              }))
                            }
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 5: INITIAL CLIENT ADMINISTRATOR */}
              {wizardStep === 5 && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider text-amber-400">
                    Step 5: Client Primary Administrator Account
                  </h4>
                  <p className="text-xs text-slate-400">
                    Provision the initial Admin user for this client organization. When this Admin logs in, they will automatically inherit this client's branding and feature permissions.
                  </p>

                  {isEditing ? (
                    <div className="p-4 bg-slate-800/60 rounded-xl border border-slate-700 text-xs text-slate-400">
                      Admin accounts are managed under the Admins & Users tab for existing organizations.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Administrator Full Name *
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Rajesh Kumar"
                          value={formData.initialAdmin.name}
                          onChange={e =>
                            setFormData(prev => ({
                              ...prev,
                              initialAdmin: { ...prev.initialAdmin, name: e.target.value }
                            }))
                          }
                          className="w-full px-3 py-2 bg-slate-800 text-white text-xs rounded-xl border border-slate-700 focus:outline-none focus:border-amber-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Administrator Login Email *
                        </label>
                        <input
                          type="email"
                          placeholder="admin@deliveryplus.com"
                          value={formData.initialAdmin.email}
                          onChange={e =>
                            setFormData(prev => ({
                              ...prev,
                              initialAdmin: { ...prev.initialAdmin, email: e.target.value }
                            }))
                          }
                          className="w-full px-3 py-2 bg-slate-800 text-white text-xs rounded-xl border border-slate-700 focus:outline-none focus:border-amber-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Initial Password *
                        </label>
                        <input
                          type="password"
                          placeholder="Min. 6 characters"
                          value={formData.initialAdmin.password}
                          onChange={e =>
                            setFormData(prev => ({
                              ...prev,
                              initialAdmin: { ...prev.initialAdmin, password: e.target.value }
                            }))
                          }
                          className="w-full px-3 py-2 bg-slate-800 text-white text-xs rounded-xl border border-slate-700 focus:outline-none focus:border-amber-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Contact Phone Number
                        </label>
                        <input
                          type="text"
                          placeholder="+91 98765 43210"
                          value={formData.initialAdmin.phone}
                          onChange={e =>
                            setFormData(prev => ({
                              ...prev,
                              initialAdmin: { ...prev.initialAdmin, phone: e.target.value }
                            }))
                          }
                          className="w-full px-3 py-2 bg-slate-800 text-white text-xs rounded-xl border border-slate-700 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 6: FINAL REVIEW & VERIFICATION */}
              {wizardStep === 6 && (() => {
                const cleanSlug = String(formData.slug || formData.name || 'client')
                  .toLowerCase()
                  .replace(/^\/?(\?org=)?/, '')
                  .replace(/[^a-z0-9-]/g, '')
                  .trim() || 'client';

                const adminUrl = getAdminLoginUrl(cleanSlug);
                const employeeUrl = getEmployeeLoginUrl(cleanSlug);
                const whiteLabelAccessUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/?org=${cleanSlug}`;
                const primaryColor = formData.branding.primaryColor || '#2563EB';
                const accentColor = formData.branding.accentColor || '#06B6D4';
                const sidebarBg = formData.branding.sidebarBackground || '#0F172A';
                const sidebarActiveColor = formData.branding.sidebarActiveColor || primaryColor;
                const companyName = formData.branding.companyName || formData.name || 'Client Workspace';

                return (
                  <div className="space-y-4 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-bold uppercase tracking-wider text-amber-500">
                          Step 6: Review Configuration & Launch
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Verify identity, branding assets, theme tokens, and copy client portal access URLs.
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Ready to Launch
                      </span>
                    </div>

                    {/* TOP CLIENT BRAND IDENTITY HEADER (With Logo & Theme) */}
                    <div
                      className="rounded-2xl p-4 border transition-all shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                      style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        borderColor: primaryColor + '40',
                        borderLeftWidth: '4px',
                        borderLeftColor: primaryColor
                      }}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        {/* 1. Client Logo Preview */}
                        {formData.branding.logoUrl ? (
                          <div className="w-14 h-14 rounded-xl p-1 bg-white border border-slate-200/80 shadow-xs flex items-center justify-center shrink-0 overflow-hidden">
                            <img
                              src={formData.branding.logoUrl}
                              alt={companyName}
                              className="max-h-full max-w-full object-contain"
                            />
                          </div>
                        ) : (
                          <div
                            className="w-14 h-14 rounded-xl flex items-center justify-center font-black text-lg shadow-xs shrink-0 text-white"
                            style={{
                              background: `linear-gradient(135deg, ${primaryColor} 0%, ${accentColor} 100%)`
                            }}
                          >
                            {formData.clientCode ? formData.clientCode.slice(0, 3).toUpperCase() : companyName.slice(0, 2).toUpperCase()}
                          </div>
                        )}

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-base font-black text-slate-900 leading-tight truncate">
                              {companyName}
                            </h3>
                            {formData.clientCode && (
                              <span
                                className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border shadow-2xs"
                                style={{
                                  backgroundColor: primaryColor + '15',
                                  color: primaryColor,
                                  borderColor: primaryColor + '40'
                                }}
                              >
                                #{formData.clientCode}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                            <span>Slug: <strong className="font-mono text-slate-800">/{cleanSlug}</strong></span>
                            <span>•</span>
                            <span>Industry: <strong className="text-slate-800">{formData.industry || 'Enterprise'}</strong></span>
                          </p>
                        </div>
                      </div>

                      {/* Theme Colors Palette Pill Showcase */}
                      <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200/80 shrink-0">
                        <div className="text-center px-1.5">
                          <div className="w-5 h-5 rounded-md shadow-2xs mx-auto mb-1 border border-black/10" style={{ backgroundColor: primaryColor }} />
                          <span className="text-[9px] font-mono text-slate-600 font-semibold block">{primaryColor}</span>
                          <span className="text-[8px] uppercase tracking-wider text-slate-400 font-bold block">Primary</span>
                        </div>
                        <div className="text-center px-1.5 border-l border-slate-200">
                          <div className="w-5 h-5 rounded-md shadow-2xs mx-auto mb-1 border border-black/10" style={{ backgroundColor: accentColor }} />
                          <span className="text-[9px] font-mono text-slate-600 font-semibold block">{accentColor}</span>
                          <span className="text-[8px] uppercase tracking-wider text-slate-400 font-bold block">Accent</span>
                        </div>
                        <div className="text-center px-1.5 border-l border-slate-200">
                          <div className="w-5 h-5 rounded-md shadow-2xs mx-auto mb-1 border border-black/10" style={{ backgroundColor: sidebarBg }} />
                          <span className="text-[9px] font-mono text-slate-600 font-semibold block">{sidebarBg}</span>
                          <span className="text-[8px] uppercase tracking-wider text-slate-400 font-bold block">Sidebar</span>
                        </div>
                        <div className="text-center px-1.5 border-l border-slate-200">
                          <div className="w-5 h-5 rounded-md shadow-2xs mx-auto mb-1 border border-black/10" style={{ backgroundColor: sidebarActiveColor }} />
                          <span className="text-[9px] font-mono text-slate-600 font-semibold block">{sidebarActiveColor}</span>
                          <span className="text-[8px] uppercase tracking-wider text-slate-400 font-bold block">Active</span>
                        </div>
                      </div>
                    </div>

                    {/* GENERATED ADMIN LOGIN URL (Highlighted with Brand Theme & Logo) */}
                    <div
                      className="rounded-2xl p-4 border transition-all shadow-sm space-y-3"
                      style={{
                        backgroundColor: primaryColor + '08',
                        borderColor: primaryColor + '50'
                      }}
                    >
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-white shadow-2xs shrink-0"
                            style={{ backgroundColor: primaryColor }}
                          >
                            <Shield className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-slate-900 block leading-tight">
                              Dedicated Client Administrator Login URL
                            </span>
                            <span className="text-[11px] text-slate-500">
                              Inherits {companyName}'s custom logo, primary color & security policies
                            </span>
                          </div>
                        </div>

                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-2xs"
                          style={{
                            backgroundColor: primaryColor,
                            color: getAccessibleTextColor(primaryColor)
                          }}
                        >
                          Admin Portal
                        </span>
                      </div>

                      {/* Primary Canonical Admin Route */}
                      <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200/90 shadow-2xs">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: primaryColor }} />
                        <code className="text-xs font-mono font-semibold text-slate-800 flex-1 truncate select-all">
                          {adminUrl}
                        </code>

                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(adminUrl);
                            setCopiedUrlType('admin');
                            setTimeout(() => setCopiedUrlType(null), 2500);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer shadow-2xs border"
                          style={{
                            backgroundColor: copiedUrlType === 'admin' ? '#10B981' : '#FFFFFF',
                            color: copiedUrlType === 'admin' ? '#FFFFFF' : '#1E293B',
                            borderColor: copiedUrlType === 'admin' ? '#10B981' : '#E2E8F0'
                          }}
                          title="Copy Admin Login URL"
                        >
                          {copiedUrlType === 'admin' ? (
                            <>
                              <CheckCheck className="w-3.5 h-3.5" />
                              <span>Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-slate-500" />
                              <span>Copy Link</span>
                            </>
                          )}
                        </button>

                        <a
                          href={adminUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all shrink-0 cursor-pointer shadow-xs hover:opacity-90 active:scale-95"
                          style={{
                            backgroundColor: primaryColor,
                            color: getAccessibleTextColor(primaryColor)
                          }}
                          title="Open and test the branded Admin Login page in a new tab"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Test Admin Login</span>
                        </a>
                      </div>

                      {/* Alternative White-Label Short URL */}
                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200/60 px-1">
                        <span>Universal Tenant Route: <code className="font-mono text-slate-700 bg-white/80 px-1.5 py-0.5 rounded border border-slate-200">{whiteLabelAccessUrl}</code></span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(whiteLabelAccessUrl);
                            setCopiedUrlType('admin');
                            setTimeout(() => setCopiedUrlType(null), 2500);
                          }}
                          className="text-slate-600 hover:text-slate-900 font-semibold underline cursor-pointer"
                        >
                          Copy short link
                        </button>
                      </div>
                    </div>

                    {/* GENERATED EMPLOYEE LOGIN URL */}
                    <div className="rounded-2xl p-4 bg-white border border-slate-200/80 shadow-xs space-y-2">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs shrink-0 border border-emerald-200">
                            EMP
                          </div>
                          <div>
                            <span className="text-xs font-bold text-slate-900 block leading-tight">
                              Dedicated Employee Work Desk Login URL
                            </span>
                            <span className="text-[11px] text-slate-500">
                              Employees access punch clock, leads, follow-ups & recordings
                            </span>
                          </div>
                        </div>

                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 uppercase tracking-wider">
                          Employee Portal
                        </span>
                      </div>

                      <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
                        <code className="text-xs font-mono font-semibold text-slate-800 flex-1 truncate select-all">
                          {employeeUrl}
                        </code>

                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(employeeUrl);
                            setCopiedUrlType('employee');
                            setTimeout(() => setCopiedUrlType(null), 2500);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer shadow-2xs border bg-white hover:bg-slate-100 text-slate-700 border-slate-300"
                        >
                          {copiedUrlType === 'employee' ? (
                            <>
                              <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-700">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-slate-500" />
                              <span>Copy Link</span>
                            </>
                          )}
                        </button>

                        <a
                          href={employeeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 transition-all shrink-0 cursor-pointer"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                          <span>Test Employee Login</span>
                        </a>
                      </div>
                    </div>

                    {/* PRIMARY ADMINISTRATOR CREDENTIALS */}
                    {formData.initialAdmin.email && (
                      <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center shrink-0">
                            {formData.initialAdmin.name ? formData.initialAdmin.name.slice(0, 2).toUpperCase() : 'AD'}
                          </div>
                          <div>
                            <span className="text-slate-500 text-[11px] block">Primary Client Administrator:</span>
                            <span className="font-bold text-slate-900">{formData.initialAdmin.name || 'Administrator'}</span>
                            <span className="text-slate-500 font-mono text-[11px] ml-2">({formData.initialAdmin.email})</span>
                          </div>
                        </div>
                        {formData.initialAdmin.password && !isEditing && (
                          <div className="text-right">
                            <span className="text-slate-400 text-[10px] block">Initial Password:</span>
                            <span className="font-mono text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                              {formData.initialAdmin.password}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer Controls */}
            <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
              <button
                type="button"
                disabled={wizardStep === 1}
                onClick={() => setWizardStep(prev => Math.max(1, prev - 1))}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 text-xs font-bold rounded-xl transition-all"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>

              <div className="flex items-center gap-3">
                {wizardStep < 6 ? (
                  <button
                    type="button"
                    onClick={() => setWizardStep(prev => Math.min(6, prev + 1))}
                    className="flex items-center gap-1.5 px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl transition-all shadow-md shadow-amber-500/20"
                  >
                    <span>Next Step</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={handleFormSubmit}
                    className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-black rounded-xl shadow-lg shadow-emerald-500/25 transition-all"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Launch Client Organization'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Client Organization Provisioned Success Modal */}
      {createdOrgSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-white">
            {/* Header */}
            <div className="p-6 bg-gradient-to-r from-emerald-500/20 via-teal-500/10 to-transparent border-b border-slate-800 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Client Provisioned Successfully!</h3>
                  <p className="text-xs text-slate-400">
                    <span className="font-semibold text-emerald-400">{createdOrgSuccess.orgName}</span> is now active with isolated tenant branding.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCreatedOrgSuccess(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 text-xs">
              {/* Branding Swatches */}
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block">Palette Preview</span>
                  <span className="text-xs font-mono text-slate-300">Slug: /{createdOrgSuccess.slug}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-md border border-white/20 shadow-xs" style={{ backgroundColor: createdOrgSuccess.palette.primary }} title="Primary" />
                  <span className="w-5 h-5 rounded-md border border-white/20 shadow-xs" style={{ backgroundColor: createdOrgSuccess.palette.secondary }} title="Secondary" />
                  <span className="w-5 h-5 rounded-md border border-white/20 shadow-xs" style={{ backgroundColor: createdOrgSuccess.palette.sidebar }} title="Sidebar" />
                </div>
              </div>

              {/* Admin Login Link */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-amber-400" />
                    Admin Login Portal
                  </span>
                  <span className="text-[10px] text-slate-500">Split-screen layout</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-slate-950 rounded-xl border border-slate-800">
                  <input
                    readOnly
                    value={createdOrgSuccess.adminLoginUrl}
                    className="bg-transparent text-slate-300 font-mono text-xs flex-1 outline-none select-all"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(createdOrgSuccess.adminLoginUrl);
                      setCopiedUrlType('admin');
                      setTimeout(() => setCopiedUrlType(null), 2000);
                    }}
                    className="flex items-center gap-1 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg transition-all"
                  >
                    {copiedUrlType === 'admin' ? (
                      <>
                        <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-400" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Employee Login Link */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200 flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-blue-400" />
                    Employee Login Portal
                  </span>
                  <span className="text-[10px] text-slate-500">Centered workday focus card</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-slate-950 rounded-xl border border-slate-800">
                  <input
                    readOnly
                    value={createdOrgSuccess.employeeLoginUrl}
                    className="bg-transparent text-slate-300 font-mono text-xs flex-1 outline-none select-all"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(createdOrgSuccess.employeeLoginUrl);
                      setCopiedUrlType('employee');
                      setTimeout(() => setCopiedUrlType(null), 2000);
                    }}
                    className="flex items-center gap-1 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg transition-all"
                  >
                    {copiedUrlType === 'employee' ? (
                      <>
                        <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-400" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {createdOrgSuccess.adminEmail && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300">
                  <p className="font-bold">Initial Administrator Provisioned:</p>
                  <p className="mt-0.5 text-slate-300 font-mono">{createdOrgSuccess.adminEmail}</p>
                  <p className="mt-1 text-[11px] text-slate-400">Send this Admin their login URL above along with the temporary password you set.</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setCreatedOrgSuccess(null)}
                className="px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-bold rounded-xl text-xs shadow-md transition-all"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default OrganizationManagementView;
