import React, { useState } from 'react';
import { Building2, Users, Plus, X, Phone, Mail, MapPin, CheckCircle2 } from 'lucide-react';
import { DetailDrawer, EmployeePage, EmployeeRecord, RecordTable, Stats, useEmployeeRecords } from './EmployeeModuleShared';
import { api } from '@/src/services/api';
import { useAuth } from '@/src/context/AuthContext';

export const EmployeeCustomersView: React.FC = () => {
  const { user } = useAuth();
  const [selected, setSelected] = useState<EmployeeRecord | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    companyName: '',
    email: '',
    phone: '',
    gstNumber: '',
    street: '',
    city: '',
    state: ''
  });

  const data = useEmployeeRecords('/employee/customers', []);

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) {
      alert('Customer Name and Phone number are required.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.post('/employee/customers', {
        name: formData.name,
        companyName: formData.companyName || formData.name,
        email: formData.email,
        phone: formData.phone,
        gstNumber: formData.gstNumber,
        address: {
          street: formData.street,
          city: formData.city,
          state: formData.state,
          country: 'India'
        },
        assignedTo: user?.name,
        status: 'ACTIVE'
      });

      if (res.success) {
        setIsAddModalOpen(false);
        setFormData({ name: '', companyName: '', email: '', phone: '', gstNumber: '', street: '', city: '', state: '' });
        await data.reload();
      } else {
        alert(res.message || 'Failed to add customer');
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <EmployeePage
      eyebrow="Relationship workspace"
      title="My Customers"
      description="Manage your customer portfolio, conversations and revenue opportunities."
      icon={Users}
      action="Add customer"
      onAction={() => setIsAddModalOpen(true)}
    >
      <Stats
        items={[
          { label: 'Total customers', value: String(data.records.length), detail: data.loading ? 'Loading...' : 'Live assigned portfolio', tone: 'text-blue-600' },
          { label: 'Active accounts', value: String(data.records.filter(row => row.status === 'ACTIVE').length), detail: 'Currently active', tone: 'text-emerald-600' },
          { label: 'Recent additions', value: String(data.records.slice(0, 3).length), detail: 'Assigned to your desk', tone: 'text-amber-600' },
          { label: 'Portfolio status', value: '100% Live', detail: 'Real-time database sync', tone: 'text-emerald-600' }
        ]}
      />

      <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
        <Building2 className="h-4 w-4 text-blue-600" />
        <span>Your assigned customer accounts & accounts directory (Synced with Live CRM Database)</span>
      </div>

      <RecordTable
        records={data.records}
        searchPlaceholder="Search customer by name or company..."
        onOpen={setSelected}
        loading={data.loading}
        error={data.error}
      />

      {/* Add Customer Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 border border-slate-200 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  <span>Add New Customer Account</span>
                </h3>
                <p className="text-xs text-slate-500">Create a direct customer profile assigned to your desk</p>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddCustomer} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Contact Person Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Rajesh Sharma"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Company / Business Name</label>
                  <input
                    type="text"
                    value={formData.companyName}
                    onChange={e => setFormData({ ...formData, companyName: e.target.value })}
                    placeholder="e.g. Sharma Industrial Corp"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    placeholder="rajesh@sharmaindustrial.in"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">GST Number (Optional)</label>
                  <input
                    type="text"
                    value={formData.gstNumber}
                    onChange={e => setFormData({ ...formData, gstNumber: e.target.value.toUpperCase() })}
                    placeholder="24AAACS1234F1Z5"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">City / Location</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={e => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Ahmedabad / Delhi"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Street Address</label>
                <input
                  type="text"
                  value={formData.street}
                  onChange={e => setFormData({ ...formData, street: e.target.value })}
                  placeholder="Plot No, Industrial Phase / Street"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
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
                  <span>{submitting ? 'Creating Customer...' : 'Save & Assign Customer'}</span>
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