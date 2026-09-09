import React, { useState, useEffect } from 'react';
import { api } from '@/src/services/api';
import { useAuth } from '@/src/context/AuthContext';
import { Invoice, Payment, Customer } from '@/src/types';
import { TaxInvoiceModal } from '../components/TaxInvoiceModal';
import {
  PageHeader,
  StatusBadge,
  Modal,
  exportToCSV
} from '@/src/components/common/UIComponents';
import {
  Mail,
  CreditCard,
  Receipt,
  Plus,
  Search,
  Download,
  CheckCircle2,
  DollarSign,
  TrendingDown,
  Clock,
  ArrowUpRight,
  Printer,
  Eye,
  FileText
} from 'lucide-react';

// ==========================================
// 1. INVOICES VIEW
// ==========================================
export const InvoicesView: React.FC = () => {
  const { hasPermission } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

  // Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [items, setItems] = useState<any[]>([
    { productId: 'prod_valv', productName: 'Stainless Steel Industrial Valve 2-inch', quantity: 5, unitPrice: 12500, taxPercent: 18 }
  ]);

  const fetchInvoices = async () => {
    const res = await api.get('/invoices');
    if (res.success && res.data) setInvoices(res.data);
    const custRes = await api.get('/customers');
    if (custRes.success && custRes.data) setCustomers(custRes.data);
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    const cust = customers.find(c => c._id === selectedCustomerId);
    if (!cust) return;

    const res = await api.post('/invoices', {
      customerId: cust._id,
      customerName: cust.companyName || cust.name,
      dueDate,
      items
    });

    if (res.success) {
      setIsModalOpen(false);
      fetchInvoices();
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Tax Invoices & Billing"
        subtitle="Manage GST tax invoices, customer payment tracking and accounts receivables"
        actionText="Generate Invoice"
        actionIcon={Plus}
        actionPermission="invoices.create"
        onAction={() => setIsModalOpen(true)}
        secondaryAction={
          <button
            onClick={() => exportToCSV('360CRM_Invoices', invoices)}
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
                <th className="px-6 py-3.5">Invoice #</th>
                <th className="px-6 py-3.5">Customer</th>
                <th className="px-6 py-3.5">Invoice Date</th>
                <th className="px-6 py-3.5">Due Date</th>
                <th className="px-6 py-3.5">Grand Total</th>
                <th className="px-6 py-3.5">Paid Amount</th>
                <th className="px-6 py-3.5">Balance Due</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {invoices.map(inv => (
                <tr key={inv._id} className="hover:bg-slate-50/70">
                  <td className="px-6 py-4 font-bold text-blue-600 font-mono">{inv.invoiceNumber}</td>
                  <td className="px-6 py-4 font-bold text-slate-900">{inv.customerName}</td>
                  <td className="px-6 py-4 text-slate-500">{inv.invoiceDate || (inv as any).date}</td>
                  <td className="px-6 py-4 text-slate-500">{inv.dueDate}</td>
                  <td className="px-6 py-4 font-bold text-slate-900">₹{inv.grandTotal.toLocaleString('en-IN')}</td>
                  <td className="px-6 py-4 font-semibold text-emerald-600">₹{inv.paidAmount.toLocaleString('en-IN')}</td>
                  <td className="px-6 py-4 font-bold text-rose-600">₹{inv.dueAmount.toLocaleString('en-IN')}</td>
                  <td className="px-6 py-4"><StatusBadge status={inv.paymentStatus} /></td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => setSelectedInvoice(inv)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
                      title="View & Download PDF / Print Tax Invoice"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print / PDF</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tax Invoice Modal for Print & PDF Download */}
      <TaxInvoiceModal
        isOpen={!!selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
        invoice={selectedInvoice}
        customer={customers.find(c => c._id === selectedInvoice?.customerId || c.name === selectedInvoice?.customerName)}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create New Tax Invoice"
        subtitle="Generate GST compliant commercial invoice"
      >
        <form onSubmit={handleCreateInvoice} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Select Customer *</label>
            <select
              required
              value={selectedCustomerId}
              onChange={e => setSelectedCustomerId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
            >
              <option value="">Choose customer...</option>
              {customers.map(c => (
                <option key={c._id} value={c._id}>
                  {c.companyName} ({c.name})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Payment Due Date</label>
            <input
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 text-white rounded-xl font-semibold shadow-xs"
            >
              Issue Invoice
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

// ==========================================
// 2. PAYMENTS VIEW
// ==========================================
export const PaymentsView: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    invoiceId: '',
    amount: 50000,
    paymentMethod: 'BANK',
    referenceNumber: '',
    paymentDate: new Date().toISOString().split('T')[0],
    notes: 'Online RTGS Transfer'
  });

  const fetchData = async () => {
    const pRes = await api.get('/payments');
    if (pRes.success) setPayments(pRes.data);
    const iRes = await api.get('/invoices');
    if (iRes.success) setInvoices(iRes.data.filter((i: any) => i.dueAmount > 0));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const inv = invoices.find(i => i._id === formData.invoiceId);
    if (!inv) return;

    const res = await api.post('/payments', {
      ...formData,
      customerId: inv.customerId,
      partyId: inv.customerId,
      customerName: inv.customerName,
      partyName: inv.customerName,
      invoiceNumber: inv.invoiceNumber,
      paymentMode: formData.paymentMethod,
      transactionReference: formData.referenceNumber,
      date: formData.paymentDate
    });

    if (res.success) {
      alert(res.message);
      setIsModalOpen(false);
      fetchData();
    } else {
      alert(res.message || 'Failed to record payment');
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Payments Received"
        subtitle="Record incoming remittances (Bank, UPI, Cash, Cheque) and auto-reconcile invoices"
        actionText="Record Payment"
        actionIcon={Plus}
        actionPermission="payments.create"
        onAction={() => setIsModalOpen(true)}
      />

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-semibold uppercase">
              <tr>
                <th className="px-6 py-3.5">Payment #</th>
                <th className="px-6 py-3.5">Customer</th>
                <th className="px-6 py-3.5">Invoice #</th>
                <th className="px-6 py-3.5">Amount Received</th>
                <th className="px-6 py-3.5">Mode</th>
                <th className="px-6 py-3.5">Reference #</th>
                <th className="px-6 py-3.5">Received Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {payments.map(pay => (
                <tr key={pay._id} className="hover:bg-slate-50/70">
                  <td className="px-6 py-4 font-bold text-blue-600 font-mono">{pay.paymentNumber}</td>
                  <td className="px-6 py-4 font-bold text-slate-900">{pay.customerName || (pay as any).partyName || 'Valued Customer'}</td>
                  <td className="px-6 py-4 font-mono text-slate-600">{pay.invoiceNumber || 'Direct Deposit'}</td>
                  <td className="px-6 py-4 font-bold text-emerald-600 text-sm">₹{Number(pay.amount || 0).toLocaleString('en-IN')}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-0.5 bg-slate-100 rounded-md font-semibold text-[11px]">
                      {pay.paymentMethod || (pay as any).paymentMode || 'BANK'}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono text-slate-500">{pay.referenceNumber || (pay as any).transactionReference || 'N/A'}</td>
                  <td className="px-6 py-4 text-slate-500">{pay.paymentDate || (pay as any).date || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Record Payment Receipt"
        subtitle="Apply remittance towards outstanding customer invoice"
      >
        <form onSubmit={handleRecordPayment} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Select Outstanding Invoice *</label>
            <select
              required
              value={formData.invoiceId}
              onChange={e => {
                const inv = invoices.find(i => i._id === e.target.value);
                setFormData({
                  ...formData,
                  invoiceId: e.target.value,
                  amount: inv ? inv.dueAmount : 0
                });
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
            >
              <option value="">Choose invoice...</option>
              {invoices.map(i => (
                <option key={i._id} value={i._id}>
                  {i.invoiceNumber} - {i.customerName} (Due: ₹{i.dueAmount.toLocaleString('en-IN')})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Payment Amount (₹) *</label>
              <input
                type="number"
                required
                value={formData.amount}
                onChange={e => setFormData({ ...formData, amount: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Payment Method</label>
              <select
                value={formData.paymentMethod}
                onChange={e => setFormData({ ...formData, paymentMethod: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
              >
                <option value="BANK">Bank Transfer (NEFT/RTGS)</option>
                <option value="UPI">UPI / QR Code</option>
                <option value="CHEQUE">Cheque</option>
                <option value="CASH">Cash</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">UTR / Cheque Ref #</label>
              <input
                type="text"
                value={formData.referenceNumber}
                onChange={e => setFormData({ ...formData, referenceNumber: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                placeholder="UTR202604081029"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Payment Date</label>
              <input
                type="date"
                value={formData.paymentDate}
                onChange={e => setFormData({ ...formData, paymentDate: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 text-white rounded-xl font-semibold shadow-xs"
            >
              Confirm Receipt
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

// ==========================================
// 3. RECEIVABLES VIEW
// ==========================================
export const ReceivablesView: React.FC = () => {
  const [data, setData] = useState<any>(null);

  const fetchReceivables = async () => {
    const res = await api.get('/receivables');
    if (res.success && res.data) setData(res.data);
  };

  useEffect(() => {
    fetchReceivables();
  }, []);

  const invoices = data?.invoices || [];
  const customerMap: Record<string, { customerName: string; totalInvoices: number; totalDue: number }> = {};
  
  invoices.forEach((inv: any) => {
    const key = inv.customerId || inv.customerName;
    if (!customerMap[key]) {
      customerMap[key] = {
        customerName: inv.customerName,
        totalInvoices: 0,
        totalDue: 0
      };
    }
    customerMap[key].totalInvoices += 1;
    customerMap[key].totalDue += Number(inv.dueAmount || 0);
  });
  
  const groupedCustomers = Object.values(customerMap);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Accounts Receivable (Debtors)"
        subtitle="Monitor customer outstanding ledger balances and overdue collections"
      />

      <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-xs flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Outstanding Invoiced Receivables</p>
          <h2 className="text-3xl font-black text-white mt-1">₹{(data?.totalReceivable || 0).toLocaleString('en-IN')}</h2>
        </div>
        <Clock className="w-8 h-8 text-rose-400" />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-semibold uppercase">
              <tr>
                <th className="px-6 py-3.5">Customer Name</th>
                <th className="px-6 py-3.5">Pending Invoices</th>
                <th className="px-6 py-3.5">Total Outstanding Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {groupedCustomers.map((c: any, idx: number) => (
                <tr key={idx} className="hover:bg-slate-50/70">
                  <td className="px-6 py-4 font-bold text-slate-900">{c.customerName}</td>
                  <td className="px-6 py-4">{c.totalInvoices} invoice(s)</td>
                  <td className="px-6 py-4 font-bold text-rose-600 text-sm">₹{c.totalDue.toLocaleString('en-IN')}</td>
                </tr>
              ))}
              {groupedCustomers.length === 0 && (
                <tr>
                  <td colSpan={3} className="text-center py-8 text-slate-400">
                    No outstanding receivables found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 4. PAYABLES VIEW
// ==========================================
export const PayablesView: React.FC = () => {
  const [data, setData] = useState<any>(null);

  const fetchPayables = async () => {
    const res = await api.get('/payables');
    if (res.success && res.data) setData(res.data);
  };

  useEffect(() => {
    fetchPayables();
  }, []);

  const purchases = data?.purchases || [];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Accounts Payable (Creditors)"
        subtitle="Monitor outstanding supplier bills, raw material invoices and payments pending release"
      />

      <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-xs flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Balance Payable to Suppliers</p>
          <h2 className="text-3xl font-black text-white mt-1">₹{(data?.totalPayable || 0).toLocaleString('en-IN')}</h2>
        </div>
        <TrendingDown className="w-8 h-8 text-amber-400" />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-semibold uppercase">
              <tr>
                <th className="px-6 py-3.5">PO Number</th>
                <th className="px-6 py-3.5">Supplier / Vendor</th>
                <th className="px-6 py-3.5">PO Date</th>
                <th className="px-6 py-3.5">Total Bill Amount</th>
                <th className="px-6 py-3.5">Paid Amount</th>
                <th className="px-6 py-3.5">Balance Payable</th>
                <th className="px-6 py-3.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {purchases.map((p: any) => {
                const balance = Number(p.grandTotal || 0) - Number(p.paidAmount || 0);
                return (
                  <tr key={p._id} className="hover:bg-slate-50/70">
                    <td className="px-6 py-4 font-bold text-blue-600 font-mono">{p.purchaseNumber}</td>
                    <td className="px-6 py-4 font-bold text-slate-900">{p.supplierName}</td>
                    <td className="px-6 py-4 text-slate-500">{p.purchaseDate}</td>
                    <td className="px-6 py-4 font-bold">₹{p.grandTotal.toLocaleString('en-IN')}</td>
                    <td className="px-6 py-4 text-emerald-600">₹{(p.paidAmount || 0).toLocaleString('en-IN')}</td>
                    <td className="px-6 py-4 font-bold text-rose-600">₹{balance.toLocaleString('en-IN')}</td>
                    <td className="px-6 py-4"><StatusBadge status={p.paymentStatus} /></td>
                  </tr>
                );
              })}
              {purchases.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400">
                    No outstanding payables found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 5. EXPENSES VIEW
// ==========================================
export const ExpensesView: React.FC = () => {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    category: 'Operations',
    amount: 1500,
    paymentMode: 'Bank Transfer',
    vendor: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });

  const fetchExpenses = async () => {
    const res = await api.get('/expenses');
    if (res.success && res.data) setExpenses(res.data);
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const handleRecordExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.amount) return;

    const res = await api.post('/expenses', formData);
    if (res.success) {
      setIsModalOpen(false);
      setFormData({
        title: '',
        category: 'Operations',
        amount: 1500,
        paymentMode: 'Bank Transfer',
        vendor: '',
        description: '',
        date: new Date().toISOString().split('T')[0]
      });
      fetchExpenses();
    } else {
      alert(res.message || 'Failed to record expense');
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Operational Expenses"
        subtitle="Log corporate spending, utility bills, logistics costs, and administrative disbursements"
        actionText="Log Expense"
        actionIcon={Plus}
        onAction={() => setIsModalOpen(true)}
      />

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-semibold uppercase">
              <tr>
                <th className="px-6 py-3.5">Expense #</th>
                <th className="px-6 py-3.5">Expense Title</th>
                <th className="px-6 py-3.5">Category</th>
                <th className="px-6 py-3.5">Amount</th>
                <th className="px-6 py-3.5">Mode</th>
                <th className="px-6 py-3.5">Vendor</th>
                <th className="px-6 py-3.5">Log Date</th>
                <th className="px-6 py-3.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {expenses.map((e: any) => (
                <tr key={e._id} className="hover:bg-slate-50/70">
                  <td className="px-6 py-4 font-bold text-slate-500 font-mono">{e.expenseNumber}</td>
                  <td className="px-6 py-4 font-bold text-slate-900">{e.title}</td>
                  <td className="px-6 py-4 text-slate-600">{e.category}</td>
                  <td className="px-6 py-4 font-bold text-rose-600">₹{e.amount.toLocaleString('en-IN')}</td>
                  <td className="px-6 py-4">{e.paymentMode}</td>
                  <td className="px-6 py-4 text-slate-500">{e.vendor || '—'}</td>
                  <td className="px-6 py-4 text-slate-500">
                    {new Date(e.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4"><StatusBadge status={e.status} /></td>
                </tr>
              ))}
              {expenses.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-slate-400">
                    No expenses logged yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Log Corporate Expense"
        subtitle="Log operational disbursement and approve entry"
      >
        <form onSubmit={handleRecordExpense} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Expense Title / Particulars *</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
              placeholder="e.g. Warehouse electricity bill Jan 2026"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Expense Category</label>
              <select
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
              >
                <option value="Operations">Operations</option>
                <option value="Rent & Utilities">Rent & Utilities</option>
                <option value="Logistics & Transport">Logistics & Transport</option>
                <option value="Salaries & Perks">Salaries & Perks</option>
                <option value="Marketing">Marketing</option>
                <option value="Office Stationery">Office Stationery</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Payment Method</label>
              <select
                value={formData.paymentMode}
                onChange={e => setFormData({ ...formData, paymentMode: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
              >
                <option value="Bank Transfer">Bank Transfer (RTGS/NEFT)</option>
                <option value="UPI">UPI / GPay / PhonePe</option>
                <option value="Cash">Cash</option>
                <option value="Cheque">Cheque Payment</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Amount (₹) *</label>
              <input
                type="number"
                required
                value={formData.amount}
                onChange={e => setFormData({ ...formData, amount: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Vendor / Payee</label>
              <input
                type="text"
                value={formData.vendor}
                onChange={e => setFormData({ ...formData, vendor: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                placeholder="e.g. Torrent Power Ltd"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Expense Date</label>
              <input
                type="date"
                value={formData.date}
                onChange={e => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Brief Description</label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
              placeholder="Provide notes on the transaction..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 text-white rounded-xl font-semibold shadow-xs"
            >
              Approve & Log Expense
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

// ==========================================
// 6. CREDIT NOTES VIEW
// ==========================================
export const CreditNotesView: React.FC = () => {
  const [notes, setNotes] = useState<any[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    customerId: '',
    amount: 10000,
    notes: 'Material return discount adjustment'
  });

  const fetchData = async () => {
    const cnRes = await api.get('/credit-notes');
    if (cnRes.success && cnRes.data) setNotes(Array.isArray(cnRes.data) ? cnRes.data : []);
    const custRes = await api.get('/customers');
    if (custRes.success && custRes.data) setCustomers(Array.isArray(custRes.data) ? custRes.data : []);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleIssueCreditNote = async (e: React.FormEvent) => {
    e.preventDefault();
    const cust = customers.find(c => c._id === formData.customerId);
    if (!cust) return;

    const res = await api.post('/credit-notes', {
      customerId: cust._id,
      customerName: cust.companyName || cust.name,
      cnAmount: Number(formData.amount),
      reason: formData.notes
    });

    if (res.success) {
      setIsModalOpen(false);
      setFormData({ customerId: '', amount: 10000, notes: 'Material return discount adjustment' });
      fetchData();
    } else {
      alert(res.message || 'Failed to issue credit note');
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Credit Notes & Returns"
        subtitle="Manage customer sales returns, credit notes, and ledger balance adjustments"
        actionText="Issue Credit Note"
        actionIcon={Plus}
        onAction={() => setIsModalOpen(true)}
      />

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-semibold uppercase">
              <tr>
                <th className="px-6 py-3.5">Credit Note #</th>
                <th className="px-6 py-3.5">Customer Name</th>
                <th className="px-6 py-3.5">Date Issued</th>
                <th className="px-6 py-3.5">Credit Amount</th>
                <th className="px-6 py-3.5">Reason / Notes</th>
                <th className="px-6 py-3.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {Array.isArray(notes) && notes.map((n: any) => (
                <tr key={n._id} className="hover:bg-slate-50/70">
                  <td className="px-6 py-4 font-bold text-blue-600 font-mono">{n.creditNoteNumber}</td>
                  <td className="px-6 py-4 font-bold text-slate-900">{n.customerName}</td>
                  <td className="px-6 py-4 text-slate-500">
                    {n.createdAt || n.date ? new Date(n.createdAt || n.date).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="px-6 py-4 font-bold text-emerald-600">
                    ₹{(Number(n.amount ?? n.cnAmount) || 0).toLocaleString('en-IN')}
                  </td>
                  <td className="px-6 py-4 text-slate-600">{n.reason || 'Returns'}</td>
                  <td className="px-6 py-4"><StatusBadge status={n.status || 'ACTIVE'} /></td>
                </tr>
              ))}
              {(!Array.isArray(notes) || notes.length === 0) && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400">
                    No credit notes issued yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Issue Credit Note Adjustment"
        subtitle="Authorize returns credit to customer billing ledger"
      >
        <form onSubmit={handleIssueCreditNote} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Select Customer Account *</label>
            <select
              required
              value={formData.customerId}
              onChange={e => setFormData({ ...formData, customerId: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
            >
              <option value="">Choose customer...</option>
              {customers.map(c => (
                <option key={c._id} value={c._id}>
                  {c.companyName} ({c.name})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Credit Adjustment Amount (₹) *</label>
            <input
              type="number"
              required
              value={formData.amount}
              onChange={e => setFormData({ ...formData, amount: Number(e.target.value) })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Reason / Handover Notes</label>
            <textarea
              rows={3}
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
              placeholder="e.g. Returned 2 units damaged industrial valves..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 text-white rounded-xl font-semibold shadow-xs"
            >
              Confirm Issue Credit Note
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

