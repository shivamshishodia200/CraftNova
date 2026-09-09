import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { LoginRouter } from './components/auth/LoginRouter';
import { AdminHeader } from './../craftmedia_admin/components/AdminHeader';
import { AdminSidebar } from './../craftmedia_admin/components/AdminSidebar';

// Admin Page Views
import { DashboardView } from './../craftmedia_admin/pages/DashboardView';
import {
  LeadsView,
  CustomersView,
  QuotationsView,
  SalesOrdersView,
  FollowUpsView,
  SalesReportsView
} from './../craftmedia_admin/pages/SalesViews';
import {
  ProductsView,
  CategoriesView,
  InventoryView,
  StockInView,
  StockOutView,
  PurchasesView,
  SuppliersView
} from './../craftmedia_admin/pages/InventoryViews';
import {
  InvoicesView,
  PaymentsView,
  ReceivablesView,
  PayablesView,
  ExpensesView,
  CreditNotesView
} from './../craftmedia_admin/pages/AccountsViews';
import {
  EmployeesView,
  AttendanceView,
  SalaryView,
  PerformanceView,
  LeaveRequestsView
} from './../craftmedia_admin/pages/PeopleViews';
import {
  CampaignsView,
  TradeIndiaView,
  WhatsAppView,
  ReportsHubView,
  IntegrationsView
} from './../craftmedia_admin/pages/MarketingAndSystemViews';
import { EmployeePortalView } from './../craftmedia_admin/pages/EmployeePortalView';
import { EmployeeCustomersView } from './../craftmedia_admin/pages/EmployeeCustomersView';
import { EmployeeTasksView } from './../craftmedia_admin/pages/EmployeeTasksView';
import { EmployeeQuotationsView } from './../craftmedia_admin/pages/EmployeeQuotationsView';
import { EmployeeSalesOrdersView } from './../craftmedia_admin/pages/EmployeeSalesOrdersView';
import { EmployeePerformanceView } from './../craftmedia_admin/pages/EmployeePerformanceView';
import { EmployeeLeaveView } from './../craftmedia_admin/pages/EmployeeLeaveView';
import { EmployeeSalaryView } from './../craftmedia_admin/pages/EmployeeSalaryView';
import { EmployeeProfileView } from './../craftmedia_admin/pages/EmployeeProfileView';
import { EmployeeNotificationsView } from './../craftmedia_admin/pages/EmployeeNotificationsView';
import { HrDashboardView } from './../craftmedia_admin/pages/HrDashboardView';
import { LiveTrackingView } from './../craftmedia_admin/pages/LiveTrackingView';
import { HrWorkSessionsView } from './../craftmedia_admin/pages/HrWorkSessionsView';
import { appActivityTracker } from './services/appActivityTracker';

// Super Admin Portal
import { SuperAdminPortal } from './../craftmedia-super admin/SuperAdminPortal';

import { useOrganization } from './context/OrganizationContext';
import { parseRoute, ParsedRoute } from './utils/routeUtils';

