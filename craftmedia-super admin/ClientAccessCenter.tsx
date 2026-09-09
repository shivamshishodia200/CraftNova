import React, { useState, useEffect, useMemo } from 'react';
import { api } from '@/src/services/api';
import { DynamicBrandLogo } from '@/src/components/common/DynamicBrandLogo';
import { getAdminLoginUrl, getEmployeeLoginUrl } from '@/src/utils/routeUtils';
import {
  Building2,
  Shield,
  Users,
  UserCheck,
  UserX,
  Plus,
  Edit2,
  Search,
  Check,
  X,
  ExternalLink,
  RefreshCw,
  Eye,
  Key,
  Lock,
  Unlock,
  Copy,
  CheckCheck,
  AlertTriangle,
  LogOut,
  Clock,
  Calendar,
  Phone,
  Mail,
  Briefcase,
  ChevronRight,
  Sparkles,
  Sliders,
  Activity,
  Layers,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  Save,
  Trash2,
  Info,
  Laptop,
  CheckCircle2,
  XCircle,
  Crown
} from 'lucide-react';

interface Organization {
  _id?: string;
  id: string;
  name: string;
  slug: string;
  clientCode: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'TRIAL' | 'INACTIVE';
  contactEmail?: string;
  contactPhone?: string;
  branding?: any;
  features?: any;
  settings?: any;
  adminCount?: number;
  employeeCount?: number;
}

interface UserAccount {
  _id: string;
  id?: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  roleId?: string;
  roleName?: string;
  department?: string;
  designation?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  isPrimaryAdmin?: boolean;
  effectivePermissions?: string[];
  effectivePermissionCount?: number;
  customPermissions?: string[];
  permissionMode?: 'ROLE' | 'REPLACE';
  lastLogin?: string;
  lastPasswordResetAt?: string;
  failedLoginCount?: number;
  createdAt?: string;
}

interface EmployeeRecord {
  _id: string;
  employeeId: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  designation: string;
  reportingManager?: string;
  shift?: string;
  joiningDate?: string;
  status: 'ACTIVE' | 'ON_LEAVE' | 'RESIGNED' | 'TERMINATED';
  salary?: number;
  userAccount?: {
    userId: string;
    email: string;
    role: string;
    status: string;
    lastLogin?: string;
  } | null;
  attendanceToday?: {
    status: string;
    checkIn?: string;
    checkOut?: string;
  };
  customPermissions?: string[];
  createdAt?: string;
}

interface ClientAccessCenterProps {
  organization?: Organization;
  org?: Organization;
  onClose: () => void;
  onOrganizationUpdated?: (updatedOrg: Organization) => void;
  initialTab?: 'admins' | 'employees' | 'permissions' | 'modules' | 'security' | 'activity';
}

// Module Permission Definitions for Interactive Matrix
const PERMISSION_MODULES = [
  { id: 'dashboard', name: 'Dashboard & Analytics', actions: ['view', 'export', 'manage'] },
  { id: 'leads', name: 'Sales Leads Pipeline', actions: ['view', 'create', 'edit', 'delete', 'export', 'assign'] },
  { id: 'customers', name: 'Customer Directory', actions: ['view', 'create', 'edit', 'delete', 'export'] },
  { id: 'follow_ups', name: 'Follow-Ups & Reminders', actions: ['view', 'create', 'edit', 'delete'] },
  { id: 'quotations', name: 'Quotations & Estimates', actions: ['view', 'create', 'edit', 'delete', 'approve', 'convert'] },
  { id: 'sales_orders', name: 'Sales Orders', actions: ['view', 'create', 'edit', 'delete', 'approve'] },
  { id: 'call_logs', name: 'Call Logs & Audio Recordings', actions: ['view', 'create', 'delete'] },
  { id: 'products', name: 'Products & Store Catalog', actions: ['view', 'create', 'edit', 'delete', 'export'] },
  { id: 'categories', name: 'Product Categories', actions: ['view', 'create', 'edit', 'delete'] },
  { id: 'stock', name: 'Stock In/Out & Inventory', actions: ['view', 'create', 'adjust', 'manage'] },
  { id: 'purchases', name: 'Purchase Orders', actions: ['view', 'create', 'edit', 'delete', 'approve'] },
  { id: 'suppliers', name: 'Suppliers & Vendors', actions: ['view', 'create', 'edit', 'delete'] },
  { id: 'invoices', name: 'Invoices & Billing', actions: ['view', 'create', 'edit', 'delete', 'export', 'approve'] },
  { id: 'payments', name: 'Payments & Collections', actions: ['view', 'create', 'edit', 'delete', 'export'] },
  { id: 'expenses', name: 'Expense Management', actions: ['view', 'create', 'edit', 'delete', 'approve'] },
  { id: 'employees', name: 'Employee Profiles', actions: ['view', 'create', 'edit', 'delete', 'export'] },
  { id: 'attendance', name: 'Attendance & Punch Clock', actions: ['view', 'create', 'edit', 'approve', 'export'] },
  { id: 'leaves', name: 'Leave Requests & Approvals', actions: ['view', 'create', 'approve', 'reject'] },
  { id: 'salary', name: 'Salary & Payroll Slips', actions: ['view', 'create', 'edit', 'export'] },
  { id: 'performance', name: 'Performance Appraisals', actions: ['view', 'create', 'edit'] },
  { id: 'live_tracking', name: 'Live GPS Field Tracking', actions: ['view', 'export', 'manage'] },
  { id: 'work_recording', name: 'Desktop Session Recording', actions: ['view', 'export', 'manage'] },
  { id: 'campaigns', name: 'Marketing Campaigns', actions: ['view', 'create', 'edit', 'delete'] },
  { id: 'tradeindia', name: 'TradeIndia B2B Sync', actions: ['view', 'sync', 'manage'] },
  { id: 'whatsapp', name: 'WhatsApp Business API', actions: ['view', 'send', 'manage'] },
  { id: 'reports', name: 'Central Reports Hub', actions: ['view', 'export'] },
  { id: 'settings', name: 'Organization Settings', actions: ['view', 'edit', 'manage'] },
  { id: 'audit_logs', name: 'Security Audit Logs', actions: ['view', 'export'] }
];

