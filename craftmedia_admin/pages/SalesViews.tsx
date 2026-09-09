import React, { useState, useEffect } from 'react';
import { api } from '@/src/services/api';
import { useAuth } from '@/src/context/AuthContext';
import { Lead, Customer, Quotation, SalesOrder, FollowUp } from '@/src/types';
import { TaxInvoiceModal } from '../components/TaxInvoiceModal';
import {
  PageHeader,
  StatusBadge,
  Modal,
  EmptyState,
  exportToCSV
} from '@/src/components/common/UIComponents';
import {
  Target,
  Users,
  ShoppingCart,
  ShoppingBag,
  Zap,
  Plus,
  Search,
  CheckCircle2,
  Trash2,
  Edit2,
  Eye,
  ArrowRight,
  Phone,
  Mail,
  Building,
  Calendar,
  DollarSign,
  Download,
  AlertCircle,
  Clock,
  CheckCheck,
  FileText,
  FileCheck,
  Send,
  Printer,
  ChevronRight,
  TrendingUp,
  Award,
  Package,
  Truck,
  Layers,
  Sparkles,
  X,
  MessageSquare,
  BarChart3,
  Filter,
  Check,
  UserCheck,
  UserPlus,
  User,
  Briefcase
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';

// Helper to calculate how many minutes/hours ago a lead arrived
export const getLeadArrivalLabel = (createdAt?: string): { text: string; isNew: boolean; fullDate: string } => {
  if (!createdAt) return { text: 'Unknown', isNew: false, fullDate: '—' };
  const d = new Date(createdAt);
  if (isNaN(d.getTime())) return { text: 'Unknown', isNew: false, fullDate: '—' };

  const now = new Date();
  const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  const fullDate = d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  if (diffSec < 60) return { text: 'Just now', isNew: true, fullDate };
  if (diffMin === 1) return { text: '1m ago', isNew: true, fullDate };
  if (diffMin < 60) return { text: `${diffMin}m ago`, isNew: diffMin <= 30, fullDate };
  if (diffHours === 1) return { text: '1h ago', isNew: false, fullDate };
  if (diffHours < 24) return { text: `${diffHours}h ago`, isNew: false, fullDate };
  if (diffDays === 1) return { text: 'Yesterday', isNew: false, fullDate };
  if (diffDays < 7) return { text: `${diffDays}d ago`, isNew: false, fullDate };
  return { text: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }), isNew: false, fullDate };
};

