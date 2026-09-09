import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useOrganization, OrganizationBranding, DEFAULT_PLATFORM_BRANDING } from '../context/OrganizationContext';
import { DynamicBrandLogo } from './common/DynamicBrandLogo';
import { api } from '../services/api';
import { Lock, Mail, ArrowRight, Sparkles, ShieldCheck, AlertTriangle } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const { branding: globalBranding } = useOrganization();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Client-specific white-labeled login branding state
  const [clientBranding, setClientBranding] = useState<OrganizationBranding | null>(null);

  // Detect ?org=slug in URL for white-label client portal
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orgParam = params.get('org') || params.get('client');

    if (orgParam) {
      api.get(`/public/branding/${encodeURIComponent(orgParam)}`).then(res => {
        if (res.success && res.data?.branding) {
          setClientBranding(res.data.branding);
        }
      }).catch(err => {
        console.warn('Could not load branded client portal branding:', err);
      });
    }
  }, []);

  const activeBranding = clientBranding || globalBranding || DEFAULT_PLATFORM_BRANDING;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const res = await login({ email, password });
    if (!res.success) {
      setError(res.message || 'Login failed. Please check your work email and password.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden font-sans select-none">
      {/* Dynamic Background Lighting */}
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[650px] rounded-full blur-[160px] pointer-events-none opacity-20"
        style={{ backgroundColor: activeBranding.primaryColor || '#F59E0B' }}
      />
      <div
        className="absolute bottom-10 right-1/4 w-[450px] h-[450px] rounded-full blur-[140px] pointer-events-none opacity-15"
        style={{ backgroundColor: activeBranding.accentColor || '#EA580C' }}
      />

      <div className="w-full max-w-md relative z-10 space-y-6 sm:space-y-7">
        {/* Brand Banner Header */}
        <div className="text-center space-y-3">
          <div
            className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-semibold shadow-inner border"
            style={{
              backgroundColor: 'rgba(245, 158, 11, 0.1)',
              borderColor: 'rgba(245, 158, 11, 0.25)',
              color: activeBranding.primaryColor || '#F59E0B'
            }}
          >
            <Sparkles className="w-3.5 h-3.5" style={{ color: activeBranding.primaryColor || '#F59E0B' }} />
            <span>{activeBranding.loginTitle || 'Next-Gen Enterprise Platform'}</span>
          </div>

          <div className="flex justify-center pt-1">
            <DynamicBrandLogo size={52} showText={true} textSize="xl" subtitle="ENTERPRISE WORKSPACE SUITE" />
          </div>

          <p className="text-slate-400 text-xs max-w-sm mx-auto leading-relaxed">
            {activeBranding.loginSubtitle || 'Unified business platform for Sales, Inventory, Accounts, Live Telemetry & Governance.'}
          </p>
        </div>

        {/* Centered Sign-In Card */}
        <div className="bg-slate-900/90 backdrop-blur-2xl border border-slate-800/90 rounded-3xl p-7 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden">
          {/* Top Gradient Ribbon Accent */}
          <div
            className="absolute top-0 left-0 right-0 h-1"
            style={{
              background: `linear-gradient(to right, ${activeBranding.primaryColor || '#F59E0B'}, ${activeBranding.accentColor || '#EA580C'})`
            }}
          />

          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
                <span>Sign In</span>
                <span
                  className="text-[10px] font-mono font-bold px-2 py-0.5 rounded border"
                  style={{
                    backgroundColor: 'rgba(245, 158, 11, 0.15)',
                    color: activeBranding.primaryColor || '#F59E0B',
                    borderColor: 'rgba(245, 158, 11, 0.3)'
                  }}
                >
                  PORTAL
                </span>
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Enter your work credentials for {activeBranding.companyName || 'your organization'} to continue
            </p>
          </div>

          {error && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-xs text-rose-300 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span className="leading-tight">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <label className="block font-semibold text-slate-300">Work Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="user@company.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-1 transition-all text-xs"
                />
              </div>

            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block font-semibold text-slate-300">Password</label>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-1 transition-all text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 text-slate-400 cursor-pointer hover:text-slate-300 transition-colors">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-800 text-amber-500 focus:ring-0 cursor-pointer accent-amber-500"
                />
                <span className="text-[11px]">Remember this device</span>
              </label>
              <span className="text-[11px] text-amber-400/80 hover:text-amber-300 cursor-pointer font-medium transition-colors">
                Forgot password?
              </span>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                background: `linear-gradient(135deg, ${activeBranding.primaryColor || '#F59E0B'} 0%, ${activeBranding.accentColor || '#EA580C'} 100%)`
              }}
              className="w-full py-3 mt-2 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-lg cursor-pointer disabled:opacity-50 active:scale-[0.99]"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Authenticating...</span>
                </div>
              ) : (
                <>
                  <span>Sign In to {activeBranding.companyName || 'Dashboard'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Security Guarantee Footer */}
          <div className="pt-4 border-t border-slate-800/80 text-[11px] text-slate-500 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>Multi-Tenant RBAC</span>
            </span>
            <span className="text-emerald-400 flex items-center gap-1.5 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Central Cloud API Live</span>
            </span>
          </div>
        </div>

        {/* Global Footer Note */}
        <p className="text-center text-[11px] text-slate-500">
          {activeBranding.footerText || '360CRM Enterprise Suite • Secure Multi-Tenant Architecture'}
        </p>
      </div>
    </div>
  );
};
