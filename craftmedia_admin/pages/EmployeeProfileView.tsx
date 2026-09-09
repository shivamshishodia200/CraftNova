import React, { useEffect, useState } from 'react';
import { api } from '@/src/services/api';
import { Edit3, ShieldCheck, UserRound, X, CheckCircle2, Building2, Phone, Mail, User } from 'lucide-react';
import { EmployeePage, Stats } from './EmployeeModuleShared';

export const EmployeeProfileView: React.FC = () => {
  const [profile, setProfile] = useState<any>(null);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    department: '',
    designation: '',
    email: ''
  });

  const load = async () => {
    const response = await api.get('/employee/profile');
    if (response.success && response.data) {
      setProfile(response.data);
      setFormData({
        name: response.data.name || '',
        phone: response.data.phone || '',
        department: response.data.department || '',
        designation: response.data.designation || '',
        email: response.data.email || ''
      });
    } else {
      setError(response.message || 'Unable to load profile.');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const response = await api.put('/employee/profile', formData);
      if (response.success) {
        setIsModalOpen(false);
        await load();
      } else {
        alert(response.message || 'Failed to update profile');
      }
    } catch (err: any) {
      alert('Error updating profile: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <EmployeePage
      onAction={() => setIsModalOpen(true)}
      eyebrow="Identity workspace"
      title="My Profile"
      description="Keep your employee profile, contact details and security preferences current."
      icon={UserRound}
      action="Edit profile"
    >
      {error && <div className="rounded-xl bg-amber-50 p-3 text-xs font-semibold text-amber-700">{error}</div>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-3xl bg-blue-600 text-2xl font-black text-white shadow-lg shadow-blue-600/30">
            {(profile?.avatar || profile?.name || 'AS').slice(0, 2).toUpperCase()}
          </div>
          <h2 className="mt-4 text-lg font-black text-slate-900">{profile?.name || 'Loading profile...'}</h2>
          <p className="mt-1 text-xs text-slate-500 font-medium">{profile?.designation || 'Employee'}</p>
          <span className="mt-4 inline-flex rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-[10px] font-bold text-emerald-700">
            Active Employee
          </span>
          <button
            onClick={() => setIsModalOpen(true)}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer"
          >
            <Edit3 className="h-3.5 w-3.5 text-blue-600" /> Edit Profile Details
          </button>
        </aside>

        <section className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-black text-slate-900 border-b border-slate-100 pb-3">Personal Information</h2>
            <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
              {[
                ['Full name', profile?.name],
                ['Email', profile?.email],
                ['Employee ID', profile?.employeeCode || profile?.id || 'EMP-1001'],
                ['Department', profile?.department || 'Operations'],
                ['Phone', profile?.phone || 'Not provided'],
                ['Joining date', profile?.joiningDate || '01 Jan 2024']
              ].map(([label, value]) => (
                <div key={String(label)} className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
                  <p className="mt-1 text-xs font-bold text-slate-800">{value || '—'}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              <h2 className="text-sm font-black text-slate-900">Security & Access</h2>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                onClick={() => alert('Password update request sent to system administrator.')}
                className="rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer transition-all"
              >
                Change Password
              </button>
              <button className="rounded-xl bg-emerald-50 border border-emerald-200 px-3.5 py-2 text-xs font-bold text-emerald-700">
                2FA Enabled
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* Edit Profile Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-slate-200 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <UserRound className="w-5 h-5 text-blue-600" />
                  <span>Update Profile Information</span>
                </h3>
                <p className="text-xs text-slate-500">Edit your employee account profile details</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Department</label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={e => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Designation</label>
                  <input
                    type="text"
                    value={formData.designation}
                    onChange={e => setFormData({ ...formData, designation: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-600/25 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{submitting ? 'Saving...' : 'Save Profile'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </EmployeePage>
  );
};
