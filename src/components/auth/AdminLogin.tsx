import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { OrganizationBranding, useOrganization } from '../../context/OrganizationContext';
import { DynamicBrandLogo } from '../common/DynamicBrandLogo';
import { Lock, Mail, ArrowRight, ShieldCheck, Building2, AlertTriangle, Eye, EyeOff } from 'lucide-react';
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
  const { login } = useAuth();
  const { setPreviewOrg } = useOrganization();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const tokens = deriveThemeTokens(branding);
  const companyDisplayName = branding?.companyName || organizationName || 'Organization';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Please enter both administrator email and password.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await login({
        email: email.trim(),
        password,
        expectedPortal: 'ADMIN',
        organizationSlug
      });

      if (!res.success) {
        setError(res.message || 'Login failed. Please check your administrator credentials.');
        setLoading(false);
      } else {
        // Clear previewOrg so real organization branding from login session takes precedence
        setPreviewOrg(null);
        navigateTo('/');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during sign in.');
      setLoading(false);
    }
  };

  const panelBg = branding?.sidebarBackground || '#080D1A';

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans select-none">
      <div className="w-full max-w-5xl bg-slate-900/90 border border-slate-800/90 rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[560px]">
        {/* LEFT: Client Organization Branding Panel (Configured by Super Admin) */}
        <div
          className="lg:col-span-5 p-8 sm:p-10 flex flex-col justify-between relative overflow-hidden text-white"
          style={{
            backgroundColor: panelBg,
            backgroundImage: branding?.loginBackgroundUrl ? `url(${branding.loginBackgroundUrl})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        >
          {/* Ambient Brand Glow */}
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
              <span>Verified Organization Workspace</span>
            </div>

            <div className="pt-2">
              <DynamicBrandLogo
                logoUrl={branding?.logoUrl}
                companyName={companyDisplayName}
                primaryColor={tokens.brandPrimary}
                accentColor={tokens.brandAccent}
                size={44}
                showText={true}
                textSize="lg"
                subtitle="MANAGEMENT SUITE"
              />
            </div>

            <div className="space-y-2 pt-2">
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
                {branding?.loginTitle || `Welcome to ${companyDisplayName}`}
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
                {branding?.loginSubtitle ||
                  'Unified platform for CRM, Sales Pipeline, Inventory, Accounts, and Team Operations.'}
              </p>
            </div>
          </div>

          {/* Bottom Security / Workspace Badge */}
          <div className="relative z-10 pt-8 mt-auto border-t border-white/10 space-y-2">
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Dedicated Client Portal: <strong className="font-semibold text-white">{companyDisplayName}</strong></span>
            </div>
            <p className="text-[11px] text-slate-400">
              {branding?.footerText || 'Enterprise Cloud Infrastructure • Secure Dedicated Portal'}
            </p>
          </div>
        </div>

        {/* RIGHT: Administrator Sign-In Form (Clean fields only) */}
        <div className="lg:col-span-7 p-8 sm:p-12 bg-slate-900 flex flex-col justify-center relative">
          <div className="max-w-md w-full mx-auto space-y-6">
            <div>
              <div
                className="inline-block px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider mb-2"
                style={{
                  backgroundColor: tokens.brandPrimarySoft,
                  color: tokens.brandPrimary,
                  border: `1px solid ${tokens.brandPrimaryBorder}`
                }}
              >
                Administrator Portal
              </div>
              <h3 className="text-2xl font-bold text-white tracking-tight">
                Sign In
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Enter your administrator credentials to access <span className="text-slate-300 font-semibold">{companyDisplayName}</span>.
              </p>
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
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    required
                    autoFocus
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder={`e.g. admin@${organizationSlug}.com`}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-800/80 text-white placeholder-slate-500 text-xs rounded-xl border border-slate-700 focus:outline-none transition-all font-mono"
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
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-800/80 text-white placeholder-slate-500 text-xs rounded-xl border border-slate-700 focus:outline-none transition-all"
                    onFocus={e => (e.target.style.borderColor = tokens.brandPrimary)}
                    onBlur={e => (e.target.style.borderColor = '')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer p-1"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={e => setRememberMe(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-800 text-amber-500 focus:ring-0 cursor-pointer"
                  />
                  <span className="text-slate-400 hover:text-slate-300 text-xs">Remember my session</span>
                </label>
                <button
                  type="button"
                  onClick={() => navigateTo(`/employee/login/${organizationSlug}`)}
                  className="text-[11px] hover:underline transition-colors font-medium"
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
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Admin Workspace</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Clean subtle footer */}
            <div className="pt-4 border-t border-slate-800/80 text-center text-[11px] text-slate-500">
              <span>&copy; {new Date().getFullYear()} {companyDisplayName}. All rights reserved.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
