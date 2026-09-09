import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { OrganizationBranding, useOrganization } from '../../context/OrganizationContext';
import { DynamicBrandLogo } from '../common/DynamicBrandLogo';
import { Lock, Mail, ArrowRight, ShieldCheck, Building2, AlertTriangle, Shield, Sparkles } from 'lucide-react';
import { navigateTo } from '../../utils/routeUtils';
import { deriveThemeTokens } from '../../utils/colorUtils';

interface AdminLoginProps {
  organizationSlug: string;
  organizationName: string;
  branding: OrganizationBranding;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({
  organizationSlug,
  organizationName,
  branding
}) => {
  const { login, user } = useAuth();
  const { setPreviewOrg } = useOrganization();
  const [email, setEmail] = useState(() => {
    if (organizationSlug === '3' || organizationSlug === '360crm') {
      return '360crm@admin.com';
    }
    if (organizationSlug === 's') {
      return '360admin@gmail.com';
    }
    if (organizationSlug === 'deliveryplus') {
      return 'admin@deliveryplus.com';
    }
    return `admin@${organizationSlug}.com`;
  });
  const [password, setPassword] = useState('admin123');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const tokens = deriveThemeTokens(branding);
  const companyDisplayName = branding.companyName || organizationName || 'Company';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const res = await login({
      email,
      password,
      expectedPortal: 'ADMIN',
      organizationSlug
    });

    if (!res.success) {
      setError(res.message || 'Login failed. Please check your administrator credentials.');
      setLoading(false);
    } else {
      // Clear previewOrg so real organization branding from login takes precedence
      setPreviewOrg(null);
      navigateTo('/');
    }
  };

  const panelBg = branding.sidebarBackground || '#080D1A';

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans select-none">
      <div className="w-full max-w-5xl bg-slate-900/90 border border-slate-800/90 rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[580px]">
        {/* LEFT: Client Organization Branding Panel */}
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
              <span>Verified Client Workspace</span>
            </div>

            <div className="pt-2">
              <DynamicBrandLogo
                logoUrl={branding.logoUrl}
                companyName={companyDisplayName}
                size={44}
                showText={true}
                textSize="lg"
                subtitle="MANAGEMENT SUITE"
              />
            </div>

            <div className="space-y-2 pt-2">
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
                {branding.loginTitle || `Welcome to ${companyDisplayName}`}
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
                {branding.loginSubtitle ||
                  'Centralized administration desk for CRM, Sales, Inventory, Accounts, and Team Governance.'}
              </p>
            </div>
          </div>

          {/* Bottom Security / Architecture Badge */}
          <div className="relative z-10 pt-8 mt-auto border-t border-white/10 space-y-2">
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Dedicated Organization Tenant: <strong className="font-mono text-white">{organizationSlug}</strong></span>
            </div>
            <p className="text-[11px] text-slate-400">
              {branding.footerText || 'Enterprise Cloud Infrastructure • Single Codebase SaaS'}
            </p>
          </div>
        </div>

        {/* RIGHT: Administrator Sign-In Form */}
        <div className="lg:col-span-7 p-8 sm:p-12 bg-slate-900 flex flex-col justify-center relative">
          <div className="max-w-md w-full mx-auto space-y-6">
            <div>
              <div className="inline-block px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider mb-2"
                style={{
                  backgroundColor: tokens.brandPrimarySoft,
                  color: tokens.brandPrimary,
                  border: `1px solid ${tokens.brandPrimaryBorder}`
                }}
              >
                Administrator Portal
              </div>
              <h3 className="text-2xl font-bold text-white tracking-tight">
                Welcome Back
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Sign in with your verified administrator credentials to manage {companyDisplayName}.
              </p>
            </div>

            {/* Active Super Admin Session Notification Banner */}
            {user?.role === 'SUPER_ADMIN' && (
              <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0" />
                  <span className="text-slate-300">
                    Active Session: <strong className="text-white">{user.name}</strong> (Super Admin)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewOrg({
                        id: organizationSlug,
                        name: companyDisplayName,
                        branding
                      });
                      navigateTo('/');
                    }}
                    className="px-2.5 py-1 rounded-lg text-white font-bold text-[11px] shadow-xs cursor-pointer transition-all shrink-0 flex items-center gap-1"
                    style={{ backgroundColor: tokens.brandPrimary }}
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Enter Workspace Directly</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => navigateTo('/super-admin')}
                    className="px-2 py-1 rounded-lg text-slate-400 hover:text-white bg-slate-800 text-[11px] border border-slate-700 cursor-pointer"
                  >
                    Super Admin
                  </button>
                </div>
              </div>
            )}

            {/* Quick Demo Fill Helper */}
            <div className="flex items-center justify-between gap-2 p-2.5 bg-slate-800/60 rounded-xl border border-slate-700/60 text-[11px]">
              <span className="text-slate-400">
                Demo Admin: <code className="text-slate-200 font-mono">360crm@admin.com</code> / <code className="text-slate-200 font-mono">admin123</code>
              </span>
              <button
                type="button"
                onClick={() => {
                  setEmail('360crm@admin.com');
                  setPassword('admin123');
                }}
                className="px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors shrink-0"
                style={{
                  backgroundColor: tokens.brandPrimarySoft,
                  color: tokens.brandPrimary,
                  border: `1px solid ${tokens.brandPrimaryBorder}`
                }}
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
                  Administrator Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder={`admin@${organizationSlug}.com`}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-800/80 text-white placeholder-slate-500 text-xs rounded-xl border border-slate-700 focus:outline-none transition-all font-mono"
                    style={{
                      borderColor: undefined
                    }}
                    onFocus={e => (e.target.style.borderColor = tokens.brandPrimary)}
                    onBlur={e => (e.target.style.borderColor = '')}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-300">
                    Password
                  </label>
                  <span className="text-[11px] text-slate-400 hover:text-slate-300 cursor-pointer">
                    Forgot password?
                  </span>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-800/80 text-white placeholder-slate-500 text-xs rounded-xl border border-slate-700 focus:outline-none transition-all"
                    onFocus={e => (e.target.style.borderColor = tokens.brandPrimary)}
                    onBlur={e => (e.target.style.borderColor = '')}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={e => setRememberMe(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-800 text-amber-500 focus:ring-0"
                  />
                  <span>Remember my session</span>
                </label>
                <button
                  type="button"
                  onClick={() => navigateTo(`/employee/login/${organizationSlug}`)}
                  className="text-[11px] hover:underline transition-colors"
                  style={{ color: tokens.brandPrimary }}
                >
                  Employee Portal &rarr;
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl text-xs font-bold transition-all duration-150 shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed mt-2"
                style={{
                  backgroundColor: tokens.brandPrimary,
                  color: tokens.buttonPrimaryText
                }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = tokens.brandPrimaryHover)}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = tokens.brandPrimary)}
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    <span>Authorizing Admin Access...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Admin Workspace</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
              <span>Tenant: <code className="text-slate-400 font-mono">{organizationSlug}</code></span>
              <button
                type="button"
                onClick={() => navigateTo('/super-admin/login')}
                className="hover:text-slate-400 transition-colors"
              >
                Super Admin Access
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
