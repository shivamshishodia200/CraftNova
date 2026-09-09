import React, { useState, useEffect } from 'react';
import { FileText, TrendingUp, Plus, X, CheckCircle2, Trash2 } from 'lucide-react';
import { DetailDrawer, EmployeePage, EmployeeRecord, RecordTable, Stats, useEmployeeRecords } from './EmployeeModuleShared';
import { api } from '@/src/services/api';
import { useAuth } from '@/src/context/AuthContext';

export const EmployeeQuotationsView: React.FC = () => {
  const { user } = useAuth();
  const [selected, setSelected] = useState<EmployeeRecord | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedCustomerName, setSelectedCustomerName] = useState('');
  const [validUntil, setValidUntil] = useState(
    new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
  );
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<any[]>([
    { productId: '', productName: '', sku: '', quantity: 1, unitPrice: 0, taxPercent: 18, discountPercent: 0, total: 0 }
  ]);

  const data = useEmployeeRecords('/employee/quotations', []);

  // Fetch Customers and Products for Quotation builder
  useEffect(() => {
    async function loadDropdowns() {
      const [custRes, prodRes] = await Promise.all([
        api.get('/customers'),
        api.get('/products')
      ]);
      if (custRes.success) setCustomers(custRes.data || []);
      if (prodRes.success) setProducts(prodRes.data || []);
    }
    loadDropdowns();
  }, []);

  const handleProductChange = (index: number, productId: string) => {
    const prod = products.find(p => p._id === productId);
    const newItems = [...items];
    if (prod) {
      const price = prod.sellingPrice || 1000;
      const tax = prod.taxPercent || 18;
      const qty = newItems[index].quantity || 1;
      const disc = newItems[index].discountPercent || 0;
      const sub = qty * price * (1 - disc / 100);
      const total = sub * (1 + tax / 100);
      newItems[index] = {
        productId: prod._id,
        productName: prod.name,
        sku: prod.sku,
        quantity: qty,
        unitPrice: price,
        taxPercent: tax,
        discountPercent: disc,
        total: Math.round(total)
      };
    } else {
      newItems[index].productId = '';
    }
    setItems(newItems);
  };

  const handleItemPropChange = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index][field] = value;
    const qty = Number(newItems[index].quantity) || 1;
    const price = Number(newItems[index].unitPrice) || 0;
    const tax = Number(newItems[index].taxPercent) || 0;
    const disc = Number(newItems[index].discountPercent) || 0;
    const sub = qty * price * (1 - disc / 100);
    newItems[index].total = Math.round(sub * (1 + tax / 100));
    setItems(newItems);
  };

  const addItemRow = () => {
    setItems([
      ...items,
      { productId: '', productName: '', sku: '', quantity: 1, unitPrice: 0, taxPercent: 18, discountPercent: 0, total: 0 }
    ]);
  };

  const removeItemRow = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const grandTotal = items.reduce((sum, item) => sum + (Number(item.total) || 0), 0);

  const handleCreateQuotation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerName) {
      alert('Please select or specify a customer name.');
      return;
    }
    if (items.length === 0 || !items[0].productName) {
      alert('Please add at least one valid product line item.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.post('/quotations', {
        customerId: selectedCustomerId || 'cust_temp',
        customerName: selectedCustomerName,
        validUntil,
        items,
        notes: notes || 'Delivery within 7 business days from order confirmation.',
        subTotal: items.reduce((s, i) => s + (i.quantity * i.unitPrice), 0),
        taxAmount: Math.round(grandTotal * 0.18),
        discountAmount: 0,
        grandTotal,
        salesRep: user?.name
      });

      if (res.success) {
        setIsModalOpen(false);
        setItems([{ productId: '', productName: '', sku: '', quantity: 1, unitPrice: 0, taxPercent: 18, discountPercent: 0, total: 0 }]);
        setSelectedCustomerId('');
        setSelectedCustomerName('');
        setNotes('');
        await data.reload();
      } else {
        alert(res.message || 'Failed to create quotation');
      }
    } catch (err: any) {
      alert('Error creating quotation: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <EmployeePage
      eyebrow="Commercial workspace"
      title="Quotations"
      description="Create, track and convert customer proposals from one focused view."
      icon={FileText}
      action="New quotation"
      onAction={() => setIsModalOpen(true)}
    >
      <Stats
        items={[
          { label: 'Total Quotes', value: String(data.records.length), detail: data.loading ? 'Loading...' : 'Live quotation database', tone: 'text-blue-600' },
          { label: 'Pending Quotes', value: String(data.records.filter(row => row.status === 'PENDING' || row.status === 'SENT').length), detail: 'Awaiting client action', tone: 'text-amber-600' },
          { label: 'Accepted / Won', value: String(data.records.filter(row => row.status === 'ACCEPTED' || row.status === 'CONVERTED').length), detail: 'Converted orders', tone: 'text-emerald-600' },
          { label: 'Pipeline Value', value: `₹${(data.records.reduce((sum, row) => sum + Number((row.value || '').replace(/[^0-9.]/g, '')), 0) / 100000).toFixed(2)} L`, detail: 'Current quotation value', tone: 'text-blue-600' }
        ]}
      />

      <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-xs font-semibold text-blue-800 shadow-2xs">
        <TrendingUp className="mr-2 inline h-4 w-4 text-blue-600" />
        <span>Quotation proposals are dynamically generated and linked with inventory product master rates.</span>
      </div>

      <RecordTable
        records={data.records}
        searchPlaceholder="Search quotation number or client..."
        onOpen={setSelected}
        loading={data.loading}
        error={data.error}
      />

      {/* New Quotation Builder Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 border border-slate-200 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <span>Generate New Commercial Quotation</span>
                </h3>
                <p className="text-xs text-slate-500">Add client details & calculate items automatically</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateQuotation} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Select Customer Account *</label>
                  <select
                    value={selectedCustomerId}
                    onChange={e => {
                      setSelectedCustomerId(e.target.value);
                      const c = customers.find(item => item._id === e.target.value);
                      if (c) setSelectedCustomerName(c.name);
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Choose Customer --</option>
                    {customers.map(c => (
                      <option key={c._id} value={c._id}>
                        {c.name} {c.companyName ? `(${c.companyName})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Customer / Company Name *</label>
                  <input
                    type="text"
                    required
                    value={selectedCustomerName}
                    onChange={e => setSelectedCustomerName(e.target.value)}
                    placeholder="Enter customer name..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Line Items Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800">Quotation Line Items</label>
                  <button
                    type="button"
                    onClick={addItemRow}
                    className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {items.map((item, index) => (
                    <div key={index} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div className="sm:col-span-2">
                          <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Product</label>
                          <select
                            value={item.productId}
                            onChange={e => handleProductChange(index, e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                          >
                            <option value="">-- Choose Product --</option>
                            {products.map(p => (
                              <option key={p._id} value={p._id}>
                                {p.name} (₹{p.sellingPrice || 1000})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Custom Name</label>
                          <input
                            type="text"
                            value={item.productName}
                            onChange={e => handleItemPropChange(index, 'productName', e.target.value)}
                            placeholder="Product Title"
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-2 items-end">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Qty</label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={e => handleItemPropChange(index, 'quantity', Number(e.target.value))}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Rate (₹)</label>
                          <input
                            type="number"
                            value={item.unitPrice}
                            onChange={e => handleItemPropChange(index, 'unitPrice', Number(e.target.value))}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Total (₹)</label>
                          <div className="px-2.5 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-800">
                            ₹{Number(item.total || 0).toLocaleString('en-IN')}
                          </div>
                        </div>
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => removeItemRow(index)}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg cursor-pointer"
                            title="Remove row"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Summary */}
              <div className="flex items-center justify-between p-3.5 bg-blue-50 border border-blue-200 rounded-2xl">
                <span className="font-bold text-blue-900">Grand Total (Incl. GST):</span>
                <span className="text-base font-black text-blue-700">₹{grandTotal.toLocaleString('en-IN')}</span>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-600/25 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{submitting ? 'Generating...' : 'Create Quotation'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <DetailDrawer record={selected} onClose={() => setSelected(null)} />
    </EmployeePage>
  );
};
