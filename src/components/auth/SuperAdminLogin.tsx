import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Shield, Lock, Mail, ArrowRight, ShieldCheck, Sparkles, KeyRound } from 'lucide-react';
import { navigateTo } from '../../utils/routeUtils';

export const SuperAdminLogin: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('shivam.craftmedia@gmail.com');
  const [password, setPassword] = useState('Password@123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const res = await login({
      email,
      password,
      expectedPortal: 'SUPER_ADMIN'
    });

    if (!res.success) {
      setError(res.message || 'Authentication failed. Please verify Super Admin credentials.');
      setLoading(false);
    } else {
      navigateTo('/super-admin');
    }
  };

  return (
    <div className="min-h-screen bg-[#050811] text-slate-100 flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden font-sans select-none">
      {/* Platform Ambient Blue Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full blur-[180px] pointer-events-none bg-blue-600/15" />
      <div className="absolute bottom-10 right-1/4 w-[500px] h-[500px] rounded-full blur-[160px] pointer-events-none bg-indigo-500/10" />

      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Platform Identity Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <Shield className="w-3.5 h-3.5 text-blue-400" />
            <span>Root Platform Infrastructure</span>
          </div>

          <div className="flex justify-center items-center gap-3 pt-1">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/25 border border-blue-400/30">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <h1 className="text-2xl font-black tracking-tight text-white">
                360<span className="text-blue-400">CRM</span>
              </h1>
              <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400">
                Enterprise Super Admin
              </p>
            </div>
          </div>

          <p className="text-slate-400 text-xs max-w-sm mx-auto leading-relaxed">
            Manage client organizations, white-label branding, feature matrices, and root infrastructure.
          </p>
        </div>

        {/* Super Admin Sign-In Card */}
        <div className="bg-[#0b1224]/90 backdrop-blur-2xl border border-slate-800 rounded-3xl p-7 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden">
          {/* Top Blue Accent Bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-400" />

          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
              <span>Platform Owner Sign In</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Enter authorized Super Administrator credentials to access global console.
            </p>
          </div>

          {error && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2.5 animate-in fade-in">
              <KeyRound className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Super Admin Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="superadmin@360crm.com"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-900/90 text-white placeholder-slate-500 text-xs rounded-xl border border-slate-700/80 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all font-mono"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Master Security Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-900/90 text-white placeholder-slate-500 text-xs rounded-xl border border-slate-700/80 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.99] transition-all duration-150 shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Verifying Root Credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Platform</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <Lock className="w-3 h-3 text-emerald-400" />
              <span>TLS 1.3 256-Bit Encrypted</span>
            </span>
            <button
              type="button"
              onClick={() => navigateTo('/login')}
              className="text-blue-400 hover:text-blue-300 transition-colors"
            >
              Switch Portal
            </button>
          </div>
        </div>

        <p className="text-center text-[11px] text-slate-500">
          360CRM Multi-Tenant SaaS Engine • Restricted Access
        </p>
      </div>
    </div>
  );
};
