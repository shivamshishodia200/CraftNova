import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { OrganizationBranding } from '../../context/OrganizationContext';
import { DynamicBrandLogo } from '../common/DynamicBrandLogo';
import {
  UserCheck,
  Lock,
  ArrowRight,
  Calendar,
  Clock,
  ShieldCheck,
  AlertTriangle,
  BadgeCheck,
  Laptop
} from 'lucide-react';
import { navigateTo } from '../../utils/routeUtils';
import { deriveThemeTokens } from '../../utils/colorUtils';

interface EmployeeLoginProps {
  organizationSlug: string;
  organizationName: string;
  branding: OrganizationBranding;
}

export const EmployeeLogin: React.FC<EmployeeLoginProps> = ({
  organizationSlug,
  organizationName,
  branding
}) => {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const tokens = deriveThemeTokens(branding);
  const companyDisplayName = branding.companyName || organizationName || 'Company';

  // Format today's date
  const todayFormatted = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(new Date());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const res = await login({
      identifier,
      password,
      expectedPortal: 'EMPLOYEE',
      organizationSlug
    });

    if (!res.success) {
      setError(res.message || 'Login failed. Please verify your Employee ID/Email and password.');
      setLoading(false);
    } else {
      navigateTo('/');
    }
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden font-sans select-none">
      {/* Background Radial Ambiance */}
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[160px] pointer-events-none opacity-20"
        style={{ backgroundColor: tokens.brandPrimary }}
      />
      <div
        className="absolute bottom-10 right-1/4 w-[450px] h-[450px] rounded-full blur-[140px] pointer-events-none opacity-15"
        style={{ backgroundColor: tokens.brandAccent }}
      />

      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Today's Date & Employee Pill */}
        <div className="flex items-center justify-between px-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-slate-900/80 border border-slate-800 text-slate-300 shadow-xs">
            <Calendar className="w-3.5 h-3.5 text-emerald-400" />
            <span>{todayFormatted}</span>
          </div>

          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Clock-In Ready</span>
          </div>
        </div>

        {/* Centered Employee Card */}
        <div className="bg-slate-900/95 backdrop-blur-2xl border border-slate-800/90 rounded-3xl p-7 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden">
          {/* Top Brand Accent Stripe */}
          <div
            className="absolute top-0 left-0 right-0 h-1.5"
            style={{
              background: `linear-gradient(to right, ${tokens.brandPrimary}, ${tokens.brandAccent})`
            }}
          />

          {/* Centered Logo & Greeting */}
          <div className="text-center space-y-3 pt-2">
            <div className="flex justify-center">
              <DynamicBrandLogo
                logoUrl={branding.logoUrl}
                companyName={companyDisplayName}
                size={48}
                showText={true}
                textSize="lg"
                subtitle="EMPLOYEE DESK"
              />
            </div>

            <div className="space-y-1">
              <div
                className="inline-block px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider"
                style={{
                  backgroundColor: tokens.brandPrimarySoft,
                  color: tokens.brandPrimary,
                  border: `1px solid ${tokens.brandPrimaryBorder}`
                }}
              >
                Employee Workstation
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                Your workday starts here.
              </h2>
              <p className="text-xs text-slate-400">
                Log in to access your daily tasks, calling desk, and attendance recorder.
              </p>
            </div>
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
                Employee ID or Work Email
              </label>
              <div className="relative">
                <UserCheck className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  placeholder="e.g. EMP-001 or arjun@craftmedia.com"
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
                <span className="text-[11px] text-slate-400 hover:text-slate-300 cursor-pointer">
                  Need Help?
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
                  <span>Preparing Workstation...</span>
                </>
              ) : (
                <>
                  <span>Continue to Workstation</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Employee Feature Badges */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-[11px] text-slate-400">
            <div className="flex items-center gap-1.5 p-2 rounded-xl bg-slate-800/40 border border-slate-700/40">
              <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Auto Punch-In</span>
            </div>
            <div className="flex items-center gap-1.5 p-2 rounded-xl bg-slate-800/40 border border-slate-700/40">
              <Laptop className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span>Work Session Telemetry</span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
            <button
              type="button"
              onClick={() => navigateTo(`/admin/login/${organizationSlug}`)}
              className="hover:underline transition-colors"
              style={{ color: tokens.brandPrimary }}
            >
              &larr; Admin Portal
            </button>
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              <span>Enterprise Single Sign-On</span>
            </span>
          </div>
        </div>

        <p className="text-center text-[11px] text-slate-500">
          {companyDisplayName} • Powered by 360CRM Multi-Tenant SaaS
        </p>
      </div>
    </div>
  );
};