export const AppContent: React.FC = () => {
  const { user, isAuthenticated, isLoading: isAuthLoading, activePortal, setActivePortal } = useAuth();
  const { branding, isLoading: isOrgLoading, previewOrg, setPreviewOrg } = useOrganization();
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [route, setRoute] = useState<ParsedRoute>(() => parseRoute());

  // Listen for browser navigation changes (popstate and hashchange)
  useEffect(() => {
    const handleLocationChange = () => {
      setRoute(parseRoute());
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  // If user role is EMPLOYEE, default view is employee portal
  useEffect(() => {
    if (user?.role === 'EMPLOYEE') {
      setCurrentView('emp_dashboard');
    } else if (user?.role === 'SUPER_ADMIN' && activePortal === 'superadmin') {
      // stay in superadmin
    } else if (currentView.startsWith('emp_') && user?.role !== 'EMPLOYEE') {
      setCurrentView('dashboard');
    }
  }, [user?.role, activePortal]);

  // Track route/view changes in employee activity telemetry
  useEffect(() => {
    if (currentView) {
      appActivityTracker.onNavigate(currentView);
    }
  }, [currentView]);

  if (isAuthLoading || (isAuthenticated && isOrgLoading && !previewOrg)) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <div className="w-10 h-10 border-3 border-slate-700 border-t-white rounded-full animate-spin mb-4" />
        <p className="text-xs font-semibold text-slate-400 tracking-wide">
          Initializing Enterprise Workspace...
        </p>
      </div>
    );
  }

  // If explicitly navigating to a login route (/admin/login/:slug, /employee/login/:slug, /super-admin/login)
  // OR if not authenticated, render LoginRouter!
  if (!isAuthenticated || route.isLoginRoute) {
    return <LoginRouter />;
  }

  // Render Super Admin Portal when active (unless previewing a client workspace)
  if (activePortal === 'superadmin' && user?.role === 'SUPER_ADMIN' && !previewOrg) {
    return <SuperAdminPortal />;
  }


  // Render Main Admin / Employee Workspace Layout
  const renderCurrentView = () => {
    switch (currentView) {
      case 'dashboard':
        return user?.role === 'HR_EMPLOYEE'
          ? <HrDashboardView onNavigate={setCurrentView} />
          : <DashboardView onNavigate={setCurrentView} />;
      
      // Employee Portal
      case 'emp_dashboard':
      case 'emp_attendance':
      case 'emp_leads':
      case 'emp_followups':
      case 'emp_calls':
        return <EmployeePortalView currentView={currentView} />;

      case 'emp_messages':
        return <EmployeePortalView currentView={currentView} />;
      case 'emp_customers':
        return <EmployeeCustomersView />;
      case 'emp_tasks':
        return <EmployeeTasksView />;
      case 'emp_quotations':
        return <EmployeeQuotationsView />;
      case 'emp_orders':
        return <EmployeeSalesOrdersView />;
      case 'emp_performance':
        return <EmployeePerformanceView />;
      case 'emp_leave':
        return <EmployeeLeaveView />;
      case 'emp_salary':
        return <EmployeeSalaryView />;
      case 'emp_profile':
        return <EmployeeProfileView />;
      case 'emp_notifications':
        return <EmployeeNotificationsView />;

      case 'employee_portal':
        return <EmployeePortalView currentView="emp_dashboard" />;

      // Sales Views
      case 'leads':
        return <LeadsView />;
      case 'customers':
        return <CustomersView />;
      case 'quotations':
        return <QuotationsView onNavigate={setCurrentView} />;
      case 'sales_orders':
        return <SalesOrdersView />;
      case 'follow_ups':
        return <FollowUpsView />;
      case 'sales_reports':
        return <SalesReportsView />;

      // Marketing Views
      case 'marketing_dashboard':
      case 'campaigns':
      case 'lead_sources':
        return <CampaignsView />;
      case 'tradeindia':
      case 'website_leads':
        return <TradeIndiaView />;
      case 'whatsapp':
        return <WhatsAppView />;
      case 'marketing_reports':
        return <ReportsHubView />;

      // Inventory Views
      case 'products':
        return <ProductsView />;
      case 'categories':
        return <CategoriesView />;
      case 'inventory':
      case 'warehouses':
        return <InventoryView />;
      case 'stock_in':
        return <StockInView />;
      case 'stock_out':
        return <StockOutView />;
      case 'purchase':
        return <PurchasesView />;
      case 'suppliers':
        return <SuppliersView />;

      // Accounts Views
      case 'invoices':
        return <InvoicesView />;
      case 'expenses':
        return <ExpensesView />;
      case 'credit_notes':
        return <CreditNotesView />;
      case 'payments':
        return <PaymentsView />;
      case 'receivables':
        return <ReceivablesView />;
      case 'payables':
        return <PayablesView />;
      case 'accounts_reports':
        return <ReportsHubView />;

      // People / HR Views
      case 'employees':
        return <EmployeesView />;
      case 'work_sessions':
        return <HrWorkSessionsView />;
      case 'live_tracking':
        return <LiveTrackingView />;
      case 'leave_requests':
        return <LeaveRequestsView />;
      case 'attendance':
        return <AttendanceView />;
      case 'performance':
        return <PerformanceView />;
      case 'salary':
        return <SalaryView />;

      // Reports Hub
      case 'reports':
        return <ReportsHubView />;

      // Integrations
      case 'integrations':
        return <IntegrationsView />;

      // Users & Roles (if accessible in admin mode)
      case 'users_roles':
        if (user?.role === 'SUPER_ADMIN') {
          setActivePortal('superadmin');
          return null;
        }
        return <EmployeesView />;

      default:
        return <DashboardView onNavigate={setCurrentView} />;
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-50 font-sans text-slate-800">
      {/* Super Admin Client Preview Banner */}
      {previewOrg && (
        <div
          className="text-white px-4 py-2 flex items-center justify-between text-xs font-semibold shadow-md z-50 shrink-0 border-b border-black/20"
          style={{
            background: 'linear-gradient(to right, var(--brand-secondary, #0f172a), var(--brand-primary, #2563eb))'
          }}
        >
          <div className="flex items-center gap-3">
            <span
              className="px-2 py-0.5 rounded text-[10px] tracking-wider uppercase font-bold border"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                color: '#ffffff',
                borderColor: 'rgba(255, 255, 255, 0.3)'
              }}
            >
              PREVIEW MODE
            </span>
            <span>
              Simulating client workspace: <strong className="text-white">{previewOrg.name}</strong> ({previewOrg.clientCode})
            </span>
          </div>
          <button
            onClick={() => {
              setPreviewOrg(null);
              if (user?.role === 'SUPER_ADMIN') {
                setActivePortal('superadmin');
              }
            }}
            className="bg-black/30 hover:bg-black/50 text-white px-3 py-1 rounded-lg transition-colors text-xs font-bold border border-white/25 cursor-pointer"
          >
            Exit Preview & Return to Super Admin
          </button>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Navigation */}
        <AdminSidebar
          currentView={currentView}
          onNavigate={setCurrentView}
          isOpen={isMobileSidebarOpen}
          onClose={() => setIsMobileSidebarOpen(false)}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <AdminHeader
            onExportReport={() => {}}
            onToggleSidebar={() => setIsMobileSidebarOpen(prev => !prev)}
          />

          <main className="flex-1 overflow-y-auto bg-[#f8fafc]">
            {renderCurrentView()}
          </main>
        </div>
      </div>
    </div>
  );
};

export default AppContent;

