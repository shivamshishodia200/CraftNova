import React, { useState, useEffect } from 'react';
import { api } from '@/src/services/api';
import { useAuth } from '@/src/context/AuthContext';
import { Product, Supplier, Purchase, StockTransaction } from '@/src/types';
import {
  PageHeader,
  StatusBadge,
  Modal,
  EmptyState,
  exportToCSV
} from '@/src/components/common/UIComponents';
import {
  Boxes,
  Layers,
  ArrowDownToLine,
  ArrowUpFromLine,
  ShoppingCart,
  Users,
  Plus,
  Search,
  Download,
  AlertTriangle,
  CheckCircle2,
  PackageCheck,
  Building,
  RefreshCw
} from 'lucide-react';

// ==========================================
// 1. PRODUCTS VIEW
// ==========================================
export const ProductsView: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    barcode: '',
    category: 'Industrial Machinery',
    unit: 'Units',
    purchasePrice: 10000,
    sellingPrice: 15000,
    taxPercent: 18,
    currentStock: 10,
    minStock: 5,
    maxStock: 100,
    description: ''
  });

  const fetchProducts = async () => {
    setLoading(true);
    const res = await api.get('/products');
    if (res.success && res.data) setProducts(res.data);
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await api.post('/products', formData);
    if (res.success) {
      setIsModalOpen(false);
      fetchProducts();
    } else {
      alert(res.message);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Products & Item Catalog"
        subtitle="Maintain master product catalog, SKUs, pricing & inventory parameters"
        actionText="Add Product"
        actionIcon={Plus}
        actionPermission="products.create"
        onAction={() => setIsModalOpen(true)}
        secondaryAction={
          <button
            onClick={() => exportToCSV('360CRM_Products', products)}
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
                <th className="px-6 py-3.5">Product & SKU</th>
                <th className="px-6 py-3.5">Category</th>
                <th className="px-6 py-3.5">Purchase Price</th>
                <th className="px-6 py-3.5">Selling Price</th>
                <th className="px-6 py-3.5">Current Stock</th>
                <th className="px-6 py-3.5">Warehouse</th>
                <th className="px-6 py-3.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {products.map(p => (
                <tr key={p._id} className="hover:bg-slate-50/70">
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-900">{p.name}</div>
                    <div className="text-[11px] text-blue-600 font-mono">SKU: {p.sku}</div>
                  </td>
                  <td className="px-6 py-4">{p.category}</td>
                  <td className="px-6 py-4 font-semibold">₹{p.purchasePrice.toLocaleString('en-IN')}</td>
                  <td className="px-6 py-4 font-bold text-slate-900">₹{p.sellingPrice.toLocaleString('en-IN')}</td>
                  <td className="px-6 py-4 font-bold text-slate-900">
                    <span className={`px-2 py-1 rounded-lg text-xs ${
                      p.currentStock <= p.minStock
                        ? 'bg-rose-50 text-rose-700 border border-rose-200 font-bold'
                        : 'bg-slate-100 text-slate-800'
                    }`}>
                      {p.currentStock} {p.unit}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-500">{p.warehouseName || 'Main Plant'}</td>
                  <td className="px-6 py-4"><StatusBadge status={p.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add New Product"
        subtitle="Register SKU, inventory thresholds and tax structure"
      >
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Product Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                placeholder="e.g. Stainless Steel Industrial Valve"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">SKU Code *</label>
              <input
                type="text"
                required
                value={formData.sku}
                onChange={e => setFormData({ ...formData, sku: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl uppercase font-mono"
                placeholder="VALV-SS-001"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Category</label>
              <input
                type="text"
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Unit of Measure</label>
              <input
                type="text"
                value={formData.unit}
                onChange={e => setFormData({ ...formData, unit: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                placeholder="Pcs, Units, Kgs, Liters"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">GST Tax %</label>
              <input
                type="number"
                value={formData.taxPercent}
                onChange={e => setFormData({ ...formData, taxPercent: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Purchase Price (₹)</label>
              <input
                type="number"
                value={formData.purchasePrice}
                onChange={e => setFormData({ ...formData, purchasePrice: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Selling Price (₹)</label>
              <input
                type="number"
                value={formData.sellingPrice}
                onChange={e => setFormData({ ...formData, sellingPrice: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Opening Stock</label>
              <input
                type="number"
                value={formData.currentStock}
                onChange={e => setFormData({ ...formData, currentStock: Number(e.target.value) })}
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
              className="px-5 py-2 bg-blue-600 text-white rounded-xl font-semibold shadow-xs"
            >
              Save Product
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

// ==========================================
// 2. INVENTORY OVERVIEW
// ==========================================
export const InventoryView: React.FC = () => {
  const [items, setItems] = useState<any[]>([]);

  const fetchInventory = async () => {
    const res = await api.get('/inventory');
    if (res.success && res.data) {
      const rawList = Array.isArray(res.data)
        ? res.data
        : (Array.isArray(res.data.products)
          ? res.data.products
          : (Array.isArray(res.data.items) ? res.data.items : []));

      const formatted = rawList.map((p: any) => ({
        productId: p._id || p.productId || p.id,
        productName: p.name || p.productName || 'Unnamed Product',
        sku: p.sku || 'N/A',
        warehouseName: p.warehouseName || 'Main Plant Warehouse (Unit 1)',
        currentStock: Number(p.currentStock) || 0,
        unit: p.unit || 'Pcs',
        minStock: Number(p.minStock ?? p.minStockLevel) || 10,
        stockValue: p.stockValue ?? ((Number(p.currentStock) || 0) * (Number(p.purchasePrice) || 0)),
        stockStatus: p.stockStatus || ((Number(p.currentStock) || 0) <= (Number(p.minStock ?? p.minStockLevel) || 10) ? 'LOW_STOCK' : 'IN_STOCK')
      }));
      setItems(formatted);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Live Inventory & Reorder Monitoring"
        subtitle="Real-time stock on hand, valuation and automated reorder alerts"
        secondaryAction={
          <button
            onClick={() => exportToCSV('360CRM_Inventory_Stock', items)}
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
                <th className="px-6 py-3.5">Product & SKU</th>
                <th className="px-6 py-3.5">Warehouse</th>
                <th className="px-6 py-3.5">Available Stock</th>
                <th className="px-6 py-3.5">Min Stock Alert</th>
                <th className="px-6 py-3.5">Stock Valuation</th>
                <th className="px-6 py-3.5">Stock Health</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {Array.isArray(items) && items.map(it => (
                <tr key={it.productId} className="hover:bg-slate-50/70">
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-900">{it.productName}</div>
                    <div className="text-[11px] text-slate-400 font-mono">SKU: {it.sku}</div>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{it.warehouseName}</td>
                  <td className="px-6 py-4 font-bold text-base text-slate-900">
                    {it.currentStock} {it.unit}
                  </td>
                  <td className="px-6 py-4 text-slate-500 font-semibold">
                    Min {it.minStock} {it.unit}
                  </td>
                  <td className="px-6 py-4 font-bold text-emerald-600">
                    ₹{(Number(it.stockValue) || 0).toLocaleString('en-IN')}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={it.stockStatus} />
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
// 3. STOCK IN (RECEIVING INVENTORY)
// ==========================================
export const StockInView: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [formData, setFormData] = useState({
    productId: '',
    quantity: 10,
    referenceType: 'MANUAL',
    supplierId: '',
    reason: 'Stock replenishment'
  });

  const fetchData = async () => {
    const pRes = await api.get('/products');
    if (pRes.success) setProducts(pRes.data);
    const sRes = await api.get('/suppliers');
    if (sRes.success) setSuppliers(sRes.data);
    const txRes = await api.get('/stock-transactions', { type: 'STOCK_IN' });
    if (txRes.success) setTransactions(txRes.data);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleStockIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const sup = suppliers.find(s => s._id === formData.supplierId);
    const res = await api.post('/stock-in', {
      ...formData,
      supplierName: sup?.name
    });

    if (res.success) {
      alert(res.message);
      setFormData({
        productId: '',
        quantity: 10,
        referenceType: 'MANUAL',
        supplierId: '',
        reason: ''
      });
      fetchData();
    } else {
      alert(res.message);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Stock In (Inventory Inflow)"
        subtitle="Record warehouse receipts, inward shipments and stock adjustments"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form Card */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs">
          <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
            <ArrowDownToLine className="w-5 h-5 text-emerald-600" />
            Inward Stock Receipt
          </h3>

          <form onSubmit={handleStockIn} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Select Product *</label>
              <select
                required
                value={formData.productId}
                onChange={e => setFormData({ ...formData, productId: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
              >
                <option value="">Choose item...</option>
                {products.map(p => (
                  <option key={p._id} value={p._id}>
                    {p.name} (Current: {p.currentStock} {p.unit})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Quantity to Inflow *</label>
              <input
                type="number"
                min="1"
                required
                value={formData.quantity}
                onChange={e => setFormData({ ...formData, quantity: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Supplier (Optional)</label>
              <select
                value={formData.supplierId}
                onChange={e => setFormData({ ...formData, supplierId: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
              >
                <option value="">Choose supplier...</option>
                {suppliers.map(s => (
                  <option key={s._id} value={s._id}>
                    {s.companyName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Reason / Reference Notes</label>
              <textarea
                rows={2}
                value={formData.reason}
                onChange={e => setFormData({ ...formData, reason: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                placeholder="Inward bill #, Challan reference..."
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs transition-all"
            >
              Confirm Inward Stock
            </button>
          </form>
        </div>

        {/* History Table */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs">
          <h3 className="text-base font-bold text-slate-900 mb-4">Recent Inward Transactions</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase">
                <tr>
                  <th className="px-4 py-2.5">Product</th>
                  <th className="px-4 py-2.5">Quantity In</th>
                  <th className="px-4 py-2.5">New Stock</th>
                  <th className="px-4 py-2.5">Reason / Ref</th>
                  <th className="px-4 py-2.5">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {transactions.slice(0, 10).map(t => (
                  <tr key={t._id}>
                    <td className="px-4 py-3 font-bold text-slate-900">{t.productName}</td>
                    <td className="px-4 py-3 font-bold text-emerald-600">+{t.quantity}</td>
                    <td className="px-4 py-3 font-semibold text-slate-700">{t.newStock}</td>
                    <td className="px-4 py-3 text-slate-500">{t.reason || t.referenceType}</td>
                    <td className="px-4 py-3 text-slate-400">{new Date(t.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 4. STOCK OUT (ISSUANCE & FULFILLMENT)
// ==========================================
export const StockOutView: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [formData, setFormData] = useState({
    productId: '',
    quantity: 1,
    referenceType: 'MANUAL',
    reason: 'Internal production issue'
  });

  const selectedProduct = products.find(p => p._id === formData.productId);

  const fetchData = async () => {
    const pRes = await api.get('/products');
    if (pRes.success) setProducts(pRes.data);
    const txRes = await api.get('/stock-transactions', { type: 'STOCK_OUT' });
    if (txRes.success) setTransactions(txRes.data);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleStockOut = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    if (formData.quantity > selectedProduct.currentStock) {
      alert(`Cannot issue ${formData.quantity} units! Only ${selectedProduct.currentStock} units available.`);
      return;
    }

    const res = await api.post('/stock-out', formData);
    if (res.success) {
      alert(res.message);
      setFormData({
        productId: '',
        quantity: 1,
        referenceType: 'MANUAL',
        reason: ''
      });
      fetchData();
    } else {
      alert(res.message);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Stock Out (Inventory Issuance)"
        subtitle="Manage inventory outflow, order fulfillment, and dispatch with strict stock validation"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form Card */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs">
          <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
            <ArrowUpFromLine className="w-5 h-5 text-rose-600" />
            Outward Stock Issuance
          </h3>

          <form onSubmit={handleStockOut} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Select Product *</label>
              <select
                required
                value={formData.productId}
                onChange={e => setFormData({ ...formData, productId: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
              >
                <option value="">Choose item...</option>
                {products.map(p => (
                  <option key={p._id} value={p._id}>
                    {p.name} (Available: {p.currentStock} {p.unit})
                  </option>
                ))}
              </select>
            </div>

            {selectedProduct && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
                <span className="text-slate-500 font-medium">Currently Available:</span>
                <span className="font-bold text-slate-900 text-sm">{selectedProduct.currentStock} {selectedProduct.unit}</span>
              </div>
            )}

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Quantity to Issue *</label>
              <input
                type="number"
                min="1"
                max={selectedProduct?.currentStock || 9999}
                required
                value={formData.quantity}
                onChange={e => setFormData({ ...formData, quantity: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Issuance Purpose</label>
              <select
                value={formData.referenceType}
                onChange={e => setFormData({ ...formData, referenceType: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
              >
                <option value="MANUAL">Manual Issuance</option>
                <option value="PRODUCTION">Production Workshop</option>
                <option value="SALES">Sales Dispatch</option>
                <option value="DAMAGE">Damaged / Expired Write-off</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Reason / Job Order #</label>
              <textarea
                rows={2}
                value={formData.reason}
                onChange={e => setFormData({ ...formData, reason: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                placeholder="Project reference or customer delivery slip..."
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-xs transition-all"
            >
              Authorize Stock Out
            </button>
          </form>
        </div>

        {/* History Table */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs">
          <h3 className="text-base font-bold text-slate-900 mb-4">Recent Outward Transactions</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase">
                <tr>
                  <th className="px-4 py-2.5">Product</th>
                  <th className="px-4 py-2.5">Quantity Out</th>
                  <th className="px-4 py-2.5">Remaining Stock</th>
                  <th className="px-4 py-2.5">Type / Ref</th>
                  <th className="px-4 py-2.5">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {transactions.slice(0, 10).map(t => (
                  <tr key={t._id}>
                    <td className="px-4 py-3 font-bold text-slate-900">{t.productName}</td>
                    <td className="px-4 py-3 font-bold text-rose-600">-{t.quantity}</td>
                    <td className="px-4 py-3 font-semibold text-slate-700">{t.newStock}</td>
                    <td className="px-4 py-3 text-slate-500">{t.referenceType} ({t.reason})</td>
                    <td className="px-4 py-3 text-slate-400">{new Date(t.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 5. PURCHASES VIEW (PURCHASE ORDERS & RECEIVE)
// ==========================================
export const PurchasesView: React.FC = () => {
  const { hasPermission } = useAuth();
  const [purchases, setPurchases] = useState<Purchase[]>([]);

  const fetchPurchases = async () => {
    const res = await api.get('/purchases');
    if (res.success && res.data) setPurchases(res.data);
  };

  useEffect(() => {
    fetchPurchases();
  }, []);

  const handleReceive = async (poId: string) => {
    if (confirm('Receive this Purchase Order and automatically increase warehouse inventory for all items?')) {
      const res = await api.patch(`/purchases/${poId}/receive`);
      if (res.success) {
        alert(res.message);
        fetchPurchases();
      } else {
        alert(res.message);
      }
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Purchase Orders"
        subtitle="Manage supplier procurement and automatically update store stock upon delivery"
        secondaryAction={
          <button
            onClick={() => exportToCSV('360CRM_Purchase_Orders', purchases)}
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
                <th className="px-6 py-3.5">PO Number</th>
                <th className="px-6 py-3.5">Supplier</th>
                <th className="px-6 py-3.5">PO Date</th>
                <th className="px-6 py-3.5">Total Amount</th>
                <th className="px-6 py-3.5">Payment</th>
                <th className="px-6 py-3.5">Order Status</th>
                <th className="px-6 py-3.5 text-right">Stock Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {purchases.map(po => (
                <tr key={po._id} className="hover:bg-slate-50/70">
                  <td className="px-6 py-4 font-bold text-blue-600 font-mono">{po.purchaseNumber}</td>
                  <td className="px-6 py-4 font-bold text-slate-900">{po.supplierName}</td>
                  <td className="px-6 py-4 text-slate-500">{po.purchaseDate}</td>
                  <td className="px-6 py-4 font-bold text-slate-900">₹{po.grandTotal.toLocaleString('en-IN')}</td>
                  <td className="px-6 py-4"><StatusBadge status={po.paymentStatus} /></td>
                  <td className="px-6 py-4"><StatusBadge status={po.status} /></td>
                  <td className="px-6 py-4 text-right">
                    {po.status === 'ORDERED' && hasPermission('purchase.receive') && (
                      <button
                        onClick={() => handleReceive(po._id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                      >
                        <PackageCheck className="w-4 h-4" />
                        Receive into Stock
                      </button>
                    )}
                    {po.status === 'RECEIVED' && (
                      <span className="text-emerald-600 font-bold text-xs">✓ In Stock</span>
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
// 6. SUPPLIERS VIEW
// ==========================================
export const SuppliersView: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  const fetchSuppliers = async () => {
    const res = await api.get('/suppliers');
    if (res.success && res.data) setSuppliers(res.data);
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Vendors & Suppliers"
        subtitle="Manage raw material and manufacturing supplier contracts and outstanding payables"
      />

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-semibold uppercase">
              <tr>
                <th className="px-6 py-3.5">Vendor / Company</th>
                <th className="px-6 py-3.5">Contact Details</th>
                <th className="px-6 py-3.5">Payment Terms</th>
                <th className="px-6 py-3.5">Outstanding Payable</th>
                <th className="px-6 py-3.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {suppliers.map(s => (
                <tr key={s._id} className="hover:bg-slate-50/70">
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-900">{s.companyName}</div>
                    <div className="text-[11px] text-slate-400 font-normal">{s.name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div>{s.phone}</div>
                    <div className="text-[11px] text-slate-400 font-normal">{s.email}</div>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{s.paymentTerms}</td>
                  <td className="px-6 py-4 font-bold text-rose-600">₹{s.balancePayable.toLocaleString('en-IN')}</td>
                  <td className="px-6 py-4"><StatusBadge status={s.status} /></td>
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
// 7. CATEGORIES VIEW
// ==========================================
export const CategoriesView: React.FC = () => {
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });

  const fetchData = async () => {
    setLoading(true);
    const catRes = await api.get('/categories');
    if (catRes.success && catRes.data) setCategories(catRes.data);
    const prodRes = await api.get('/products');
    if (prodRes.success && prodRes.data) setProducts(prodRes.data);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    const res = await api.post('/categories', formData);
    if (res.success) {
      setIsModalOpen(false);
      setFormData({ name: '', description: '' });
      fetchData();
    } else {
      alert(res.message || 'Failed to create category');
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Product Categories"
        subtitle="Manage product categories, groups and classifications for catalog organization"
        actionText="Add Category"
        actionIcon={Plus}
        actionPermission="categories.create"
        onAction={() => setIsModalOpen(true)}
      />

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-semibold uppercase">
              <tr>
                <th className="px-6 py-3.5">Category Name</th>
                <th className="px-6 py-3.5">Description</th>
                <th className="px-6 py-3.5">Associated Products</th>
                <th className="px-6 py-3.5">Created At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {categories.map(c => {
                const associatedCount = products.filter(
                  p => p.category === c.name || p.categoryId === c._id
                ).length;
                return (
                  <tr key={c._id} className="hover:bg-slate-50/70">
                    <td className="px-6 py-4 font-bold text-slate-900">{c.name}</td>
                    <td className="px-6 py-4 text-slate-500">{c.description || '—'}</td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold">
                        {associatedCount} Products
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-400">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                );
              })}
              {categories.length === 0 && !loading && (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-slate-400">
                    No categories registered yet. Click Add Category to create one.
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
        title="Add New Category"
        subtitle="Create classification for products"
      >
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Category Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
              placeholder="e.g. Valves, Pipes, Fasteners"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Description</label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
              placeholder="Provide a short description of the category..."
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
              Create Category
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

