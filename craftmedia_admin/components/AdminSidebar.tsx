import React, { useState, useEffect } from 'react';
import { useAuth } from '@/src/context/AuthContext';
import { useOrganization } from '@/src/context/OrganizationContext';
import { DynamicBrandLogo } from '@/src/components/common/DynamicBrandLogo';
import {
  Check,
  LayoutDashboard,
  Target,
  Users,
  ShoppingCart,
  ShoppingBag,
  Zap,
  BarChart3,
  LayoutGrid,
  Boxes,
  Layers,
  ArrowDownToLine,
  ArrowUpFromLine,
  Mail,
  CreditCard,
  Receipt,
  User,
  UserCheck,
  CalendarDays,
  TrendingUp,
  Monitor,
  Plug,
  Settings,
  Flame,
  MessageSquare,
  ChevronDown,
  ChevronRight,
  FolderOpen,
  Building2,
  PieChart,
  ShieldCheck,
  DollarSign,
  PackageCheck,
  Megaphone,
  Briefcase,
  Smartphone,
  PhoneCall,
  FileAudio,
  Bell,
  CheckSquare,
  Clock,
  Award,
  Compass,
  MapPin
} from 'lucide-react';

interface SidebarProps {
  currentView: string;
  onNavigate: (viewId: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

interface NavSubItem {
  id: string;
  label: string;
  icon: React.ElementType;
  permission: string;
  badge?: string;
  feature?: string;
}

interface NavGroup {
  id: string;
  title: string;
  icon: React.ElementType;
  isDropdown: boolean;
  permission?: string;
  feature?: string;
  items?: NavSubItem[];
}

export const AdminSidebar: React.FC<SidebarProps> = ({ currentView, onNavigate, isOpen, onClose }) => {
  const { hasPermission, user, setActivePortal } = useAuth();
  const { branding, organization, canAccessFeature } = useOrganization();

  const handleNavClick = (viewId: string) => {
    onNavigate(viewId);
    if (onClose) onClose();
  };

  const isEmployee = user?.role === 'EMPLOYEE';
  const isHrUser = user?.role === 'HR_EMPLOYEE';

  // Employee workspace navigation; each item opens its relevant portal section.
  const employeeNavItems = [
    { id: 'emp_dashboard', label: 'Dashboard', icon: LayoutDashboard, badge: 'Daily', permission: 'attendance.view' },
    { id: 'emp_customers', label: 'My Customers', icon: Users, permission: 'customers.view' },
    { id: 'emp_tasks', label: 'My Tasks', icon: CheckSquare, permission: 'tasks.view' },
    { id: 'emp_quotations', label: 'Quotations', icon: ShoppingCart, permission: 'quotations.view' },
    { id: 'emp_orders', label: 'Sales Orders', icon: ShoppingBag, permission: 'sales_orders.view' },
    { id: 'emp_performance', label: 'My Performance', icon: Award, permission: 'performance.view.self' },
    { id: 'emp_leave', label: 'Leave Requests', icon: CalendarDays, permission: 'leave.view.self' },
    { id: 'emp_salary', label: 'My Salary Slips', icon: DollarSign, permission: 'salary.view.self' },
    { id: 'emp_profile', label: 'My Profile', icon: User },
    { id: 'emp_notifications', label: 'Notifications', icon: Bell },
  ];

  // Standard Admin Navigation schema with collapsible dropdown groups
  const navGroups: NavGroup[] = [
    {
      id: 'main',
      title: 'Main Dashboard',
      icon: LayoutDashboard,
      isDropdown: false,
      permission: 'dashboard.view',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: 'dashboard.view' }
      ]
    },
    {
      id: 'sales',
      title: 'Sales',
      icon: TrendingUp,
      isDropdown: true,
      items: [
        { id: 'leads', label: 'Leads', icon: Target, permission: 'leads.view', feature: 'crm.leads' },
        { id: 'customers', label: 'Customers', icon: Users, permission: 'customers.view', feature: 'crm.customers' },
        { id: 'quotations', label: 'Quotations', icon: ShoppingCart, permission: 'quotations.view', feature: 'sales.quotations' },
        { id: 'sales_orders', label: 'Sales Orders', icon: ShoppingBag, permission: 'sales_orders.view', feature: 'sales.salesOrders' },
        { id: 'follow_ups', label: 'Follow-ups', icon: Zap, permission: 'follow_ups.view', feature: 'crm.followUps' },
        { id: 'sales_reports', label: 'Sales Reports', icon: BarChart3, permission: 'sales_reports.view', feature: 'sales.reports' },
      ],
    },
    {
      id: 'marketing',
      title: 'Marketing',
      icon: Megaphone,
      isDropdown: true,
      items: [
        { id: 'marketing_dashboard', label: 'Dashboard', icon: LayoutGrid, permission: 'campaigns.view', feature: 'marketing.campaigns' },
        { id: 'campaigns', label: 'Campaigns', icon: Target, permission: 'campaigns.view', feature: 'marketing.campaigns' },
        { id: 'lead_sources', label: 'Lead Sources', icon: Target, permission: 'lead_sources.view', feature: 'marketing.campaigns' },
        { id: 'tradeindia', label: 'TradeIndia', icon: Plug, permission: 'tradeindia.view', feature: 'marketing.tradeIndia' },
        { id: 'website_leads', label: 'Website Leads', icon: Zap, permission: 'website_leads.view', feature: 'marketing.campaigns' },
        { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, permission: 'whatsapp.view', feature: 'marketing.whatsApp' },
        { id: 'marketing_reports', label: 'Reports', icon: BarChart3, permission: 'marketing_reports.view', feature: 'marketing.reports' },
      ],
    },
    {
      id: 'inventory',
      title: 'Store / Inventory',
      icon: Boxes,
      isDropdown: true,
      items: [
        { id: 'products', label: 'Products', icon: Boxes, permission: 'products.view', feature: 'inventory.products' },
        { id: 'categories', label: 'Categories', icon: Layers, permission: 'categories.view', feature: 'inventory.categories' },
        { id: 'inventory', label: 'Inventory', icon: Boxes, permission: 'inventory.view', feature: 'inventory.products' },
        { id: 'warehouses', label: 'Warehouses', icon: Building2, permission: 'warehouses.view', feature: 'inventory.warehouses' },
        { id: 'stock_in', label: 'Stock In', icon: ArrowDownToLine, permission: 'stock_in.view', feature: 'inventory.stockInOut' },
        { id: 'stock_out', label: 'Stock Out', icon: ArrowUpFromLine, permission: 'stock_out.view', feature: 'inventory.stockInOut' },
        { id: 'purchase', label: 'Purchase', icon: ShoppingCart, permission: 'purchase.view', feature: 'inventory.purchases' },
        { id: 'suppliers', label: 'Suppliers', icon: Users, permission: 'suppliers.view', feature: 'inventory.suppliers' },
      ],
    },
    {
      id: 'accounts',
      title: 'Accounts & Finance',
      icon: Receipt,
      isDropdown: true,
      items: [
        { id: 'invoices', label: 'Invoices', icon: Receipt, permission: 'invoices.view', feature: 'accounts.invoices' },
        { id: 'payments', label: 'Payments', icon: CreditCard, permission: 'payments.view', feature: 'accounts.payments' },
        { id: 'expenses', label: 'Expenses', icon: DollarSign, permission: 'expenses.view', feature: 'accounts.expenses' },
        { id: 'receivables', label: 'Receivables', icon: ArrowDownToLine, permission: 'receivables.view', feature: 'accounts.invoices' },
        { id: 'payables', label: 'Payables', icon: ArrowUpFromLine, permission: 'payables.view', feature: 'accounts.invoices' },
        { id: 'credit_notes', label: 'Credit Notes', icon: Mail, permission: 'credit_notes.view', feature: 'accounts.creditNotes' },
        { id: 'accounts_reports', label: 'Accounts Reports', icon: BarChart3, permission: 'accounts_reports.view', feature: 'accounts.reports' },
      ],
    },
    {
      id: 'people',
      title: 'People & HR',
      icon: Briefcase,
      isDropdown: false,
      items: [
        { id: 'employees', label: 'Employees', icon: User, permission: 'employees.view', feature: 'hr.employees' },
        { id: 'work_sessions', label: 'Work Sessions & Recordings', icon: Monitor, permission: 'attendance.view', feature: 'hr.workRecording', badge: 'Live' },
        { id: 'live_tracking', label: 'Live Tracking', icon: Compass, permission: 'employee_tracking.view_live', feature: 'hr.liveTracking', badge: 'Live' },
        { id: 'leave_requests', label: 'Leave Requests', icon: CalendarDays, permission: 'employees.view', feature: 'hr.leave' },
        { id: 'attendance', label: 'Attendance', icon: UserCheck, permission: 'attendance.view', feature: 'hr.attendance' },
        { id: 'salary', label: 'Salary', icon: CalendarDays, permission: 'salary.view', feature: 'hr.salary' },
        { id: 'performance', label: 'Performance', icon: BarChart3, permission: 'performance.view', feature: 'hr.performance' },
      ],
    },
    {
      id: 'reports_hub',
      title: 'Reports Hub',
      icon: BarChart3,
      isDropdown: false,
      permission: 'reports.view',
      feature: 'reports',
      items: [
        { id: 'reports', label: 'All Analytics', icon: BarChart3, permission: 'reports.view', feature: 'reports' },
      ],
    },
    {
      id: 'integrations_group',
      title: 'Integrations',
      icon: Plug,
      isDropdown: false,
      permission: 'integrations.view',
      feature: 'integrations',
      items: [
        { id: 'integrations', label: 'Integrations', icon: Plug, permission: 'integrations.view', feature: 'integrations' },
      ],
    },
    {
      id: 'settings_group',
      title: 'Users & Roles',
      icon: Settings,
      isDropdown: false,
      permission: 'users.view',
      items: [
        { id: 'users_roles', label: 'Users & Roles', icon: Users, permission: 'users.view' },
      ],
    },
  ];

