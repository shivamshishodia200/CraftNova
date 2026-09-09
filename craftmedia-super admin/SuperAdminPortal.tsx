import React, { useState, useEffect } from 'react';
import { useAuth } from '@/src/context/AuthContext';
import { api } from '@/src/services/api';
import { User, Role, Permission, AuditLog, AttendanceSettingsDoc, OfficeLocation } from '@/src/types';
import { CraftMediaLogo } from '@/src/components/common/CraftMediaLogo';
import {
  PageHeader,
  StatusBadge,
  Modal,
  EmptyState,
  exportToCSV
} from '@/src/components/common/UIComponents';
import {
  Shield,
  Users,
  KeyRound,
  FileText,
  Activity,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  RefreshCw,
  Download,
  Lock,
  Unlock,
  SlidersHorizontal,
  Server,
  Database,
  Eye,
  Check,
  X,
  ExternalLink,
  ChevronRight,
  UserPlus,
  ShieldCheck,
  AlertTriangle,
  ArrowLeft,
  MapPin,
  Building2,
  Compass,
  Clock,
  Camera,
  Navigation,
  Monitor,
  Cpu,
  Zap,
  WifiOff,
  Timer,
  Sun,
  Moon
} from 'lucide-react';

import { OrganizationManagementView } from './OrganizationManagementView';