// ==========================================
// 1. LEADS VIEW
// ==========================================
export const LeadsView: React.FC = () => {
  const { hasPermission } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [salesReps, setSalesReps] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('THIS_MONTH');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  
  // Modals & Drawers
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [convertingLead, setConvertingLead] = useState<Lead | null>(null);
  const [followUpLead, setFollowUpLead] = useState<Lead | null>(null);
  const [assigningLead, setAssigningLead] = useState<Lead | null>(null);
  const [assignEmpId, setAssignEmpId] = useState('');
  const [assignNotes, setAssignNotes] = useState('');
  const [drawerEmpId, setDrawerEmpId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State for Lead
  const [formData, setFormData] = useState({
    name: '',
    companyName: '',
    email: '',
    phone: '',
    source: 'Website',
    status: 'NEW',
    priority: 'MEDIUM',
    assignedTo: 'Vikram Mehta',
    estimatedValue: 100000,
    city: 'Ahmedabad',
    state: 'Gujarat',
    notes: '',
    tags: 'Hot Lead'
  });

  // Follow-up Form State
  const [fupData, setFupData] = useState({
    title: 'Client Discovery Call',
    type: 'Call',
    priority: 'MEDIUM',
    scheduledAt: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
    description: 'Discuss requirement and share catalog'
  });

  const fetchSalesReps = async () => {
    const res = await api.get('/sales-reps');
    if (res.success && res.data) {
      setSalesReps(res.data);
    }
  };

  const fetchLeads = async () => {
    setLoading(true);
    const effectiveDateParam = dateFilter === 'SPECIFIC_MONTH' && selectedMonth ? `MONTH_${selectedMonth}` : dateFilter;
    const res = await api.get('/leads', {
      search,
      status: statusFilter,
      source: sourceFilter,
      priority: priorityFilter,
      dateFilter: effectiveDateParam,
      fromDate,
      toDate
    });
    if (res.success && res.data) {
      setLeads(res.data);
      if (res.stats) setStats(res.stats);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLeads();
    fetchSalesReps();
  }, [statusFilter, sourceFilter, priorityFilter, dateFilter, selectedMonth, fromDate, toDate]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLeads();
  };

  const handleOpenCreate = (lead?: Lead) => {
    if (lead) {
      setEditingLead(lead);
      setFormData({
        name: lead.name,
        companyName: lead.companyName || '',
        email: lead.email,
        phone: lead.phone,
        source: lead.source,
        status: lead.status,
        priority: lead.priority || 'MEDIUM',
        assignedTo: lead.assignedTo || '',
        estimatedValue: lead.estimatedValue || 0,
        city: lead.city || 'Ahmedabad',
        state: lead.state || 'Gujarat',
        notes: lead.notes || '',
        tags: (lead.tags || []).join(', ')
      });
    } else {
      setEditingLead(null);
      setFormData({
        name: '',
        companyName: '',
        email: '',
        phone: '',
        source: 'Website',
        status: 'NEW',
        priority: 'MEDIUM',
        assignedTo: '',
        estimatedValue: 100000,
        city: 'Ahmedabad',
        state: 'Gujarat',
        notes: '',
        tags: 'Hot Lead'
      });
    }
    setIsCreateOpen(true);
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningLead) return;
    const selectedRep = salesReps.find(r => r._id === assignEmpId || r.name === assignEmpId) || salesReps[0];
    if (!selectedRep && !assignEmpId) {
      alert('Please select an employee / sales representative');
      return;
    }
    const repName = selectedRep ? selectedRep.name : assignEmpId;
    const repId = selectedRep ? selectedRep._id : undefined;

    setIsSubmitting(true);
    const res = await api.patch(`/leads/${assigningLead._id}/assign`, {
      employeeId: repId,
      assignedTo: repName,
      notes: assignNotes
    });
    setIsSubmitting(false);

    if (res.success) {
      setAssigningLead(null);
      setAssignNotes('');
      fetchLeads();
      fetchSalesReps();
      if (selectedLead && selectedLead._id === assigningLead._id) {
        setSelectedLead({ ...selectedLead, assignedTo: repName, assignedToId: repId } as any);
      }
    } else {
      alert(res.message || 'Failed to assign lead');
    }
  };

  const handleDrawerAssign = async () => {
    if (!selectedLead || !drawerEmpId) return;
    const selectedRep = salesReps.find(r => r._id === drawerEmpId || r.name === drawerEmpId);
    if (!selectedRep) return;

    setIsSubmitting(true);
    const res = await api.patch(`/leads/${selectedLead._id}/assign`, {
      employeeId: selectedRep._id,
      assignedTo: selectedRep.name
    });
    setIsSubmitting(false);

    if (res.success) {
      setSelectedLead({ ...selectedLead, assignedTo: selectedRep.name, assignedToId: selectedRep._id } as any);
      setDrawerEmpId('');
      fetchLeads();
      fetchSalesReps();
    } else {
      alert(res.message || 'Failed to assign lead');
    }
  };

  const handleSaveLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const payload = {
      ...formData,
      tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean)
    };

    if (editingLead) {
      const res = await api.put(`/leads/${editingLead._id}`, payload);
      if (res.success) {
        setIsCreateOpen(false);
        setEditingLead(null);
        fetchLeads();
        if (selectedLead && selectedLead._id === editingLead._id) {
          setSelectedLead({ ...selectedLead, ...payload } as any);
        }
      } else {
        alert(res.message || 'Failed to update lead');
      }
    } else {
      const res = await api.post('/leads', payload);
      if (res.success) {
        setIsCreateOpen(false);
        fetchLeads();
      } else {
        alert(res.message || 'Failed to create lead');
      }
    }
    setIsSubmitting(false);
  };

  const handleDeleteLead = async (id: string) => {
    if (confirm('Are you sure you want to permanently delete this lead?')) {
      const res = await api.delete(`/leads/${id}`);
      if (res.success) {
        if (selectedLead?._id === id) setSelectedLead(null);
        fetchLeads();
      } else {
        alert(res.message || 'Failed to delete lead');
      }
    }
  };

  const handleConvertLead = async (lead: Lead) => {
    if (confirm(`Convert lead '${lead.name}' into a permanent Customer Account?`)) {
      const res = await api.post(`/leads/${lead._id}/convert`);
      if (res.success) {
        alert(`✅ Success: ${res.message}`);
        setConvertingLead(null);
        if (selectedLead?._id === lead._id) setSelectedLead(null);
        fetchLeads();
      } else {
        alert(res.message || 'Failed to convert lead');
      }
    }
  };

  const handleScheduleFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!followUpLead) return;
    setIsSubmitting(true);
    const res = await api.post('/follow-ups', {
      leadId: followUpLead._id,
      leadName: followUpLead.name,
      ...fupData,
      assignedTo: followUpLead.assignedTo || 'Vikram Mehta'
    });
    if (res.success) {
      alert(`✅ Follow-up scheduled for ${followUpLead.name}!`);
      setFollowUpLead(null);
    } else {
      alert(res.message || 'Failed to schedule follow-up');
    }
    setIsSubmitting(false);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Leads Pipeline Management"
        subtitle="Track, qualify and convert prospective business inquiries across all acquisition channels"
        secondaryAction={
          <button
            onClick={() => exportToCSV('360CRM_Leads_Report', leads)}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>
        }
        actionText="Add New Lead"
        actionPermission="leads.create"
        onAction={() => handleOpenCreate()}
      />

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {[
          { label: 'Total Leads (All-Time)', value: stats?.totalLeads ?? leads.length, color: 'text-blue-600', bg: 'bg-blue-50/60', icon: Target },
          { label: "This Month's Inbound", value: stats?.currentMonthLeads ?? leads.length, color: 'text-indigo-600', bg: 'bg-indigo-50/60', icon: Calendar },
          { label: "Today's Inbound", value: stats?.todayLeads ?? 0, color: 'text-emerald-600', bg: 'bg-emerald-50/60', icon: Sparkles },
          { label: 'Qualified', value: stats?.qualifiedLeads ?? leads.filter(l => l.status === 'QUALIFIED').length, color: 'text-purple-600', bg: 'bg-purple-50/60', icon: CheckCircle2 },
          { label: 'Won / Converted', value: stats?.convertedLeads ?? leads.filter(l => l.status === 'WON' || l.status === 'CONVERTED').length, color: 'text-teal-600', bg: 'bg-teal-50/60', icon: Award },
          { label: 'Pipeline Value', value: `₹${((stats?.pipelineValue ?? 0) / 100000).toFixed(1)}L`, color: 'text-amber-600', bg: 'bg-amber-50/60', icon: DollarSign }
        ].map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div key={idx} className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{kpi.label}</span>
                <div className={`p-1.5 rounded-lg ${kpi.bg} ${kpi.color}`}><Icon className="w-3.5 h-3.5" /></div>
              </div>
              <p className={`text-xl font-black mt-2 ${kpi.color}`}>{kpi.value}</p>
            </div>
          );
        })}
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <form onSubmit={handleSearchSubmit} className="relative w-full sm:max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search leads by name, company, email, phone, city..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium"
            />
          </form>

          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            {/* Date / Month Filter Dropdown */}
            <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700">
              <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <select
                value={dateFilter}
                onChange={e => {
                  const val = e.target.value;
                  setDateFilter(val);
                  if (val !== 'CUSTOM') {
                    setFromDate('');
                    setToDate('');
                  }
                  if (val !== 'SPECIFIC_MONTH') {
                    setSelectedMonth('');
                  }
                }}
                className="bg-transparent focus:outline-hidden text-xs font-semibold text-slate-700 cursor-pointer"
              >
                <option value="THIS_MONTH">This Month ({new Date().toLocaleString('en-IN', { month: 'short', year: 'numeric' })}) [Default]</option>
                <option value="ALL_TIME">All Time ({stats?.totalLeads ?? 0} Total Leads)</option>
                <option value="TODAY">Today's Leads</option>
                <option value="YESTERDAY">Yesterday</option>
                <option value="LAST_7_DAYS">Last 7 Days</option>
                <option value="LAST_30_DAYS">Last 30 Days</option>
                <option value="PREV_MONTH">Last Month</option>
                <option value="SPECIFIC_MONTH">Select Specific Month...</option>
                <option value="CUSTOM">Custom Date Range...</option>
              </select>
            </div>

            {/* Specific Month Picker */}
            {dateFilter === 'SPECIFIC_MONTH' && (
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1">
                <input
                  type="month"
                  value={selectedMonth || new Date().toISOString().slice(0, 7)}
                  onChange={e => setSelectedMonth(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-hidden cursor-pointer"
                  title="Pick any Month"
                />
              </div>
            )}

            {/* Custom Range Inputs */}
            {dateFilter === 'CUSTOM' && (
              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1">
                <input
                  type="date"
                  value={fromDate}
                  onChange={e => setFromDate(e.target.value)}
                  className="bg-transparent text-[11px] font-medium text-slate-700 focus:outline-hidden"
                  title="From Date"
                />
                <span className="text-slate-400 text-xs">-</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={e => setToDate(e.target.value)}
                  className="bg-transparent text-[11px] font-medium text-slate-700 focus:outline-hidden"
                  title="To Date"
                />
              </div>
            )}

            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-hidden cursor-pointer"
            >
              <option value="">All Statuses</option>
              <option value="NEW">New</option>
              <option value="CONTACTED">Contacted</option>
              <option value="QUALIFIED">Qualified</option>
              <option value="PROPOSAL">Proposal</option>
              <option value="NEGOTIATION">Negotiation</option>
              <option value="WON">Won</option>
              <option value="CONVERTED">Converted</option>
              <option value="LOST">Lost</option>
            </select>

            <select
              value={sourceFilter}
              onChange={e => setSourceFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-hidden cursor-pointer"
            >
              <option value="">All Sources</option>
              <option value="TradeIndia">TradeIndia</option>
              <option value="IndiaMART">IndiaMART</option>
              <option value="Website">Website Inbound</option>
              <option value="WhatsApp">WhatsApp</option>
              <option value="Custom REST">Custom REST API</option>
              <option value="Referral">Referral</option>
              <option value="Manual">Manual</option>
            </select>

            <select
              value={priorityFilter}
              onChange={e => setPriorityFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-hidden cursor-pointer"
            >
              <option value="">All Priorities</option>
              <option value="LOW">Low Priority</option>
              <option value="MEDIUM">Medium Priority</option>
              <option value="HIGH">High Priority</option>
              <option value="URGENT">Urgent Priority</option>
            </select>

            {(statusFilter || sourceFilter || priorityFilter || dateFilter !== 'THIS_MONTH' || fromDate || toDate || search) && (
              <button
                onClick={() => {
                  setSearch('');
                  setStatusFilter('');
                  setSourceFilter('');
                  setPriorityFilter('');
                  setDateFilter('THIS_MONTH');
                  setSelectedMonth('');
                  setFromDate('');
                  setToDate('');
                }}
                className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold transition-colors"
                title="Reset to Current Month"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Active View Context Bar */}
      <div className="bg-slate-50/90 border border-slate-200/80 rounded-xl px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-slate-800 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-blue-600" />
            <span>Active View:</span>
          </span>
          <span className="px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold border border-blue-200/70 shadow-2xs">
            {dateFilter === 'THIS_MONTH'
              ? `Current Month (${new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric' })})`
              : dateFilter === 'ALL_TIME'
              ? 'All-Time Leads'
              : dateFilter === 'SPECIFIC_MONTH' && selectedMonth
              ? `Month: ${new Date(selectedMonth + '-01').toLocaleString('en-IN', { month: 'long', year: 'numeric' })}`
              : dateFilter === 'TODAY'
              ? "Today's Inbound"
              : dateFilter === 'YESTERDAY'
              ? 'Yesterday'
              : dateFilter === 'LAST_7_DAYS'
              ? 'Last 7 Days'
              : dateFilter === 'PREV_MONTH'
              ? 'Last Month'
              : dateFilter === 'CUSTOM'
              ? `Custom: ${fromDate || 'Start'} to ${toDate || 'End'}`
              : dateFilter}
          </span>
          <span className="text-slate-500 font-medium">
            • Showing <strong>{leads.length}</strong> {leads.length === 1 ? 'lead' : 'leads'} (Total CRM Records: <strong className="text-slate-900">{stats?.totalLeads ?? leads.length}</strong>)
          </span>
        </div>

        {dateFilter !== 'ALL_TIME' ? (
          <button
            onClick={() => setDateFilter('ALL_TIME')}
            className="text-blue-600 hover:text-blue-700 font-bold text-xs hover:underline cursor-pointer flex items-center gap-1 shrink-0"
          >
            <span>View All-Time Leads ({stats?.totalLeads ?? leads.length})</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        ) : (
          <button
            onClick={() => setDateFilter('THIS_MONTH')}
            className="text-blue-600 hover:text-blue-700 font-bold text-xs hover:underline cursor-pointer flex items-center gap-1 shrink-0"
          >
            <span>Filter to Current Month ({stats?.currentMonthLeads ?? 0})</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Leads Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs font-semibold flex items-center justify-center gap-2">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span>Loading Leads Pipeline...</span>
          </div>
        ) : leads.length === 0 ? (
          <EmptyState
            icon={Target}
            title="No leads match your search criteria"
            description="Try changing your search keywords or clear your active date, status, and channel filters."
            actionText="Clear All Filters"
            onAction={() => { setSearch(''); setStatusFilter(''); setSourceFilter(''); setPriorityFilter(''); setDateFilter(''); setFromDate(''); setToDate(''); }}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5 min-w-[270px]">Lead Details & Arrival</th>
                  <th className="px-5 py-3.5 min-w-[160px]">Contact Info</th>
                  <th className="px-5 py-3.5 min-w-[130px]">Source & Channel</th>
                  <th className="px-5 py-3.5 min-w-[120px]">Pipeline Status</th>
                  <th className="px-5 py-3.5 min-w-[100px]">Priority</th>
                  <th className="px-5 py-3.5 min-w-[110px]">Est. Value</th>
                  <th className="px-5 py-3.5 min-w-[140px]">Assigned Rep</th>
                  <th className="px-5 py-3.5 text-right min-w-[160px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {leads.map(lead => {
                  const arrival = getLeadArrivalLabel(lead.createdAt);
                  return (
                  <tr key={lead._id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-4 min-w-[270px]">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200/70 text-blue-700 font-bold flex items-center justify-center text-xs shrink-0 mt-0.5 shadow-2xs">
                          {lead.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-xs truncate max-w-[150px]">{lead.name}</span>
                            {lead.leadCode && (
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 font-mono text-[10px] font-semibold text-slate-500 shrink-0 whitespace-nowrap border border-slate-200/60">
                                {lead.leadCode}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5 truncate max-w-[210px]">
                            <Building className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{lead.companyName || 'Individual Contact'}</span>
                          </p>
                          <div className="flex items-center gap-1.5 mt-1.5 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold whitespace-nowrap ${
                                arrival.isNew
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80 font-bold'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                              title={`Lead Arrived at: ${arrival.fullDate}`}
                            >
                              <Clock className={`w-3 h-3 shrink-0 ${arrival.isNew ? 'text-emerald-600' : 'text-slate-400'}`} />
                              <span>{arrival.text}</span>
                            </span>
                            {arrival.isNew && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-600 text-white font-bold text-[9px] uppercase tracking-wider whitespace-nowrap shadow-2xs">
                                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse shrink-0" />
                                <span>New</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <p className="text-slate-800 font-semibold flex items-center gap-1.5">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{lead.phone}</span>
                      </p>
                      {lead.email && (
                        <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Mail className="w-3 h-3 text-slate-400" />
                          <span>{lead.email}</span>
                        </p>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex flex-col gap-1 items-start">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md font-semibold text-[11px] ${
                          lead.source === 'TradeIndia' || lead.source === 'TRADEINDIA'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200/80 font-bold'
                            : lead.source === 'IndiaMART'
                            ? 'bg-teal-50 text-teal-700 border border-teal-200/80 font-bold'
                            : lead.source === 'Website'
                            ? 'bg-blue-50 text-blue-700 font-bold'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {lead.source}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {lead.channel || (lead.source === 'TradeIndia' || lead.source === 'IndiaMART' ? 'B2B Portal' : 'Direct Inbound')}
                        </span>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <StatusBadge status={lead.status} />
                    </td>

                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        lead.priority === 'URGENT' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                        lead.priority === 'HIGH' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                        lead.priority === 'LOW' ? 'bg-slate-100 text-slate-600' :
                        'bg-blue-50 text-blue-700'
                      }`}>
                        {lead.priority || 'MEDIUM'}
                      </span>
                    </td>

                    <td className="px-5 py-4 font-bold text-slate-900">
                      ₹{Number(lead.estimatedValue || 0).toLocaleString('en-IN')}
                    </td>

                    <td className="px-5 py-4">
                      {lead.assignedTo && lead.assignedTo !== 'Unassigned' ? (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold flex items-center justify-center text-[10px] shrink-0">
                            {lead.assignedTo.slice(0, 1).toUpperCase()}
                          </div>
                          <span className="font-bold text-slate-800 text-xs block truncate max-w-[110px]">{lead.assignedTo}</span>
                          <button
                            onClick={() => {
                              setAssigningLead(lead);
                              setAssignEmpId(salesReps.find(r => r.name === lead.assignedTo)?._id || salesReps[0]?._id || '');
                              setAssignNotes('');
                            }}
                            className="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                            title="Reassign to Another Employee"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200/80">
                            Unassigned
                          </span>
                          <button
                            onClick={() => {
                              setAssigningLead(lead);
                              setAssignEmpId(salesReps[0]?._id || '');
                              setAssignNotes('');
                            }}
                            className="px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10px] font-bold transition-colors cursor-pointer flex items-center gap-1 border border-blue-200/60"
                            title="Assign to Sales Representative"
                          >
                            <UserCheck className="w-3 h-3" />
                            <span>Assign</span>
                          </button>
                        </div>
                      )}
                    </td>

                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => {
                            setAssigningLead(lead);
                            setAssignEmpId(salesReps.find(r => r.name === lead.assignedTo)?._id || salesReps[0]?._id || '');
                            setAssignNotes('');
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                          title="Assign to Employee"
                        >
                          <UserCheck className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setSelectedLead(lead)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                          title="View Lead 360 Drawer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setFollowUpLead(lead)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
                          title="Schedule Follow-up"
                        >
                          <Calendar className="w-4 h-4" />
                        </button>
                        {lead.status !== 'CONVERTED' && (
                          <button
                            onClick={() => handleConvertLead(lead)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                            title="Convert to Customer Account"
                          >
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenCreate(lead)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                          title="Edit Lead"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteLead(lead._id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Delete Lead"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Lead Detail Drawer */}
      {selectedLead && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex justify-end">
          <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white font-black flex items-center justify-center text-sm shadow-md">
                  {selectedLead.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">{selectedLead.name}</h3>
                  <p className="text-xs text-slate-500 font-semibold">{selectedLead.companyName || 'Individual Contact'} • {selectedLead.leadCode}</p>
                </div>
              </div>
              <button onClick={() => setSelectedLead(null)} className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Quick Conversion Banner */}
              {selectedLead.status !== 'CONVERTED' ? (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between shadow-lg shadow-blue-600/20">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-blue-200">Opportunity Conversion</h4>
                    <p className="text-sm font-black mt-0.5">Ready to formalize into Customer?</p>
                  </div>
                  <button
                    onClick={() => handleConvertLead(selectedLead)}
                    className="px-4 py-2 bg-white text-blue-700 rounded-xl text-xs font-black hover:bg-blue-50 shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Convert Now</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2 text-emerald-800 text-xs font-bold">
                  <CheckCheck className="w-4 h-4 text-emerald-600" />
                  <span>This Lead has been converted to an active Customer account.</span>
                </div>
              )}

              {/* Assigned Employee Card & Quick Reassignment */}
              <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Assigned Employee</span>
                  </h4>
                  <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                    Lead Owner
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-600 text-white font-black flex items-center justify-center text-sm shadow-md shrink-0">
                    {(selectedLead.assignedTo || 'U').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">{selectedLead.assignedTo || 'Unassigned'}</p>
                    <p className="text-xs text-slate-500 font-medium truncate">
                      {salesReps.find(r => r.name === selectedLead.assignedTo)?.department || 'Sales'} • {salesReps.find(r => r.name === selectedLead.assignedTo)?.designation || 'Sales Representative'}
                    </p>
                  </div>
                </div>

                {/* Quick In-Drawer Reassign */}
                <div className="pt-2 border-t border-slate-200/60 flex items-center gap-2">
                  <select
                    value={drawerEmpId || salesReps.find(r => r.name === selectedLead.assignedTo)?._id || ''}
                    onChange={e => setDrawerEmpId(e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Reassign to another employee...</option>
                    {salesReps.map(rep => (
                      <option key={rep._id} value={rep._id}>
                        {rep.name} ({rep.department || 'Sales'} - {rep.designation})
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleDrawerAssign}
                    disabled={!drawerEmpId || isSubmitting}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-colors shrink-0 cursor-pointer"
                  >
                    Reassign
                  </button>
                </div>
              </div>

              {/* Lead Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Phone Number</span>
                  <p className="text-xs font-bold text-slate-800 mt-1">{selectedLead.phone}</p>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Email Address</span>
                  <p className="text-xs font-bold text-slate-800 mt-1 truncate">{selectedLead.email || '—'}</p>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Source & Channel</span>
                  <p className="text-xs font-bold text-slate-800 mt-1 flex items-center gap-1">
                    <span className="text-amber-700 font-bold">{selectedLead.source}</span>
                    <span className="text-[10px] text-slate-400">({selectedLead.channel || 'B2B Portal'})</span>
                  </p>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Estimated Value</span>
                  <p className="text-xs font-bold text-slate-800 mt-1">₹{Number(selectedLead.estimatedValue || 0).toLocaleString('en-IN')}</p>
                </div>
                {selectedLead.productName && (
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 col-span-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Inquiry Product / Requirement</span>
                    <p className="text-xs font-bold text-slate-900 mt-1">
                      {selectedLead.productName}
                      {selectedLead.quantity ? ` • Qty: ${selectedLead.quantity}` : ''}
                    </p>
                  </div>
                )}
                {(selectedLead.city || selectedLead.state) && (
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Location</span>
                    <p className="text-xs font-bold text-slate-800 mt-1">{[selectedLead.city, selectedLead.state, selectedLead.country].filter(Boolean).join(', ')}</p>
                  </div>
                )}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Lead Score</span>
                  <p className="text-xs font-bold text-blue-600 mt-1">{selectedLead.leadScore || 65} / 100</p>
                </div>
                <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-200/60">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-emerald-600" />
                    <span>Lead Arrival Time</span>
                  </span>
                  <p className="text-xs font-black text-slate-900 mt-1">
                    {getLeadArrivalLabel(selectedLead.createdAt).text}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
                    {getLeadArrivalLabel(selectedLead.createdAt).fullDate}
                  </p>
                </div>
                {selectedLead.sourceLeadId && (
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 col-span-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">External Source Reference ID</span>
                    <p className="text-xs font-mono font-bold text-slate-700 mt-0.5">{selectedLead.sourceLeadId}</p>
                  </div>
                )}
              </div>

              {/* Quick Communication Actions */}
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5">Contact Channels</h4>
                <div className="grid grid-cols-3 gap-2">
                  <a
                    href={`tel:${selectedLead.phone}`}
                    className="p-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-center font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Call</span>
                  </a>
                  <a
                    href={`https://wa.me/${selectedLead.phone.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-center font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </a>
                  <a
                    href={`mailto:${selectedLead.email}`}
                    className="p-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-center font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Email</span>
                  </a>
                </div>
              </div>

              {/* Notes */}
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">Internal Notes</h4>
                <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-700 leading-relaxed">
                  {selectedLead.notes || 'No notes added for this lead yet.'}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-2">
              <button onClick={() => setSelectedLead(null)} className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-100 cursor-pointer">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Lead Modal */}
      {isCreateOpen && (
        <Modal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          title={editingLead ? 'Edit Lead Profile' : 'Register Inbound Lead'}
        >
          <form onSubmit={handleSaveLead} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Ramesh Patel"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Company Name</label>
                <input
                  type="text"
                  value={formData.companyName}
                  onChange={e => setFormData({ ...formData, companyName: e.target.value })}
                  placeholder="e.g. Patel Fabricators"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Phone Number *</label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+91 98765 43210"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  placeholder="contact@company.com"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                />
              </div>
            </div>

            {/* Assigned Employee / Sales Rep Selector (Optional) */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">Assign to Employee / Sales Rep (Optional)</label>
              <select
                value={formData.assignedTo}
                onChange={e => setFormData({ ...formData, assignedTo: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="">Unassigned (Assign Later)</option>
                {salesReps.map(rep => (
                  <option key={rep._id} value={rep.name}>
                    {rep.name} • {rep.department || 'Sales'} ({rep.designation || 'Representative'}) - {rep.activeLeadsCount || 0} active leads
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Lead Source</label>
                <select
                  value={formData.source}
                  onChange={e => setFormData({ ...formData, source: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700"
                >
                  <option value="Website">Website</option>
                  <option value="TradeIndia">TradeIndia</option>
                  <option value="IndiaMART">IndiaMART</option>
                  <option value="WhatsApp">WhatsApp</option>
                  <option value="Referral">Referral</option>
                  <option value="Manual">Manual</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Pipeline Status</label>
                <select
                  value={formData.status}
                  onChange={e => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700"
                >
                  <option value="NEW">New</option>
                  <option value="CONTACTED">Contacted</option>
                  <option value="QUALIFIED">Qualified</option>
                  <option value="PROPOSAL">Proposal</option>
                  <option value="NEGOTIATION">Negotiation</option>
                  <option value="WON">Won</option>
                  <option value="LOST">Lost</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Priority</label>
                <select
                  value={formData.priority}
                  onChange={e => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Estimated Value (₹)</label>
                <input
                  type="number"
                  value={formData.estimatedValue}
                  onChange={e => setFormData({ ...formData, estimatedValue: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">City / Region</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={e => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Ahmedabad"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Requirement Notes</label>
              <textarea
                rows={2}
                value={formData.notes}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Product requirements, volume needed, delivery timeline..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-md shadow-blue-600/20 cursor-pointer"
              >
                {isSubmitting ? 'Saving...' : editingLead ? 'Update Lead' : 'Save Lead'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Dedicated Quick Assign Modal */}
      {assigningLead && (
        <Modal
          isOpen={!!assigningLead}
          onClose={() => setAssigningLead(null)}
          title="Assign Lead to Employee"
          subtitle={`Assign prospect '${assigningLead.name}' (${assigningLead.companyName || 'Individual'}) to a team member`}
        >
          <form onSubmit={handleAssignSubmit} className="space-y-4 text-xs">
            <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-500">Lead Inquirer</span>
                <p className="font-bold text-slate-900 text-sm">{assigningLead.name}</p>
                <p className="text-slate-500 text-[11px]">{assigningLead.phone} • Est. Value: ₹{Number(assigningLead.estimatedValue || 0).toLocaleString('en-IN')}</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Current Rep</span>
                <p className="font-bold text-slate-700">{assigningLead.assignedTo || 'Unassigned'}</p>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1.5">Select Team Member / Employee *</label>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {salesReps.map(rep => (
                  <label
                    key={rep._id}
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                      assignEmpId === rep._id
                        ? 'bg-indigo-50/70 border-indigo-400 ring-2 ring-indigo-200'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100/70'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="assignee"
                        checked={assignEmpId === rep._id}
                        onChange={() => setAssignEmpId(rep._id)}
                        className="text-indigo-600 focus:ring-indigo-500"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{rep.name}</span>
                          <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-slate-200 text-slate-700">
                            {rep.department || 'Sales'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500">{rep.designation || 'Representative'} • {rep.email}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[10px] font-bold text-slate-400 block">Workload</span>
                      <span className="font-extrabold text-indigo-600 text-xs">{rep.activeLeadsCount || 0} active leads</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Handover Notes / Instructions (Optional)</label>
              <textarea
                rows={2}
                value={assignNotes}
                onChange={e => setAssignNotes(e.target.value)}
                placeholder="e.g. Prospect requested urgent quotation and product catalog by tomorrow afternoon..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setAssigningLead(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-md shadow-indigo-600/20 flex items-center gap-1.5 cursor-pointer"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Assigning...' : 'Confirm Assignment'}</span>
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Schedule Follow-up Modal */}
      {followUpLead && (
        <Modal
          isOpen={!!followUpLead}
          onClose={() => setFollowUpLead(null)}
          title={`Schedule Follow-Up for ${followUpLead.name}`}
        >
          <form onSubmit={handleScheduleFollowUp} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Activity Title</label>
              <input
                type="text"
                required
                value={fupData.title}
                onChange={e => setFupData({ ...fupData, title: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Interaction Type</label>
                <select
                  value={fupData.type}
                  onChange={e => setFupData({ ...fupData, type: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                >
                  <option value="Call">Phone Call</option>
                  <option value="WhatsApp">WhatsApp Chat</option>
                  <option value="Meeting">In-Person Meeting</option>
                  <option value="Email">Email Communication</option>
                  <option value="Task">Internal Task</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Date & Time</label>
                <input
                  type="datetime-local"
                  required
                  value={fupData.scheduledAt}
                  onChange={e => setFupData({ ...fupData, scheduledAt: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Discussion Agenda / Notes</label>
              <textarea
                rows={2}
                value={fupData.description}
                onChange={e => setFupData({ ...fupData, description: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setFollowUpLead(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 bg-blue-600 text-white rounded-xl font-bold shadow-md shadow-blue-600/20 cursor-pointer"
              >
                {isSubmitting ? 'Scheduling...' : 'Confirm Schedule'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

// ==========================================
// 2. CUSTOMERS VIEW
// ==========================================
export const CustomersView: React.FC = () => {
  const { hasPermission } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals & Drawers
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [customerDetails, setCustomerDetails] = useState<any>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

  const [formData, setFormData] = useState({
    name: '',
    companyName: '',
    email: '',
    phone: '',
    gstNumber: '',
    creditLimit: 500000,
    paymentTerms: 'Net 30',
    address: { city: 'Ahmedabad', state: 'Gujarat', country: 'India', street: '' },
    assignedTo: 'Vikram Mehta'
  });

  const fetchCustomers = async () => {
    setLoading(true);
    const res = await api.get('/customers', { search, status: statusFilter });
    if (res.success && res.data) {
      setCustomers(res.data);
      if (res.stats) setStats(res.stats);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCustomers();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCustomers();
  };

  const handleOpenCreate = (cust?: Customer) => {
    if (cust) {
      setEditingCustomer(cust);
      setFormData({
        name: cust.name,
        companyName: cust.companyName || cust.name,
        email: cust.email,
        phone: cust.phone,
        gstNumber: cust.gstNumber || '',
        creditLimit: cust.creditLimit || 500000,
        paymentTerms: cust.paymentTerms || 'Net 30',
        address: {
          city: cust.address?.city || 'Ahmedabad',
          state: cust.address?.state || 'Gujarat',
          country: cust.address?.country || 'India',
          street: cust.address?.street || ''
        },
        assignedTo: cust.assignedTo || 'Vikram Mehta'
      });
    } else {
      setEditingCustomer(null);
      setFormData({
        name: '',
        companyName: '',
        email: '',
        phone: '',
        gstNumber: '',
        creditLimit: 500000,
        paymentTerms: 'Net 30',
        address: { city: 'Ahmedabad', state: 'Gujarat', country: 'India', street: '' },
        assignedTo: 'Vikram Mehta'
      });
    }
    setIsModalOpen(true);
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCustomer) {
      const res = await api.put(`/customers/${editingCustomer._id}`, formData);
      if (res.success) {
        setIsModalOpen(false);
        fetchCustomers();
      } else {
        alert(res.message || 'Failed to update customer');
      }
    } else {
      const res = await api.post('/customers', formData);
      if (res.success) {
        setIsModalOpen(false);
        fetchCustomers();
      } else {
        alert(res.message || 'Failed to create customer');
      }
    }
  };

  const handleDeleteCustomer = async (id: string) => {
    if (confirm('Are you sure you want to delete this customer account?')) {
      const res = await api.delete(`/customers/${id}`);
      if (res.success) {
        if (selectedCustomer?._id === id) setSelectedCustomer(null);
        fetchCustomers();
      } else {
        alert(res.message || 'Failed to delete customer');
      }
    }
  };

  const handleOpen360 = async (cust: Customer) => {
    setSelectedCustomer(cust);
    setDrawerLoading(true);
    const res = await api.get(`/customers/${cust._id}/details`);
    if (res.success && res.data) {
      setCustomerDetails(res.data);
    }
    setDrawerLoading(false);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Customer Accounts & Ledger"
        subtitle="Manage business clients, billing profiles, payment ledgers and historical sales records"
        secondaryAction={
          <button
            onClick={() => exportToCSV('360CRM_Customers', customers)}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>
        }
        actionText="Add Customer"
        actionPermission="customers.create"
        onAction={() => handleOpenCreate()}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Clients', value: stats?.totalCustomers ?? customers.length, color: 'text-blue-600', icon: Users },
          { label: 'Active Accounts', value: stats?.activeCustomers ?? customers.filter(c => c.status === 'ACTIVE').length, color: 'text-emerald-600', icon: CheckCircle2 },
          { label: 'Total Revenue', value: `₹${((stats?.totalRevenue ?? customers.reduce((s, c) => s + (c.totalSpent || 0), 0)) / 100000).toFixed(1)}L`, color: 'text-indigo-600', icon: DollarSign },
          { label: 'Outstanding Balance', value: `₹${((stats?.totalOutstanding ?? customers.reduce((s, c) => s + (c.outstandingBalance || 0), 0)) / 100000).toFixed(1)}L`, color: 'text-rose-600', icon: AlertCircle }
        ].map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div key={idx} className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{kpi.label}</span>
                <Icon className={`w-4 h-4 ${kpi.color}`} />
              </div>
              <p className={`text-2xl font-black mt-2 ${kpi.color}`}>{kpi.value}</p>
            </div>
          );
        })}
      </div>

      {/* Search & Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by customer name, company, phone, GSTIN..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden font-medium"
          />
        </form>

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 w-full sm:w-auto"
        >
          <option value="">All Customer Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
      </div>

      {/* Customer Accounts Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs font-semibold">Loading Customers...</div>
        ) : customers.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No customers found"
            description="Create your first client account or convert qualified leads."
            actionText="Add Customer"
            onAction={() => handleOpenCreate()}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Customer Name & Code</th>
                  <th className="px-5 py-3.5">Company / Entity</th>
                  <th className="px-5 py-3.5">Contact Details</th>
                  <th className="px-5 py-3.5">GSTIN</th>
                  <th className="px-5 py-3.5">Orders</th>
                  <th className="px-5 py-3.5">Total Revenue</th>
                  <th className="px-5 py-3.5">Outstanding</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {customers.map(cust => (
                  <tr key={cust._id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-bold text-slate-900">{cust.name}</div>
                      <span className="text-[10px] font-mono text-blue-600 font-bold">{cust.customerCode || cust._id}</span>
                    </td>

                    <td className="px-5 py-4 font-semibold text-slate-800">
                      {cust.companyName}
                    </td>

                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-800">{cust.phone}</p>
                      <p className="text-[10px] text-slate-400">{cust.email || 'No email'}</p>
                    </td>

                    <td className="px-5 py-4 font-mono font-semibold text-slate-600">
                      {cust.gstNumber || '—'}
                    </td>

                    <td className="px-5 py-4 font-bold text-slate-800">
                      {cust.totalOrdersCount || 0}
                    </td>

                    <td className="px-5 py-4 font-bold text-emerald-600">
                      ₹{Number(cust.totalSpent || 0).toLocaleString('en-IN')}
                    </td>

                    <td className="px-5 py-4 font-bold text-rose-600">
                      ₹{Number(cust.outstandingBalance || 0).toLocaleString('en-IN')}
                    </td>

                    <td className="px-5 py-4">
                      <StatusBadge status={cust.status} />
                    </td>

                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpen360(cust)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Customer 360 Workspace"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenCreate(cust)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                          title="Edit Customer"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCustomer(cust._id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Delete Customer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Customer 360 Detail Drawer */}
      {selectedCustomer && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex justify-end">
          <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black flex items-center justify-center text-sm shadow-md">
                  {selectedCustomer.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">{selectedCustomer.name}</h3>
                  <p className="text-xs text-slate-500 font-semibold">{selectedCustomer.companyName} • {selectedCustomer.customerCode}</p>
                </div>
              </div>
              <button onClick={() => setSelectedCustomer(null)} className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {drawerLoading ? (
                <div className="text-center py-12 text-slate-400 text-xs font-semibold">Loading Complete 360 Dossier...</div>
              ) : (
                <>
                  {/* Financial Stats Summary */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-100">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Total Billed</span>
                      <p className="text-sm font-black text-blue-900 mt-1">₹{Number(selectedCustomer.totalSpent || 0).toLocaleString('en-IN')}</p>
                    </div>
                    <div className="p-3.5 bg-rose-50/60 rounded-xl border border-rose-100">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600">Outstanding</span>
                      <p className="text-sm font-black text-rose-900 mt-1">₹{Number(selectedCustomer.outstandingBalance || 0).toLocaleString('en-IN')}</p>
                    </div>
                    <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-100">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Credit Limit</span>
                      <p className="text-sm font-black text-emerald-900 mt-1">₹{Number(selectedCustomer.creditLimit || 500000).toLocaleString('en-IN')}</p>
                    </div>
                  </div>

                  {/* Related Sales Orders */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                      <ShoppingBag className="w-4 h-4 text-blue-600" />
                      <span>Sales Orders History ({customerDetails?.salesOrders?.length || 0})</span>
                    </h4>
                    <div className="space-y-2">
                      {(customerDetails?.salesOrders || []).map((so: any) => (
                        <div key={so._id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-bold text-blue-600 font-mono">{so.salesOrderNumber}</span>
                            <p className="text-[11px] text-slate-500">{so.orderDate} • {so.items?.length || 0} items</p>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-slate-900">₹{Number(so.grandTotal).toLocaleString('en-IN')}</span>
                            <div className="mt-0.5"><StatusBadge status={so.status} /></div>
                          </div>
                        </div>
                      ))}
                      {(!customerDetails?.salesOrders || customerDetails.salesOrders.length === 0) && (
                        <p className="text-xs text-slate-400 italic">No sales orders on record yet.</p>
                      )}
                    </div>
                  </div>

                  {/* Related Invoices */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-emerald-600" />
                      <span>Invoices & Billing ({customerDetails?.invoices?.length || 0})</span>
                    </h4>
                    <div className="space-y-2">
                      {(customerDetails?.invoices || []).map((inv: any) => (
                        <div
                          key={inv._id}
                          onClick={() => setSelectedInvoice(inv)}
                          className="p-3 rounded-xl bg-slate-50 hover:bg-blue-50/50 border border-slate-100 hover:border-blue-200 flex items-center justify-between text-xs cursor-pointer transition-all"
                          title="Click to View & Print Tax Invoice"
                        >
                          <div>
                            <span className="font-bold text-slate-800 font-mono flex items-center gap-1.5">
                              <span>{inv.invoiceNumber}</span>
                              <Printer className="w-3 h-3 text-slate-400" />
                            </span>
                            <p className="text-[11px] text-slate-500">Due: {inv.dueDate}</p>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-slate-900">₹{Number(inv.grandTotal).toLocaleString('en-IN')}</span>
                            <div className="mt-0.5"><StatusBadge status={inv.paymentStatus || inv.status} /></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tax Invoice Print & Download Modal */}
      <TaxInvoiceModal
        isOpen={!!selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
        invoice={selectedInvoice}
        customer={selectedCustomer}
      />

      {/* Create / Edit Customer Modal */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingCustomer ? 'Edit Customer Account' : 'Register New Customer Account'}
        >
          <form onSubmit={handleSaveCustomer} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Contact Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Company / Entity Name *</label>
                <input
                  type="text"
                  required
                  value={formData.companyName}
                  onChange={e => setFormData({ ...formData, companyName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Phone Number *</label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">GSTIN Number</label>
                <input
                  type="text"
                  value={formData.gstNumber}
                  onChange={e => setFormData({ ...formData, gstNumber: e.target.value })}
                  placeholder="24AAAAA0000A1Z5"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono uppercase"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Payment Terms</label>
                <input
                  type="text"
                  value={formData.paymentTerms}
                  onChange={e => setFormData({ ...formData, paymentTerms: e.target.value })}
                  placeholder="Net 30 / Advance"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-blue-600 text-white rounded-xl font-bold shadow-md shadow-blue-600/20"
              >
                {editingCustomer ? 'Update Customer' : 'Save Customer'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

// ==========================================
// 3. QUOTATIONS VIEW
// ==========================================
export const QuotationsView: React.FC<{ onNavigate?: (view: string) => void }> = ({ onNavigate }) => {
  const { hasPermission } = useAuth();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals & Drawers
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<Quotation | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dynamic Line Items Form
  const [customerId, setCustomerId] = useState('');
  const [items, setItems] = useState<any[]>([
    { productId: 'prod_1', productName: 'TMT Steel Rebars Fe550D (12mm)', sku: 'TMT-12MM', quantity: 5, unitPrice: 58000, discountPercent: 0, taxPercent: 18 }
  ]);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [shipping, setShipping] = useState(2500);
  const [terms, setTerms] = useState('Payment: 100% against delivery. Validity: 30 days.');

  const fetchQuotations = async () => {
    setLoading(true);
    const res = await api.get('/quotations', { search, status: statusFilter });
    if (res.success && res.data) {
      setQuotations(res.data);
      if (res.stats) setStats(res.stats);
    }
    setLoading(false);
  };

  const fetchDependencies = async () => {
    const custRes = await api.get('/customers');
    if (custRes.success && custRes.data) setCustomers(custRes.data);

    const prodRes = await api.get('/products');
    if (prodRes.success && prodRes.data) setProducts(prodRes.data);
  };

  useEffect(() => {
    fetchQuotations();
    fetchDependencies();
  }, [statusFilter]);

  const handleAddItem = () => {
    const defaultProd = products[0];
    setItems([
      ...items,
      {
        productId: defaultProd?._id || `prod_${Date.now()}`,
        productName: defaultProd?.name || 'Mild Steel Structural Angle (50x50x6mm)',
        sku: defaultProd?.sku || 'MS-ANG-50',
        quantity: 1,
        unitPrice: defaultProd?.sellingPrice || 62000,
        discountPercent: 0,
        taxPercent: 18
      }
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const handleSaveQuotation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) {
      alert('Please select a customer account');
      return;
    }
    setIsSubmitting(true);
    const customer = customers.find(c => c._id === customerId);

    const payload = {
      customerId,
      customerName: customer?.name || customer?.companyName || 'Valued Customer',
      items,
      discountAmount,
      shipping,
      termsAndConditions: terms
    };

    const res = await api.post('/quotations', payload);
    if (res.success) {
      alert(`✅ Quotation generated successfully!`);
      setIsModalOpen(false);
      fetchQuotations();
    } else {
      alert(res.message || 'Failed to create quotation');
    }
    setIsSubmitting(false);
  };

  const handleApproveQuotation = async (id: string) => {
    const res = await api.patch(`/quotations/${id}/approve`);
    if (res.success) {
      alert(`✅ ${res.message}`);
      if (selectedQuote?._id === id) setSelectedQuote(null);
      fetchQuotations();
    } else {
      alert(res.message || 'Failed to approve quotation');
    }
  };

  const handleConvertToSO = async (id: string) => {
    if (confirm('Convert this Quotation into a live Sales Order for warehouse dispatch & billing?')) {
      const res = await api.post(`/quotations/${id}/convert`);
      if (res.success) {
        alert(`✅ ${res.message}`);
        if (selectedQuote?._id === id) setSelectedQuote(null);
        fetchQuotations();
        if (onNavigate) onNavigate('sales_orders');
      } else {
        alert(res.message || 'Failed to convert quotation');
      }
    }
  };

  // Compute Live Totals
  const subTotal = items.reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.unitPrice || 0)), 0);
  const taxTotal = items.reduce((sum, item) => {
    const lineSub = Number(item.quantity || 0) * Number(item.unitPrice || 0);
    const disc = (lineSub * (Number(item.discountPercent) || 0)) / 100;
    return sum + ((lineSub - disc) * (Number(item.taxPercent) || 18)) / 100;
  }, 0);
  const grandTotal = Math.round(subTotal + taxTotal - Number(discountAmount || 0) + Number(shipping || 0));

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Quotations & Proposals"
        subtitle="Generate formal price quotations with dynamic GST calculation and convert to sales orders"
        secondaryAction={
          <button
            onClick={() => exportToCSV('360CRM_Quotations', quotations)}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>
        }
        actionText="New Quotation Builder"
        actionPermission="quotations.create"
        onAction={() => setIsModalOpen(true)}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Quotes', value: stats?.totalQuotes ?? quotations.length, color: 'text-blue-600', icon: ShoppingCart },
          { label: 'Pending Approval', value: stats?.sentQuotes ?? quotations.filter(q => q.status === 'SENT').length, color: 'text-amber-600', icon: Clock },
          { label: 'Approved Proposals', value: stats?.approvedQuotes ?? quotations.filter(q => q.status === 'APPROVED' || q.status === 'ACCEPTED').length, color: 'text-emerald-600', icon: CheckCircle2 },
          { label: 'Total Value', value: `₹${((stats?.totalQuoteValue ?? quotations.reduce((s, q) => s + (q.grandTotal || 0), 0)) / 100000).toFixed(1)}L`, color: 'text-indigo-600', icon: DollarSign }
        ].map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div key={idx} className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{kpi.label}</span>
                <Icon className={`w-4 h-4 ${kpi.color}`} />
              </div>
              <p className={`text-2xl font-black mt-2 ${kpi.color}`}>{kpi.value}</p>
            </div>
          );
        })}
      </div>

      {/* Quotation Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Quotation Ref</th>
                <th className="px-5 py-3.5">Customer / Client</th>
                <th className="px-5 py-3.5">Issued Date</th>
                <th className="px-5 py-3.5">Valid Until</th>
                <th className="px-5 py-3.5">Items</th>
                <th className="px-5 py-3.5">Grand Total (GST Inc.)</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {quotations.map(q => (
                <tr key={q._id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-5 py-4 font-bold text-blue-600 font-mono">{q.quotationNumber}</td>
                  <td className="px-5 py-4 font-bold text-slate-900">{q.customerName}</td>
                  <td className="px-5 py-4 text-slate-500">{q.date}</td>
                  <td className="px-5 py-4 text-slate-500">{q.validUntil}</td>
                  <td className="px-5 py-4 font-semibold text-slate-800">{q.items?.length || 0} line items</td>
                  <td className="px-5 py-4 font-black text-slate-900">₹{Number(q.grandTotal).toLocaleString('en-IN')}</td>
                  <td className="px-5 py-4"><StatusBadge status={q.status} /></td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setSelectedQuote(q)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                        title="View Quotation"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {q.status === 'SENT' && (
                        <button
                          onClick={() => handleApproveQuotation(q._id)}
                          className="px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-[11px] font-bold border border-emerald-200"
                        >
                          Approve
                        </button>
                      )}
                      {(q.status === 'APPROVED' || q.status === 'ACCEPTED' || q.status === 'SENT') && (
                        <button
                          onClick={() => handleConvertToSO(q._id)}
                          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[11px] font-bold shadow-xs flex items-center gap-1"
                        >
                          <span>Convert to SO</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Interactive Quotation Builder Modal */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Interactive Quotation Builder"
        >
          <form onSubmit={handleSaveQuotation} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Target Customer Account *</label>
              <select
                required
                value={customerId}
                onChange={e => setCustomerId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
              >
                <option value="">Select a Customer Account...</option>
                {customers.map(c => (
                  <option key={c._id} value={c._id}>{c.name} — {c.companyName} ({c.phone})</option>
                ))}
              </select>
            </div>

            {/* Line Items List */}
            <div className="space-y-2 border-t border-b border-slate-100 py-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-900 uppercase tracking-wider">Product Line Items</span>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-100 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Line Item</span>
                </button>
              </div>

              {items.map((item, idx) => (
                <div key={idx} className="p-3 bg-slate-50/70 border border-slate-200/80 rounded-xl space-y-2">
                  <div className="grid grid-cols-12 gap-2">
                    <div className="col-span-6">
                      <label className="block text-[10px] font-bold text-slate-500">Product / Material</label>
                      <input
                        type="text"
                        required
                        value={item.productName}
                        onChange={e => {
                          const updated = [...items];
                          updated[idx].productName = e.target.value;
                          setItems(updated);
                        }}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-medium text-xs"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[10px] font-bold text-slate-500">Quantity</label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={item.quantity}
                        onChange={e => {
                          const updated = [...items];
                          updated[idx].quantity = Number(e.target.value);
                          setItems(updated);
                        }}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-bold text-xs"
                      />
                    </div>
                    <div className="col-span-3">
                      <label className="block text-[10px] font-bold text-slate-500">Unit Price (₹)</label>
                      <input
                        type="number"
                        required
                        value={item.unitPrice}
                        onChange={e => {
                          const updated = [...items];
                          updated[idx].unitPrice = Number(e.target.value);
                          setItems(updated);
                        }}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-bold text-xs"
                      />
                    </div>
                    <div className="col-span-1 flex items-end justify-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        disabled={items.length === 1}
                        className="p-1.5 text-slate-400 hover:text-rose-600 disabled:opacity-30"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Calculations Summary */}
            <div className="p-3.5 bg-slate-50 rounded-xl space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal Taxable Value:</span>
                <span className="font-bold text-slate-900">₹{subTotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>GST (Applicable 18%):</span>
                <span className="font-bold text-slate-900">₹{Math.round(taxTotal).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Freight & Handling:</span>
                <span className="font-bold text-slate-900">₹{shipping.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-sm font-black text-blue-600 pt-2 border-t border-slate-200">
                <span>Estimated Grand Total:</span>
                <span>₹{grandTotal.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 bg-blue-600 text-white rounded-xl font-bold shadow-md shadow-blue-600/20"
              >
                {isSubmitting ? 'Creating...' : 'Save & Issue Quotation'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Quotation Detail Drawer */}
      {selectedQuote && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex justify-end">
          <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div>
                <span className="text-[10px] font-bold text-blue-600 font-mono uppercase">Official Quotation</span>
                <h3 className="text-base font-black text-slate-900">{selectedQuote.quotationNumber}</h3>
              </div>
              <button onClick={() => setSelectedQuote(null)} className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-semibold">Client Name:</span>
                  <span className="font-bold text-slate-900">{selectedQuote.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-semibold">Issued Date:</span>
                  <span className="font-bold text-slate-900">{selectedQuote.date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-semibold">Valid Until:</span>
                  <span className="font-bold text-slate-900">{selectedQuote.validUntil}</span>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-[10px] font-bold uppercase text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">Item</th>
                      <th className="p-2.5">Qty</th>
                      <th className="p-2.5">Rate</th>
                      <th className="p-2.5 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {selectedQuote.items.map((it, idx) => (
                      <tr key={idx}>
                        <td className="p-2.5 font-bold text-slate-800">{it.productName}</td>
                        <td className="p-2.5">{it.quantity}</td>
                        <td className="p-2.5">₹{Number(it.unitPrice).toLocaleString('en-IN')}</td>
                        <td className="p-2.5 text-right font-bold">₹{Number(it.total).toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 flex items-center justify-between">
                <span className="font-bold text-slate-700">Grand Total Amount:</span>
                <span className="text-lg font-black text-blue-700">₹{Number(selectedQuote.grandTotal).toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-2">
              <button
                onClick={() => window.print()}
                className="px-3.5 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold text-xs flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print PDF</span>
              </button>
              {selectedQuote.status !== 'CONVERTED' && (
                <button
                  onClick={() => handleConvertToSO(selectedQuote._id)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs shadow-md shadow-blue-600/20 flex items-center gap-1.5"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>Convert to Sales Order</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ==========================================
// 4. SALES ORDERS VIEW
// ==========================================
export const SalesOrdersView: React.FC = () => {
  const { hasPermission } = useAuth();
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

  const fetchOrders = async () => {
    setLoading(true);
    const res = await api.get('/sales-orders');
    if (res.success && res.data) {
      setOrders(res.data);
      if (res.stats) setStats(res.stats);
    }
    setLoading(false);
  };

  const handleViewInvoice = async (orderId: string) => {
    const res = await api.get(`/invoices/${orderId}`);
    if (res.success && res.data) {
      setSelectedInvoice(res.data);
    } else {
      alert(res.message || 'Invoice details not found for this order.');
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    const res = await api.patch(`/sales-orders/${id}/status`, { status: newStatus });
    if (res.success) {
      alert(`✅ ${res.message}`);
      fetchOrders();
      if (selectedOrder?._id === id) {
        setSelectedOrder({ ...selectedOrder, status: newStatus as any });
      }
    } else {
      alert(res.message || 'Failed to update order status');
    }
  };

  const handleGenerateInvoice = async (id: string) => {
    const res = await api.post(`/sales-orders/${id}/generate-invoice`);
    if (res.success) {
      alert(`✅ ${res.message}`);
      fetchOrders();
      if (selectedOrder?._id === id) {
        setSelectedOrder({ ...selectedOrder, isInvoiced: true });
      }
    } else {
      alert(res.message || 'Failed to generate tax invoice');
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Sales Orders & Warehouse Fulfillment"
        subtitle="Confirmed customer orders pending dispatch, delivery verification and tax billing"
        secondaryAction={
          <button
            onClick={() => exportToCSV('360CRM_Sales_Orders', orders)}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Orders', value: stats?.totalOrders ?? orders.length, color: 'text-blue-600', icon: ShoppingBag },
          { label: 'In Processing', value: stats?.pendingOrders ?? orders.filter(o => o.status === 'PROCESSING' || o.status === 'PENDING').length, color: 'text-amber-600', icon: Clock },
          { label: 'Dispatched / In Transit', value: stats?.dispatchedOrders ?? orders.filter(o => o.status === 'DISPATCHED').length, color: 'text-indigo-600', icon: Truck },
          { label: 'Total Order Value', value: `₹${((stats?.totalOrderValue ?? orders.reduce((s, o) => s + (o.grandTotal || 0), 0)) / 100000).toFixed(1)}L`, color: 'text-emerald-600', icon: DollarSign }
        ].map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div key={idx} className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{kpi.label}</span>
                <Icon className={`w-4 h-4 ${kpi.color}`} />
              </div>
              <p className={`text-2xl font-black mt-2 ${kpi.color}`}>{kpi.value}</p>
            </div>
          );
        })}
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Order Number</th>
                <th className="px-5 py-3.5">Customer</th>
                <th className="px-5 py-3.5">Order Date</th>
                <th className="px-5 py-3.5">Expected Delivery</th>
                <th className="px-5 py-3.5">Amount (₹)</th>
                <th className="px-5 py-3.5">Fulfillment Stage</th>
                <th className="px-5 py-3.5">Billing Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {orders.map(ord => (
                <tr key={ord._id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-5 py-4 font-bold text-blue-600 font-mono">{ord.salesOrderNumber}</td>
                  <td className="px-5 py-4 font-bold text-slate-900">{ord.customerName}</td>
                  <td className="px-5 py-4 text-slate-500">{ord.orderDate}</td>
                  <td className="px-5 py-4 text-slate-500">{ord.expectedDelivery}</td>
                  <td className="px-5 py-4 font-black text-slate-900">₹{Number(ord.grandTotal).toLocaleString('en-IN')}</td>
                  <td className="px-5 py-4"><StatusBadge status={ord.status} /></td>
                  <td className="px-5 py-4">
                    {ord.isInvoiced ? (
                      <span
                        onClick={() => handleViewInvoice(ord._id)}
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[10px] cursor-pointer transition-colors border border-emerald-200"
                        title="Click to View & Print Tax Invoice"
                      >
                        <Printer className="w-2.5 h-2.5" />
                        <span>Invoiced</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-amber-50 text-amber-700 font-bold text-[10px]">
                        Pending Invoice
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setSelectedOrder(ord)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 cursor-pointer"
                        title="View Order Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {ord.isInvoiced && (
                        <button
                          onClick={() => handleViewInvoice(ord._id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 cursor-pointer"
                          title="View & Download PDF / Print Tax Invoice"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      )}

                      {ord.status === 'PROCESSING' && (
                        <button
                          onClick={() => handleUpdateStatus(ord._id, 'PACKED')}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold cursor-pointer"
                        >
                          Pack
                        </button>
                      )}

                      {ord.status === 'PACKED' && (
                        <button
                          onClick={() => handleUpdateStatus(ord._id, 'DISPATCHED')}
                          className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[11px] font-bold shadow-xs cursor-pointer"
                        >
                          Dispatch
                        </button>
                      )}

                      {ord.status === 'DISPATCHED' && (
                        <button
                          onClick={() => handleUpdateStatus(ord._id, 'DELIVERED')}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-bold shadow-xs cursor-pointer"
                        >
                          Delivered
                        </button>
                      )}

                      {!ord.isInvoiced && (
                        <button
                          onClick={() => handleGenerateInvoice(ord._id)}
                          className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-[11px] font-bold border border-blue-200 cursor-pointer"
                        >
                          Create Invoice
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tax Invoice Print & Download Modal */}
      <TaxInvoiceModal
        isOpen={!!selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
        invoice={selectedInvoice}
      />
    </div>
  );
};

// ==========================================
// 5. FOLLOW-UPS VIEW
// ==========================================
export const FollowUpsView: React.FC = () => {
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'COMPLETED'>('ALL');

  const fetchFollowUps = async () => {
    setLoading(true);
    const res = await api.get('/follow-ups', {
      status: activeTab === 'ALL' ? undefined : activeTab
    });
    if (res.success && res.data) {
      setFollowUps(res.data);
      if (res.stats) setStats(res.stats);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchFollowUps();
  }, [activeTab]);

  const handleComplete = async (id: string) => {
    const notes = prompt('Enter follow-up outcome notes:');
    if (notes !== null) {
      const res = await api.patch(`/follow-ups/${id}/complete`, { outcomeNotes: notes });
      if (res.success) {
        fetchFollowUps();
      }
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Follow-Ups & Task Reminders"
        subtitle="Track upcoming prospect check-ins, scheduled phone calls and client discussions"
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Follow-ups', value: stats?.totalFollowUps ?? followUps.length, color: 'text-blue-600' },
          { label: "Today's Due", value: stats?.todayFollowUps ?? 0, color: 'text-amber-600' },
          { label: 'Overdue Reminders', value: stats?.overdueFollowUps ?? 0, color: 'text-rose-600' },
          { label: 'Completed', value: stats?.completedFollowUps ?? followUps.filter(f => f.status === 'COMPLETED').length, color: 'text-emerald-600' }
        ].map((kpi, idx) => (
          <div key={idx} className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{kpi.label}</span>
            <p className={`text-2xl font-black mt-2 ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Tab Filter */}
      <div className="flex gap-2">
        {(['ALL', 'PENDING', 'COMPLETED'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === tab
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {tab === 'ALL' ? 'All Follow-ups' : tab === 'PENDING' ? 'Pending Action' : 'Completed'}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Lead / Contact</th>
                <th className="px-5 py-3.5">Channel</th>
                <th className="px-5 py-3.5">Activity Title</th>
                <th className="px-5 py-3.5">Scheduled Date</th>
                <th className="px-5 py-3.5">Assigned Rep</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {followUps.map(f => (
                <tr key={f._id} className="hover:bg-slate-50/70">
                  <td className="px-5 py-4 font-bold text-slate-900">{f.leadName || f.customerName || 'Inquiry Contact'}</td>
                  <td className="px-5 py-4">
                    <span className="inline-flex items-center px-2 py-0.5 bg-blue-50 text-blue-700 font-bold rounded-md">
                      {f.type}
                    </span>
                  </td>
                  <td className="px-5 py-4 font-semibold text-slate-800">{f.title}</td>
                  <td className="px-5 py-4 text-slate-500">{new Date(f.scheduledAt).toLocaleString()}</td>
                  <td className="px-5 py-4 text-slate-600">{f.assignedTo}</td>
                  <td className="px-5 py-4"><StatusBadge status={f.status} /></td>
                  <td className="px-5 py-4 text-right">
                    {f.status === 'PENDING' && (
                      <button
                        onClick={() => handleComplete(f._id)}
                        className="px-3 py-1.5 bg-slate-900 hover:bg-black text-white rounded-lg text-xs font-bold"
                      >
                        Mark Done
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 6. SALES REPORTS VIEW
// ==========================================
export const SalesReportsView: React.FC = () => {
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    setLoading(true);
    const res = await api.get('/sales/reports');
    if (res.success && res.data) {
      setReportData(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Sales Analytics & Revenue Intelligence"
        subtitle="Visual reporting on sales pipeline conversion, monthly revenue volume and top customer accounts"
        secondaryAction={
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
        }
      />

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Billed Revenue</span>
          <p className="text-2xl font-black text-blue-600 mt-2">
            ₹{((reportData?.summary?.totalRevenue || 0) / 100000).toFixed(2)} Lakhs
          </p>
        </div>
        <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Collected</span>
          <p className="text-2xl font-black text-emerald-600 mt-2">
            ₹{((reportData?.summary?.totalCollected || 0) / 100000).toFixed(2)} Lakhs
          </p>
        </div>
        <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Lead Win Rate</span>
          <p className="text-2xl font-black text-indigo-600 mt-2">
            {reportData?.summary?.conversionRate || 32}%
          </p>
        </div>
        <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Quote Conversion Rate</span>
          <p className="text-2xl font-black text-teal-600 mt-2">
            {reportData?.summary?.quoteWinRate || 58}%
          </p>
        </div>
      </div>

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Revenue Bar Chart */}
        <div className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-600" />
            <span>Monthly Revenue Volume (Last 6 Months)</span>
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={reportData?.monthlyTrends || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fontWeight: 600 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={val => `₹${val / 1000}k`} />
                <Tooltip formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Sales Volume']} />
                <Bar dataKey="sales" fill="#2563eb" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Lead Source Pie Chart */}
        <div className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <Target className="w-4 h-4 text-indigo-600" />
            <span>Lead Acquisition by Channel</span>
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={reportData?.leadSources || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {(reportData?.leadSources || []).map((_: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top 5 Customers Table */}
      <div className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
        <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
          <Award className="w-4 h-4 text-amber-500" />
          <span>Top 5 High-Value Enterprise Accounts</span>
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase">
              <tr>
                <th className="px-4 py-3">Client Name</th>
                <th className="px-4 py-3">Company Entity</th>
                <th className="px-4 py-3">Completed Orders</th>
                <th className="px-4 py-3 text-right">Lifetime Billed Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {(reportData?.topCustomers || []).map((c: any, i: number) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-bold text-slate-900">{c.name}</td>
                  <td className="px-4 py-3 text-slate-600">{c.company}</td>
                  <td className="px-4 py-3 font-bold">{c.orders} Orders</td>
                  <td className="px-4 py-3 text-right font-black text-emerald-600">₹{Number(c.spent).toLocaleString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};