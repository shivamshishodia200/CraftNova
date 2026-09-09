import React, { useState } from 'react';
import { useAuth } from '@/src/context/AuthContext';
import { useOrganization } from '@/src/context/OrganizationContext';
import { Shield, LogOut, ChevronDown, Check, UserCheck, RefreshCw, Menu, Building2, Eye, X } from 'lucide-react';

export const AdminHeader: React.FC<{ onExportReport?: () => void; onToggleSidebar?: () => void }> = ({ onExportReport, onToggleSidebar }) => {
  const { user, logout, activePortal, setActivePortal } = useAuth();
  const { organization, branding, previewOrg, setPreviewOrg } = useOrganization();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <header
      style={{ backgroundColor: 'var(--header-bg, #ffffff)', color: 'var(--header-text, #0f172a)' }}
      className="border-b border-slate-200/80 px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-30 shadow-2xs"
    >
      <div className="flex items-center gap-3">
        {/* Mobile Hamburger Toggle Button */}
        <button
          type="button"
          onClick={onToggleSidebar}
          className="p-2 -ml-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl lg:hidden focus:outline-hidden cursor-pointer"
          aria-label="Toggle Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
              {branding.companyName || 'Business Management'}
            </h2>
            {organization?.clientCode && (
              <span
                className="text-[10px] font-mono font-bold px-2 py-0.5 rounded border"
                style={{
                  backgroundColor: 'var(--brand-primary-soft, rgba(37, 99, 235, 0.1))',
                  color: 'var(--brand-primary, #2563eb)',
                  borderColor: 'var(--brand-primary-border, rgba(37, 99, 235, 0.3))'
                }}
              >
                {organization.clientCode}
              </span>
            )}
            {previewOrg && (
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded border flex items-center gap-1"
                style={{
                  backgroundColor: 'var(--brand-primary-soft, rgba(37, 99, 235, 0.1))',
                  color: 'var(--brand-primary, #2563eb)',
                  borderColor: 'var(--brand-primary-border, rgba(37, 99, 235, 0.3))'
                }}
              >
                <Eye className="w-3 h-3" />
                PREVIEW MODE
              </span>
            )}
          </div>
          <p className="text-[11px] sm:text-xs text-slate-500 font-normal hidden sm:block">
            {branding.loginSubtitle || 'Sales, marketing, inventory, accounts and telemetry in one place.'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Exit Preview Button */}
        {previewOrg && (
          <button
            onClick={() => setPreviewOrg(null)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer border"
            style={{
              backgroundColor: 'var(--brand-primary, #2563eb)',
              color: 'var(--button-primary-text, #ffffff)',
              borderColor: 'var(--brand-primary-border, rgba(37, 99, 235, 0.4))'
            }}
          >
            <X className="w-3.5 h-3.5" />
            <span>Exit {previewOrg.name} Preview</span>
          </button>
        )}

        {/* Portal Switcher for Super Admin */}
        {user?.role === 'SUPER_ADMIN' && (
          <div className="hidden sm:flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setActivePortal('admin')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                activePortal === 'admin'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-300'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Admin CRM View
            </button>
            <button
              onClick={() => setActivePortal('superadmin')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all ${
                activePortal === 'superadmin'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              Super Admin Portal
            </button>
          </div>
        )}

        {/* Live Online Status */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-medium border border-emerald-200/60">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Online</span>
        </div>

        {/* User Profile & Demo Switcher Dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2.5 p-1 pl-1.5 pr-2.5 rounded-full hover:bg-slate-100 border border-slate-200 transition-colors"
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-xs border"
              style={{
                backgroundColor: 'var(--brand-primary, #f59e0b)',
                borderColor: 'var(--brand-primary-border, #f59e0b)',
                color: 'var(--button-primary-text, #ffffff)'
              }}
            >
              {user?.avatar || user?.name?.slice(0, 2).toUpperCase() || 'CM'}
            </div>
            <span className="text-xs font-semibold text-slate-800 hidden md:inline">
              {user?.avatar || 'CM'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-4 py-2.5 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-900">{user?.name}</p>
                <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                <div className="mt-1.5 inline-block px-2 py-0.5 bg-amber-50 text-amber-800 text-[10px] font-semibold rounded-md border border-amber-200">
                  Role: {user?.role}
                </div>
              </div>

              <div className="border-t border-slate-100 pt-1 px-2">
                <button
                  onClick={() => {
                    logout();
                    setDropdownOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-lg flex items-center gap-2"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