export const SuperAdminPortal: React.FC = () => {
  const { user, logout, setActivePortal } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'organizations' | 'admins' | 'access' | 'roles' | 'audit' | 'system' | 'attendance'>('overview');
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isLightMode, setIsLightMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('superadmin_theme');
    return saved !== null ? saved === 'light' : true; // DEFAULT TO LIGHT MODE
  });



  // Attendance Security Settings State
  const [attSettings, setAttSettings] = useState<AttendanceSettingsDoc | null>(null);
  const [attLoading, setAttLoading] = useState(false);
  const [attSaving, setAttSaving] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<OfficeLocation | null>(null);
  const [locationForm, setLocationForm] = useState({
    name: '',
    lat: 28.6139,
    lng: 77.2090,
    radiusMeters: 100,
    address: '',
    enabled: true
  });
  const [detectingGps, setDetectingGps] = useState(false);

  // Admins & Users State
  const [usersList, setUsersList] = useState<User[]>([]);
  const [rolesList, setRolesList] = useState<Role[]>([]);
  const [permissionsGrouped, setPermissionsGrouped] = useState<Record<string, Permission[]>>({});
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // User Modals
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    role: 'ADMIN',
    organization: 'Craft Media Hub',
    customPermissions: [] as string[],
  });

  // Permissions Customization Modal
  const [isPermModalOpen, setIsPermModalOpen] = useState(false);
  const [selectedUserForPerms, setSelectedUserForPerms] = useState<User | null>(null);
  const [customPerms, setCustomPerms] = useState<string[]>([]);
  const [showLoginCredentials, setShowLoginCredentials] = useState(true);

  // Role Modals
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [roleForm, setRoleForm] = useState({
    name: '',
    code: '',
    description: '',
    permissions: [] as string[]
  });

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditActionFilter, setAuditActionFilter] = useState('');
  const [selectedLogDetail, setSelectedLogDetail] = useState<AuditLog | null>(null);

  // Fetch SuperAdmin Overview Stats
  const fetchStats = async () => {
    setLoading(true);
    const res = await api.get('/superadmin/stats');
    if (res.success && res.data) {
      setStats(res.data);
    }
    setLoading(false);
  };

  // Fetch Users
  const fetchUsers = async () => {
    const res = await api.get('/users', { search: userSearch, role: roleFilter, status: statusFilter });
    if (res.success && res.data) {
      setUsersList(res.data);
    }
  };

  // Fetch Roles & Permissions
  const fetchRolesAndPermissions = async () => {
    const rolesRes = await api.get('/roles');
    if (rolesRes.success && rolesRes.data) {
      setRolesList(rolesRes.data);
    }
    const permRes = await api.get('/permissions');
    if (permRes.success && permRes.data) {
      setAllPermissions(permRes.data.all || []);
      setPermissionsGrouped(permRes.data.grouped || {});
    }
  };

  // Fetch Audit Logs
  const fetchAuditLogs = async () => {
    const res = await api.get('/audit-logs', { action: auditActionFilter, search: auditSearch });
    if (res.success && res.data) {
      setAuditLogs(res.data.logs || []);
    }
  };

  // Fetch Attendance Security Settings
  const fetchAttendanceSettings = async () => {
    setAttLoading(true);
    const res = await api.get('/attendance/settings');
    if (res.success && res.data) {
      setAttSettings(res.data);
    }
    setAttLoading(false);
  };

  const handleSaveAttendanceToggles = async (updates: Partial<AttendanceSettingsDoc>) => {
    try {
      setAttSaving(true);
      const payload = {
        ...attSettings,
        ...updates
      };
      const res = await api.put('/attendance/settings', payload);
      if (res.success && res.data) {
        setAttSettings(res.data);
        alert('Attendance Security Policy updated successfully!');
      } else {
        alert(res.message || 'Failed to update attendance security settings');
      }
    } catch (err: any) {
      alert('Error updating settings: ' + err.message);
    } finally {
      setAttSaving(false);
    }
  };

  const handleSaveLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingLocation) {
        const res = await api.put(`/attendance/settings/locations/${editingLocation.id}`, locationForm);
        if (res.success && res.data) {
          setAttSettings(res.data);
          setIsLocationModalOpen(false);
          setEditingLocation(null);
        } else {
          alert(res.message || 'Failed to update location');
        }
      } else {
        const res = await api.post('/attendance/settings/locations', locationForm);
        if (res.success && res.data) {
          setAttSettings(res.data);
          setIsLocationModalOpen(false);
        } else {
          alert(res.message || 'Failed to add location');
        }
      }
    } catch (err: any) {
      alert('Error saving location: ' + err.message);
    }
  };

  const handleDeleteLocation = async (locId: string) => {
    if (!window.confirm('Are you sure you want to remove this office location?')) return;
    const res = await api.delete(`/attendance/settings/locations/${locId}`);
    if (res.success && res.data) {
      setAttSettings(res.data);
    } else {
      alert(res.message || 'Failed to delete location');
    }
  };

  const handleToggleLocation = async (loc: OfficeLocation) => {
    const res = await api.put(`/attendance/settings/locations/${loc.id}`, {
      ...loc,
      enabled: !loc.enabled
    });
    if (res.success && res.data) {
      setAttSettings(res.data);
    }
  };

  const handleDetectCurrentGps = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }
    setDetectingGps(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLocationForm(prev => ({
          ...prev,
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
          radiusMeters: prev.radiusMeters || 100
        }));
        setDetectingGps(false);
        alert(`Detected current coordinates: Lat ${pos.coords.latitude.toFixed(6)}, Lng ${pos.coords.longitude.toFixed(6)}`);
      },
      err => {
        setDetectingGps(false);
        alert('Could not detect GPS: ' + err.message);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  useEffect(() => {
    fetchStats();
    fetchUsers();
    fetchRolesAndPermissions();
    fetchAuditLogs();
    fetchAttendanceSettings();
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [userSearch, roleFilter, statusFilter]);

  useEffect(() => {
    fetchAuditLogs();
  }, [auditSearch, auditActionFilter]);

  // Handle Save User
  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser) {
      const res = await api.put(`/users/${editingUser.id || editingUser._id}`, {
        name: userForm.name,
        phone: userForm.phone,
        role: userForm.role,
        organization: userForm.organization,
        customPermissions: userForm.customPermissions,
        permissionMode: 'REPLACE'
      });
      if (res.success) {
        setIsUserModalOpen(false);
        setEditingUser(null);
        fetchUsers();
        fetchStats();
      } else {
        alert(res.message);
      }
    } else {
      const res = await api.post('/users', userForm);
      if (res.success) {
        setIsUserModalOpen(false);
        fetchUsers();
        fetchStats();
      } else {
        alert(res.message);
      }
    }
  };

  // Toggle User Status
  const handleToggleStatus = async (userId: string) => {
    const res = await api.patch(`/users/${userId}/status`);
    if (res.success) {
      fetchUsers();
      fetchStats();
    }
  };

  const handleResetPassword = async (targetUser: User) => {
    const newPassword = window.prompt(`Set a new password for ${targetUser.name} (minimum 6 characters):`);
    if (!newPassword) return;
    if (newPassword.length < 6) {
      alert('Password must be at least 6 characters long.');
      return;
    }

    const userId = targetUser.id || targetUser._id;
    const res = await api.post(`/users/${userId}/reset-password`, { newPassword });
    alert(res.success ? `Password reset successfully for ${targetUser.name}` : (res.message || 'Password reset failed'));
  };

  const handleToggleLoginVisibility = async (targetUser: User) => {
    const userId = targetUser.id || targetUser._id;
    const res = await api.put(`/users/${userId}/permissions`, {
      customPermissions: targetUser.customPermissions || [],
      showLoginCredentials: targetUser.showLoginCredentials !== false,
      showOnLogin: targetUser.showOnLogin === false
    });
    if (res.success) {
      fetchUsers();
    } else {
      alert(res.message || 'Login visibility update failed');
    }
  };

  // Open Permission Matrix for User
  const handleOpenUserPermissions = (targetUser: User) => {
    setSelectedUserForPerms(targetUser);
    setCustomPerms(targetUser.customPermissions || targetUser.permissions || []);
    setShowLoginCredentials(targetUser.showLoginCredentials !== false);
    setIsPermModalOpen(true);
  };

  // Save User Permissions Override
  const handleSaveUserPermissions = async () => {
    if (!selectedUserForPerms) return;
    const userId = selectedUserForPerms.id || selectedUserForPerms._id;
    const res = await api.put(`/users/${userId}/permissions`, {
      customPermissions: customPerms,
      showLoginCredentials
    });
    if (res.success) {
      setIsPermModalOpen(false);
      fetchUsers();
      alert(`Permissions updated successfully for ${selectedUserForPerms.name}`);
    } else {
      alert(res.message);
    }
  };

  // Handle Save Role
  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingRole) {
      const res = await api.put(`/roles/${editingRole._id}`, roleForm);
      if (res.success) {
        setIsRoleModalOpen(false);
        setEditingRole(null);
        fetchRolesAndPermissions();
      } else {
        alert(res.message);
      }
    } else {
      const res = await api.post('/roles', roleForm);
      if (res.success) {
        setIsRoleModalOpen(false);
        fetchRolesAndPermissions();
        fetchStats();
      } else {
        alert(res.message);
      }
    }
  };

  const togglePermissionSelection = (code: string) => {
    if (customPerms.includes(code)) {
      setCustomPerms(customPerms.filter(p => p !== code));
    } else {
      setCustomPerms([...customPerms, code]);
    }
  };

  const toggleProvisionPermission = (code: string) => {
    setUserForm(prev => ({
      ...prev,
      customPermissions: prev.customPermissions.includes(code)
        ? prev.customPermissions.filter(permission => permission !== code)
        : [...prev.customPermissions, code]
    }));
  };

  const toggleRolePermissionSelection = (code: string) => {
    if (roleForm.permissions.includes(code)) {
      setRoleForm({
        ...roleForm,
        permissions: roleForm.permissions.filter(p => p !== code)
      });
    } else {
      setRoleForm({
        ...roleForm,
        permissions: [...roleForm.permissions, code]
      });
    }
  };

  const selectAllCategory = (categoryPerms: Permission[]) => {
    const codes = categoryPerms.map(p => p.code);
    const set = new Set([...customPerms, ...codes]);
    setCustomPerms(Array.from(set));
  };

  const clearAllCategory = (categoryPerms: Permission[]) => {
    const codes = new Set(categoryPerms.map(p => p.code));
    setCustomPerms(customPerms.filter(p => !codes.has(p)));
  };

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-150 ${isLightMode ? 'superadmin-light bg-[#f8fafc] text-slate-800' : 'superadmin-dark bg-slate-900 text-slate-100'}`}>
      {/* Top Super Admin Navigation Bar */}
      <header className="bg-slate-950/90 backdrop-blur-md border-b border-slate-800 px-6 py-3.5 flex items-center justify-between sticky top-0 z-40 relative overflow-hidden">

        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600" />
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <CraftMediaLogo size={36} />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-black text-white uppercase tracking-wider">CRAFT MEDIA HUB SUPER ADMIN</h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  ROOT CONTROL
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Enterprise RBAC, Multi-Admin Governance & Audit Vault</p>
            </div>
          </div>
        </div>

        {/* Center Tabs */}
        <div className="hidden md:flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'overview'
                ? 'bg-gradient-to-r from-amber-500 via-orange-600 to-rose-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            Overview
          </button>
          <button
            onClick={() => setActiveTab('organizations')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'organizations'
                ? 'bg-gradient-to-r from-amber-500 via-orange-600 to-rose-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            Clients & White-Label
          </button>
          <button
            onClick={() => setActiveTab('admins')}

            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'admins'
                ? 'bg-gradient-to-r from-amber-500 via-orange-600 to-rose-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Admins & Users
          </button>
          <button
            onClick={() => setActiveTab('access')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'access'
                ? 'bg-gradient-to-r from-amber-500 via-orange-600 to-rose-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Admin Access
          </button>
          <button
            onClick={() => setActiveTab('roles')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'roles'
                ? 'bg-gradient-to-r from-amber-500 via-orange-600 to-rose-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            Roles & Matrix
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'audit'
                ? 'bg-gradient-to-r from-amber-500 via-orange-600 to-rose-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Audit Logs
          </button>
          <button
            onClick={() => setActiveTab('attendance')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'attendance'
                ? 'bg-gradient-to-r from-amber-500 via-orange-600 to-rose-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            Attendance Security
          </button>
          <button
            onClick={() => setActiveTab('system')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'system'
                ? 'bg-gradient-to-r from-amber-500 via-orange-600 to-rose-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            System & Node
          </button>
        </div>

        {/* Right Switch to CRM View & Theme Toggle */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setIsLightMode(prev => {
                const next = !prev;
                localStorage.setItem('superadmin_theme', next ? 'light' : 'dark');
                return next;
              });
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all shadow-2xs ${
              isLightMode
                ? 'bg-amber-500/10 text-amber-600 border-amber-300/40 hover:bg-amber-500/20'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
            title={isLightMode ? "Switch to Dark Mode" : "Switch to Light Mode"}
          >
            {isLightMode ? <Sun className="w-3.5 h-3.5 text-amber-500" /> : <Moon className="w-3.5 h-3.5 text-slate-400" />}
            <span>{isLightMode ? 'Light' : 'Dark'}</span>
          </button>

          <button
            onClick={() => setActivePortal('admin')}

            className="flex items-center gap-2 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-semibold rounded-xl border border-slate-700 transition-all active:scale-95 shadow-2xs"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-amber-400" />
            <span>Switch to CRM Portal</span>
          </button>
          <button
            onClick={logout}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold rounded-xl border border-rose-500/30 transition-all"
            title="Logout"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-rose-600 text-white flex items-center justify-center text-xs font-bold ring-2 ring-amber-400/30">
            {user?.avatar || 'SA'}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full space-y-8 animate-in fade-in duration-150">
        {/* ============================================================== */}
        {/* 0. ORGANIZATIONS / CLIENTS TAB */}
        {/* ============================================================== */}
        {activeTab === 'organizations' && <OrganizationManagementView />}

        {/* ============================================================== */}
        {/* 1. OVERVIEW TAB */}
        {/* ============================================================== */}
        {activeTab === 'overview' && (

          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-white tracking-tight">Super Administrator Control Center</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Global administration, role-based access enforcement, security monitoring and live database telemetry.
                </p>
              </div>
              <button
                onClick={fetchStats}
                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 self-start"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                Refresh Telemetry
              </button>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="bg-slate-800/80 rounded-2xl p-6 border border-slate-700/80 shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Administrators</span>
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-4 flex items-baseline gap-2">
                  <h3 className="text-3xl font-black text-white">{stats?.totalAdmins || 0}</h3>
                  <span className="text-xs text-emerald-400 font-semibold">{stats?.activeAdmins || 0} Active</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-2">Full system privileges assigned</p>
              </div>

              <div className="bg-slate-800/80 rounded-2xl p-6 border border-slate-700/80 shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Users & Staff</span>
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold">
                    <Users className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-4 flex items-baseline gap-2">
                  <h3 className="text-3xl font-black text-white">{stats?.totalUsers || 0}</h3>
                  <span className="text-xs text-indigo-400 font-semibold">{stats?.activeUsers || 0} Active</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-2">Across 6 operational divisions</p>
              </div>

              <div className="bg-slate-800/80 rounded-2xl p-6 border border-slate-700/80 shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Configured Roles</span>
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold">
                    <KeyRound className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-4 flex items-baseline gap-2">
                  <h3 className="text-3xl font-black text-white">{stats?.totalRoles || 0}</h3>
                  <span className="text-xs text-purple-400 font-semibold">{stats?.totalPermissions || 43} Granular Codes</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-2">Custom & system security matrices</p>
              </div>

              <div className="bg-slate-800/80 rounded-2xl p-6 border border-slate-700/80 shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Audit Trail Events</span>
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
                    <FileText className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-4 flex items-baseline gap-2">
                  <h3 className="text-3xl font-black text-white">{stats?.totalAuditLogs || 0}</h3>
                  <span className="text-xs text-emerald-400 font-semibold">100% Immutable</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-2">Real-time mutation logging active</p>
              </div>
            </div>

            {/* Quick Actions & System Health */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-slate-800/80 rounded-2xl p-6 border border-slate-700/80 shadow-lg space-y-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-blue-400" />
                  Fast Governance Actions
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <button
                    onClick={() => {
                      setEditingUser(null);
                      setUserForm({
                        name: '',
                        email: '',
                        password: '',
                        phone: '',
                        role: 'ADMIN',
                        organization: 'Craft Media Hub',
                        customPermissions: []
                      });
                      setIsUserModalOpen(true);
                    }}
                    className="p-4 bg-slate-900/80 hover:bg-slate-900 border border-slate-700 hover:border-blue-500/50 rounded-xl text-left transition-all group"
                  >
                    <UserPlus className="w-5 h-5 text-blue-400 mb-2 group-hover:scale-110 transition-transform" />
                    <h4 className="text-xs font-bold text-white">Create New Admin</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">Provision credentials & assign base role</p>
                  </button>

                  <button
                    onClick={() => {
                      setEditingRole(null);
                      setRoleForm({ name: '', code: '', description: '', permissions: [] });
                      setIsRoleModalOpen(true);
                    }}
                    className="p-4 bg-slate-900/80 hover:bg-slate-900 border border-slate-700 hover:border-indigo-500/50 rounded-xl text-left transition-all group"
                  >
                    <KeyRound className="w-5 h-5 text-indigo-400 mb-2 group-hover:scale-110 transition-transform" />
                    <h4 className="text-xs font-bold text-white">Add Custom Role</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">Define custom permission matrix</p>
                  </button>

                  <button
                    onClick={() => exportToCSV('CraftMediaHub_Full_Audit_Vault', auditLogs)}
                    className="p-4 bg-slate-900/80 hover:bg-slate-900 border border-slate-700 hover:border-amber-500/50 rounded-xl text-left transition-all group"
                  >
                    <Download className="w-5 h-5 text-amber-400 mb-2 group-hover:scale-110 transition-transform" />
                    <h4 className="text-xs font-bold text-white">Export Audit Vault</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">Download full CSV of all system logs</p>
                  </button>
                </div>

                <div className="pt-4 border-t border-slate-700/60 flex items-center justify-between text-xs text-slate-400">
                  <span>Organization Name: <strong className="text-slate-200">CRAFT MEDIA HUB ENTERPRISES</strong></span>
                  <span>Environment: <strong className="text-emerald-400">Production Ready</strong></span>
                </div>
              </div>

              <div className="bg-slate-800/80 rounded-2xl p-6 border border-slate-700/80 shadow-lg space-y-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Database className="w-4 h-4 text-amber-400" />
                  Live Persistence Telemetry
                </h3>
                <div className="space-y-3 text-xs">
                  <div className="flex justify-between items-center py-2 border-b border-slate-700/50">
                    <span className="text-slate-400">Database Engine</span>
                    <span className="font-semibold text-amber-400">MongoDB / Memory Store</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-700/50">
                    <span className="text-slate-400">System Health</span>
                    <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-400">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      OPERATIONAL
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-700/50">
                    <span className="text-slate-400">API Uptime</span>
                    <span className="font-semibold text-slate-200">99.99%</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-slate-400">Auth Token Guard</span>
                    <span className="font-mono text-amber-400">JWT + RBAC Middleware</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* 2. ADMINS & USERS TAB */}
        {/* ============================================================== */}
        {activeTab === 'admins' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-white tracking-tight">Administrators & User Directory</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Manage login accounts, toggle active status, assign default roles or configure granular user permission overrides.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => exportToCSV('CraftMediaHub_Admin_Directory', usersList)}
                  className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold rounded-xl"
                >
                  <Download className="w-4 h-4 text-slate-400" />
                  Export CSV
                </button>
                <button
                  onClick={() => {
                    setEditingUser(null);
                    setUserForm({
                      name: '',
                      email: '',
                      password: '',
                      phone: '',
                      role: 'ADMIN',
                      organization: 'Craft Media Hub',
                      customPermissions: []
                    });
                    setIsUserModalOpen(true);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  Add New User
                </button>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/80 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search user name or email..."
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-xl text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <select
                  value={roleFilter}
                  onChange={e => setRoleFilter(e.target.value)}
                  className="text-xs bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-200"
                >
                  <option value="">All Roles</option>
                  <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                  <option value="ADMIN">ADMIN</option>
                  <option value="SALES_EMPLOYEE">SALES_EMPLOYEE</option>
                  <option value="STORE_EMPLOYEE">STORE_EMPLOYEE</option>
                  <option value="ACCOUNTANT">ACCOUNTANT</option>
                  <option value="HR_EMPLOYEE">HR_EMPLOYEE</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="text-xs bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-200"
                >
                  <option value="">All Statuses</option>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-slate-800/80 rounded-2xl border border-slate-700/80 shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/80 border-b border-slate-700/80 text-slate-400 font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-3.5">User Identity</th>
                      <th className="px-6 py-3.5">Assigned Role</th>
                      <th className="px-6 py-3.5">Custom Permissions</th>
                      <th className="px-6 py-3.5">Show on Login</th>
                      <th className="px-6 py-3.5">Status</th>
                      <th className="px-6 py-3.5 text-right">Actions & RBAC</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50 font-medium text-slate-300">
                    {usersList.map(u => {
                      const uId = u.id || u._id || '';
                      return (
                        <tr key={uId} className="hover:bg-slate-700/30 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold text-xs">
                                {u.avatar || u.name.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-bold text-white flex items-center gap-2">
                                  {u.name}
                                  {u.role === 'SUPER_ADMIN' && (
                                    <span className="px-1.5 py-0.2 rounded text-[9px] bg-blue-500/20 text-blue-400 font-bold border border-blue-500/30">
                                      ROOT
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-400 font-normal">
                                  {u.showLoginCredentials === false ? 'Login email hidden' : u.email}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <button
                              type="button"
                              onClick={() => handleToggleLoginVisibility(u)}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                                u.showOnLogin !== false
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                                  : 'bg-slate-900 text-slate-500 border-slate-700 hover:text-slate-300'
                              }`}
                              title={u.showOnLogin !== false ? 'Hide from login page' : 'Show on login page'}
                            >
                              {u.showOnLogin !== false ? <Eye className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5 opacity-50" />}
                              {u.showOnLogin !== false ? 'Enabled' : 'Disabled'}
                            </button>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-900 text-blue-400 border border-slate-700 font-mono">
                              {u.role}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {u.role === 'SUPER_ADMIN' ? (
                              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                                <ShieldCheck className="w-3.5 h-3.5" />
                                All 43 Privileges
                              </span>
                            ) : u.customPermissions && u.customPermissions.length > 0 ? (
                              <span className="text-amber-400 font-semibold">
                                {u.customPermissions.length} Custom Overrides
                              </span>
                            ) : (
                              <span className="text-slate-500 font-normal">Inherited from Role</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                u.status === 'ACTIVE'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              }`}
                            >
                              {u.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {/* Customize Permissions Button */}
                              {u.role !== 'SUPER_ADMIN' && (
                                <button
                                  onClick={() => handleOpenUserPermissions(u)}
                                  className="px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg text-xs font-semibold border border-blue-500/30 transition-colors flex items-center gap-1"
                                  title="Customize Granular Permissions"
                                >
                                  <KeyRound className="w-3.5 h-3.5" />
                                  Edit Matrix
                                </button>
                              )}

                              {u.role !== 'SUPER_ADMIN' && (
                                <button
                                  onClick={() => handleResetPassword(u)}
                                  className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg"
                                  title="Reset Password"
                                >
                                  <KeyRound className="w-4 h-4" />
                                </button>
                              )}

                              {/* Toggle Status */}
                              {u.role !== 'SUPER_ADMIN' && (
                                <button
                                  onClick={() => handleToggleStatus(uId)}
                                  className={`p-1.5 rounded-lg transition-colors ${
                                    u.status === 'ACTIVE'
                                      ? 'text-slate-400 hover:text-rose-400 hover:bg-rose-500/10'
                                      : 'text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10'
                                  }`}
                                  title={u.status === 'ACTIVE' ? 'Disable Account' : 'Enable Account'}
                                >
                                  {u.status === 'ACTIVE' ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4 text-emerald-400" />}
                                </button>
                              )}

                              {/* Edit Profile */}
                              <button
                                onClick={() => {
                                  setEditingUser(u);
                                  setUserForm({
                                    name: u.name,
                                    email: u.email,
                                    password: '',
                                    phone: u.phone || '',
                                    role: u.role,
                                    organization: u.organization || 'Craft Media Hub',
                                    customPermissions: u.customPermissions || [],
                                  });
                                  setIsUserModalOpen(true);
                                }}
                                className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded-lg"
                                title="Edit User"
                              >
                                <Edit2 className="w-4 h-4" />
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
          </div>
        )}

        {/* ============================================================== */}
        {/* 3. ADMIN ACCESS CONTROL TAB */}
        {/* ============================================================== */}
        {activeTab === 'access' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-white tracking-tight">Admin Access Control</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Create admin credentials and decide which CRM sections and actions each admin can use.
                </p>
              </div>
              <button
                onClick={() => {
                  setEditingUser(null);
                  setUserForm({
                    name: '',
                    email: '',
                    password: '',
                    phone: '',
                    role: 'ADMIN',
                    organization: 'Craft Media Hub',
                    customPermissions: []
                  });
                  setIsUserModalOpen(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs"
              >
                <UserPlus className="w-4 h-4" />
                Create Admin Access
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {usersList.filter(account => account.role !== 'SUPER_ADMIN').map(account => {
                const accountId = account.id || account._id || '';
                const role = rolesList.find(item => item.code === account.role);
                const effectiveCount = new Set([...(role?.permissions || []), ...(account.customPermissions || [])]).size;
                return (
                  <div key={accountId} className="bg-slate-800/80 rounded-2xl p-5 border border-slate-700/80 shadow-lg">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold text-xs">
                          {account.avatar || account.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-bold text-white truncate">{account.name}</h3>
                          <p className="text-[11px] text-slate-400 truncate">{account.email}</p>
                        </div>
                      </div>
                      <span className={`shrink-0 px-2 py-1 rounded-full text-[10px] font-bold border ${account.status === 'ACTIVE' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-rose-400 bg-rose-500/10 border-rose-500/20'}`}>
                        {account.status}
                      </span>
                    </div>
                    <div className="mt-4 flex items-center justify-between text-xs">
                      <span className="text-slate-400">Role: <strong className="text-blue-400">{account.role}</strong></span>
                      <span className="text-slate-400">Access: <strong className="text-emerald-400">{effectiveCount} permissions</strong></span>
                    </div>
                    <button
                      onClick={() => handleOpenUserPermissions(account)}
                      className="mt-4 w-full inline-flex items-center justify-center gap-2 px-3 py-2 bg-slate-900 hover:bg-slate-950 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700"
                    >
                      <KeyRound className="w-3.5 h-3.5 text-blue-400" />
                      Configure Sections & Permissions
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* 4. ROLES & RBAC MATRIX TAB */}
        {/* ============================================================== */}
        {activeTab === 'roles' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-white tracking-tight">Roles & RBAC Permission Schemas</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Define role templates and assign default access rules across 8 operational business modules.
                </p>
              </div>
              <button
                onClick={() => {
                  setEditingRole(null);
                  setRoleForm({ name: '', code: '', description: '', permissions: [] });
                  setIsRoleModalOpen(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs"
              >
                <Plus className="w-4 h-4" />
                Create Role
              </button>
            </div>

            {/* Roles Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {rolesList.map(r => (
                <div
                  key={r._id}
                  className="bg-slate-800/80 rounded-2xl p-6 border border-slate-700/80 shadow-lg space-y-4 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-1 bg-slate-900 text-blue-400 rounded-lg font-mono text-xs font-bold border border-slate-700">
                        {r.code}
                      </span>
                      {r.isSystem ? (
                        <span className="px-2 py-0.5 bg-purple-500/10 text-purple-400 rounded-full text-[10px] font-bold border border-purple-500/20">
                          SYSTEM ROLE
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-full text-[10px] font-bold border border-emerald-500/20">
                          CUSTOM
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-white mt-3">{r.name}</h3>
                    <p className="text-xs text-slate-400 mt-1">{r.description || 'No description provided.'}</p>
                  </div>

                  <div className="pt-4 border-t border-slate-700/60 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Granted Permissions:</span>
                      <strong className="text-emerald-400 font-bold">
                        {r.code === 'SUPER_ADMIN' ? 'All (43)' : `${r.permissions?.length || 0} Codes`}
                      </strong>
                    </div>

                    {r.code !== 'SUPER_ADMIN' && (
                      <button
                        onClick={() => {
                          setEditingRole(r);
                          setRoleForm({
                            name: r.name,
                            code: r.code,
                            description: r.description,
                            permissions: r.permissions || []
                          });
                          setIsRoleModalOpen(true);
                        }}
                        className="w-full py-2 bg-slate-900 hover:bg-slate-950 text-slate-200 hover:text-white rounded-xl text-xs font-semibold border border-slate-700 transition-colors flex items-center justify-center gap-2"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-blue-400" />
                        Edit Role Matrix
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Permission Taxonomy Reference */}
            <div className="bg-slate-800/80 rounded-2xl p-6 border border-slate-700/80 space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-purple-400" />
                Global Permission Code Taxonomy ({allPermissions.length} Total Codes)
              </h3>
              <p className="text-xs text-slate-400">
                The platform utilizes fine-grained dot-notation permissions (e.g. <code>leads.create</code>, <code>invoices.approve</code>).
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                {(Object.entries(permissionsGrouped) as [string, Permission[]][]).map(([category, perms]) => (
                  <div key={category} className="p-4 bg-slate-900/90 rounded-xl border border-slate-700/60 space-y-2">
                    <div className="flex justify-between items-center">
                      <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider">{category}</h4>
                      <span className="text-[11px] text-slate-500 font-semibold">{perms.length} actions</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {perms.map(p => (
                        <span
                          key={p.code}
                          className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded text-[10px] font-mono border border-slate-700"
                          title={p.description}
                        >
                          {p.code}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* 4. AUDIT LOGS TAB */}
        {/* ============================================================== */}
        {activeTab === 'audit' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-white tracking-tight">Security & Mutation Audit Vault</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Immutable record of user logins, role modifications, record mutations, and administrative activities.
                </p>
              </div>
              <button
                onClick={() => exportToCSV('CraftMediaHub_Audit_Logs', auditLogs)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 via-orange-600 to-rose-600 text-white text-xs font-semibold rounded-xl shadow-xs self-start"
              >
                <Download className="w-4 h-4" />
                Export Audit CSV
              </button>
            </div>

            {/* Filter Bar */}
            <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/80 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search audit by user, action or module..."
                  value={auditSearch}
                  onChange={e => setAuditSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-xl text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <select
                  value={auditActionFilter}
                  onChange={e => setAuditActionFilter(e.target.value)}
                  className="text-xs bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-200"
                >
                  <option value="">All Action Types</option>
                  <option value="LOGIN">LOGIN</option>
                  <option value="USER_CREATED">USER_CREATED</option>
                  <option value="PERMISSION_CHANGED">PERMISSION_CHANGED</option>
                  <option value="ROLE_CHANGED">ROLE_CHANGED</option>
                  <option value="UPDATE">UPDATE</option>
                  <option value="STOCK_IN">STOCK_IN</option>
                  <option value="STOCK_OUT">STOCK_OUT</option>
                </select>
              </div>
            </div>

            {/* Audit Logs Table */}
            <div className="bg-slate-800/80 rounded-2xl border border-slate-700/80 shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/80 border-b border-slate-700/80 text-slate-400 font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-3.5">Timestamp</th>
                      <th className="px-6 py-3.5">Actor / User</th>
                      <th className="px-6 py-3.5">Action Executed</th>
                      <th className="px-6 py-3.5">Module & Entity</th>
                      <th className="px-6 py-3.5">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50 font-medium text-slate-300">
                    {auditLogs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-12 text-slate-500">
                          No audit entries match your criteria.
                        </td>
                      </tr>
                    ) : (
                      auditLogs.map(log => (
                        <tr key={log._id} className="hover:bg-slate-700/30 transition-colors">
                          <td className="px-6 py-4 font-mono text-[11px] text-slate-400">
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-bold text-white">{log.userName}</div>
                            <div className="text-[11px] text-slate-400 font-mono">{log.role}</div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center px-2 py-0.5 rounded font-mono text-[11px] font-bold bg-slate-900 text-blue-400 border border-slate-700">
                              {log.action}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-semibold text-slate-200">{log.entity}</div>
                            <div className="text-[11px] text-slate-400 uppercase font-mono">{log.module}</div>
                          </td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => setSelectedLogDetail(log)}
                              className="px-2.5 py-1 bg-slate-900 hover:bg-slate-950 text-slate-300 hover:text-white rounded-lg text-xs font-semibold border border-slate-700"
                            >
                              Inspect Payload
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* 5. SYSTEM & NODE TELEMETRY TAB */}
        {/* ============================================================== */}
        {activeTab === 'system' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-black text-white tracking-tight">System Node & Server Environment</h2>
              <p className="text-xs text-slate-400 mt-1">
                Direct container metrics, network reverse proxy status and backend runtime diagnostics.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-800/80 rounded-2xl p-6 border border-slate-700/80 shadow-lg space-y-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Server className="w-4 h-4 text-blue-400" />
                  Runtime Environment
                </h3>
                <div className="space-y-3 text-xs">
                  <div className="flex justify-between py-2 border-b border-slate-700/50">
                    <span className="text-slate-400">Node.js Engine</span>
                    <span className="font-mono text-slate-200">v22 (ESM & Native TS)</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-700/50">
                    <span className="text-slate-400">Internal Microservice Port</span>
                    <span className="font-mono text-emerald-400">3000 (Nginx Reverse Proxy)</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-700/50">
                    <span className="text-slate-400">Frontend Framework</span>
                    <span className="font-mono text-slate-200">React 19 + Tailwind CSS 4</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-slate-400">RBAC Enforcement Middleware</span>
                    <span className="font-mono text-blue-400">Active on /api/*</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-800/80 rounded-2xl p-6 border border-slate-700/80 shadow-lg space-y-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Database className="w-4 h-4 text-emerald-400" />
                  Database Collections
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-700/60 flex justify-between">
                    <span>users, roles, permissions</span>
                    <strong className="text-blue-400 font-mono">RBAC Engine</strong>
                  </div>
                  <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-700/60 flex justify-between">
                    <span>leads, customers, quotations, salesOrders</span>
                    <strong className="text-indigo-400 font-mono">Sales Pipeline</strong>
                  </div>
                  <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-700/60 flex justify-between">
                    <span>products, inventory, stockTransactions, purchases</span>
                    <strong className="text-purple-400 font-mono">Store / Inventory</strong>
                  </div>
                  <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-700/60 flex justify-between">
                    <span>invoices, payments, expenses, payables</span>
                    <strong className="text-emerald-400 font-mono">Accounts & Ledger</strong>
                  </div>
                  <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-700/60 flex justify-between">
                    <span>employees, attendance, salaries, auditLogs</span>
                    <strong className="text-amber-400 font-mono">People & Security</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 7: ATTENDANCE SECURITY & GEOFENCING CONFIGURATION */}
        {/* ============================================================== */}
        {activeTab === 'attendance' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800 backdrop-blur-sm">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-blue-400" />
                  Attendance Security & Geofence Policy
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Control Selfie verification, multi-branch GPS geofencing radius, and employee clock-in compliance.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={fetchAttendanceSettings}
                  disabled={attLoading}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-2 border border-slate-700 transition-all cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${attLoading ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
                <button
                  onClick={() => {
                    setEditingLocation(null);
                    setLocationForm({
                      name: '',
                      lat: 28.6139,
                      lng: 77.2090,
                      radiusMeters: 100,
                      address: '',
                      enabled: true
                    });
                    setIsLocationModalOpen(true);
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Office Location</span>
                </button>
              </div>
            </div>

            {/* Policy Enforcement Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {/* Card 1: Clock-In Security Policy */}
              <div className="bg-slate-900/80 rounded-2xl p-5 border border-slate-800 shadow-lg space-y-4 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                        <Camera className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-white">Clock-In Verification</h3>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Selfie & GPS Rules</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Control verification rules required when an employee checks in to start their shift.
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-300">Require Live Selfie</span>
                    <button
                      type="button"
                      disabled={attSaving}
                      onClick={() => handleSaveAttendanceToggles({
                        requireSelfieClockIn: !((attSettings?.requireSelfieClockIn ?? attSettings?.requireSelfie) ?? true),
                        requireSelfie: !((attSettings?.requireSelfieClockIn ?? attSettings?.requireSelfie) ?? true)
                      })}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                        (attSettings?.requireSelfieClockIn ?? attSettings?.requireSelfie) ? 'bg-blue-600' : 'bg-slate-800'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          (attSettings?.requireSelfieClockIn ?? attSettings?.requireSelfie) ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-300">Require GPS Location</span>
                    <button
                      type="button"
                      disabled={attSaving}
                      onClick={() => handleSaveAttendanceToggles({
                        requireLocationClockIn: !((attSettings?.requireLocationClockIn ?? attSettings?.requireLocation) ?? true),
                        requireLocation: !((attSettings?.requireLocationClockIn ?? attSettings?.requireLocation) ?? true)
                      })}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                        (attSettings?.requireLocationClockIn ?? attSettings?.requireLocation) ? 'bg-emerald-600' : 'bg-slate-800'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          (attSettings?.requireLocationClockIn ?? attSettings?.requireLocation) ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* Card 2: Clock-Out Security Policy */}
              <div className="bg-slate-900/80 rounded-2xl p-5 border border-slate-800 shadow-lg space-y-4 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                        <Navigation className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-white">Clock-Out Verification</h3>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">End-of-Shift Policy</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Decide whether employees must submit photo or location proof upon clocking out.
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-300">Require Live Selfie</span>
                    <button
                      type="button"
                      disabled={attSaving}
                      onClick={() => handleSaveAttendanceToggles({ requireSelfieClockOut: !(attSettings?.requireSelfieClockOut ?? false) })}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                        attSettings?.requireSelfieClockOut ? 'bg-amber-600' : 'bg-slate-800'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          attSettings?.requireSelfieClockOut ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-300">Require GPS Location</span>
                    <button
                      type="button"
                      disabled={attSaving}
                      onClick={() => handleSaveAttendanceToggles({ requireLocationClockOut: !(attSettings?.requireLocationClockOut ?? false) })}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                        attSettings?.requireLocationClockOut ? 'bg-emerald-600' : 'bg-slate-800'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          attSettings?.requireLocationClockOut ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* Card 3: GPS Signal Tolerance & Limits */}
              <div className="bg-slate-900/80 rounded-2xl p-5 border border-slate-800 shadow-lg space-y-4 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                        <Compass className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-white">Signal Accuracy Limit</h3>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">GPS Precision</span>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      ±{attSettings?.maxGpsAccuracyMeters || 100}m
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Maximum GPS margin of error allowed before rejecting poor signals to prevent spoofing.
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {[50, 100, 200].map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => handleSaveAttendanceToggles({ maxGpsAccuracyMeters: val })}
                        className={`px-2 py-1 rounded-lg text-[11px] font-mono font-bold border transition-all cursor-pointer ${
                          attSettings?.maxGpsAccuracyMeters === val
                            ? 'bg-purple-600 text-white border-purple-500 shadow-xs'
                            : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                        }`}
                      >
                        {val}m
                      </button>
                    ))}
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium">Preset Limits</span>
                </div>
              </div>

              {/* Card 4: Desktop Activity Tracking */}
              <div className="bg-slate-900/80 rounded-2xl p-5 border border-slate-800 shadow-lg space-y-4 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                        <Monitor className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-white">Desktop Screen Tracking</h3>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Active Window & Apps</span>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      (attSettings?.desktopTrackingEnabled ?? true)
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}>
                      {(attSettings?.desktopTrackingEnabled ?? true) ? 'ACTIVE' : 'OFF'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Enables the lightweight desktop agent to track active application sessions during valid clock-in windows.
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300">Desktop Agent Tracking</span>
                  <button
                    type="button"
                    disabled={attSaving}
                    onClick={() => handleSaveAttendanceToggles({ desktopTrackingEnabled: !(attSettings?.desktopTrackingEnabled ?? true) })}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                      (attSettings?.desktopTrackingEnabled ?? true) ? 'bg-cyan-600' : 'bg-slate-800'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        (attSettings?.desktopTrackingEnabled ?? true) ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Card 5: Idle Threshold & Inactivity Detection */}
              <div className="bg-slate-900/80 rounded-2xl p-5 border border-slate-800 shadow-lg space-y-4 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400">
                        <Timer className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-white">Idle Threshold Limit</h3>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Inactivity Detection</span>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-orange-500/20 text-orange-300 border border-orange-500/30">
                      {attSettings?.idleThresholdMinutes || 5} min
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Time without mouse/keyboard input before workstation transitions to IDLE state and pauses active screen time.
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {[3, 5, 10].map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => handleSaveAttendanceToggles({ idleThresholdMinutes: val })}
                        className={`px-2 py-1 rounded-lg text-[11px] font-mono font-bold border transition-all cursor-pointer ${
                          (attSettings?.idleThresholdMinutes || 5) === val
                            ? 'bg-orange-600 text-white border-orange-500 shadow-xs'
                            : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                        }`}
                      >
                        {val}m
                      </button>
                    ))}
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium">Threshold</span>
                </div>
              </div>

              {/* Card 6: Offline Tracking & Sync Frequency */}
              <div className="bg-slate-900/80 rounded-2xl p-5 border border-slate-800 shadow-lg space-y-4 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
                        <WifiOff className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-white">Offline Queue & Sync</h3>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Resilience Engine</span>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                      {attSettings?.activitySyncIntervalSeconds || 30}s
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Locally queues desktop telemetry during internet disconnection and automatically flushes batches to server.
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {[15, 30, 60].map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => handleSaveAttendanceToggles({ activitySyncIntervalSeconds: val })}
                        className={`px-2 py-1 rounded-lg text-[11px] font-mono font-bold border transition-all cursor-pointer ${
                          (attSettings?.activitySyncIntervalSeconds || 30) === val
                            ? 'bg-teal-600 text-white border-teal-500 shadow-xs'
                            : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                        }`}
                      >
                        {val}s
                      </button>
                    ))}
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium">Sync Interval</span>
                </div>
              </div>
            </div>

            {/* Allowed Office Locations & Multi-Branch Geofences */}
            <div className="bg-slate-900/80 rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
              <div className="p-5 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Allowed Office & Factory Locations (Multi-Branch)</h3>
                    <p className="text-xs text-slate-400">
                      Employees can clock in when physically present within the defined radius of any active location below.
                    </p>
                  </div>
                </div>
                <span className="px-3 py-1 bg-slate-800 text-slate-300 rounded-lg text-xs font-bold border border-slate-700">
                  {(attSettings?.allowedLocations || []).filter(l => l.enabled).length} Active Offices
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                    <tr>
                      <th className="px-6 py-3.5">Office / Plant Name</th>
                      <th className="px-6 py-3.5">Coordinates (Lat, Lng)</th>
                      <th className="px-6 py-3.5">Allowed Radius</th>
                      <th className="px-6 py-3.5">Physical Address / Notes</th>
                      <th className="px-6 py-3.5">Geofence Status</th>
                      <th className="px-6 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300 font-medium">
                    {(attSettings?.allowedLocations || []).map(loc => (
                      <tr key={loc.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                            <span className="font-bold text-white text-sm">{loc.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-mono text-slate-300">
                          <span className="bg-slate-950 px-2 py-1 rounded-md border border-slate-800">
                            {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-300 border border-blue-500/20 font-mono font-bold text-[11px]">
                            {loc.radiusMeters} meters
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-400 max-w-xs truncate">
                          {loc.address || '—'}
                        </td>
                        <td className="px-6 py-4">
                          <button
                            type="button"
                            onClick={() => handleToggleLocation(loc)}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all cursor-pointer ${
                              loc.enabled
                                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30'
                                : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                            }`}
                          >
                            {loc.enabled ? 'ACTIVE ✓' : 'DISABLED ✕'}
                          </button>
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <button
                            onClick={() => {
                              setEditingLocation(loc);
                              setLocationForm({
                                name: loc.name,
                                lat: loc.lat,
                                lng: loc.lng,
                                radiusMeters: loc.radiusMeters,
                                address: loc.address || '',
                                enabled: loc.enabled
                              });
                              setIsLocationModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-blue-600 text-slate-300 hover:text-white transition-all cursor-pointer"
                            title="Edit Location"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteLocation(loc.id)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white transition-all cursor-pointer"
                            title="Delete Location"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {(!attSettings?.allowedLocations || attSettings.allowedLocations.length === 0) && (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-slate-500">
                          No office locations configured yet. Click &quot;Add Office Location&quot; to configure geofenced premises.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ============================================================== */}
      {/* MODAL 1: ADD / EDIT USER */}
      {/* ============================================================== */}
      <Modal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        title={editingUser ? 'Edit User Profile & Base Role' : 'Provision New System User'}
        subtitle="Manage login credentials, department role and organization binding"
      >
        <form onSubmit={handleSaveUser} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
              <input
                type="text"
                required
                value={userForm.name}
                onChange={e => setUserForm({ ...userForm, name: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white"
                placeholder="e.g. Ramesh Patel"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Email Address (Login) *</label>
              <input
                type="email"
                required
                disabled={!!editingUser}
                value={userForm.email}
                onChange={e => setUserForm({ ...userForm, email: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white disabled:opacity-60"
                placeholder="ramesh@craftmediahub.com"
              />
            </div>
          </div>

          {!editingUser && (
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Initial Password *</label>
              <input
                type="password"
                required
                value={userForm.password}
                onChange={e => setUserForm({ ...userForm, password: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white"
                placeholder="Minimum 6 characters"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Base Role *</label>
              <select
                value={userForm.role}
                onChange={e => setUserForm({ ...userForm, role: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white"
              >
                {rolesList.map(r => (
                  <option key={r._id} value={r.code}>
                    {r.name} ({r.code})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Contact Phone</label>
              <input
                type="text"
                value={userForm.phone}
                onChange={e => setUserForm({ ...userForm, phone: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white"
                placeholder="+91 98765 43210"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Organization Unit</label>
            <input
              type="text"
              value={userForm.organization}
              onChange={e => setUserForm({ ...userForm, organization: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white"
            />
          </div>

          <div className="pt-2 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="block font-semibold text-slate-700">Initial Section Permissions</label>
                <p className="text-[11px] text-slate-500 mt-0.5">These permissions are applied when the admin logs in.</p>
              </div>
              <span className="text-[11px] font-bold text-blue-600">{userForm.customPermissions.length} selected</span>
            </div>
            <div className="max-h-48 overflow-y-auto p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              {(Object.entries(permissionsGrouped) as [string, Permission[]][]).map(([category, permissions]) => (
                <div key={category}>
                  <div className="text-[10px] font-bold uppercase text-slate-500 mb-1.5">{category}</div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {permissions.map(permission => (
                      <label key={permission.code} className="flex items-center gap-1.5 text-[10px] text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={userForm.customPermissions.includes(permission.code)}
                          onChange={() => toggleProvisionPermission(permission.code)}
                          className="rounded text-blue-600 focus:ring-blue-500"
                        />
                        <span className="truncate" title={permission.code}>{permission.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsUserModalOpen(false)}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-xs"
            >
              {editingUser ? 'Save Updates' : 'Provision User'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL 2: USER GRANULAR PERMISSIONS MATRIX */}
      {/* ============================================================== */}
      <Modal
        isOpen={isPermModalOpen}
        onClose={() => setIsPermModalOpen(false)}
        title={`Custom Permission Matrix: ${selectedUserForPerms?.name}`}
        subtitle={`Toggle specific access overrides for this user account (Base Role: ${selectedUserForPerms?.role})`}
        maxWidth="max-w-4xl"
      >
        <div className="space-y-6 text-xs">
          <div className="p-3 bg-blue-50 text-blue-900 rounded-xl border border-blue-200 flex items-center justify-between">
            <div>
              <strong>Active Privileges: {customPerms.length} Selected</strong>
              <p className="text-[11px] text-blue-700 mt-0.5">
                Permissions checked below will grant this specific user access regardless of default role changes.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCustomPerms(allPermissions.map(p => p.code))}
                className="px-2.5 py-1 bg-blue-600 text-white rounded-lg text-[11px] font-bold"
              >
                Grant All
              </button>
              <button
                type="button"
                onClick={() => setCustomPerms([])}
                className="px-2.5 py-1 bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold"
              >
                Clear All
              </button>
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="font-bold text-slate-900">Show login email in directory</div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Controls whether this user&apos;s login email is visible in the Super Admin user list.
                </p>
              </div>
              <label className="inline-flex items-center gap-2 cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={showLoginCredentials}
                  onChange={e => setShowLoginCredentials(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="text-xs font-semibold text-slate-700">
                  {showLoginCredentials ? 'Visible' : 'Hidden'}
                </span>
              </label>
            </div>
            <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Password is never displayed or returned by the backend. Use Reset Password to set a new one.
            </div>
          </div>

          <div className="space-y-5 max-h-[55vh] overflow-y-auto pr-2">
            {(Object.entries(permissionsGrouped) as [string, Permission[]][]).map(([category, perms]) => {
              const allSelected = perms.every(p => customPerms.includes(p.code));

              return (
                <div key={category} className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <h4 className="font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                      {category}
                    </h4>
                    <div className="flex items-center gap-2 text-[11px]">
                      <button
                        type="button"
                        onClick={() => selectAllCategory(perms)}
                        className="text-blue-600 hover:underline font-semibold"
                      >
                        Select Group
                      </button>
                      <span className="text-slate-300">|</span>
                      <button
                        type="button"
                        onClick={() => clearAllCategory(perms)}
                        className="text-slate-500 hover:underline font-semibold"
                      >
                        Clear Group
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {perms.map(p => {
                      const isChecked = customPerms.includes(p.code);
                      return (
                        <label
                          key={p.code}
                          className={`flex items-start gap-2.5 p-2 rounded-xl border transition-all cursor-pointer select-none ${
                            isChecked
                              ? 'bg-blue-50/80 border-blue-300 text-blue-900'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => togglePermissionSelection(p.code)}
                            className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                          />
                          <div className="truncate">
                            <div className="font-bold text-[11px] leading-tight">{p.name}</div>
                            <div className="text-[10px] font-mono text-slate-400 mt-0.5">{p.code}</div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsPermModalOpen(false)}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-semibold"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveUserPermissions}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-xs"
            >
              Save Permission Overrides
            </button>
          </div>
        </div>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL 3: CREATE / EDIT ROLE */}
      {/* ============================================================== */}
      <Modal
        isOpen={isRoleModalOpen}
        onClose={() => setIsRoleModalOpen(false)}
        title={editingRole ? `Edit Role: ${editingRole.name}` : 'Create New Security Role'}
        subtitle="Define base permissions inherited by users assigned this role"
        maxWidth="max-w-4xl"
      >
        <form onSubmit={handleSaveRole} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Role Title *</label>
              <input
                type="text"
                required
                value={roleForm.name}
                onChange={e => setRoleForm({ ...roleForm, name: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                placeholder="e.g. Regional Store Manager"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Role Code *</label>
              <input
                type="text"
                required
                disabled={!!editingRole}
                value={roleForm.code}
                onChange={e => setRoleForm({ ...roleForm, code: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 uppercase disabled:opacity-60"
                placeholder="STORE_MANAGER"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Role Description</label>
            <input
              type="text"
              value={roleForm.description}
              onChange={e => setRoleForm({ ...roleForm, description: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
              placeholder="Full access to warehouse inventory, stock transfers, purchase orders and stock alerts"
            />
          </div>

          {/* Role Permissions Selection */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-900">Select Role Permissions ({roleForm.permissions.length} selected)</label>
              <div className="flex items-center gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={() => setRoleForm({ ...roleForm, permissions: allPermissions.map(p => p.code) })}
                  className="text-blue-600 font-semibold hover:underline"
                >
                  Select All
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={() => setRoleForm({ ...roleForm, permissions: [] })}
                  className="text-slate-500 font-semibold hover:underline"
                >
                  Clear All
                </button>
              </div>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
              {(Object.entries(permissionsGrouped) as [string, Permission[]][]).map(([category, perms]) => (
                <div key={category} className="space-y-1.5">
                  <h5 className="font-bold text-[11px] text-slate-700 uppercase">{category}</h5>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {perms.map(p => {
                      const isChecked = roleForm.permissions.includes(p.code);
                      return (
                        <label
                          key={p.code}
                          className={`flex items-center gap-2 p-1.5 rounded-lg border text-[11px] cursor-pointer ${
                            isChecked ? 'bg-blue-50 border-blue-300 text-blue-900 font-semibold' : 'bg-white border-slate-200 text-slate-600'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleRolePermissionSelection(p.code)}
                            className="rounded text-blue-600"
                          />
                          <span className="truncate font-mono text-[10px]">{p.code}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsRoleModalOpen(false)}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 text-white rounded-xl font-semibold shadow-xs"
            >
              {editingRole ? 'Update Role' : 'Create Role'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL 4: AUDIT LOG PAYLOAD INSPECTOR */}
      {/* ============================================================== */}
      <Modal
        isOpen={!!selectedLogDetail}
        onClose={() => setSelectedLogDetail(null)}
        title="Audit Log Payload Inspection"
        subtitle={`Action: ${selectedLogDetail?.action} | Entity: ${selectedLogDetail?.entity}`}
        maxWidth="max-w-2xl"
      >
        {selectedLogDetail && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-500">Actor / User:</span>
                <p className="font-bold text-slate-900">{selectedLogDetail.userName} ({selectedLogDetail.userEmail})</p>
              </div>
              <div>
                <span className="text-slate-500">Timestamp:</span>
                <p className="font-bold text-slate-900">{new Date(selectedLogDetail.timestamp).toLocaleString()}</p>
              </div>
            </div>

            <div>
              <span className="block font-bold text-slate-700 mb-1">Previous State (Old Data):</span>
              <pre className="p-3 bg-slate-900 text-slate-300 rounded-xl overflow-x-auto text-[11px] font-mono">
                {selectedLogDetail.oldData ? JSON.stringify(selectedLogDetail.oldData, null, 2) : 'null (New Record)'}
              </pre>
            </div>

            <div>
              <span className="block font-bold text-slate-700 mb-1">Mutated State (New Data):</span>
              <pre className="p-3 bg-slate-900 text-emerald-400 rounded-xl overflow-x-auto text-[11px] font-mono">
                {selectedLogDetail.newData ? JSON.stringify(selectedLogDetail.newData, null, 2) : 'null'}
              </pre>
            </div>
          </div>
        )}
      </Modal>

      {/* ============================================================== */}
      {/* MODAL 5: ADD / EDIT OFFICE LOCATION (GEOFENCING) */}
      {/* ============================================================== */}
      <Modal
        isOpen={isLocationModalOpen}
        onClose={() => {
          setIsLocationModalOpen(false);
          setEditingLocation(null);
        }}
        title={editingLocation ? 'Edit Office Branch Geofence' : 'Add New Office / Factory Location'}
        subtitle="Define geographic GPS boundaries and allowed clock-in radius for employees"
      >
        <form onSubmit={handleSaveLocation} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Office / Branch Name *</label>
            <input
              type="text"
              required
              value={locationForm.name}
              onChange={e => setLocationForm({ ...locationForm, name: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white font-medium"
              placeholder="e.g. Pune Regional Branch / Naroda Factory"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Latitude (Decimal) *</label>
              <input
                type="number"
                step="any"
                required
                value={locationForm.lat}
                onChange={e => setLocationForm({ ...locationForm, lat: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white font-mono"
                placeholder="28.6139"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Longitude (Decimal) *</label>
              <input
                type="number"
                step="any"
                required
                value={locationForm.lng}
                onChange={e => setLocationForm({ ...locationForm, lng: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white font-mono"
                placeholder="77.2090"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              disabled={detectingGps}
              onClick={handleDetectCurrentGps}
              className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-bold text-[11px] flex items-center gap-1.5 border border-blue-200 cursor-pointer transition-all"
            >
              <Navigation className={`w-3.5 h-3.5 ${detectingGps ? 'animate-spin' : ''}`} />
              <span>{detectingGps ? 'Detecting GPS...' : 'Use My Current Location Coordinates'}</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Allowed Radius (Meters) *</label>
              <input
                type="number"
                min="20"
                max="5000"
                required
                value={locationForm.radiusMeters}
                onChange={e => setLocationForm({ ...locationForm, radiusMeters: parseInt(e.target.value, 10) || 100 })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white font-mono font-bold"
                placeholder="100"
              />
              <p className="text-[10px] text-slate-400 mt-1">Recommended: 100m - 250m</p>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Active Status</label>
              <label className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={locationForm.enabled}
                  onChange={e => setLocationForm({ ...locationForm, enabled: e.target.checked })}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="font-semibold text-slate-700">Enable Geofence</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Physical Address / Landmark (Optional)</label>
            <textarea
              rows={2}
              value={locationForm.address}
              onChange={e => setLocationForm({ ...locationForm, address: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white font-medium"
              placeholder="e.g. Sector 63 Noida Plant, Gate No. 2"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setIsLocationModalOpen(false);
                setEditingLocation(null);
              }}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-600/20 transition-all cursor-pointer"
            >
              {editingLocation ? 'Save Updates' : 'Create Location Geofence'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
