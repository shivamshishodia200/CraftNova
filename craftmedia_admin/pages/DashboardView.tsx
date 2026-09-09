import React, { useState, useEffect } from 'react';
import { api } from '@/src/services/api';
import { useAuth } from '@/src/context/AuthContext';
import {
  Target,
  Users,
  Mail,
  Boxes,
  ExternalLink,
  ArrowRight,
  TrendingUp,
  DollarSign,
  ShoppingCart,
  CheckCircle2,
  Clock,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { exportToCSV } from '@/src/components/common/UIComponents';

export const DashboardView: React.FC<{ onNavigate: (viewId: string) => void }> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    const res = await api.get('/dashboard');
    if (res.success && res.data) {
      setStats(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleExportSummary = () => {
    if (!stats) return;
    const summaryData = [
      { Metric: 'Total Leads', Value: stats.cards?.totalLeads || 0 },
      { Metric: 'Total Customers', Value: stats.cards?.totalCustomers || 0 },
      { Metric: 'Total Invoices', Value: stats.cards?.totalInvoices || 0 },
      { Metric: 'Total Products', Value: stats.cards?.totalProducts || 0 },
      { Metric: 'Total Sales Revenue (INR)', Value: stats.cards?.totalSales || 0 },
      { Metric: 'Total Purchases (INR)', Value: stats.cards?.totalPurchases || 0 },
      { Metric: 'Total Inventory Stock Value (INR)', Value: stats.cards?.stockValue || 0 },
      { Metric: 'Total Pending Receivables (INR)', Value: stats.cards?.pendingPayments || 0 },
    ];
    exportToCSV('360CRM_Executive_Dashboard_Summary', summaryData);
  };

  const cards = stats?.cards || {
    totalLeads: 0,
    totalCustomers: 0,
    totalInvoices: 0,
    totalProducts: 0,
    totalSales: 0,
    totalPurchases: 0,
    stockValue: 0,
    pendingPayments: 0
  };

  const erpModules = [
    {
      id: 'leads',
      name: 'Sales Management',
      flow: 'Leads → Customers → Quotations → Orders',
      status: 'Ready',
      viewId: 'leads'
    },
    {
      id: 'marketing_dashboard',
      name: 'Marketing Management',
      flow: 'Campaigns → Sources → TradeIndia → Website → WhatsApp',
      status: 'Ready',
      viewId: 'campaigns'
    },
    {
      id: 'products',
      name: 'Store / Inventory',
      flow: 'Products → Stock → Purchase → Suppliers',
      status: 'Ready',
      viewId: 'products'
    },
    {
      id: 'invoices',
      name: 'Accounts Management',
      flow: 'Invoices → Payments → Receivables → Payables',
      status: 'Ready',
      viewId: 'invoices'
    },
    {
      id: 'employees',
      name: 'Employee Management',
      flow: 'Employees → Attendance → Salary → Performance',
      status: 'Ready',
      viewId: 'employees'
    },
  ];

  const businessFlowSteps = [
    { step: 1, label: 'Lead', count: stats?.flowStats?.leads || cards.totalLeads, viewId: 'leads' },
    { step: 2, label: 'Follow-up', count: stats?.flowStats?.followUps || 2, viewId: 'follow_ups' },
    { step: 3, label: 'Quotation', count: stats?.flowStats?.quotations || 2, viewId: 'quotations' },
    { step: 4, label: 'Sales Order', count: stats?.flowStats?.salesOrders || 1, viewId: 'sales_orders' },
    { step: 5, label: 'Invoice', count: stats?.flowStats?.invoices || cards.totalInvoices, viewId: 'invoices' },
    { step: 6, label: 'Payment', count: stats?.flowStats?.payments || 2, viewId: 'payments' },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-150">
      {/* Title & Top Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Live overview of your business operations.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchStats}
            className="p-2.5 text-slate-500 hover:text-slate-800 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-2xs"
            title="Refresh metrics"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleExportSummary}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-white text-sm font-semibold rounded-xl shadow-xs transition-all active:scale-95 hover:opacity-90 cursor-pointer"
            style={{
              backgroundColor: 'var(--brand-primary, #2563eb)',
              color: 'var(--button-primary-text, #ffffff)'
            }}
          >
            <ExternalLink className="w-4 h-4" />
            Export Report
          </button>
        </div>
      </div>

      {/* 4 Main Big Cards Matching Screenshot */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Leads */}
        <div
          onClick={() => onNavigate('leads')}
          className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform"
              style={{
                backgroundColor: 'var(--brand-primary-soft, rgba(37, 99, 235, 0.1))',
                color: 'var(--brand-primary, #2563eb)'
              }}
            >
              <Target className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Total Leads</p>
              <h3 className="text-3xl font-black text-slate-900 mt-0.5">{cards.totalLeads}</h3>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 font-medium mt-4 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Connected to MongoDB
          </p>
        </div>

        {/* Customers */}
        <div
          onClick={() => onNavigate('customers')}
          className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform"
              style={{
                backgroundColor: 'var(--brand-primary-soft, rgba(37, 99, 235, 0.1))',
                color: 'var(--brand-primary, #2563eb)'
              }}
            >
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Customers</p>
              <h3 className="text-3xl font-black text-slate-900 mt-0.5">{cards.totalCustomers}</h3>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 font-medium mt-4 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Connected to MongoDB
          </p>
        </div>

        {/* Invoices */}
        <div
          onClick={() => onNavigate('invoices')}
          className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform"
              style={{
                backgroundColor: 'var(--brand-primary-soft, rgba(37, 99, 235, 0.1))',
                color: 'var(--brand-primary, #2563eb)'
              }}
            >
              <Mail className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Invoices</p>
              <h3 className="text-3xl font-black text-slate-900 mt-0.5">{cards.totalInvoices}</h3>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 font-medium mt-4 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Connected to MongoDB
          </p>
        </div>

        {/* Products */}
        <div
          onClick={() => onNavigate('products')}
          className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform"
              style={{
                backgroundColor: 'var(--brand-primary-soft, rgba(37, 99, 235, 0.1))',
                color: 'var(--brand-primary, #2563eb)'
              }}
            >
              <Boxes className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Products</p>
              <h3 className="text-3xl font-black text-slate-900 mt-0.5">{cards.totalProducts}</h3>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 font-medium mt-4 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Connected to MongoDB
          </p>
        </div>
      </div>

      {/* Financial Overview Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-xs border border-slate-800">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Sales Invoiced</p>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <h4 className="text-2xl font-bold text-white mt-2">₹{(Number(cards.totalSales) || 0).toLocaleString('en-IN')}</h4>
          <p className="text-xs text-slate-400 mt-1">Across all confirmed billing</p>
        </div>

        <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-xs border border-slate-800">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Stock Valuation</p>
            <Boxes className="w-4 h-4 text-blue-400" />
          </div>
          <h4 className="text-2xl font-bold text-white mt-2">₹{(Number(cards.stockValue) || 0).toLocaleString('en-IN')}</h4>
          <p className="text-xs text-slate-400 mt-1">Live physical warehouse value</p>
        </div>

        <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-xs border border-slate-800">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Purchase Orders</p>
            <ShoppingCart className="w-4 h-4 text-amber-400" />
          </div>
          <h4 className="text-2xl font-bold text-white mt-2">₹{(Number(cards.totalPurchases) || 0).toLocaleString('en-IN')}</h4>
          <p className="text-xs text-slate-400 mt-1">Supplier commitments & POs</p>
        </div>

        <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-xs border border-slate-800">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pending Receivables</p>
            <Clock className="w-4 h-4 text-rose-400" />
          </div>
          <h4 className="text-2xl font-bold text-white mt-2">₹{(Number(cards.pendingPayments) || 0).toLocaleString('en-IN')}</h4>
          <p className="text-xs text-slate-400 mt-1">Outstanding customer dues</p>
        </div>
      </div>

      {/* 2 Bottom Sections: ERP Modules & Business Flow Matching Screenshot */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Card: ERP Modules */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-bold text-slate-900">ERP Modules</h3>
            <span className="text-xs font-semibold text-slate-400">Operational flow</span>
          </div>

          <div className="divide-y divide-slate-100">
            {erpModules.map(mod => (
              <div
                key={mod.id}
                onClick={() => onNavigate(mod.viewId)}
                className="py-4 first:pt-0 last:pb-0 flex items-center justify-between group hover:bg-slate-50/70 p-2 rounded-xl transition-colors cursor-pointer"
              >
                <div>
                  <h4 className="text-sm font-bold text-slate-900 group-hover:opacity-80 transition-opacity">
                    {mod.name}
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">{mod.flow}</p>
                </div>
                <span
                  className="inline-flex items-center px-3 py-1 text-xs font-bold rounded-lg border"
                  style={{
                    backgroundColor: 'var(--brand-primary-soft, rgba(37, 99, 235, 0.1))',
                    color: 'var(--brand-primary, #2563eb)',
                    borderColor: 'var(--brand-primary-border, rgba(37, 99, 235, 0.3))'
                  }}
                >
                  {mod.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Card: Business Flow */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-900">Business Flow</h3>
              <span className="text-xs font-semibold text-slate-400">End-to-end</span>
            </div>

            {/* Step Pills Matching Screenshot */}
            <div className="flex flex-wrap items-center gap-3">
              {businessFlowSteps.map((s, idx) => (
                <button
                  key={s.step}
                  onClick={() => onNavigate(s.viewId)}
                  className="flex items-center gap-2 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-800 transition-all group active:scale-95 cursor-pointer"
                >
                  <span
                    className="w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center shrink-0 shadow-2xs"
                    style={{
                      backgroundColor: 'var(--brand-primary, #2563eb)',
                      color: 'var(--button-primary-text, #ffffff)'
                    }}
                  >
                    {s.step}
                  </span>
                  <span>{s.label}</span>
                  {idx < businessFlowSteps.length - 1 && (
                    <span className="text-slate-400 font-normal">→</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Descriptive Box Matching Screenshot */}
          <div className="mt-8 p-4 bg-slate-50 rounded-xl border border-slate-200/60 text-xs text-slate-600 leading-relaxed">
            Employees receive assigned leads, record calls/messages/follow-ups, and the activity timeline remains visible to CRM users.
          </div>
        </div>
      </div>
    </div>
  );
};
