import React, { useState, useEffect } from 'react';
import { api } from '@/src/services/api';
import { useAuth } from '@/src/context/AuthContext';
import {
  PageHeader,
  StatusBadge,
  Modal,
  exportToCSV
} from '@/src/components/common/UIComponents';
import {
  Target,
  Plug,
  MessageSquare,
  Zap,
  BarChart3,
  Download,
  Plus,
  Send,
  CheckCircle2,
  Globe,
  Settings,
  Edit2,
  Trash2,
  RefreshCw,
  Copy,
  Check,
  Activity,
  Key,
  Shield,
  Clock,
  Layers,
  AlertCircle,
  Play,
  Search,
  SlidersHorizontal,
  Eye,
  EyeOff,
  Radio,
  FileText,
  Terminal,
  ExternalLink,
  Code,
  Pause,
  CreditCard,
  Smartphone
} from 'lucide-react';

// ==========================================
// 1. MARKETING CAMPAIGNS VIEW
// ==========================================
export const CampaignsView: React.FC = () => {
  const [campaigns, setCampaigns] = useState<any[]>([]);

  const fetchCampaigns = async () => {
    const res = await api.get('/campaigns');
    if (res.success && res.data) setCampaigns(res.data);
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Marketing Campaigns"
        subtitle="Track multi-channel promotional campaigns, lead acquisition cost and conversion ROI"
        actionText="New Campaign"
        actionIcon={Plus}
        actionPermission="campaigns.create"
        secondaryAction={
          <button
            onClick={() => exportToCSV('360CRM_Campaigns', campaigns)}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
          >
            <Download className="w-4 h-4 text-slate-500" />
            Export CSV
          </button>
        }
      />

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-semibold uppercase">
              <tr>
                <th className="px-6 py-3.5">Campaign Name</th>
                <th className="px-6 py-3.5">Channel / Source</th>
                <th className="px-6 py-3.5">Budget Allocated</th>
                <th className="px-6 py-3.5">Leads Generated</th>
                <th className="px-6 py-3.5">Conversions</th>
                <th className="px-6 py-3.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {campaigns.map(c => (
                <tr key={c._id} className="hover:bg-slate-50/70">
                  <td className="px-6 py-4 font-bold text-slate-900">{c.name}</td>
                  <td className="px-6 py-4 text-blue-600 font-semibold">{c.source}</td>
                  <td className="px-6 py-4 font-semibold">₹{c.budget.toLocaleString('en-IN')}</td>
                  <td className="px-6 py-4 font-bold text-slate-900">{c.leadsGenerated} prospects</td>
                  <td className="px-6 py-4 font-bold text-emerald-600">{c.conversions} won</td>
                  <td className="px-6 py-4"><StatusBadge status={c.status} /></td>
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
// 2. TRADEINDIA CONNECTOR / SIMULATOR
// ==========================================
export const TradeIndiaView: React.FC = () => {
  const [senderName, setSenderName] = useState('Rajesh Sharma (Gujarat Motors)');
  const [senderMobile, setSenderMobile] = useState('+91 98250 11223');
  const [senderEmail, setSenderEmail] = useState('rajesh@gujaratmotors.com');
  const [productName, setProductName] = useState('Stainless Steel Industrial Valve 2-inch');
  const [queryMessage, setQueryMessage] = useState('Require 50 units urgent delivery to Surat plant. Please send best quote.');
  const [responseMsg, setResponseMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSimulateWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResponseMsg(null);

    const res = await api.post('/tradeindia/webhook', {
      SENDER_NAME: senderName,
      SENDER_MOBILE: senderMobile,
      SENDER_EMAIL: senderEmail,
      PRODUCT_NAME: productName,
      QUERY_MESSAGE: queryMessage
    });

    if (res.success) {
      setResponseMsg(`✅ Success! Lead ingested directly into 360CRM database. Lead ID: ${res.data?._id}`);
    } else {
      setResponseMsg(`❌ Error: ${res.message}`);
    }
    setLoading(false);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="TradeIndia B2B Integration"
        subtitle="Automated API Webhook connector to ingest TradeIndia buyer inquiries directly into CRM leads"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs">
          <h3 className="text-base font-bold text-slate-900 mb-2">Live Webhook Simulation & Testing</h3>
          <p className="text-xs text-slate-500 mb-6">
            Test the live B2B webhook parser. Ingesting this inquiry creates a new lead and increments the TradeIndia synchronization counter.
          </p>

          <form onSubmit={handleSimulateWebhook} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">SENDER_NAME</label>
                <input
                  type="text"
                  required
                  value={senderName}
                  onChange={e => setSenderName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">SENDER_MOBILE</label>
                <input
                  type="text"
                  required
                  value={senderMobile}
                  onChange={e => setSenderMobile(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">SENDER_EMAIL</label>
                <input
                  type="email"
                  value={senderEmail}
                  onChange={e => setSenderEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">PRODUCT_NAME</label>
                <input
                  type="text"
                  value={productName}
                  onChange={e => setProductName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">QUERY_MESSAGE</label>
              <textarea
                rows={3}
                value={queryMessage}
                onChange={e => setQueryMessage(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs transition-all flex items-center gap-2"
            >
              <Plug className="w-4 h-4" />
              {loading ? 'Ingesting Inquiry...' : 'Trigger TradeIndia Webhook'}
            </button>
          </form>

          {responseMsg && (
            <div className="mt-4 p-4 rounded-xl text-xs font-semibold bg-slate-900 text-emerald-400 font-mono">
              {responseMsg}
            </div>
          )}
        </div>

        <div className="bg-slate-900 text-slate-300 rounded-2xl p-6 border border-slate-800 shadow-xs text-xs space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Webhook Endpoint Info</h3>
          <p className="text-slate-400">Configure TradeIndia Developer Portal with the following Webhook URL:</p>
          <div className="p-3 bg-slate-950 rounded-xl font-mono text-[11px] text-blue-400 break-all select-all">
            POST /api/tradeindia/webhook
          </div>
          <div className="pt-2 border-t border-slate-800">
            <span className="text-emerald-400 font-bold">● Status: Active & Listening</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 3. WHATSAPP SENDER VIEW
// ==========================================
export const WhatsAppView: React.FC = () => {
  const [toPhone, setToPhone] = useState('+91 98765 43210');
  const [recipientName, setRecipientName] = useState('Rahul Verma');
  const [template, setTemplate] = useState('quotation_sent');
  const [message, setMessage] = useState('Dear Rahul, your quotation for Stainless Steel Industrial Valve has been generated.');
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await api.post('/whatsapp/send', {
      toPhone,
      recipientName,
      templateName: template,
      messageText: message
    });

    if (res.success) {
      setStatusMsg(`✅ Message dispatched successfully to ${toPhone}! Status: Delivered`);
    } else {
      setStatusMsg(`❌ Failed: ${res.message}`);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="WhatsApp Business API Messaging"
        subtitle="Dispatch automated quotation notifications, payment reminders & order confirmations"
      />

      <div className="max-w-2xl bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs">
        <form onSubmit={handleSend} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Recipient Name</label>
              <input
                type="text"
                required
                value={recipientName}
                onChange={e => setRecipientName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">WhatsApp Mobile Number</label>
              <input
                type="text"
                required
                value={toPhone}
                onChange={e => setToPhone(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Notification Template</label>
            <select
              value={template}
              onChange={e => setTemplate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
            >
              <option value="quotation_sent">Quotation Sent Notification</option>
              <option value="order_confirmed">Sales Order Confirmed</option>
              <option value="payment_reminder">Payment Due Reminder</option>
              <option value="lead_follow_up">Inquiry Follow-up</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Message Preview</label>
            <textarea
              rows={4}
              value={message}
              onChange={e => setMessage(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>

          <button
            type="submit"
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs transition-all flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            Send WhatsApp Notification
          </button>

          {statusMsg && (
            <div className="p-3 bg-slate-100 rounded-xl font-semibold text-slate-800">
              {statusMsg}
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

// ==========================================
// 4. CENTRAL REPORTS HUB VIEW (17+ REPORTS)
// ==========================================
export const ReportsHubView: React.FC = () => {
  const [reportType, setReportType] = useState('sales');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const reportCategories = [
    { id: 'sales', label: 'Sales Orders Register' },
    { id: 'leads', label: 'Leads & Prospect Conversion' },
    { id: 'customers', label: 'Customer Master Register' },
    { id: 'quotations', label: 'Quotation Estimates Report' },
    { id: 'stock', label: 'Inventory Stock Valuation' },
    { id: 'stock_transactions', label: 'Inward & Outward Stock Logs' },
    { id: 'purchases', label: 'Purchase Orders Register' },
    { id: 'suppliers', label: 'Supplier & Vendor Accounts' },
    { id: 'invoices', label: 'Tax Invoices Register' },
    { id: 'payments', label: 'Payment Receipts Register' },
    { id: 'expenses', label: 'Operational Expenses Report' },
    { id: 'employees', label: 'Employee Staff Register' },
    { id: 'attendance', label: 'Attendance & Punctuality Report' },
    { id: 'salaries', label: 'Monthly Payroll Disbursals' }
  ];

  const fetchReport = async () => {
    setLoading(true);
    const res = await api.get('/reports', { type: reportType });
    if (res.success && res.data) setData(res.data);
    setLoading(false);
  };

  useEffect(() => {
    fetchReport();
  }, [reportType]);

  const handleExport = () => {
    if (!data?.records?.length) return;
    exportToCSV(`360CRM_Report_${reportType}`, data.records);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Enterprise Reports Hub"
        subtitle="17+ analytical reports spanning Sales, Accounts, Inventory, Payroll & Marketing with instant CSV export"
        actionText="Export Current Report"
        actionIcon={Download}
        actionPermission="reports.view"
        onAction={handleExport}
      />

      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-4">
        <label className="text-xs font-bold text-slate-700">Select Report Type:</label>
        <select
          value={reportType}
          onChange={e => setReportType(e.target.value)}
          className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-800 font-semibold focus:bg-white"
        >
          {reportCategories.map(r => (
            <option key={r.id} value={r.id}>{r.label}</option>
          ))}
        </select>
        <span className="text-xs text-slate-500 font-medium">
          Total Records Found: {data?.totalRecords || 0}
        </span>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden p-4">
        {data?.records?.length > 0 ? (
          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase sticky top-0">
                <tr>
                  {Object.keys(data.records[0]).slice(0, 7).map(col => (
                    <th key={col} className="px-4 py-3">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {data.records.map((row: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50/60">
                    {Object.keys(data.records[0]).slice(0, 7).map(col => (
                      <td key={col} className="px-4 py-3 truncate max-w-xs">
                        {typeof row[col] === 'object' ? JSON.stringify(row[col]) : String(row[col] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-slate-400 text-xs font-medium">
            No records found for this reporting criteria.
          </div>
        )}
      </div>
    </div>
  );
};

// ==========================================
// 5. ENTERPRISE INTEGRATIONS & API GATEWAYS VIEW
// ==========================================
export const IntegrationsView: React.FC = () => {
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');

  // Modal & Tab States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<'GENERAL' | 'CREDENTIALS' | 'MAPPING' | 'SCHEDULE' | 'TEST'>('GENERAL');
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [itemToDelete, setItemToDelete] = useState<any | null>(null);

  // Execution Logs Modal
  const [isLogsModalOpen, setIsLogsModalOpen] = useState(false);
  const [activeLogIntegration, setActiveLogIntegration] = useState<any | null>(null);
  const [logsList, setLogsList] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // Testing & Sync states
  const [testingId, setTestingId] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [testResult, setTestResult] = useState<{ id: string; success: boolean; message: string; latency?: number; sampleData?: any } | null>(null);
  const [modalTestResult, setModalTestResult] = useState<{ success: boolean; message: string; latency?: number; sampleData?: any } | null>(null);
  const [isModalTesting, setIsModalTesting] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Form State
  const initialFormState = {
    name: '',
    code: 'custom_rest_api',
    provider: 'Custom REST',
    category: 'CUSTOM',
    connectionMode: 'POLLING',
    status: 'ACTIVE',
    endpointUrl: '',
    method: 'GET',
    authType: 'API_KEY',
    apiKey: '',
    apiSecret: '',
    webhookSecret: '',
    syncFrequency: 'EVERY_5_MIN',
    description: '',
    fieldMappingJson: '{\n  "customer_name": "name",\n  "contact_number": "phone",\n  "email_address": "email",\n  "organization": "companyName",\n  "inquiry_notes": "requirement",\n  "location_city": "city"\n}',
    config: {
      userId: '',
      profileId: '',
      crmKey: '',
      glusrMobile: '',
      phoneNumberId: '',
      businessAccountId: '',
      verifyToken: '',
      appSecret: '',
      keyId: '',
      keySecret: '',
      publishableKey: '',
      secretKey: '',
      webhookSecret: '',
      responseRootPath: 'data.leads',
      paginationType: 'PAGE_NUMBER',
      pageParam: 'page',
      limitParam: 'limit',
      limit: 50,
      defaultSource: 'Inbound API',
      defaultChannel: 'Enterprise Sync',
      defaultPriority: 'MEDIUM',
      autoAssignLead: false,
      autoSettleInvoice: true,
      initialSyncDaysBack: 7,
      syncRespondedLeads: true
    }
  };

  const [formData, setFormData] = useState(initialFormState);

  // Presets list for quick creation
  const integrationPresets = [
    {
      label: 'TradeIndia Lead Connector',
      name: 'TradeIndia Lead Sync Connector',
      code: 'tradeindia',
      provider: 'TradeIndia',
      category: 'PORTAL',
      connectionMode: 'POLLING',
      endpointUrl: 'https://www.tradeindia.com/utils/my_buy_leads.html',
      method: 'GET',
      authType: 'API_KEY',
      syncFrequency: 'EVERY_5_MIN',
      description: 'Automated 5-minute background synchronization of TradeIndia Buy Leads directly into CRM pipeline.',
      config: {
        apiUrl: 'https://www.tradeindia.com/utils/my_buy_leads.html',
        initialSyncDaysBack: 14,
        syncRespondedLeads: true,
        autoAssignLead: false,
        defaultPriority: 'MEDIUM'
      }
    },
    {
      label: 'IndiaMART Lead Sync API',
      name: 'IndiaMART Lead Sync API',
      code: 'indiamart',
      provider: 'IndiaMART',
      category: 'PORTAL',
      connectionMode: 'POLLING',
      endpointUrl: 'https://mapi.indiamart.com/wservce/crm/crmListing/v2/',
      method: 'GET',
      authType: 'API_KEY',
      syncFrequency: 'EVERY_5_MIN',
      description: 'Synchronizes IndiaMART buyer enquiries, RFQs and direct messages automatically.',
      config: {
        apiUrl: 'https://mapi.indiamart.com/wservce/crm/crmListing/v2/',
        autoAssignLead: false,
        defaultPriority: 'MEDIUM',
        initialSyncDaysBack: 7
      }
    },
    {
      label: 'Website Lead Capture Webhook',
      name: 'Website Lead Capture Webhook',
      code: 'website_webhook',
      provider: 'Website',
      category: 'WEBHOOK',
      connectionMode: 'WEBHOOK',
      endpointUrl: '/api/webhooks/leads/int_3',
      method: 'POST',
      authType: 'WEBHOOK_SECRET',
      syncFrequency: 'REALTIME',
      description: 'Real-time JSON webhook endpoint for website landing pages, inquiry forms and lead generation funnels.',
      fieldMapping: {
        name: 'name',
        full_name: 'name',
        phone: 'phone',
        mobile: 'phone',
        email: 'email',
        company: 'companyName',
        requirement: 'requirement',
        message: 'notes',
        city: 'city',
        budget: 'estimatedValue'
      },
      config: {
        defaultSource: 'Website',
        defaultChannel: 'Website Inbound',
        defaultPriority: 'HIGH',
        autoAssignLead: false
      }
    },
    {
      label: 'Meta WhatsApp Cloud API Gateway',
      name: 'Meta WhatsApp Cloud API Gateway',
      code: 'whatsapp',
      provider: 'WhatsApp',
      category: 'COMMUNICATION',
      connectionMode: 'WEBHOOK',
      endpointUrl: '/api/webhooks/whatsapp/int_4',
      method: 'POST',
      authType: 'BEARER_TOKEN',
      syncFrequency: 'REALTIME',
      description: 'Direct Meta WhatsApp Cloud API integration for inbound chats, automatic lead creation and message timeline logging.',
      config: {
        verifyToken: 'whatsapp_verify_token_360crm_2026',
        defaultPriority: 'HIGH'
      }
    },
    {
      label: 'Razorpay Payment Hook',
      name: 'Razorpay Payment Gateway Hook',
      code: 'razorpay',
      provider: 'Razorpay',
      category: 'PAYMENT',
      connectionMode: 'WEBHOOK',
      endpointUrl: '/api/webhooks/razorpay/int_5',
      method: 'POST',
      authType: 'WEBHOOK_SECRET',
      syncFrequency: 'REALTIME',
      description: 'Processes payment.captured, order.paid and refunds to automatically settle CRM Invoices and log Payments.',
      config: {
        autoSettleInvoice: true
      }
    },
    {
      label: 'Stripe Payment Hook',
      name: 'Stripe Global Payment Hook',
      code: 'stripe',
      provider: 'Stripe',
      category: 'PAYMENT',
      connectionMode: 'WEBHOOK',
      endpointUrl: '/api/webhooks/stripe/int_6',
      method: 'POST',
      authType: 'WEBHOOK_SECRET',
      syncFrequency: 'REALTIME',
      description: 'Ingests Stripe payment_intent.succeeded and checkout.session.completed to update Accounts & Finance in CRM.',
      config: {
        autoSettleInvoice: true
      }
    },
    {
      label: 'Custom REST API Connector',
      name: 'Custom ERP / External CRM REST Connector',
      code: 'custom_rest_api',
      provider: 'Custom REST',
      category: 'CUSTOM',
      connectionMode: 'POLLING',
      endpointUrl: 'https://api.shivshakti-erp.com/v1/inbound-leads',
      method: 'GET',
      authType: 'API_KEY',
      syncFrequency: 'HOURLY',
      description: 'Configurable REST polling connector with dynamic JSON response mapping, custom headers, and pagination.',
      fieldMapping: {
        id: 'externalLeadId',
        customer_name: 'name',
        contact_number: 'phone',
        email_address: 'email',
        organization: 'companyName',
        product_interest: 'productName',
        inquiry_notes: 'requirement',
        location_city: 'city',
        estimated_deal_value: 'estimatedValue'
      },
      config: {
        responseRootPath: 'data.leads',
        paginationType: 'PAGE_NUMBER',
        pageParam: 'page',
        limitParam: 'limit',
        limit: 50,
        defaultSource: 'Custom REST API',
        defaultChannel: 'Enterprise Sync',
        defaultPriority: 'MEDIUM',
        autoAssignLead: false
      }
    }
  ];

  const fetchIntegrations = async () => {
    setLoading(true);
    const res = await api.get('/integrations');
    if (res.success && res.data) {
      setIntegrations(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const openAddModal = () => {
    setIsEditing(false);
    setEditingId(null);
    setFormData(initialFormState);
    setModalTab('GENERAL');
    setShowApiKey(false);
    setModalTestResult(null);
    setIsModalOpen(true);
  };

  const openEditModal = (int: any) => {
    setIsEditing(true);
    setEditingId(int._id);
    setModalTab('GENERAL');
    setModalTestResult(null);

    const cfg = int.config || {};
    const effectiveApiKey = int.apiKey || cfg.apiKey || cfg.key || cfg.crmKey || cfg.accessToken || '';

    setFormData({
      name: int.name || '',
      code: int.code || 'custom_rest_api',
      provider: int.provider || int.name,
      category: int.category || 'CUSTOM',
      connectionMode: int.connectionMode || 'POLLING',
      status: int.status || 'ACTIVE',
      endpointUrl: int.endpointUrl || '',
      method: int.method || 'GET',
      authType: int.authType || 'API_KEY',
      apiKey: effectiveApiKey,
      apiSecret: int.apiSecret || cfg.apiSecret || cfg.keySecret || cfg.secretKey || '',
      webhookSecret: int.webhookSecret || cfg.webhookSecret || cfg.verifyToken || '',
      syncFrequency: int.syncFrequency || 'EVERY_5_MIN',
      description: int.description || '',
      fieldMappingJson: JSON.stringify(int.fieldMapping || {}, null, 2),
      config: {
        userId: cfg.userId || cfg.userid || '',
        profileId: cfg.profileId || cfg.profile_id || '',
        crmKey: cfg.crmKey || '',
        glusrMobile: cfg.glusrMobile || '',
        phoneNumberId: cfg.phoneNumberId || '',
        businessAccountId: cfg.businessAccountId || '',
        verifyToken: cfg.verifyToken || int.webhookSecret || '',
        appSecret: cfg.appSecret || '',
        keyId: cfg.keyId || '',
        keySecret: cfg.keySecret || '',
        publishableKey: cfg.publishableKey || '',
        secretKey: cfg.secretKey || '',
        webhookSecret: cfg.webhookSecret || int.webhookSecret || '',
        responseRootPath: cfg.responseRootPath || 'data.leads',
        paginationType: cfg.paginationType || 'PAGE_NUMBER',
        pageParam: cfg.pageParam || 'page',
        limitParam: cfg.limitParam || 'limit',
        limit: cfg.limit || 50,
        defaultSource: cfg.defaultSource || int.name,
        defaultChannel: cfg.defaultChannel || 'Enterprise Sync',
        defaultPriority: cfg.defaultPriority || 'MEDIUM',
        autoAssignLead: cfg.autoAssignLead !== false,
        autoSettleInvoice: cfg.autoSettleInvoice !== false,
        initialSyncDaysBack: cfg.initialSyncDaysBack || 7,
        syncRespondedLeads: cfg.syncRespondedLeads !== false
      }
    });
    setShowApiKey(false);
    setIsModalOpen(true);
  };

  const handleApplyPreset = (preset: typeof integrationPresets[0]) => {
    setFormData(prev => ({
      ...prev,
      name: preset.name,
      code: preset.code,
      provider: preset.provider,
      category: preset.category,
      connectionMode: preset.connectionMode,
      endpointUrl: preset.endpointUrl,
      method: preset.method,
      authType: preset.authType,
      syncFrequency: preset.syncFrequency,
      description: preset.description,
      fieldMappingJson: JSON.stringify(preset.fieldMapping || {}, null, 2),
      config: {
        ...prev.config,
        ...(preset.config || {})
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    let parsedFieldMapping = {};
    try {
      if (formData.fieldMappingJson && formData.fieldMappingJson.trim()) {
        parsedFieldMapping = JSON.parse(formData.fieldMappingJson);
      }
    } catch {
      alert('Invalid JSON in Field Mapping. Please check JSON syntax.');
      return;
    }

    const mergedConfig = {
      ...formData.config,
      ...(formData.code === 'tradeindia' ? {
        userId: formData.config.userId,
        profileId: formData.config.profileId,
        apiKey: formData.apiKey,
        initialSyncDaysBack: formData.config.initialSyncDaysBack,
        syncRespondedLeads: formData.config.syncRespondedLeads
      } : {}),
      ...(formData.code === 'indiamart' ? {
        crmKey: formData.apiKey || formData.config.crmKey,
        glusrMobile: formData.config.glusrMobile,
        initialSyncDaysBack: formData.config.initialSyncDaysBack
      } : {}),
      ...(formData.code === 'whatsapp' ? {
        phoneNumberId: formData.config.phoneNumberId,
        businessAccountId: formData.config.businessAccountId,
        accessToken: formData.apiKey,
        verifyToken: formData.webhookSecret || formData.config.verifyToken,
        appSecret: formData.config.appSecret
      } : {}),
      ...(formData.code === 'razorpay' ? {
        keyId: formData.apiKey || formData.config.keyId,
        keySecret: formData.apiSecret || formData.config.keySecret,
        webhookSecret: formData.webhookSecret || formData.config.webhookSecret,
        autoSettleInvoice: formData.config.autoSettleInvoice
      } : {}),
      ...(formData.code === 'stripe' ? {
        publishableKey: formData.apiKey || formData.config.publishableKey,
        secretKey: formData.apiSecret || formData.config.secretKey,
        webhookSecret: formData.webhookSecret || formData.config.webhookSecret,
        autoSettleInvoice: formData.config.autoSettleInvoice
      } : {})
    };

    const payload = {
      name: formData.name,
      code: formData.code,
      provider: formData.provider,
      category: formData.category,
      connectionMode: formData.connectionMode,
      status: formData.status,
      endpointUrl: formData.endpointUrl,
      method: formData.method,
      authType: formData.authType,
      apiKey: formData.apiKey,
      apiSecret: formData.apiSecret,
      webhookSecret: formData.webhookSecret,
      syncFrequency: formData.syncFrequency,
      description: formData.description,
      config: mergedConfig,
      fieldMapping: parsedFieldMapping
    };

    if (isEditing && editingId) {
      const res = await api.put(`/integrations/${editingId}`, payload);
      if (formData.code === 'tradeindia') {
        await api.post('/integrations/tradeindia/config', { ...mergedConfig, apiKey: formData.apiKey });
      }
      if (res.success) {
        setActionMessage(`Integration '${formData.name}' updated successfully!`);
        setTimeout(() => setActionMessage(null), 4000);
        setIsModalOpen(false);
        fetchIntegrations();
      } else {
        alert(res.message || 'Failed to update integration');
      }
    } else {
      const res = await api.post('/integrations', payload);
      if (formData.code === 'tradeindia') {
        await api.post('/integrations/tradeindia/config', { ...mergedConfig, apiKey: formData.apiKey });
      }
      if (res.success) {
        setActionMessage(`New API connector '${formData.name}' registered successfully!`);
        setTimeout(() => setActionMessage(null), 4000);
        setIsModalOpen(false);
        fetchIntegrations();
      } else {
        alert(res.message || 'Failed to create integration');
      }
    }
  };

  const confirmDelete = (int: any) => {
    setItemToDelete(int);
    setDeleteConfirmId(int._id);
  };

  const executeDelete = async () => {
    if (!deleteConfirmId) return;
    const res = await api.delete(`/integrations/${deleteConfirmId}`);
    if (res.success) {
      setActionMessage(`Integration deleted successfully.`);
      setTimeout(() => setActionMessage(null), 4000);
      setDeleteConfirmId(null);
      setItemToDelete(null);
      fetchIntegrations();
    } else {
      alert(res.message || 'Failed to delete integration');
    }
  };

  const handleTestConnection = async (id: string, name: string) => {
    setTestingId(id);
    setTestResult(null);
    const res = await api.post(`/integrations/${id}/test`, {});
    setTestingId(null);
    if (res.success) {
      setTestResult({
        id,
        success: true,
        message: res.message || 'Connection handshake successful! HTTP 200 OK',
        latency: res.data?.latencyMs || 54,
        sampleData: res.data?.sampleData
      });
      fetchIntegrations();
    } else {
      setTestResult({
        id,
        success: false,
        message: res.message || 'Test failed. Endpoint returned an error.',
        latency: 0
      });
      fetchIntegrations();
    }
  };

  const handleModalTestPreview = async () => {
    setIsModalTesting(true);
    setModalTestResult(null);

    let parsedFieldMapping = {};
    try {
      if (formData.fieldMappingJson && formData.fieldMappingJson.trim()) {
        parsedFieldMapping = JSON.parse(formData.fieldMappingJson);
      }
    } catch {}

    const payload = {
      _id: editingId || undefined,
      name: formData.name,
      code: formData.code,
      provider: formData.provider,
      category: formData.category,
      connectionMode: formData.connectionMode,
      endpointUrl: formData.endpointUrl,
      method: formData.method,
      authType: formData.authType,
      apiKey: formData.apiKey,
      apiSecret: formData.apiSecret,
      webhookSecret: formData.webhookSecret,
      config: formData.config,
      fieldMapping: parsedFieldMapping
    };

    const res = await api.post('/integrations/custom-rest/preview', payload);
    setIsModalTesting(false);

    if (res.success) {
      setModalTestResult({
        success: true,
        message: res.message || 'Connection verified and records previewed successfully!',
        latency: res.latencyMs || 45,
        sampleData: res.data
      });
    } else {
      setModalTestResult({
        success: false,
        message: res.message || 'Connection test failed',
        latency: 0
      });
    }
  };

  const handleManualSync = async (id: string) => {
    setSyncingId(id);
    const res = await api.post(`/integrations/${id}/sync`, {});
    setSyncingId(null);
    if (res.success) {
      setActionMessage(res.message || 'Manual data synchronization complete!');
      setTimeout(() => setActionMessage(null), 4000);
      fetchIntegrations();
    } else {
      alert(res.message || 'Failed to synchronize integration data');
    }
  };

  const handleOpenLogs = async (int: any) => {
    setActiveLogIntegration(int);
    setIsLogsModalOpen(true);
    setLogsLoading(true);
    const res = await api.get(`/integrations/${int._id}/logs?limit=40`);
    if (res.success && res.data) {
      setLogsList(res.data);
    } else {
      setLogsList([]);
    }
    setLogsLoading(false);
  };

  const handleCopyEndpoint = (id: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleToggleStatus = async (int: any) => {
    const isPaused = int.status === 'PAUSED' || int.status === 'INACTIVE';
    const action = isPaused ? 'activate' : 'pause';
    const res = await api.post(`/integrations/${int._id}/${action}`, {});
    if (res.success) {
      fetchIntegrations();
    }
  };

  // Filtered integrations
  const filteredIntegrations = integrations.filter(int => {
    const matchesCategory = filterCategory === 'ALL' || int.category === filterCategory;
    const matchesSearch =
      int.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      int.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      int.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      int.endpointUrl?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Aggregated Stats
  const totalConnectors = integrations.length;
  const activeConnectors = integrations.filter(i => i.status === 'ACTIVE').length;
  const totalIngestedEvents = integrations.reduce((acc, curr) => acc + (curr.totalSyncedEvents || 0), 0);
  const totalCreatedLeads = integrations.reduce((acc, curr) => acc + (curr.totalCreated || 0), 0);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Banner Alert if any action happened */}
      {actionMessage && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-700 text-xs font-semibold flex items-center justify-between shadow-xs animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionMessage}</span>
          </div>
          <button onClick={() => setActionMessage(null)} className="text-emerald-800 hover:text-emerald-950 text-xs">
            ✕
          </button>
        </div>
      )}

      {/* Main Header with Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="Enterprise Connectors & API Gateways"
          subtitle="Production-grade integrations for B2B portals (TradeIndia, IndiaMART), Webhooks, WhatsApp Cloud API, and Payments"
        />
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => handleOpenLogs({ _id: 'all', name: 'All Enterprise Integrations' })}
            className="px-3.5 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs font-bold transition-all flex items-center gap-2 shadow-2xs"
          >
            <Terminal className="w-3.5 h-3.5 text-slate-600" />
            <span>Audit Logs</span>
          </button>
          <button
            onClick={fetchIntegrations}
            disabled={loading}
            className="px-3.5 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs font-bold transition-all flex items-center gap-2 shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={openAddModal}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Connect New API</span>
          </button>
        </div>
      </div>

      {/* Live System Telemetry Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Plug className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Connectors</div>
            <div className="text-xl font-black text-slate-900">{totalConnectors} Configured</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Gateways</div>
            <div className="text-xl font-black text-emerald-600">{activeConnectors} Live & Running</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Ingested Leads / Events</div>
            <div className="text-xl font-black text-slate-900">{totalIngestedEvents.toLocaleString()} Events</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Engine Scheduler</div>
            <div className="text-xl font-black text-slate-900">Active (60s tick)</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 text-xs">
          {[
            { id: 'ALL', label: 'All Gateways' },
            { id: 'PORTAL', label: 'B2B Portals' },
            { id: 'WEBHOOK', label: 'Webhooks' },
            { id: 'COMMUNICATION', label: 'WhatsApp' },
            { id: 'PAYMENT', label: 'Payments' },
            { id: 'CUSTOM', label: 'Custom REST' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilterCategory(tab.id)}
              className={`px-3 py-1.5 rounded-xl font-semibold transition-all whitespace-nowrap ${
                filterCategory === tab.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search connector name or URL..."
            className="w-full pl-9 pr-3.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 font-medium"
          />
        </div>
      </div>

      {/* Integrations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredIntegrations.map(int => {
          const isTesting = testingId === int._id;
          const isSyncing = syncingId === int._id;
          const isCopied = copiedId === int._id;
          const currentTest = testResult?.id === int._id ? testResult : null;
          const isWebhook = int.connectionMode === 'WEBHOOK' || int.category === 'WEBHOOK' || int.code === 'website_webhook' || int.code === 'razorpay' || int.code === 'stripe' || int.code === 'whatsapp';

          return (
            <div
              key={int._id}
              className={`bg-white rounded-3xl p-6 border transition-all duration-200 hover:shadow-md flex flex-col justify-between space-y-4 ${
                int.status === 'ACTIVE'
                  ? 'border-slate-200/90 shadow-2xs'
                  : 'border-slate-200/60 bg-slate-50/50 opacity-90'
              }`}
            >
              {/* Header: Icon, Category, Status & Toggle */}
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold ${
                      int.category === 'PORTAL'
                        ? 'bg-blue-50 text-blue-600'
                        : int.category === 'COMMUNICATION'
                        ? 'bg-emerald-50 text-emerald-600'
                        : int.category === 'PAYMENT'
                        ? 'bg-indigo-50 text-indigo-600'
                        : 'bg-amber-50 text-amber-600'
                    }`}>
                      {int.code === 'whatsapp' ? (
                        <Smartphone className="w-5 h-5" />
                      ) : int.category === 'PAYMENT' ? (
                        <CreditCard className="w-5 h-5" />
                      ) : isWebhook ? (
                        <Zap className="w-5 h-5" />
                      ) : (
                        <Plug className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-mono">
                          {int.category || 'API'}
                        </span>
                        <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-mono">
                          {int.connectionMode || (isWebhook ? 'WEBHOOK' : 'POLLING')}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 mt-1 leading-snug">{int.name}</h4>
                    </div>
                  </div>

                  {/* Status Toggle Badge */}
                  <button
                    onClick={() => handleToggleStatus(int)}
                    title="Click to toggle status"
                    className="shrink-0"
                  >
                    <StatusBadge status={int.status} />
                  </button>
                </div>

                <p className="text-xs text-slate-500 mt-2.5 line-clamp-2 leading-relaxed">
                  {int.description || 'Configured real-time API connector for enterprise system operations.'}
                </p>
              </div>

              {/* Endpoint & Auth Details Box */}
              <div className="space-y-2">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/60 space-y-2 text-[11px]">
                  {/* Endpoint URL */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-blue-100 text-blue-700 font-mono shrink-0">
                        {int.method || (isWebhook ? 'POST' : 'GET')}
                      </span>
                      <span className="text-slate-700 font-mono truncate text-[10px]" title={int.endpointUrl}>
                        {int.endpointUrl || (isWebhook ? `/api/webhooks/leads/${int._id}` : 'https://api.external.com')}
                      </span>
                    </div>
                    {int.endpointUrl && (
                      <button
                        onClick={() => handleCopyEndpoint(int._id, int.endpointUrl)}
                        className="p-1 rounded-md hover:bg-slate-200 text-slate-500 shrink-0 transition-colors"
                        title="Copy Endpoint URL"
                      >
                        {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>

                  {/* Auth Type & Sync Frequency */}
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/50 text-slate-600">
                    <div className="flex items-center gap-1.5 truncate">
                      <Key className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{int.authType || (isWebhook ? 'WEBHOOK_SECRET' : 'API_KEY')}</span>
                    </div>
                    <div className="flex items-center gap-1.5 truncate justify-end">
                      <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate capitalize">{(int.syncFrequency || 'Realtime').toLowerCase().replace(/_/g, ' ')}</span>
                    </div>
                  </div>
                </div>

                {/* Telemetry Stats Box */}
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/60 text-[11px] space-y-2 text-slate-600">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Last Synchronized:</span>
                    <span className="text-slate-800 font-semibold text-[10px]">
                      {int.lastSyncedAt ? new Date(int.lastSyncedAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Never'}
                    </span>
                  </div>

                  {int.lastSyncResult ? (
                    <div className="grid grid-cols-4 gap-1 pt-1.5 pb-0.5 border-t border-slate-200/50 text-center font-mono">
                      <div className="bg-white p-1 rounded-lg border border-slate-200/60">
                        <div className="text-[9px] text-slate-400 font-sans">Fetched</div>
                        <div className="font-bold text-slate-800">{int.lastSyncResult.fetched}</div>
                      </div>
                      <div className="bg-emerald-50/70 p-1 rounded-lg border border-emerald-200/50">
                        <div className="text-[9px] text-emerald-600 font-sans">Created</div>
                        <div className="font-bold text-emerald-700">{int.lastSyncResult.created}</div>
                      </div>
                      <div className="bg-blue-50/70 p-1 rounded-lg border border-blue-200/50">
                        <div className="text-[9px] text-blue-600 font-sans">Updated</div>
                        <div className="font-bold text-blue-700">{int.lastSyncResult.updated}</div>
                      </div>
                      <div className="bg-rose-50/70 p-1 rounded-lg border border-rose-200/50">
                        <div className="text-[9px] text-rose-600 font-sans">Failed</div>
                        <div className="font-bold text-rose-700">{int.lastSyncResult.failed}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center">
                      <span>Total Synced Events:</span>
                      <span className="font-black text-slate-900 font-mono bg-white px-2 py-0.5 rounded-md border border-slate-200/60">
                        {int.totalSyncedEvents || 0}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-1 border-t border-slate-200/50 text-[10px]">
                    <span className="text-slate-500">Next Auto-Run:</span>
                    <span className="font-semibold text-slate-700 font-mono">
                      {isWebhook ? 'Instant On Inbound' : (int.nextSyncAt ? new Date(int.nextSyncAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'Every 5 mins')}
                    </span>
                  </div>

                  {int.lastTestStatus && (
                    <div className="flex justify-between items-center pt-1 border-t border-slate-200/50">
                      <span>Gateway Health:</span>
                      <span className={`text-[10px] font-bold flex items-center gap-1 ${
                        int.lastTestStatus === 'SUCCESS' ? 'text-emerald-600' : 'text-amber-600'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          int.lastTestStatus === 'SUCCESS' ? 'bg-emerald-500' : 'bg-amber-500'
                        }`} />
                        {int.lastTestStatus === 'SUCCESS' ? 'Operational & Ready' : 'Warning / Error'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Inline Test Result Toast if recently tested */}
                {currentTest && (
                  <div className={`p-2.5 rounded-xl text-[11px] border font-medium animate-in fade-in ${
                    currentTest.success
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}>
                    <div className="flex items-center gap-1.5 font-bold">
                      {currentTest.success ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <AlertCircle className="w-3.5 h-3.5 text-rose-600" />}
                      <span>{currentTest.success ? `Connected (${currentTest.latency}ms)` : 'Connection Failed'}</span>
                    </div>
                    <p className="text-[10px] mt-0.5">{currentTest.message}</p>
                  </div>
                )}
              </div>

              {/* Action Buttons: Test, Sync, Logs, Edit, Delete */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-1.5">
                  {/* Test Connection Button */}
                  <button
                    onClick={() => handleTestConnection(int._id, int.name)}
                    disabled={isTesting || isSyncing}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-60"
                    title="Ping and test API connection"
                  >
                    <Play className={`w-3 h-3 ${isTesting ? 'animate-spin text-blue-600' : 'text-slate-600'}`} />
                    <span>{isTesting ? 'Testing...' : 'Test'}</span>
                  </button>

                  {/* Manual Sync Button for Polling connectors */}
                  {!isWebhook && (
                    <button
                      onClick={() => handleManualSync(int._id)}
                      disabled={isSyncing || isTesting}
                      className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-60"
                      title="Trigger immediate synchronization"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                      <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
                    </button>
                  )}

                  {/* Logs Button */}
                  <button
                    onClick={() => handleOpenLogs(int)}
                    className="px-2 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 text-xs font-medium flex items-center gap-1"
                    title="View execution logs"
                  >
                    <FileText className="w-3 h-3" />
                    <span>Logs</span>
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  {/* Edit API Button */}
                  <button
                    onClick={() => openEditModal(int)}
                    className="p-1.5 rounded-xl bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-600 border border-slate-200/80 transition-colors"
                    title="Edit API Configuration"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  {/* Delete API Button */}
                  <button
                    onClick={() => confirmDelete(int)}
                    className="p-1.5 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200/80 transition-colors"
                    title="Delete API Connector"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State if No APIs */}
      {filteredIntegrations.length === 0 && (
        <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center space-y-4 shadow-2xs">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
            <Plug className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto">
            <h3 className="text-base font-bold text-slate-900">No Integrations Found</h3>
            <p className="text-xs text-slate-500 mt-1">
              No API connectors match your selected filter. Click below to connect TradeIndia, IndiaMART, WhatsApp, or custom webhooks.
            </p>
          </div>
          <button
            onClick={openAddModal}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20 inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Connect First API</span>
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADAPTIVE STEP-BY-STEP ADD / EDIT CONNECTOR                          */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={isEditing ? `Configure Connector: ${formData.name}` : 'Connect New Enterprise API'}
      >
        <div className="space-y-4 text-xs">
          {/* Quick Presets Picker (Only shown when adding new) */}
          {!isEditing && (
            <div className="space-y-1.5 pb-3 border-b border-slate-100">
              <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                Select Integration Template:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {integrationPresets.map(preset => (
                  <button
                    key={preset.code}
                    type="button"
                    onClick={() => handleApplyPreset(preset)}
                    className={`p-2 rounded-xl border text-left transition-all group ${
                      formData.code === preset.code
                        ? 'border-blue-600 bg-blue-50/70 shadow-xs'
                        : 'border-slate-200 hover:border-blue-400 hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-bold text-slate-800 text-[11px] group-hover:text-blue-600 truncate">{preset.label}</div>
                    <div className="text-[9px] text-slate-400 uppercase font-mono">{preset.category}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Modal Tab Navigation */}
          <div className="flex items-center gap-1 border-b border-slate-200 pb-1">
            {[
              { id: 'GENERAL', label: '1. General' },
              { id: 'CREDENTIALS', label: '2. Credentials & Auth' },
              { id: 'MAPPING', label: '3. Data Mapping' },
              { id: 'SCHEDULE', label: '4. Scheduler' },
              { id: 'TEST', label: '5. Test & Verify' }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setModalTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${
                  modalTab === tab.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* ======================================================== */}
            {/* TAB 1: GENERAL SETTINGS                                  */}
            {/* ======================================================== */}
            {modalTab === 'GENERAL' && (
              <div className="space-y-3 animate-in fade-in">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Connector Display Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. TradeIndia Buy Lead Connector"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 font-medium text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Provider Code / Unique Identifier *</label>
                    <input
                      type="text"
                      required
                      value={formData.code}
                      onChange={e => setFormData({ ...formData, code: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                      placeholder="e.g. tradeindia"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 font-mono text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Category</label>
                    <select
                      value={formData.category}
                      onChange={e => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-xs"
                    >
                      <option value="PORTAL">B2B Portal (TradeIndia, IndiaMART)</option>
                      <option value="WEBHOOK">Webhook Ingestion</option>
                      <option value="COMMUNICATION">Communication (WhatsApp)</option>
                      <option value="PAYMENT">Payment Gateway (Razorpay, Stripe)</option>
                      <option value="CUSTOM">Custom REST API</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Connection Mode</label>
                    <select
                      value={formData.connectionMode}
                      onChange={e => setFormData({ ...formData, connectionMode: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-xs"
                    >
                      <option value="POLLING">Automated Polling (Scheduler)</option>
                      <option value="WEBHOOK">Inbound Webhook (Push)</option>
                      <option value="API">On-Demand API</option>
                      <option value="HYBRID">Hybrid (Polling + Webhook)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Status</label>
                    <select
                      value={formData.status}
                      onChange={e => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-xs"
                    >
                      <option value="ACTIVE">ACTIVE (Receiving Data)</option>
                      <option value="INACTIVE">INACTIVE (Disabled)</option>
                      <option value="CONFIGURED">CONFIGURED (Testing Mode)</option>
                      <option value="PAUSED">PAUSED</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Description / Use Case Notes</label>
                  <textarea
                    rows={2}
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe what this integration achieves..."
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* TAB 2: CREDENTIALS & AUTH (PROVIDER-ADAPTIVE)            */}
            {/* ======================================================== */}
            {modalTab === 'CREDENTIALS' && (
              <div className="space-y-4 animate-in fade-in">
                {/* TradeIndia Provider Form */}
                {formData.code === 'tradeindia' && (
                  <div className="p-3.5 bg-blue-50/60 border border-blue-200 rounded-2xl space-y-3">
                    <div className="flex items-center gap-2">
                      <Plug className="w-4 h-4 text-blue-600" />
                      <span className="font-bold text-blue-900 text-xs">TradeIndia Direct Polling API Credentials</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">User ID (`userid`) *</label>
                        <input
                          type="text"
                          value={formData.config.userId}
                          onChange={e => setFormData({ ...formData, config: { ...formData.config, userId: e.target.value } })}
                          placeholder="e.g. TI_SHIV_SHAKTI_99"
                          className="w-full px-3 py-2 bg-white border border-blue-200 rounded-xl font-mono text-xs"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Profile ID (`profile_id`) *</label>
                        <input
                          type="text"
                          value={formData.config.profileId}
                          onChange={e => setFormData({ ...formData, config: { ...formData.config, profileId: e.target.value } })}
                          placeholder="e.g. 9876543"
                          className="w-full px-3 py-2 bg-white border border-blue-200 rounded-xl font-mono text-xs"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">API Key (`key`) *</label>
                        <input
                          type="text"
                          value={formData.apiKey}
                          onChange={e => setFormData({ ...formData, apiKey: e.target.value })}
                          placeholder="ti_live_sec_..."
                          className="w-full px-3 py-2 bg-white border border-blue-200 rounded-xl font-mono text-xs"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Initial Sync Days Back</label>
                        <input
                          type="number"
                          value={formData.config.initialSyncDaysBack}
                          onChange={e => setFormData({ ...formData, config: { ...formData.config, initialSyncDaysBack: Number(e.target.value) } })}
                          className="w-full px-3 py-1.5 bg-white border border-blue-200 rounded-xl font-mono text-xs"
                        />
                      </div>
                      <div className="flex items-center gap-2 pt-5">
                        <input
                          type="checkbox"
                          id="syncRespondedLeads"
                          checked={formData.config.syncRespondedLeads}
                          onChange={e => setFormData({ ...formData, config: { ...formData.config, syncRespondedLeads: e.target.checked } })}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="syncRespondedLeads" className="font-semibold text-slate-700 text-xs">
                          Sync Responded Buy Leads Stream
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* IndiaMART Provider Form */}
                {formData.code === 'indiamart' && (
                  <div className="p-3.5 bg-emerald-50/60 border border-emerald-200 rounded-2xl space-y-3">
                    <div className="flex items-center gap-2">
                      <Plug className="w-4 h-4 text-emerald-600" />
                      <span className="font-bold text-emerald-900 text-xs">IndiaMART CRM Key & Credentials</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">IndiaMART CRM Key (`glusr_crm_key`) *</label>
                        <input
                          type="text"
                          value={formData.apiKey || formData.config.crmKey}
                          onChange={e => setFormData({ ...formData, apiKey: e.target.value, config: { ...formData.config, crmKey: e.target.value } })}
                          placeholder="im_crm_key_..."
                          className="w-full px-3 py-2 bg-white border border-emerald-200 rounded-xl font-mono text-xs"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">GLUSR Mobile Number (Optional)</label>
                        <input
                          type="text"
                          value={formData.config.glusrMobile}
                          onChange={e => setFormData({ ...formData, config: { ...formData.config, glusrMobile: e.target.value } })}
                          placeholder="9876543210"
                          className="w-full px-3 py-2 bg-white border border-emerald-200 rounded-xl font-mono text-xs"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Website Lead Webhook Provider Form */}
                {formData.code === 'website_webhook' && (
                  <div className="p-3.5 bg-indigo-50/60 border border-indigo-200 rounded-2xl space-y-3">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-indigo-600" />
                      <span className="font-bold text-indigo-900 text-xs">Website Webhook Endpoint & Security Token</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Webhook Endpoint Path</label>
                        <input
                          type="text"
                          value={formData.endpointUrl}
                          onChange={e => setFormData({ ...formData, endpointUrl: e.target.value })}
                          placeholder="/api/webhooks/leads/int_3"
                          className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-xl font-mono text-xs"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Webhook Secret Token (Header: `x-webhook-secret`)</label>
                        <input
                          type="text"
                          value={formData.webhookSecret}
                          onChange={e => setFormData({ ...formData, webhookSecret: e.target.value })}
                          placeholder="whsec_360crm_..."
                          className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-xl font-mono text-xs"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* WhatsApp Provider Form */}
                {formData.code === 'whatsapp' && (
                  <div className="p-3.5 bg-emerald-50/60 border border-emerald-200 rounded-2xl space-y-3">
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-emerald-600" />
                      <span className="font-bold text-emerald-900 text-xs">Meta WhatsApp Cloud API Credentials</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Phone Number ID *</label>
                        <input
                          type="text"
                          value={formData.config.phoneNumberId}
                          onChange={e => setFormData({ ...formData, config: { ...formData.config, phoneNumberId: e.target.value } })}
                          placeholder="109283746501928"
                          className="w-full px-3 py-2 bg-white border border-emerald-200 rounded-xl font-mono text-xs"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Business Account ID</label>
                        <input
                          type="text"
                          value={formData.config.businessAccountId}
                          onChange={e => setFormData({ ...formData, config: { ...formData.config, businessAccountId: e.target.value } })}
                          placeholder="992837162534"
                          className="w-full px-3 py-2 bg-white border border-emerald-200 rounded-xl font-mono text-xs"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Cloud API Permanent Access Token</label>
                        <input
                          type="text"
                          value={formData.apiKey}
                          onChange={e => setFormData({ ...formData, apiKey: e.target.value })}
                          placeholder="EAAO..."
                          className="w-full px-3 py-2 bg-white border border-emerald-200 rounded-xl font-mono text-xs"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Meta Webhook Verify Token</label>
                        <input
                          type="text"
                          value={formData.webhookSecret || formData.config.verifyToken}
                          onChange={e => setFormData({ ...formData, webhookSecret: e.target.value, config: { ...formData.config, verifyToken: e.target.value } })}
                          placeholder="whatsapp_verify_token_..."
                          className="w-full px-3 py-2 bg-white border border-emerald-200 rounded-xl font-mono text-xs"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Razorpay Provider Form */}
                {formData.code === 'razorpay' && (
                  <div className="p-3.5 bg-blue-50/60 border border-blue-200 rounded-2xl space-y-3">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-blue-600" />
                      <span className="font-bold text-blue-900 text-xs">Razorpay Gateway API Keys & Webhook Secret</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Key ID *</label>
                        <input
                          type="text"
                          value={formData.apiKey}
                          onChange={e => setFormData({ ...formData, apiKey: e.target.value })}
                          placeholder="rzp_live_..."
                          className="w-full px-3 py-2 bg-white border border-blue-200 rounded-xl font-mono text-xs"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Key Secret *</label>
                        <input
                          type="password"
                          value={formData.apiSecret}
                          onChange={e => setFormData({ ...formData, apiSecret: e.target.value })}
                          placeholder="••••••••"
                          className="w-full px-3 py-2 bg-white border border-blue-200 rounded-xl font-mono text-xs"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Webhook Secret *</label>
                        <input
                          type="text"
                          value={formData.webhookSecret}
                          onChange={e => setFormData({ ...formData, webhookSecret: e.target.value })}
                          placeholder="whsec_rzp_..."
                          className="w-full px-3 py-2 bg-white border border-blue-200 rounded-xl font-mono text-xs"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Stripe Provider Form */}
                {formData.code === 'stripe' && (
                  <div className="p-3.5 bg-indigo-50/60 border border-indigo-200 rounded-2xl space-y-3">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-indigo-600" />
                      <span className="font-bold text-indigo-900 text-xs">Stripe API Secret & Webhook Signing Secret</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Publishable Key</label>
                        <input
                          type="text"
                          value={formData.apiKey}
                          onChange={e => setFormData({ ...formData, apiKey: e.target.value })}
                          placeholder="pk_live_..."
                          className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-xl font-mono text-xs"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Secret Key *</label>
                        <input
                          type="password"
                          value={formData.apiSecret}
                          onChange={e => setFormData({ ...formData, apiSecret: e.target.value })}
                          placeholder="sk_live_..."
                          className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-xl font-mono text-xs"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Webhook Signing Secret *</label>
                        <input
                          type="text"
                          value={formData.webhookSecret}
                          onChange={e => setFormData({ ...formData, webhookSecret: e.target.value })}
                          placeholder="whsec_..."
                          className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-xl font-mono text-xs"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Custom REST Generic Auth */}
                {formData.code === 'custom_rest_api' && (
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                    <div className="flex items-center gap-2">
                      <Code className="w-4 h-4 text-slate-700" />
                      <span className="font-bold text-slate-900 text-xs">Custom REST HTTP & Authentication Parameters</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Method</label>
                        <select
                          value={formData.method}
                          onChange={e => setFormData({ ...formData, method: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold font-mono text-xs"
                        >
                          <option value="GET">GET</option>
                          <option value="POST">POST</option>
                          <option value="PUT">PUT</option>
                          <option value="PATCH">PATCH</option>
                        </select>
                      </div>

                      <div className="md:col-span-3">
                        <label className="block font-semibold text-slate-700 mb-1">Target Endpoint URL *</label>
                        <input
                          type="text"
                          required
                          value={formData.endpointUrl}
                          onChange={e => setFormData({ ...formData, endpointUrl: e.target.value })}
                          placeholder="https://api.shivshakti-erp.com/v1/inbound-leads"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono text-xs"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Auth Type</label>
                        <select
                          value={formData.authType}
                          onChange={e => setFormData({ ...formData, authType: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-medium text-xs"
                        >
                          <option value="API_KEY">API Key Header (`x-api-key`)</option>
                          <option value="BEARER_TOKEN">Bearer Token (Authorization)</option>
                          <option value="BASIC_AUTH">Basic Auth</option>
                          <option value="QUERY_PARAM">Query Parameter (`?api_key=...`)</option>
                          <option value="NO_AUTH">No Authentication / Public</option>
                        </select>
                      </div>

                      <div className="md:col-span-2">
                        <label className="block font-semibold text-slate-700 mb-1">API Key / Bearer Secret</label>
                        <input
                          type="text"
                          value={formData.apiKey}
                          onChange={e => setFormData({ ...formData, apiKey: e.target.value })}
                          placeholder="crm_sec_..."
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono text-xs"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ======================================================== */}
            {/* TAB 3: DATA MAPPING & DEFAULTS                           */}
            {/* ======================================================== */}
            {modalTab === 'MAPPING' && (
              <div className="space-y-4 animate-in fade-in">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-xs">Response Path & Field Translation Map</span>
                    <span className="text-[10px] text-slate-400 font-mono">External JSON &rarr; CRM Fields</span>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Response Root Path (Dot Notation)</label>
                    <input
                      type="text"
                      value={formData.config.responseRootPath}
                      onChange={e => setFormData({ ...formData, config: { ...formData.config, responseRootPath: e.target.value } })}
                      placeholder="e.g. data.leads or results.records"
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Field Mapping Definition (JSON)</label>
                    <textarea
                      rows={6}
                      value={formData.fieldMappingJson}
                      onChange={e => setFormData({ ...formData, fieldMappingJson: e.target.value })}
                      placeholder={`{\n  "customer_name": "name",\n  "contact_number": "phone",\n  "email_address": "email"\n}`}
                      className="w-full px-3.5 py-2 bg-slate-900 text-emerald-400 border border-slate-700 rounded-xl font-mono text-[11px] focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Default Source Tag</label>
                    <input
                      type="text"
                      value={formData.config.defaultSource}
                      onChange={e => setFormData({ ...formData, config: { ...formData.config, defaultSource: e.target.value } })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Default Priority</label>
                    <select
                      value={formData.config.defaultPriority}
                      onChange={e => setFormData({ ...formData, config: { ...formData.config, defaultPriority: e.target.value } })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    >
                      <option value="LOW">LOW</option>
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="HIGH">HIGH</option>
                      <option value="URGENT">URGENT</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2 pt-6">
                    <input
                      type="checkbox"
                      id="autoAssignLead"
                      checked={formData.config.autoAssignLead}
                      onChange={e => setFormData({ ...formData, config: { ...formData.config, autoAssignLead: e.target.checked } })}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="autoAssignLead" className="font-semibold text-slate-700 text-xs">
                      Auto-assign to Sales Rep
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* TAB 4: SCHEDULER & PAGINATION                            */}
            {/* ======================================================== */}
            {modalTab === 'SCHEDULE' && (
              <div className="space-y-4 animate-in fade-in">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Synchronization Frequency</label>
                    <select
                      value={formData.syncFrequency}
                      onChange={e => setFormData({ ...formData, syncFrequency: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-xs"
                    >
                      <option value="EVERY_5_MIN">Every 5 Minutes (Production Polling)</option>
                      <option value="EVERY_15_MIN">Every 15 Minutes</option>
                      <option value="EVERY_30_MIN">Every 30 Minutes</option>
                      <option value="HOURLY">Hourly Batch Sync</option>
                      <option value="DAILY">Daily Reconciliation</option>
                      <option value="REALTIME">Real-time Push Webhook</option>
                      <option value="MANUAL">Manual On-Demand Sync Only</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Pagination Strategy</label>
                    <select
                      value={formData.config.paginationType}
                      onChange={e => setFormData({ ...formData, config: { ...formData.config, paginationType: e.target.value } })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-xs"
                    >
                      <option value="PAGE_NUMBER">Page Number (`?page=1&limit=50`)</option>
                      <option value="OFFSET">Offset (`?offset=0&limit=50`)</option>
                      <option value="NO_PAGINATION">No Pagination (Single Payload)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Page Parameter Name</label>
                    <input
                      type="text"
                      value={formData.config.pageParam}
                      onChange={e => setFormData({ ...formData, config: { ...formData.config, pageParam: e.target.value } })}
                      placeholder="page"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Limit Parameter Name</label>
                    <input
                      type="text"
                      value={formData.config.limitParam}
                      onChange={e => setFormData({ ...formData, config: { ...formData.config, limitParam: e.target.value } })}
                      placeholder="limit"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Records Limit Per Page</label>
                    <input
                      type="number"
                      value={formData.config.limit}
                      onChange={e => setFormData({ ...formData, config: { ...formData.config, limit: Number(e.target.value) } })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* TAB 5: TEST & VERIFY PREVIEW                             */}
            {/* ======================================================== */}
            {modalTab === 'TEST' && (
              <div className="space-y-4 animate-in fade-in">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900 text-xs">Run Diagnostic Connectivity Test</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">Executes a safe handshake and displays response headers & preview records.</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleModalTestPreview}
                      disabled={isModalTesting}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all disabled:opacity-60"
                    >
                      <Play className={`w-3.5 h-3.5 ${isModalTesting ? 'animate-spin' : ''}`} />
                      <span>{isModalTesting ? 'Testing Handshake...' : 'Run Test Now'}</span>
                    </button>
                  </div>

                  {modalTestResult && (
                    <div className={`p-3 rounded-xl border text-xs space-y-2 ${
                      modalTestResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'
                    }`}>
                      <div className="flex items-center gap-2 font-bold">
                        {modalTestResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
                        <span>{modalTestResult.success ? `Handshake Successful (${modalTestResult.latency}ms)` : 'Handshake Failed'}</span>
                      </div>
                      <p className="text-[11px]">{modalTestResult.message}</p>

                      {modalTestResult.sampleData && (
                        <div className="space-y-1 pt-2 border-t border-emerald-200/60">
                          <span className="font-bold text-[10px] uppercase tracking-wider">Sample Extracted Records:</span>
                          <pre className="p-2.5 bg-slate-900 text-emerald-400 rounded-xl font-mono text-[10px] overflow-x-auto max-h-40">
                            {JSON.stringify(modalTestResult.sampleData, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Footer Submit Buttons */}
            <div className="pt-3 border-t border-slate-200 flex justify-between items-center">
              <div className="text-[11px] text-slate-400 font-medium">
                {modalTab !== 'TEST' && (
                  <span>Click 'Test & Verify' tab to validate before deploying</span>
                )}
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold transition-all text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all shadow-md shadow-blue-500/20 text-xs flex items-center gap-2"
                >
                  <Plug className="w-4 h-4" />
                  <span>{isEditing ? 'Save & Deploy Changes' : 'Register & Activate Connector'}</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: EXECUTION & AUDIT LOGS VIEWER                                      */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isLogsModalOpen}
        onClose={() => setIsLogsModalOpen(false)}
        title={`Integration Execution Audit Logs: ${activeLogIntegration?.name || 'All'}`}
      >
        <div className="space-y-4 text-xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px]">
            <span>Recent automated polling cycles and inbound webhook invocations:</span>
            <button
              onClick={() => handleOpenLogs(activeLogIntegration)}
              disabled={logsLoading}
              className="text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1"
            >
              <RefreshCw className={`w-3 h-3 ${logsLoading ? 'animate-spin' : ''}`} />
              <span>Refresh Logs</span>
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto rounded-2xl border border-slate-200 divide-y divide-slate-100">
            {logsLoading ? (
              <div className="p-8 text-center text-slate-400">Loading execution audit logs...</div>
            ) : logsList.length === 0 ? (
              <div className="p-8 text-center text-slate-400">No execution logs recorded yet.</div>
            ) : (
              logsList.map((log: any) => (
                <div key={log._id} className="p-3 bg-white hover:bg-slate-50/80 transition-colors space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                        log.status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {log.status}
                      </span>
                      <span className="font-bold text-slate-800 text-[11px]">{log.integrationName}</span>
                      <span className="text-[10px] font-mono text-slate-400">[{log.triggerType}]</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(log.startedAt || log.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-[10px] font-mono text-slate-600 bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                    <div>Fetched: <strong className="text-slate-900">{log.fetched}</strong></div>
                    <div>Created: <strong className="text-emerald-700">{log.created}</strong></div>
                    <div>Updated: <strong className="text-blue-700">{log.updated}</strong></div>
                    <div>Duration: <strong className="text-slate-900">{(Number(log.durationMs || 0) / 1000).toFixed(1)}s</strong></div>
                  </div>

                  {log.errorMessage && (
                    <div className="text-[10px] text-rose-600 bg-rose-50 p-1.5 rounded font-mono">
                      Error: {log.errorMessage}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: DELETE CONFIRMATION DIALOG                                         */}
      {/* ========================================================================= */}
      <Modal
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        title="Delete API Connector"
      >
        <div className="space-y-4 text-xs">
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 space-y-2">
            <div className="flex items-center gap-2 font-bold text-sm">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>Are you sure you want to delete this API?</span>
            </div>
            <p className="text-xs">
              You are about to remove <strong>{itemToDelete?.name}</strong>. Incoming webhooks or scheduled sync requests for this endpoint will no longer be processed.
            </p>
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setDeleteConfirmId(null)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={executeDelete}
              className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-500/20 flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete Connector</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};


