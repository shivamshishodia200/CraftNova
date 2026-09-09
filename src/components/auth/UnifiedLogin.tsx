import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useOrganization } from '../../context/OrganizationContext';
import { DynamicBrandLogo } from '../common/DynamicBrandLogo';
import {
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  Building2,
  AlertTriangle,
  Shield,
  User,
  Sparkles,
  KeyRound
} from 'lucide-react';
import { navigateTo } from '../../utils/routeUtils';
import { deriveThemeTokens } from '../../utils/colorUtils';

type LoginPortalMode = 'ADMIN' | 'EMPLOYEE' | 'SUPER_ADMIN';

export const UnifiedLogin: React.FC = () => {
  const { login, user } = useAuth();
  const { branding, setPreviewOrg } = useOrganization();

  const [portalMode, setPortalMode] = useState<LoginPortalMode>('ADMIN');
  const [identifier, setIdentifier] = useState('360crm@admin.com');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const tokens = deriveThemeTokens(branding);
  const companyDisplayName = branding.companyName || '360CRM Enterprise';

  // Handle Role Switch tab change
  const handleModeChange = (mode: LoginPortalMode) => {
    setPortalMode(mode);
    setError('');
    if (mode === 'ADMIN') {
      setIdentifier('360crm@admin.com');
      setPassword('admin123');
    } else if (mode === 'EMPLOYEE') {
      setIdentifier('priya.sales@craftmediahub.com');
      setPassword('employee123');
    } else {
      setIdentifier('shivam.craftmedia@gmail.com');
      setPassword('Password@123');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await login({
        email: identifier,
        identifier: identifier,
        password,
        expectedPortal: portalMode
      });

      if (!res.success) {
        setError(res.message || 'Login failed. Please check your credentials.');
        setLoading(false);
      } else {
        setPreviewOrg(null);
        if (portalMode === 'SUPER_ADMIN') {
          navigateTo('/super-admin');
        } else {
          navigateTo('/');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Network error occurred during login.');
      setLoading(false);
    }
  };

  const panelBg = branding.sidebarBackground || '#080D1A';

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans select-none">
      <div className="w-full max-w-5xl bg-slate-900/90 border border-slate-800/90 rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[580px]">
        {/* LEFT: Branding Panel */}
        <div
          className="lg:col-span-5 p-8 sm:p-10 flex flex-col justify-between relative overflow-hidden text-white"
          style={{
            backgroundColor: panelBg,
            backgroundImage: branding.loginBackgroundUrl ? `url(${branding.loginBackgroundUrl})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        >
          {/* Subtle Ambient Radial Glow */}
          <div
            className="absolute top-10 right-10 w-72 h-72 rounded-full blur-[100px] pointer-events-none opacity-25"
            style={{ backgroundColor: tokens.brandPrimary }}
          />
          <div
            className="absolute bottom-0 left-0 w-64 h-64 rounded-full blur-[90px] pointer-events-none opacity-20"
            style={{ backgroundColor: tokens.brandAccent }}
          />

          {/* Top Brand Block */}
          <div className="relative z-10 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 backdrop-blur-md border border-white/15 text-slate-200">
              <Building2 className="w-3.5 h-3.5" style={{ color: tokens.brandPrimary }} />
              <span>Unified CRM & Telemetry Suite</span>
            </div>

            <div className="pt-2">
              <DynamicBrandLogo
                logoUrl={branding.logoUrl}
                companyName={companyDisplayName}
                size={44}
                showText={true}
                textSize="lg"
                subtitle="ENTERPRISE WORKSPACE"
              />
            </div>

            <div className="space-y-2 pt-2">
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
                {branding.loginTitle || `Welcome to ${companyDisplayName}`}
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
                {branding.loginSubtitle ||
                  'Unified multi-tenant business suite for CRM, Sales Pipeline, Live Telemetry, and Work Governance.'}
              </p>
            </div>
          </div>

          {/* Bottom Security Badge */}
          <div className="relative z-10 pt-8 mt-auto border-t border-white/10 space-y-2">
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Enterprise Single Sign-On Enabled</span>
            </div>
            <p className="text-[11px] text-slate-400">
              {branding.footerText || '360CRM Enterprise Platform • Secure Multi-Tenant Architecture'}
            </p>
          </div>
        </div>

        {/* RIGHT: Login Form */}
        <div className="lg:col-span-7 p-8 sm:p-12 bg-slate-900 flex flex-col justify-center relative">
          <div className="max-w-md w-full mx-auto space-y-6">
            {/* Header */}
            <div>
              <h3 className="text-2xl font-bold text-white tracking-tight">
                Sign In to Your Workspace
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Enter your registered credentials to access your designated role portal.
              </p>
            </div>

            {/* Portal Role Switcher Tabs */}
            <div className="p-1 bg-slate-800/80 rounded-2xl border border-slate-700/60 grid grid-cols-3 gap-1">
              <button
                type="button"
                onClick={() => handleModeChange('ADMIN')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  portalMode === 'ADMIN'
                    ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Admin</span>
              </button>

              <button
                type="button"
                onClick={() => handleModeChange('EMPLOYEE')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  portalMode === 'EMPLOYEE'
                    ? 'bg-blue-600 text-white shadow-md font-extrabold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Employee</span>
              </button>

              <button
                type="button"
                onClick={() => handleModeChange('SUPER_ADMIN')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  portalMode === 'SUPER_ADMIN'
                    ? 'bg-indigo-600 text-white shadow-md font-extrabold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Super Admin</span>
              </button>
            </div>

            {/* Quick 1-Click Demo Helper */}
            <div className="flex items-center justify-between gap-2 p-2.5 bg-slate-800/60 rounded-xl border border-slate-700/60 text-[11px]">
              <span className="text-slate-400 truncate">
                Demo: <code className="text-slate-200 font-mono">{identifier}</code>
              </span>
              <button
                type="button"
                onClick={() => handleModeChange(portalMode)}
                className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-700 hover:bg-slate-600 text-slate-200 border border-slate-600 cursor-pointer shrink-0 transition-colors"
              >
                Auto Fill
              </button>
            </div>

            {error && (
              <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2.5 animate-in fade-in">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  {portalMode === 'EMPLOYEE' ? 'Employee ID or Work Email' : portalMode === 'SUPER_ADMIN' ? 'Super Admin Email' : 'Administrator Email'}
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={e => setIdentifier(e.target.value)}
                    placeholder={
                      portalMode === 'EMPLOYEE'
                        ? 'EMP-1001 or name@company.com'
                        : portalMode === 'SUPER_ADMIN'
                        ? 'superadmin@360crm.com'
                        : 'admin@company.com'
                    }
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-800/80 text-white placeholder-slate-500 text-xs rounded-xl border border-slate-700 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter account password"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-800/80 text-white placeholder-slate-500 text-xs rounded-xl border border-slate-700 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3 px-4 rounded-xl text-xs font-bold transition-all duration-150 shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed mt-3 ${
                  portalMode === 'EMPLOYEE'
                    ? 'bg-blue-600 hover:bg-blue-500 text-white'
                    : portalMode === 'SUPER_ADMIN'
                    ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                    : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                }`}
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    <span>Signing In...</span>
                  </>
                ) : (
                  <>
                    <span>
                      {portalMode === 'EMPLOYEE'
                        ? 'Sign In to Employee Workstation'
                        : portalMode === 'SUPER_ADMIN'
                        ? 'Sign In to Platform Super Admin'
                        : 'Sign In to Admin Workspace'}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="pt-4 border-t border-slate-800 text-center">
              <p className="text-[11px] text-slate-500">
                Authorized Personnel Only • IP & Session Telemetry Monitored
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