  // State to track which dropdowns are open
  const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean>>({
    sales: true,
    marketing: false,
    inventory: false,
    accounts: false,
    people: false,
  });

  // Automatically expand the dropdown that contains the active currentView
  useEffect(() => {
    navGroups.forEach(group => {
      if (group.isDropdown && group.items) {
        const hasActiveItem = group.items.some(item => item.id === currentView);
        if (hasActiveItem) {
          setOpenDropdowns(prev => ({
            ...prev,
            [group.id]: true
          }));
        }
      }
    });
  }, [currentView]);

  const toggleDropdown = (groupId: string) => {
    setOpenDropdowns(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  return (
    <>
      {/* Mobile Dark Backdrop Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-xs z-40 lg:hidden transition-opacity duration-300"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container - Off-canvas drawer on mobile, static on lg */}
      <aside
        style={{ backgroundColor: 'var(--sidebar-bg, #080d1a)' }}
        className={`fixed inset-y-0 left-0 z-50 w-64 text-slate-400 flex flex-col shrink-0 min-h-screen border-r border-slate-800/80 select-none transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div
          className="p-3.5 flex items-center justify-between border-b border-slate-800/80 relative overflow-hidden"
          style={{ backgroundColor: 'var(--sidebar-bg, #060a14)' }}
        >
          <div
            className="absolute top-0 left-0 right-0 h-[2px]"
            style={{ background: 'linear-gradient(to right, var(--brand-primary, #2563eb), var(--brand-accent, #06b6d4))' }}
          />
          
          <DynamicBrandLogo
            size={32}
            showText={true}
            textSize="sm"
            subtitle={isEmployee ? 'Field & Calling Desk' : isHrUser ? 'HR Management' : (organization?.clientCode ? `Client: ${organization.clientCode}` : 'Enterprise CRM & ERP')}
          />

          {/* Close button on mobile */}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden focus:outline-hidden cursor-pointer"
            aria-label="Close menu"
          >
            <span className="text-lg leading-none">&times;</span>
          </button>
        </div>

      {/* Navigation Menu */}
      <div className="flex-1 overflow-y-auto py-3 px-2.5 space-y-1.5 custom-scrollbar">
        {isEmployee ? (
          /* STRICT EMPLOYEE ONLY MENU - 10 Modules */
          <div className="space-y-1">
            <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>My Workspace</span>
              <span
                className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold"
                style={{
                  backgroundColor: 'var(--brand-primary-soft, rgba(37, 99, 235, 0.2))',
                  color: 'var(--brand-primary, #2563eb)'
                }}
              >
                PORTAL
              </span>
            </div>
            {employeeNavItems.filter(item => !item.permission || hasPermission(item.permission)).map(item => {
              const ItemIcon = item.icon;
              const isActive = currentView === item.id || (currentView === 'employee_portal' && item.id === 'emp_dashboard') || (currentView === 'dashboard' && item.id === 'emp_dashboard');

              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? 'font-bold shadow-md'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                  style={
                    isActive
                      ? {
                          backgroundColor: 'var(--sidebar-active-bg, var(--brand-primary, #2563eb))',
                          color: 'var(--sidebar-active-text, #ffffff)'
                        }
                      : undefined
                  }
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <ItemIcon
                      className="w-4 h-4 shrink-0"
                      style={{ color: isActive ? 'var(--sidebar-active-text, #ffffff)' : undefined }}
                    />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold font-mono ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          /* STANDARD ADMIN / SUPERADMIN MENU */
          navGroups
            .filter(group => !isHrUser || group.id === 'main' || group.id === 'people')
            .map(group => {
            // Check permissions and organization feature flags for sub-items
            const visibleItems = group.items
              ? group.items.filter(item => hasPermission(item.permission) && (!item.feature || canAccessFeature(item.feature)))
              : [];

            // If no items are visible and top-level permission/feature isn't granted, skip
            if (visibleItems.length === 0) {
              if (group.permission && !hasPermission(group.permission)) return null;
              if (group.feature && !canAccessFeature(group.feature)) return null;
            }

            const GroupIcon = group.icon;
            const isOpen = !!openDropdowns[group.id];
            const isGroupActive = visibleItems.some(item => item.id === currentView);

            // Render single direct item if not a dropdown
            if (!group.isDropdown) {
              return (
                <div key={group.id} className="pt-0.5">
                  {visibleItems.map(item => {
                    const ItemIcon = item.icon;
                    const isActive = currentView === item.id;

                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          if (item.id === 'users_roles' && user?.role === 'SUPER_ADMIN') {
                            setActivePortal('superadmin');
                            if (onClose) onClose();
                          } else {
                            handleNavClick(item.id);
                          }
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                          isActive
                            ? 'font-bold shadow-md'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                        }`}
                        style={
                          isActive
                            ? {
                                backgroundColor: 'var(--sidebar-active-bg, var(--brand-primary, #2563eb))',
                                color: 'var(--sidebar-active-text, #ffffff)'
                              }
                            : undefined
                        }
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <ItemIcon
                            className="w-4 h-4 shrink-0"
                            style={{ color: isActive ? 'var(--sidebar-active-text, #ffffff)' : undefined }}
                          />
                          <span className="truncate">{item.label}</span>
                        </div>
                        {isActive ? (
                          <Check className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--sidebar-active-text, #ffffff)' }} />
                        ) : item.id === 'users_roles' && user?.role === 'SUPER_ADMIN' ? (
                          <span
                            className="px-1.5 py-0.2 rounded text-[9px] font-bold border"
                            style={{
                              backgroundColor: 'var(--brand-primary-soft, rgba(37, 99, 235, 0.2))',
                              color: 'var(--brand-primary, #2563eb)',
                              borderColor: 'var(--brand-primary-border, rgba(37, 99, 235, 0.3))'
                            }}
                          >
                            ROOT
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              );
            }

            // If group is a Dropdown Accordion
            return (
              <div key={group.id} className="space-y-0.5 pt-1">
                {/* Dropdown Header Trigger */}
                <button
                  onClick={() => toggleDropdown(group.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    isGroupActive
                      ? 'text-white bg-slate-800/60 font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <GroupIcon
                      className="w-4 h-4 shrink-0"
                      style={{ color: isGroupActive ? 'var(--brand-primary, #2563eb)' : undefined }}
                    />
                    <span className="truncate tracking-wide">{group.title}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-400 px-1.5 py-0.5 rounded-full bg-slate-900/80 font-mono">
                      {visibleItems.length}
                    </span>
                    {isOpen ? (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 transition-transform duration-200" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 transition-transform duration-200" />
                    )}
                  </div>
                </button>

                {/* Collapsible Dropdown Sub-Items List */}
                {isOpen && (
                  <div className="pl-3 pr-1 py-1 space-y-0.5 border-l border-slate-800/80 ml-4 animate-in fade-in slide-in-from-top-1 duration-150">
                    {visibleItems.map(item => {
                      const ItemIcon = item.icon;
                      const isActive = currentView === item.id;

                      return (
                        <button
                          key={item.id}
                          onClick={() => handleNavClick(item.id)}
                          className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-all ${
                            isActive
                              ? 'font-bold shadow-xs'
                              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                          }`}
                          style={
                            isActive
                              ? {
                                  backgroundColor: 'var(--sidebar-active-bg, var(--brand-primary, #2563eb))',
                                  color: 'var(--sidebar-active-text, #ffffff)'
                                }
                              : undefined
                          }
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <ItemIcon
                              className="w-3.5 h-3.5 shrink-0"
                              style={{ color: isActive ? 'var(--sidebar-active-text, #ffffff)' : undefined }}
                            />
                            <span className="truncate">{item.label}</span>
                          </div>
                          {isActive && (
                            <div
                              className="w-1.5 h-1.5 rounded-full animate-pulse"
                              style={{ backgroundColor: 'var(--sidebar-active-text, #ffffff)' }}
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
            })
        )}
      </div>

      {/* Bottom User Pill */}
      <div className="p-3 border-t border-slate-800/80" style={{ backgroundColor: 'var(--sidebar-bg, #060a14)' }}>
        <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/90 border border-slate-800">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-7 h-7 rounded-lg border font-bold text-xs flex items-center justify-center"
              style={
                isEmployee
                  ? {
                      backgroundColor: 'rgba(16, 185, 129, 0.2)',
                      borderColor: 'rgba(16, 185, 129, 0.4)',
                      color: '#10B981'
                    }
                  : {
                      backgroundColor: 'var(--brand-primary, #2563eb)',
                      borderColor: 'var(--brand-primary-border, #2563eb)',
                      color: 'var(--button-primary-text, #ffffff)'
                    }
              }
            >
              {user?.avatar || 'CM'}
            </div>
            <div className="truncate">
              <div className="text-xs font-bold text-slate-200 truncate">{user?.name || 'Employee'}</div>
              <div
                className="text-[10px] font-mono font-semibold"
                style={{ color: isEmployee ? '#10B981' : 'var(--brand-primary, #2563eb)' }}
              >
                {user?.role || 'EMPLOYEE'}
              </div>
            </div>
          </div>
          {user?.role === 'SUPER_ADMIN' && (
            <button
              onClick={() => setActivePortal('superadmin')}
              className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 transition-colors cursor-pointer"
              title="Open Super Admin Portal"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
      </aside>
    </>
  );
};