export const ClientAccessCenter: React.FC<ClientAccessCenterProps> = ({
  organization: propOrg,
  org,
  onClose,
  onOrganizationUpdated,
  initialTab = 'admins'
}) => {
  const organization = (propOrg || org)!;
  const orgId = organization?._id || organization?.id;
  const [activeTab, setActiveTab] = useState<'admins' | 'employees' | 'permissions' | 'modules' | 'security' | 'activity'>(initialTab);

  // Data state
  const [admins, setAdmins] = useState<UserAccount[]>([]);
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Filters & Search
  const [adminSearch, setAdminSearch] = useState<string>('');
  const [adminDeptFilter, setAdminDeptFilter] = useState<string>('ALL');
  const [adminStatusFilter, setAdminStatusFilter] = useState<string>('ALL');

  const [empSearch, setEmpSearch] = useState<string>('');
  const [empDeptFilter, setEmpDeptFilter] = useState<string>('ALL');
  const [empStatusFilter, setEmpStatusFilter] = useState<string>('ALL');

  // Modals & Drawers state
  const [selectedAdminForDrawer, setSelectedAdminForDrawer] = useState<UserAccount | null>(null);
  const [selectedEmpForDrawer, setSelectedEmpForDrawer] = useState<EmployeeRecord | null>(null);
  const [showAddAdminModal, setShowAddAdminModal] = useState<boolean>(false);
  const [showAddEmpModal, setShowAddEmpModal] = useState<boolean>(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState<UserAccount | null>(null);
  const [tempPasswordPayload, setTempPasswordPayload] = useState<{
    userEmail: string;
    userName: string;
    userRole: string;
    tempPassword: string;
    loginUrl: string;
    companyName: string;
  } | null>(null);

  // Permission Matrix State
  const [selectedUserForPerms, setSelectedUserForPerms] = useState<string>('');
  const [userPermsData, setUserPermsData] = useState<{
    user: UserAccount | null;
    customPermissions: string[];
    permissionMode: 'ROLE' | 'REPLACE';
    rolePermissions: string[];
  }>({
    user: null,
    customPermissions: [],
    permissionMode: 'ROLE',
    rolePermissions: []
  });

  // Module Access Matrix State
  const [orgFeatures, setOrgFeatures] = useState<any>(organization.features || {});

  const adminLoginUrl = getAdminLoginUrl(organization.slug);
  const employeeLoginUrl = getEmployeeLoginUrl(organization.slug);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Fetch all initial data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [adminsRes, empsRes, logsRes] = await Promise.all([
        api.get<UserAccount[]>(`/superadmin/organizations/${orgId}/admins`),
        api.get<EmployeeRecord[]>(`/superadmin/organizations/${orgId}/employees`),
        api.get<any[]>(`/superadmin/organizations/${orgId}/activity`)
      ]);

      if (adminsRes.success && Array.isArray(adminsRes.data)) {
        setAdmins(adminsRes.data);
      }
      if (empsRes.success && Array.isArray(empsRes.data)) {
        setEmployees(empsRes.data);
      }
      if (logsRes.success && Array.isArray(logsRes.data)) {
        setActivityLogs(logsRes.data);
      }
    } catch (err: any) {
      console.error('[ClientAccessCenter] Error loading data:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [orgId]);

  // Load user permissions when selecting a user in Tab 3
  const loadUserPermissions = async (userId: string) => {
    if (!userId) return;
    try {
      const res = await api.get<any>(`/superadmin/users/${userId}/permissions`);
      if (res.success && res.data) {
        const u = admins.find(a => a._id === userId) || employees.find(e => e.userAccount?.userId === userId);
        setUserPermsData({
          user: (u as any) || null,
          customPermissions: res.data.customPermissions || [],
          permissionMode: res.data.permissionMode || 'ROLE',
          rolePermissions: res.data.rolePermissions || []
        });
      }
    } catch (err: any) {
      console.error('[ClientAccessCenter] Error loading permissions:', err.message);
    }
  };

  useEffect(() => {
    if (activeTab === 'permissions' && !selectedUserForPerms && admins.length > 0) {
      setSelectedUserForPerms(admins[0]._id);
      loadUserPermissions(admins[0]._id);
    }
  }, [activeTab, admins]);

  // Filtered lists
  const filteredAdmins = useMemo(() => {
    return admins.filter(a => {
      const matchesSearch = !adminSearch ||
        a.name.toLowerCase().includes(adminSearch.toLowerCase()) ||
        a.email.toLowerCase().includes(adminSearch.toLowerCase()) ||
        (a.phone && a.phone.includes(adminSearch));
      const matchesDept = adminDeptFilter === 'ALL' || a.department === adminDeptFilter;
      const matchesStatus = adminStatusFilter === 'ALL' || a.status === adminStatusFilter;
      return matchesSearch && matchesDept && matchesStatus;
    });
  }, [admins, adminSearch, adminDeptFilter, adminStatusFilter]);

  const filteredEmployees = useMemo(() => {
    return employees.filter(e => {
      const matchesSearch = !empSearch ||
        e.name.toLowerCase().includes(empSearch.toLowerCase()) ||
        e.email.toLowerCase().includes(empSearch.toLowerCase()) ||
        e.employeeId.toLowerCase().includes(empSearch.toLowerCase()) ||
        (e.phone && e.phone.includes(empSearch));
      const matchesDept = empDeptFilter === 'ALL' || e.department === empDeptFilter;
      const matchesStatus = empStatusFilter === 'ALL' || e.status === empStatusFilter;
      return matchesSearch && matchesDept && matchesStatus;
    });
  }, [employees, empSearch, empDeptFilter, empStatusFilter]);

  // Distinct departments
  const adminDepartments = useMemo(() => {
    const set = new Set(admins.map(a => a.department).filter(Boolean));
    return Array.from(set);
  }, [admins]);

  const empDepartments = useMemo(() => {
    const set = new Set(employees.map(e => e.department).filter(Boolean));
    return Array.from(set);
  }, [employees]);

  // Primary Admin designation
  const handleSetPrimaryAdmin = async (userId: string) => {
    setActionLoading(true);
    try {
      const res = await api.put(`/superadmin/organizations/${orgId}/primary-admin`, { userId });
      if (res.success) {
        await fetchData();
        if (onOrganizationUpdated) {
          onOrganizationUpdated({
            ...organization,
            contactEmail: res.data?.primaryAdminEmail
          });
        }
      }
    } catch (err: any) {
      alert(err.message || 'Failed to set Primary Admin');
    } finally {
      setActionLoading(false);
    }
  };

  // Toggle user status
  const handleToggleUserStatus = async (user: UserAccount) => {
    const nextStatus = user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    setActionLoading(true);
    try {
      const res = await api.patch(`/superadmin/users/${user._id}/status`, { status: nextStatus });
      if (res.success) {
        await fetchData();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to change status');
    } finally {
      setActionLoading(false);
    }
  };

  // Save Module Access
  const handleSaveModuleAccess = async () => {
    setActionLoading(true);
    try {
      const res = await api.put(`/superadmin/organizations/${orgId}/features`, { features: orgFeatures });
      if (res.success) {
        alert(`Module access matrix updated successfully for ${organization.name}!`);
        if (onOrganizationUpdated) {
          onOrganizationUpdated({ ...organization, features: orgFeatures });
        }
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update module access');
    } finally {
      setActionLoading(false);
    }
  };

  // Security bulk actions
  const handleForceLogoutAll = async () => {
    if (!confirm(`Are you sure you want to invalidate all active login sessions for ${organization.name}? All admins and employees will be forced to log in again.`)) {
      return;
    }
    setActionLoading(true);
    try {
      const res = await api.post(`/superadmin/organizations/${orgId}/force-logout-all`, {});
      alert(res.message || 'All user sessions invalidated.');
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to force logout');
    } finally {
      setActionLoading(false);
    }
  };

  const handleForcePasswordResetAll = async () => {
    if (!confirm(`Require ALL users in ${organization.name} to change their password on next sign-in?`)) {
      return;
    }
    setActionLoading(true);
    try {
      const res = await api.post(`/superadmin/organizations/${orgId}/force-password-reset-all`, {});
      alert(res.message || 'Password reset flag enabled for all users.');
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to flag password reset');
    } finally {
      setActionLoading(false);
    }
  };

  // Copy All Login Details helper
  const handleCopyAllLoginDetails = (data: {
    companyName: string;
    loginUrl: string;
    userEmail: string;
    tempPassword?: string;
    userRole: string;
  }) => {
    const text = `Company: ${data.companyName}
Admin Login: ${data.loginUrl}
Email: ${data.userEmail}
Temporary Password: ${data.tempPassword || '********'}
Role: ${data.userRole}`;
    copyToClipboard(text, 'all_login_details');
  };

  const primaryAdmin = admins.find(a => a.isPrimaryAdmin) || admins[0];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col justify-between overflow-hidden animate-fadeIn">
      {/* ========================================================================= */}
      {/* 1. TOP HEADER WITH TENANT BRANDING & ACCESS URLS */}
      {/* ========================================================================= */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 shrink-0 shadow-lg">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Tenant Identity */}
          <div className="flex items-center gap-4">
            <div className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 shadow-inner">
              <DynamicBrandLogo
                logoUrl={organization.branding?.logoUrl}
                companyName={organization.name}
                className="h-9 w-auto max-w-[140px] object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black text-white tracking-tight">{organization.name}</h1>
                <span className="px-2 py-0.5 rounded bg-slate-800 text-amber-400 font-mono text-[11px] font-bold border border-slate-700">
                  {organization.clientCode}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${
                  organization.status === 'ACTIVE'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                }`}>
                  {organization.status}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-slate-400 font-mono">
                <span>/{organization.slug}</span>
                <span>•</span>
                <span className="text-slate-300">
                  Primary Admin: <strong className="text-amber-300">{primaryAdmin?.name || organization.contactEmail || 'None'}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Quick Login URLs & Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Admin Portal Action */}
            <div className="flex items-center bg-slate-800/90 rounded-xl p-1.5 border border-slate-700/80 shadow-sm">
              <span className="px-2 text-[10px] font-bold uppercase tracking-wider text-amber-400 border-r border-slate-700 mr-1.5">
                Admin
              </span>
              <button
                onClick={() => copyToClipboard(adminLoginUrl, 'admin_url_header')}
                className="px-2.5 py-1 text-xs text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors"
                title="Copy Admin Login URL"
              >
                {copiedKey === 'admin_url_header' ? <CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span className="text-[11px] font-medium">Copy</span>
              </button>
              <a
                href={adminLoginUrl}
                target="_blank"
                rel="noreferrer"
                className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg flex items-center gap-1 transition-colors shadow"
              >
                <ExternalLink className="w-3 h-3" />
                <span>Open Portal</span>
              </a>
            </div>

            {/* Employee Portal Action */}
            <div className="flex items-center bg-slate-800/90 rounded-xl p-1.5 border border-slate-700/80 shadow-sm">
              <span className="px-2 text-[10px] font-bold uppercase tracking-wider text-purple-400 border-r border-slate-700 mr-1.5">
                Employee
              </span>
              <button
                onClick={() => copyToClipboard(employeeLoginUrl, 'emp_url_header')}
                className="px-2.5 py-1 text-xs text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors"
                title="Copy Employee Login URL"
              >
                {copiedKey === 'emp_url_header' ? <CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span className="text-[11px] font-medium">Copy</span>
              </button>
              <a
                href={employeeLoginUrl}
                target="_blank"
                rel="noreferrer"
                className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-lg flex items-center gap-1 transition-colors shadow"
              >
                <ExternalLink className="w-3 h-3" />
                <span>Open Desk</span>
              </a>
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 transition-colors ml-2"
              title="Close Client Access Center"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. TAB NAVIGATION BAR */}
      {/* ========================================================================= */}
      <div className="bg-slate-900/90 border-b border-slate-800 px-6 shrink-0">
        <div className="max-w-7xl mx-auto flex items-center gap-1 overflow-x-auto no-scrollbar py-2">
          {[
            { id: 'admins', label: 'Administrators', icon: Shield, count: admins.length },
            { id: 'employees', label: 'Employees', icon: Users, count: employees.length },
            { id: 'permissions', label: 'Roles & Permissions', icon: Key },
            { id: 'modules', label: 'Module Access', icon: Layers },
            { id: 'security', label: 'Login & Security', icon: Lock },
            { id: 'activity', label: 'Activity Logs', icon: Activity, count: activityLogs.length }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold font-mono ${
                    isActive ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-slate-300'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. MAIN TAB CONTENT AREA */}
      {/* ========================================================================= */}
      <main className="flex-1 overflow-y-auto px-6 py-6 max-w-7xl mx-auto w-full">
        {/* TAB 1: ADMINISTRATORS */}
        {activeTab === 'admins' && (
          <div className="space-y-4 animate-fadeIn">
            {/* Action Bar & Search */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search admins by name, email, phone..."
                    value={adminSearch}
                    onChange={e => setAdminSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 bg-slate-950 text-white text-xs rounded-xl border border-slate-700 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <select
                  value={adminDeptFilter}
                  onChange={e => setAdminDeptFilter(e.target.value)}
                  className="px-3 py-1.5 bg-slate-950 text-xs text-slate-300 rounded-xl border border-slate-700 focus:outline-none focus:border-amber-500"
                >
                  <option value="ALL">All Departments</option>
                  {adminDepartments.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>

                <select
                  value={adminStatusFilter}
                  onChange={e => setAdminStatusFilter(e.target.value)}
                  className="px-3 py-1.5 bg-slate-950 text-xs text-slate-300 rounded-xl border border-slate-700 focus:outline-none focus:border-amber-500"
                >
                  <option value="ALL">All Status</option>
                  <option value="ACTIVE">Active</option>
                  <option value="SUSPENDED">Suspended</option>
                </select>
              </div>

              <button
                onClick={() => setShowAddAdminModal(true)}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl transition-all shadow-md shadow-amber-500/10"
              >
                <Plus className="w-4 h-4" />
                <span>Add Administrator</span>
              </button>
            </div>

            {/* Admins Data Table */}
            {loading ? (
              <div className="p-12 text-center text-slate-400 bg-slate-900/40 rounded-2xl border border-slate-800">
                <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mx-auto mb-3" />
                <p className="text-xs">Loading administrators...</p>
              </div>
            ) : filteredAdmins.length === 0 ? (
              <div className="p-12 text-center text-slate-400 bg-slate-900/40 rounded-2xl border border-slate-800">
                <Shield className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <p className="text-sm font-bold text-white">No Administrators Found</p>
                <p className="text-xs text-slate-500 mt-1">Create an admin account to manage {organization.name}.</p>
              </div>
            ) : (
              <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                      <tr>
                        <th className="py-3.5 px-4">Administrator</th>
                        <th className="py-3.5 px-4">Contact</th>
                        <th className="py-3.5 px-4">Role & Dept</th>
                        <th className="py-3.5 px-4">Status</th>
                        <th className="py-3.5 px-4">Last Login</th>
                        <th className="py-3.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {filteredAdmins.map(admin => {
                        const isPrimary = admin.isPrimaryAdmin;
                        const isSuspended = admin.status === 'SUSPENDED';

                        return (
                          <tr key={admin._id} className="hover:bg-slate-800/50 transition-colors group">
                            {/* Administrator Name & Avatar */}
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-slate-950 font-black text-xs flex items-center justify-center shadow-md">
                                  {admin.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                                </div>
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-white group-hover:text-amber-400 transition-colors">
                                      {admin.name}
                                    </span>
                                    {isPrimary && (
                                      <span className="flex items-center gap-1 px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30">
                                        <Crown className="w-2.5 h-2.5" />
                                        Primary
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[11px] text-slate-400 block font-mono">
                                    {admin.email}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Contact Info */}
                            <td className="py-3.5 px-4">
                              <div className="space-y-0.5 text-[11px]">
                                <div className="flex items-center gap-1 text-slate-300 font-mono">
                                  <Mail className="w-3 h-3 text-slate-500" />
                                  <span>{admin.email}</span>
                                </div>
                                {admin.phone && (
                                  <div className="flex items-center gap-1 text-slate-400 font-mono">
                                    <Phone className="w-3 h-3 text-slate-500" />
                                    <span>{admin.phone}</span>
                                  </div>
                                )}
                              </div>
                            </td>

                            {/* Role & Dept */}
                            <td className="py-3.5 px-4">
                              <div>
                                <span className="px-2 py-0.5 rounded-md bg-slate-800 text-amber-300 font-semibold text-[11px] border border-slate-700 inline-block">
                                  {admin.roleName || admin.role}
                                </span>
                                <span className="text-[11px] text-slate-500 block mt-0.5">
                                  {admin.department || 'Management'} • {admin.designation || 'Administrator'}
                                </span>
                              </div>
                            </td>

                            {/* Status */}
                            <td className="py-3.5 px-4">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${
                                admin.status === 'ACTIVE'
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                  : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                              }`}>
                                {admin.status}
                              </span>
                            </td>

                            {/* Last Login */}
                            <td className="py-3.5 px-4 text-[11px] text-slate-400 font-mono">
                              {admin.lastLogin ? new Date(admin.lastLogin).toLocaleString() : 'Never logged in'}
                            </td>

                            {/* Action Buttons */}
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => setSelectedAdminForDrawer(admin)}
                                  className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors"
                                  title="View Admin Details Drawer"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  onClick={() => {
                                    setSelectedUserForPerms(admin._id);
                                    loadUserPermissions(admin._id);
                                    setActiveTab('permissions');
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-amber-300 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors"
                                  title="Manage Permissions Matrix"
                                >
                                  <Key className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  onClick={() => setShowResetPasswordModal(admin)}
                                  className="p-1.5 text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 rounded-lg border border-amber-500/30 transition-colors"
                                  title="Reset Password"
                                >
                                  <Lock className="w-3.5 h-3.5" />
                                </button>

                                {!isPrimary && (
                                  <button
                                    onClick={() => handleSetPrimaryAdmin(admin._id)}
                                    className="p-1.5 text-slate-400 hover:text-amber-400 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors"
                                    title="Make Primary Administrator"
                                  >
                                    <Crown className="w-3.5 h-3.5" />
                                  </button>
                                )}

                                <button
                                  onClick={() => handleToggleUserStatus(admin)}
                                  className={`p-1.5 rounded-lg border transition-colors ${
                                    isSuspended
                                      ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20'
                                      : 'text-rose-400 bg-rose-500/10 border-rose-500/30 hover:bg-rose-500/20'
                                  }`}
                                  title={isSuspended ? 'Activate Admin' : 'Suspend Admin'}
                                >
                                  {isSuspended ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: EMPLOYEES */}
        {activeTab === 'employees' && (
          <div className="space-y-4 animate-fadeIn">
            {/* Action Bar & Search */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search by ID, name, email..."
                    value={empSearch}
                    onChange={e => setEmpSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 bg-slate-950 text-white text-xs rounded-xl border border-slate-700 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <select
                  value={empDeptFilter}
                  onChange={e => setEmpDeptFilter(e.target.value)}
                  className="px-3 py-1.5 bg-slate-950 text-xs text-slate-300 rounded-xl border border-slate-700 focus:outline-none focus:border-purple-500"
                >
                  <option value="ALL">All Departments</option>
                  {empDepartments.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>

                <select
                  value={empStatusFilter}
                  onChange={e => setEmpStatusFilter(e.target.value)}
                  className="px-3 py-1.5 bg-slate-950 text-xs text-slate-300 rounded-xl border border-slate-700 focus:outline-none focus:border-purple-500"
                >
                  <option value="ALL">All Status</option>
                  <option value="ACTIVE">Active</option>
                  <option value="ON_LEAVE">On Leave</option>
                  <option value="TERMINATED">Terminated</option>
                </select>
              </div>

              <button
                onClick={() => setShowAddEmpModal(true)}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-purple-600/20"
              >
                <Plus className="w-4 h-4" />
                <span>Add Employee</span>
              </button>
            </div>

            {/* Employees Data Table */}
            {loading ? (
              <div className="p-12 text-center text-slate-400 bg-slate-900/40 rounded-2xl border border-slate-800">
                <RefreshCw className="w-8 h-8 text-purple-500 animate-spin mx-auto mb-3" />
                <p className="text-xs">Loading employees...</p>
              </div>
            ) : filteredEmployees.length === 0 ? (
              <div className="p-12 text-center text-slate-400 bg-slate-900/40 rounded-2xl border border-slate-800">
                <Users className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <p className="text-sm font-bold text-white">No Employees Found</p>
                <p className="text-xs text-slate-500 mt-1">Add employee accounts for staff of {organization.name}.</p>
              </div>
            ) : (
              <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                      <tr>
                        <th className="py-3.5 px-4">Employee ID & Name</th>
                        <th className="py-3.5 px-4">Designation & Dept</th>
                        <th className="py-3.5 px-4">User Login Account</th>
                        <th className="py-3.5 px-4">Today's Attendance</th>
                        <th className="py-3.5 px-4">Status</th>
                        <th className="py-3.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {filteredEmployees.map(emp => {
                        const hasAccount = !!emp.userAccount;
                        return (
                          <tr key={emp._id} className="hover:bg-slate-800/50 transition-colors group">
                            {/* ID & Name */}
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-purple-600/20 text-purple-300 font-bold text-xs flex items-center justify-center border border-purple-500/30">
                                  {emp.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                                </div>
                                <div>
                                  <span className="font-bold text-white group-hover:text-purple-300 transition-colors block">
                                    {emp.name}
                                  </span>
                                  <span className="text-[10px] text-amber-400 font-mono font-semibold">
                                    {emp.employeeId}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Designation & Dept */}
                            <td className="py-3.5 px-4">
                              <div>
                                <span className="font-medium text-slate-200 block">{emp.designation || 'Staff'}</span>
                                <span className="text-[11px] text-slate-500">{emp.department || 'General'}</span>
                              </div>
                            </td>

                            {/* User Account Link */}
                            <td className="py-3.5 px-4">
                              {hasAccount ? (
                                <div className="text-[11px]">
                                  <span className="text-slate-300 font-mono block">{emp.userAccount?.email}</span>
                                  <span className="text-emerald-400 text-[10px] font-semibold flex items-center gap-1">
                                    <Check className="w-3 h-3" /> Account Active ({emp.userAccount?.role})
                                  </span>
                                </div>
                              ) : (
                                <span className="text-[11px] text-slate-500 italic">No login account</span>
                              )}
                            </td>

                            {/* Today's Attendance */}
                            <td className="py-3.5 px-4">
                              {emp.attendanceToday?.status === 'PRESENT' ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                                  Present ({emp.attendanceToday.checkIn})
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
                                  Not Punched In
                                </span>
                              )}
                            </td>

                            {/* Status */}
                            <td className="py-3.5 px-4">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${
                                emp.status === 'ACTIVE'
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                  : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                              }`}>
                                {emp.status}
                              </span>
                            </td>

                            {/* Actions */}
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => setSelectedEmpForDrawer(emp)}
                                  className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors"
                                  title="View Employee Profile Drawer"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>

                                {hasAccount && (
                                  <button
                                    onClick={() => {
                                      if (emp.userAccount?.userId) {
                                        setSelectedUserForPerms(emp.userAccount.userId);
                                        loadUserPermissions(emp.userAccount.userId);
                                        setActiveTab('permissions');
                                      }
                                    }}
                                    className="p-1.5 text-slate-400 hover:text-purple-300 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors"
                                    title="Manage Employee Permissions"
                                  >
                                    <Key className="w-3.5 h-3.5" />
                                  </button>
                                )}

                                {hasAccount && (
                                  <button
                                    onClick={() => {
                                      setShowResetPasswordModal({
                                        _id: emp.userAccount!.userId,
                                        name: emp.name,
                                        email: emp.userAccount!.email,
                                        role: emp.userAccount!.role,
                                        status: 'ACTIVE'
                                      });
                                    }}
                                    className="p-1.5 text-purple-400 hover:text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 rounded-lg border border-purple-500/30 transition-colors"
                                    title="Reset Password"
                                  >
                                    <Lock className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: ROLES & PERMISSIONS MATRIX */}
        {activeTab === 'permissions' && (
          <div className="space-y-6 animate-fadeIn">
            {/* User Selector & Role Info */}
            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/30">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Role & Granular Permission Matrix</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Customize fine-grained access overrides for individual users or apply standard role templates.
                  </p>
                </div>
              </div>

              {/* Target User Selector */}
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400 font-semibold whitespace-nowrap">Target User:</span>
                <select
                  value={selectedUserForPerms}
                  onChange={e => {
                    setSelectedUserForPerms(e.target.value);
                    loadUserPermissions(e.target.value);
                  }}
                  className="px-3 py-2 bg-slate-950 text-xs font-bold text-amber-300 rounded-xl border border-slate-700 focus:outline-none focus:border-amber-500 min-w-[220px]"
                >
                  <optgroup label="Administrators">
                    {admins.map(a => (
                      <option key={a._id} value={a._id}>{a.name} ({a.role})</option>
                    ))}
                  </optgroup>
                  <optgroup label="Employees with Accounts">
                    {employees.filter(e => e.userAccount).map(e => (
                      <option key={e.userAccount!.userId} value={e.userAccount!.userId}>{e.name} (Employee)</option>
                    ))}
                  </optgroup>
                </select>
              </div>
            </div>

            {/* Matrix Table */}
            <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
              <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white">Module Access Privileges</span>
                  <span className="text-[11px] text-slate-400 ml-2">
                    ({userPermsData.customPermissions.length} active custom permission overrides)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      // Select All
                      const all: string[] = [];
                      PERMISSION_MODULES.forEach(m => {
                        m.actions.forEach(a => all.push(`${m.id}.${a}`));
                      });
                      setUserPermsData(prev => ({ ...prev, customPermissions: all, permissionMode: 'REPLACE' }));
                    }}
                    className="px-2.5 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-lg border border-slate-700 transition-colors"
                  >
                    Grant All
                  </button>
                  <button
                    onClick={() => {
                      setUserPermsData(prev => ({ ...prev, customPermissions: [], permissionMode: 'ROLE' }));
                    }}
                    className="px-2.5 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-lg border border-slate-700 transition-colors"
                  >
                    Reset to Role Defaults
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/40 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4 w-60">Module / Resource</th>
                      <th className="py-3 px-3 text-center">View</th>
                      <th className="py-3 px-3 text-center">Create</th>
                      <th className="py-3 px-3 text-center">Edit</th>
                      <th className="py-3 px-3 text-center">Delete</th>
                      <th className="py-3 px-3 text-center">Export</th>
                      <th className="py-3 px-3 text-center">Approve</th>
                      <th className="py-3 px-3 text-center">Assign</th>
                      <th className="py-3 px-3 text-center">Manage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {PERMISSION_MODULES.map(mod => {
                      return (
                        <tr key={mod.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-2.5 px-4 font-semibold text-slate-200">
                            {mod.name}
                          </td>
                          {['view', 'create', 'edit', 'delete', 'export', 'approve', 'assign', 'manage'].map(act => {
                            const isSupported = mod.actions.includes(act);
                            const permCode = `${mod.id}.${act}`;
                            const isChecked = userPermsData.customPermissions.includes(permCode) ||
                              (userPermsData.permissionMode === 'ROLE' && userPermsData.rolePermissions.includes(permCode));

                            if (!isSupported) {
                              return (
                                <td key={act} className="py-2.5 px-3 text-center text-slate-700">
                                  —
                                </td>
                              );
                            }

                            return (
                              <td key={act} className="py-2.5 px-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={e => {
                                    const next = e.target.checked
                                      ? [...userPermsData.customPermissions, permCode]
                                      : userPermsData.customPermissions.filter(p => p !== permCode);
                                    setUserPermsData(prev => ({
                                      ...prev,
                                      customPermissions: next,
                                      permissionMode: 'REPLACE'
                                    }));
                                  }}
                                  className="w-4 h-4 rounded text-amber-500 bg-slate-950 border-slate-700 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                                />
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Save Footer */}
              <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  Changes will take effect on the user's next request or immediate session refresh.
                </span>
                <button
                  onClick={async () => {
                    if (!selectedUserForPerms) return;
                    setActionLoading(true);
                    try {
                      const res = await api.put(`/superadmin/users/${selectedUserForPerms}/permissions`, {
                        customPermissions: userPermsData.customPermissions,
                        permissionMode: userPermsData.permissionMode
                      });
                      if (res.success) {
                        alert('Permissions saved successfully!');
                        fetchData();
                      }
                    } catch (err: any) {
                      alert(err.message || 'Failed to save permissions');
                    } finally {
                      setActionLoading(false);
                    }
                  }}
                  disabled={actionLoading}
                  className="flex items-center gap-2 px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{actionLoading ? 'Saving...' : 'Save Permissions'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: MODULE ACCESS MATRIX (TENANT LEVEL) */}
        {activeTab === 'modules' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-amber-400" />
                  Client-Level Module & Feature Matrix
                </h3>
                <p className="text-xs text-slate-400 mt-1 max-w-2xl">
                  Enable or disable ERP modules for <strong>{organization.name}</strong>. If a module is disabled here, NO user (Admin or Employee) in this organization can access it, regardless of their role permissions.
                </p>
              </div>

              <button
                onClick={handleSaveModuleAccess}
                disabled={actionLoading}
                className="flex items-center gap-2 px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all shrink-0"
              >
                <Save className="w-4 h-4" />
                <span>Save Module Access</span>
              </button>
            </div>

            {/* Modules Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { id: 'dashboard', name: 'Dashboard & Executive KPIs', desc: 'Central workspace overview & live telemetry' },
                { id: 'crm.leads', name: 'Sales Leads Pipeline', desc: 'Lead capturing, assignment & status tracking' },
                { id: 'crm.customers', name: 'Customer Directory', desc: 'Accounts, credit limits & order histories' },
                { id: 'sales.quotations', name: 'Quotations & Estimates', desc: 'Draft, approve & convert sales quotes' },
                { id: 'sales.salesOrders', name: 'Sales Orders', desc: 'Order fulfillment & dispatch tracking' },
                { id: 'inventory.products', name: 'Store / Inventory', desc: 'Stock valuation, warehouses & SKU catalogs' },
                { id: 'inventory.purchases', name: 'Purchase Management', desc: 'Purchase orders, supplier bills & GRN' },
                { id: 'accounts.invoices', name: 'Invoices & Billing', desc: 'GST/Tax invoices, payments & receivables' },
                { id: 'hr.employees', name: 'HR & Employee Management', desc: 'Staff directory, salary slips & performance' },
                { id: 'hr.attendance', name: 'Attendance & Punch Clock', desc: 'Selfie verification & geofenced clock-in' },
                { id: 'hr.workRecording', name: 'Desktop Session Recording', desc: 'Screen recording, keystroke & app activity sync' },
                { id: 'hr.liveTracking', name: 'Live GPS Field Tracking', desc: 'Realtime map telemetry & breadcrumb logs' },
                { id: 'marketing.campaigns', name: 'Marketing Campaigns', desc: 'ROI tracking, lead attribution & budgets' },
                { id: 'marketing.tradeIndia', name: 'TradeIndia Connector', desc: 'Automated B2B lead ingestion sync' },
                { id: 'marketing.whatsApp', name: 'WhatsApp Business Gateway', desc: 'Direct chat templates & dispatch alerts' },
                { id: 'integrations', name: 'Enterprise Integrations', desc: 'Third-party webhooks & REST API connectors' },
                { id: 'reports', name: 'Central Reports Hub', desc: 'Cross-module audits, financial sheets & exports' }
              ].map(mod => {
                const parts = mod.id.split('.');
                const isEnabled = parts.length === 1
                  ? orgFeatures[parts[0]] !== false
                  : orgFeatures[parts[0]]?.[parts[1]] !== false;

                return (
                  <div
                    key={mod.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      isEnabled
                        ? 'bg-slate-900 border-slate-800'
                        : 'bg-slate-900/40 border-rose-900/30 opacity-70'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="text-xs font-bold text-white">{mod.name}</h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">{mod.desc}</p>
                      </div>

                      <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
                        <input
                          type="checkbox"
                          checked={isEnabled}
                          onChange={e => {
                            const checked = e.target.checked;
                            setOrgFeatures((prev: any) => {
                              if (parts.length === 1) {
                                return { ...prev, [parts[0]]: checked };
                              } else {
                                return {
                                  ...prev,
                                  [parts[0]]: {
                                    ...(prev[parts[0]] || {}),
                                    [parts[1]]: checked
                                  }
                                };
                              }
                            });
                          }}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                      </label>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                      <span className="text-slate-500">Enforcement:</span>
                      <span className={isEnabled ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
                        {isEnabled ? 'Enabled for Organization' : 'Disabled (403 Blocked)'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 5: LOGIN & SECURITY */}
        {activeTab === 'security' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Dedicated Portals Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Admin Portal Box */}
              <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                    <Shield className="w-4 h-4" />
                    <span>Client Administrator Login Gateway</span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 text-[10px] font-bold border border-amber-500/20">
                    White-Label Active
                  </span>
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono text-slate-300 break-all">
                  {adminLoginUrl}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyToClipboard(adminLoginUrl, 'admin_url_sec')}
                    className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 flex items-center justify-center gap-1.5 transition-colors"
                  >
                    {copiedKey === 'admin_url_sec' ? <CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>Copy Admin Login Link</span>
                  </button>
                  <a
                    href={adminLoginUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg flex items-center justify-center gap-1 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open</span>
                  </a>
                </div>
              </div>

              {/* Employee Portal Box */}
              <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-purple-400 font-bold text-xs">
                    <Users className="w-4 h-4" />
                    <span>Dedicated Employee Desk Login Gateway</span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 text-[10px] font-bold border border-purple-500/20">
                    White-Label Active
                  </span>
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono text-slate-300 break-all">
                  {employeeLoginUrl}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyToClipboard(employeeLoginUrl, 'emp_url_sec')}
                    className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 flex items-center justify-center gap-1.5 transition-colors"
                  >
                    {copiedKey === 'emp_url_sec' ? <CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>Copy Employee Login Link</span>
                  </button>
                  <a
                    href={employeeLoginUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Emergency Security Controls */}
            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-5">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2 text-rose-400">
                  <ShieldAlert className="w-5 h-5" />
                  Organization Security & Session Invalidation
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Global controls affecting all active sessions and user credentials belonging to <strong>{organization.name}</strong>.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex flex-col justify-between space-y-3">
                  <div>
                    <h4 className="text-xs font-bold text-white">Force Logout All Users</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Invalidates all JWT sessions for this client's admins and employees immediately.
                    </p>
                  </div>
                  <button
                    onClick={handleForceLogoutAll}
                    disabled={actionLoading}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg border border-slate-700 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <LogOut className="w-3.5 h-3.5 text-rose-400" />
                    <span>Force Logout All</span>
                  </button>
                </div>

                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex flex-col justify-between space-y-3">
                  <div>
                    <h4 className="text-xs font-bold text-white">Require Password Reset</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Forces every user to choose a new password upon their next login.
                    </p>
                  </div>
                  <button
                    onClick={handleForcePasswordResetAll}
                    disabled={actionLoading}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg border border-slate-700 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Key className="w-3.5 h-3.5 text-amber-400" />
                    <span>Force Reset on Next Login</span>
                  </button>
                </div>

                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex flex-col justify-between space-y-3">
                  <div>
                    <h4 className="text-xs font-bold text-white">Organization Status</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Current status is <strong>{organization.status}</strong>. Suspending blocks all API traffic instantly.
                    </p>
                  </div>
                  <button
                    onClick={async () => {
                      const next = organization.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
                      if (!confirm(`Are you sure you want to change organization status to ${next}?`)) return;
                      setActionLoading(true);
                      try {
                        const res = await api.patch(`/superadmin/organizations/${orgId}/status`, { status: next });
                        if (res.success) {
                          if (onOrganizationUpdated) onOrganizationUpdated({ ...organization, status: next });
                          fetchData();
                        }
                      } catch (err: any) {
                        alert(err.message || 'Failed to update status');
                      } finally {
                        setActionLoading(false);
                      }
                    }}
                    disabled={actionLoading}
                    className={`w-full py-2 text-xs font-bold rounded-lg border transition-colors flex items-center justify-center gap-1.5 ${
                      organization.status === 'ACTIVE'
                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20'
                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                    }`}
                  >
                    {organization.status === 'ACTIVE' ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    <span>{organization.status === 'ACTIVE' ? 'Suspend Organization' : 'Activate Organization'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: ACTIVITY LOGS */}
        {activeTab === 'activity' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-white">Tenant-Scoped Security & Audit Logs</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Showing administrative and user security events for <strong>{organization.name}</strong>.
                </p>
              </div>
              <button
                onClick={fetchData}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg border border-slate-700 flex items-center gap-1.5"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Refresh</span>
              </button>
            </div>

            {activityLogs.length === 0 ? (
              <div className="p-12 text-center text-slate-500 bg-slate-900/40 rounded-2xl border border-slate-800">
                <Activity className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                <p className="text-xs">No activity logs recorded yet for this organization.</p>
              </div>
            ) : (
              <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
                <div className="divide-y divide-slate-800/80">
                  {activityLogs.map((log, idx) => (
                    <div key={log._id || idx} className="p-4 flex items-start justify-between gap-4 hover:bg-slate-800/40 transition-colors">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-xl bg-slate-800 text-amber-400 border border-slate-700 mt-0.5">
                          <Activity className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-xs">{log.action || 'SECURITY_EVENT'}</span>
                            <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 text-[10px] font-mono border border-slate-700">
                              {log.module}
                            </span>
                          </div>
                          <p className="text-xs text-slate-300 mt-0.5">
                            {log.description || log.entity || 'Event logged by user'}
                          </p>
                          <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500 font-mono">
                            <span>User: {log.userName || 'System'}</span>
                            <span>•</span>
                            <span>{new Date(log.timestamp || log.createdAt).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* 4. MODALS & DRAWERS */}
      {/* ========================================================================= */}

      {/* SECURE ONE-TIME TEMPORARY PASSWORD MODAL */}
      {tempPasswordPayload && (
        <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-2xl border border-amber-500/40 shadow-2xl p-6 max-w-lg w-full space-y-5 animate-scaleUp">
            <div className="flex items-start gap-3.5">
              <div className="p-3 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/40">
                <Key className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Temporary Credentials Generated</h3>
                <p className="text-xs text-amber-300/90 mt-0.5 font-medium">
                  ⚠️ This temporary password will only be displayed ONCE. Copy and share it securely with the user.
                </p>
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block">Target Organization</span>
                <span className="text-xs font-bold text-white">{tempPasswordPayload.companyName}</span>
              </div>
              <div className="flex items-center justify-between border-t border-slate-800/80 pt-2">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block">User Email</span>
                  <span className="text-xs font-mono text-slate-200">{tempPasswordPayload.userEmail}</span>
                </div>
                <button
                  onClick={() => copyToClipboard(tempPasswordPayload.userEmail, 'modal_email')}
                  className="p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded-lg"
                  title="Copy Email"
                >
                  {copiedKey === 'modal_email' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <div className="flex items-center justify-between border-t border-slate-800/80 pt-2">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-amber-400 font-bold block">Temporary Password</span>
                  <span className="text-sm font-mono font-black text-amber-300 tracking-wider">
                    {tempPasswordPayload.tempPassword}
                  </span>
                </div>
                <button
                  onClick={() => copyToClipboard(tempPasswordPayload.tempPassword, 'modal_pass')}
                  className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg flex items-center gap-1 shadow"
                  title="Copy Password"
                >
                  {copiedKey === 'modal_pass' ? <CheckCheck className="w-3.5 h-3.5 text-slate-950" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Copy</span>
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                onClick={() => handleCopyAllLoginDetails(tempPasswordPayload)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs rounded-xl border border-slate-700 flex items-center justify-center gap-1.5 transition-colors"
              >
                {copiedKey === 'all_login_details' ? <CheckCheck className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>Copy All Login Details</span>
              </button>

              <button
                onClick={() => setTempPasswordPayload(null)}
                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-colors shadow"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD ADMIN MODAL */}
      {showAddAdminModal && (
        <AddAdminModal
          organization={organization}
          onClose={() => setShowAddAdminModal(false)}
          onSuccess={(newAdmin, tempPassword) => {
            setShowAddAdminModal(false);
            fetchData();
            if (tempPassword) {
              setTempPasswordPayload({
                companyName: organization.name,
                loginUrl: adminLoginUrl,
                userEmail: newAdmin.email,
                userName: newAdmin.name,
                userRole: newAdmin.role || 'Admin',
                tempPassword
              });
            }
          }}
        />
      )}

      {/* ADD EMPLOYEE MODAL */}
      {showAddEmpModal && (
        <AddEmployeeModal
          organization={organization}
          onClose={() => setShowAddEmpModal(false)}
          onSuccess={(data, tempPassword) => {
            setShowAddEmpModal(false);
            fetchData();
            if (tempPassword && data.employee) {
              setTempPasswordPayload({
                companyName: organization.name,
                loginUrl: employeeLoginUrl,
                userEmail: data.employee.email,
                userName: data.employee.name,
                userRole: 'Employee',
                tempPassword
              });
            }
          }}
        />
      )}

      {/* RESET PASSWORD MODAL */}
      {showResetPasswordModal && (
        <ResetPasswordModal
          user={showResetPasswordModal}
          organization={organization}
          onClose={() => setShowResetPasswordModal(null)}
          onSuccess={(user, tempPassword) => {
            setShowResetPasswordModal(null);
            fetchData();
            if (tempPassword) {
              setTempPasswordPayload({
                companyName: organization.name,
                loginUrl: user.role === 'EMPLOYEE' ? employeeLoginUrl : adminLoginUrl,
                userEmail: user.email,
                userName: user.name,
                userRole: user.role,
                tempPassword
              });
            }
          }}
        />
      )}

      {/* ADMIN DETAILS DRAWER */}
      {selectedAdminForDrawer && (
        <AdminDetailsDrawer
          admin={selectedAdminForDrawer}
          organization={organization}
          adminLoginUrl={adminLoginUrl}
          onClose={() => setSelectedAdminForDrawer(null)}
          onResetPassword={() => {
            const a = selectedAdminForDrawer;
            setSelectedAdminForDrawer(null);
            setShowResetPasswordModal(a);
          }}
          onToggleStatus={() => {
            handleToggleUserStatus(selectedAdminForDrawer);
            setSelectedAdminForDrawer(null);
          }}
        />
      )}

      {/* EMPLOYEE DETAILS DRAWER */}
      {selectedEmpForDrawer && (
        <EmployeeDetailsDrawer
          employee={selectedEmpForDrawer}
          organization={organization}
          employeeLoginUrl={employeeLoginUrl}
          onClose={() => setSelectedEmpForDrawer(null)}
        />
      )}
    </div>
  );
};

// =========================================================================
// SUBCOMPONENT: ADD ADMIN MODAL
// =========================================================================
interface AddAdminModalProps {
  organization: Organization;
  onClose: () => void;
  onSuccess: (admin: UserAccount, tempPassword?: string) => void;
}

const AddAdminModal: React.FC<AddAdminModalProps> = ({ organization, onClose, onSuccess }) => {
  const orgId = organization._id || organization.id;
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('Management');
  const [designation, setDesignation] = useState('Client Administrator');
  const [role, setRole] = useState('ADMIN');
  const [passMode, setPassMode] = useState<'AUTO' | 'MANUAL'>('AUTO');
  const [manualPassword, setManualPassword] = useState('');
  const [isPrimaryAdmin, setIsPrimaryAdmin] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setError('Name and email are required');
      return;
    }
    if (passMode === 'MANUAL' && manualPassword.length < 6) {
      setError('Manual password must be at least 6 characters');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await api.post<any>(`/superadmin/organizations/${orgId}/admins`, {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        department,
        designation,
        role,
        temporaryPassword: passMode === 'MANUAL' ? manualPassword : undefined,
        isPrimaryAdmin
      });

      if (res.success && res.data) {
        onSuccess(res.data, res.temporaryPassword);
      } else {
        setError(res.message || 'Failed to create admin');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create admin');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl p-6 max-w-lg w-full space-y-4 animate-scaleUp">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <Shield className="w-5 h-5 text-amber-400" />
            <span>Add Administrator for {organization.name}</span>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-400 block mb-1">Full Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Rahul Sharma"
                className="w-full px-3 py-2 bg-slate-950 text-white text-xs rounded-xl border border-slate-700 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-400 block mb-1">Email Address *</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@client.com"
                className="w-full px-3 py-2 bg-slate-950 text-white text-xs rounded-xl border border-slate-700 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-400 block mb-1">Phone</label>
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full px-3 py-2 bg-slate-950 text-white text-xs rounded-xl border border-slate-700 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-400 block mb-1">Department</label>
              <input
                type="text"
                value={department}
                onChange={e => setDepartment(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 text-white text-xs rounded-xl border border-slate-700 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-400 block mb-1">Role Type</label>
              <select
                value={role}
                onChange={e => setRole(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 text-white text-xs rounded-xl border border-slate-700 focus:outline-none focus:border-amber-500"
              >
                <option value="ADMIN">Full Administrator</option>
                <option value="HR_ADMIN">HR Administrator</option>
                <option value="SALES_MANAGER">Sales Manager</option>
                <option value="INVENTORY_MANAGER">Store Manager</option>
                <option value="ACCOUNTANT">Accountant</option>
              </select>
            </div>
          </div>

          {/* Password Options */}
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2.5">
            <span className="text-[11px] font-bold text-slate-300 block">Initial Temporary Password</span>
            <div className="flex items-center gap-4 text-xs">
              <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                <input
                  type="radio"
                  name="passMode"
                  checked={passMode === 'AUTO'}
                  onChange={() => setPassMode('AUTO')}
                  className="text-amber-500 focus:ring-0"
                />
                <span>Generate automatically (Recommended)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                <input
                  type="radio"
                  name="passMode"
                  checked={passMode === 'MANUAL'}
                  onChange={() => setPassMode('MANUAL')}
                  className="text-amber-500 focus:ring-0"
                />
                <span>Set manually</span>
              </label>
            </div>

            {passMode === 'MANUAL' && (
              <input
                type="text"
                value={manualPassword}
                onChange={e => setManualPassword(e.target.value)}
                placeholder="Enter minimum 6 characters password"
                className="w-full px-3 py-1.5 bg-slate-900 text-white text-xs rounded-lg border border-slate-700 focus:outline-none focus:border-amber-500"
              />
            )}
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={isPrimaryAdmin}
              onChange={e => setIsPrimaryAdmin(e.target.checked)}
              className="rounded text-amber-500 bg-slate-950 border-slate-700 focus:ring-0"
            />
            <span>Set as <strong>Primary Contact Administrator</strong> for this organization</span>
          </label>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-colors shadow disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Create Administrator'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// =========================================================================
// SUBCOMPONENT: ADD EMPLOYEE MODAL
// =========================================================================
interface AddEmployeeModalProps {
  organization: Organization;
  onClose: () => void;
  onSuccess: (data: any, tempPassword?: string) => void;
}

const AddEmployeeModal: React.FC<AddEmployeeModalProps> = ({ organization, onClose, onSuccess }) => {
  const orgId = organization._id || organization.id;
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [employeeId, setEmployeeId] = useState(`${organization.clientCode}-EMP-${Math.floor(100 + Math.random() * 900)}`);
  const [department, setDepartment] = useState('Sales');
  const [designation, setDesignation] = useState('Sales Executive');
  const [shift, setShift] = useState('Standard (09:00 - 18:00)');
  const [createLogin, setCreateLogin] = useState(true);
  const [passMode, setPassMode] = useState<'AUTO' | 'MANUAL'>('AUTO');
  const [manualPassword, setManualPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setError('Name and email are required');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await api.post<any>(`/superadmin/organizations/${orgId}/employees`, {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        employeeId: employeeId.trim(),
        department,
        designation,
        shift,
        createLoginAccount: createLogin,
        temporaryPassword: (createLogin && passMode === 'MANUAL') ? manualPassword : undefined
      });

      if (res.success && res.data) {
        onSuccess(res.data, res.temporaryPassword);
      } else {
        setError(res.message || 'Failed to create employee');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create employee');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl p-6 max-w-lg w-full space-y-4 animate-scaleUp">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <Users className="w-5 h-5 text-purple-400" />
            <span>Add Employee for {organization.name}</span>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-400 block mb-1">Employee ID *</label>
              <input
                type="text"
                required
                value={employeeId}
                onChange={e => setEmployeeId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 text-amber-300 font-mono text-xs rounded-xl border border-slate-700 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-400 block mb-1">Full Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Jack Thompson"
                className="w-full px-3 py-2 bg-slate-950 text-white text-xs rounded-xl border border-slate-700 focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-400 block mb-1">Email Address *</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="jack@client.com"
                className="w-full px-3 py-2 bg-slate-950 text-white text-xs rounded-xl border border-slate-700 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-400 block mb-1">Phone Number</label>
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+91 98000 11111"
                className="w-full px-3 py-2 bg-slate-950 text-white text-xs rounded-xl border border-slate-700 focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-400 block mb-1">Department</label>
              <select
                value={department}
                onChange={e => setDepartment(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 text-white text-xs rounded-xl border border-slate-700 focus:outline-none focus:border-purple-500"
              >
                <option value="Sales">Sales</option>
                <option value="Store">Store / Warehouse</option>
                <option value="Accounts">Accounts</option>
                <option value="HR">HR & Admin</option>
                <option value="Technical">Technical</option>
                <option value="Operations">Operations</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-400 block mb-1">Designation</label>
              <input
                type="text"
                value={designation}
                onChange={e => setDesignation(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 text-white text-xs rounded-xl border border-slate-700 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-400 block mb-1">Work Shift</label>
              <input
                type="text"
                value={shift}
                onChange={e => setShift(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 text-white text-xs rounded-xl border border-slate-700 focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          {/* Login Account Toggle */}
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2.5">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-xs font-bold text-slate-200">Provision User Login Account</span>
              <input
                type="checkbox"
                checked={createLogin}
                onChange={e => setCreateLogin(e.target.checked)}
                className="rounded text-purple-600 bg-slate-900 border-slate-700 focus:ring-0"
              />
            </label>

            {createLogin && (
              <div className="pt-2 border-t border-slate-800 flex items-center gap-4 text-xs">
                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="radio"
                    name="empPassMode"
                    checked={passMode === 'AUTO'}
                    onChange={() => setPassMode('AUTO')}
                    className="text-purple-600 focus:ring-0"
                  />
                  <span>Generate password automatically</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="radio"
                    name="empPassMode"
                    checked={passMode === 'MANUAL'}
                    onChange={() => setPassMode('MANUAL')}
                    className="text-purple-600 focus:ring-0"
                  />
                  <span>Manual</span>
                </label>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl transition-colors shadow disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Create Employee'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// =========================================================================
// SUBCOMPONENT: RESET PASSWORD MODAL
// =========================================================================
interface ResetPasswordModalProps {
  user: UserAccount;
  organization: Organization;
  onClose: () => void;
  onSuccess: (user: UserAccount, tempPassword?: string) => void;
}

const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({ user, organization, onClose, onSuccess }) => {
  const [passMode, setPassMode] = useState<'AUTO' | 'MANUAL'>('AUTO');
  const [manualPass, setManualPass] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleReset = async () => {
    if (passMode === 'MANUAL' && manualPass.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await api.post<any>(`/superadmin/users/${user._id}/reset-password`, {
        autoGenerate: passMode === 'AUTO',
        newPassword: passMode === 'MANUAL' ? manualPass : undefined
      });

      if (res.success) {
        onSuccess(user, res.temporaryPassword);
      } else {
        setError(res.message || 'Failed to reset password');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[95] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl p-6 max-w-md w-full space-y-4 animate-scaleUp">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <Lock className="w-5 h-5 text-amber-400" />
            <span>Reset Password: {user.name}</span>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-400">
          Reset credentials for <strong className="text-slate-200">{user.email}</strong> in <strong className="text-amber-400">{organization.name}</strong>.
        </p>

        {error && (
          <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400">
            {error}
          </div>
        )}

        <div className="space-y-3 bg-slate-950 p-3.5 rounded-xl border border-slate-800">
          <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer">
            <input
              type="radio"
              name="resetMode"
              checked={passMode === 'AUTO'}
              onChange={() => setPassMode('AUTO')}
              className="text-amber-500 focus:ring-0"
            />
            <span>Generate secure temporary password automatically</span>
          </label>

          <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer">
            <input
              type="radio"
              name="resetMode"
              checked={passMode === 'MANUAL'}
              onChange={() => setPassMode('MANUAL')}
              className="text-amber-500 focus:ring-0"
            />
            <span>Set password manually</span>
          </label>

          {passMode === 'MANUAL' && (
            <input
              type="text"
              value={manualPass}
              onChange={e => setManualPass(e.target.value)}
              placeholder="Enter new password (min 6 chars)"
              className="w-full px-3 py-1.5 bg-slate-900 text-white text-xs rounded-lg border border-slate-700 focus:outline-none focus:border-amber-500"
            />
          )}
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleReset}
            disabled={submitting}
            className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-colors shadow disabled:opacity-50"
          >
            {submitting ? 'Resetting...' : 'Reset & Generate'}
          </button>
        </div>
      </div>
    </div>
  );
};

// =========================================================================
// SUBCOMPONENT: ADMIN DETAILS DRAWER
// =========================================================================
interface AdminDetailsDrawerProps {
  admin: UserAccount;
  organization: Organization;
  adminLoginUrl: string;
  onClose: () => void;
  onResetPassword: () => void;
  onToggleStatus: () => void;
}

const AdminDetailsDrawer: React.FC<AdminDetailsDrawerProps> = ({
  admin,
  organization,
  adminLoginUrl,
  onClose,
  onResetPassword,
  onToggleStatus
}) => {
  return (
    <div className="fixed inset-0 z-[80] bg-slate-950/60 backdrop-blur-sm flex justify-end">
      <div className="bg-slate-900 border-l border-slate-800 w-full max-w-md h-full flex flex-col justify-between shadow-2xl p-6 overflow-y-auto animate-slideLeft">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-slate-950 font-black text-sm flex items-center justify-center shadow-lg">
                {admin.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
              </div>
              <div>
                <h3 className="text-base font-bold text-white">{admin.name}</h3>
                <span className="text-xs text-amber-400 font-mono">{admin.email}</span>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Section 1: Profile */}
          <div className="space-y-3">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Administrator Profile</span>
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Department:</span>
                <span className="text-white font-medium">{admin.department || 'Management'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Designation:</span>
                <span className="text-white font-medium">{admin.designation || 'Client Administrator'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Phone:</span>
                <span className="text-white font-mono">{admin.phone || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Role Authority:</span>
                <span className="text-amber-400 font-bold">{admin.roleName || admin.role}</span>
              </div>
            </div>
          </div>

          {/* Section 2: Organization Lock */}
          <div className="space-y-3">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Organization Membership</span>
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Client Organization:</span>
                <span className="text-white font-bold">{organization.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Client Code:</span>
                <span className="text-amber-300 font-mono">{organization.clientCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Primary Admin:</span>
                <span className={admin.isPrimaryAdmin ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                  {admin.isPrimaryAdmin ? 'Yes (Primary Contact)' : 'Secondary Admin'}
                </span>
              </div>
            </div>
          </div>

          {/* Section 3: Login Credentials & Security */}
          <div className="space-y-3">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Login & Security Status</span>
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Account Status:</span>
                <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${
                  admin.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                }`}>
                  {admin.status}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Stored Password:</span>
                <span className="text-slate-400 font-mono tracking-widest">••••••••••</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Last Login:</span>
                <span className="text-slate-300 font-mono">
                  {admin.lastLogin ? new Date(admin.lastLogin).toLocaleString() : 'Never'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Effective Permissions:</span>
                <span className="text-amber-400 font-bold">{admin.effectivePermissionCount || admin.effectivePermissions?.length || 0} modules</span>
              </div>
            </div>
          </div>
        </div>

        {/* Drawer Actions */}
        <div className="pt-6 border-t border-slate-800 space-y-2">
          <button
            onClick={onResetPassword}
            className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Reset Password</span>
          </button>

          <button
            onClick={onToggleStatus}
            className={`w-full py-2.5 text-xs font-bold rounded-xl border transition-colors flex items-center justify-center gap-1.5 ${
              admin.status === 'ACTIVE'
                ? 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20'
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
            }`}
          >
            {admin.status === 'ACTIVE' ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            <span>{admin.status === 'ACTIVE' ? 'Suspend Administrator' : 'Activate Administrator'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// =========================================================================
// SUBCOMPONENT: EMPLOYEE DETAILS DRAWER
// =========================================================================
interface EmployeeDetailsDrawerProps {
  employee: EmployeeRecord;
  organization: Organization;
  employeeLoginUrl: string;
  onClose: () => void;
}

const EmployeeDetailsDrawer: React.FC<EmployeeDetailsDrawerProps> = ({
  employee,
  organization,
  employeeLoginUrl,
  onClose
}) => {
  return (
    <div className="fixed inset-0 z-[80] bg-slate-950/60 backdrop-blur-sm flex justify-end">
      <div className="bg-slate-900 border-l border-slate-800 w-full max-w-md h-full flex flex-col justify-between shadow-2xl p-6 overflow-y-auto animate-slideLeft">
        <div className="space-y-6">
          <div className="flex items-start justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-600/20 text-purple-300 font-bold text-sm flex items-center justify-center border border-purple-500/30 shadow-lg">
                {employee.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
              </div>
              <div>
                <h3 className="text-base font-bold text-white">{employee.name}</h3>
                <span className="text-xs text-amber-400 font-mono font-bold">{employee.employeeId}</span>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Employee Details</span>
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Department:</span>
                <span className="text-white font-medium">{employee.department}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Designation:</span>
                <span className="text-white font-medium">{employee.designation}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Email:</span>
                <span className="text-white font-mono">{employee.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Phone:</span>
                <span className="text-white font-mono">{employee.phone || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Shift Schedule:</span>
                <span className="text-slate-200">{employee.shift || 'Standard (09:00 - 18:00)'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Joining Date:</span>
                <span className="text-slate-300 font-mono">{employee.joiningDate || '—'}</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Login Account</span>
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Login Account:</span>
                <span className={employee.userAccount ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                  {employee.userAccount ? 'Provisioned (Active)' : 'No account'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Desk Login URL:</span>
                <span className="text-purple-400 font-mono truncate max-w-[200px]">{employeeLoginUrl}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-800">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
