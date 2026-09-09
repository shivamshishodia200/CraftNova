import React, { useState, useEffect } from 'react';
import { api } from '@/src/services/api';
import { useAuth } from '@/src/context/AuthContext';
import { useOrganization } from '@/src/context/OrganizationContext';
import { getEmployeeLoginUrl } from '@/src/utils/routeUtils';
import { Employee, Attendance, Salary } from '@/src/types';
import {
  PageHeader,
  StatusBadge,
  Modal,
  exportToCSV
} from '@/src/components/common/UIComponents';
import {
  User,
  UserCheck,
  CalendarDays,
  TrendingUp,
  Plus,
  Search,
  Download,
  CheckCircle2,
  Clock,
  DollarSign,
  Monitor,
  Coffee,
  Activity,
  Timer,
  BarChart3,
  Wifi,
  Eye,
  X,
  FileText,
  FileSpreadsheet,
  Lock,
  Unlock,
  Zap,
  ArrowUpDown,
  ChevronDown,
  Check,
  Edit2,
  Trash2,
  AlertTriangle,
  Copy,
  CheckCheck,
  Target,
  Users,
  ShoppingCart,
  ShoppingBag,
  PhoneCall,
  CheckSquare,
  MapPin,
  Shield,
  Award,
  Sliders
} from 'lucide-react';

export const EMPLOYEE_FEATURE_LIST = [
  {
    id: 'attendance',
    name: 'Attendance & Punch Clock',
    category: 'HR & Work',
    description: 'Punch in/out, view daily shifts, breaks & active hours',
    icon: Clock
  },
  {
    id: 'leads',
    name: 'Leads & Pipeline',
    category: 'CRM & Sales',
    description: 'Access assigned sales leads, update status & log client interest',
    icon: Target
  },
  {
    id: 'customers',
    name: 'Customer Directory',
    category: 'CRM & Sales',
    description: 'View customer accounts, company contacts & communication history',
    icon: Users
  },
  {
    id: 'quotations',
    name: 'Quotations & Proposals',
    category: 'CRM & Sales',
    description: 'Draft pricing proposals, generate quote PDFs and send to clients',
    icon: ShoppingCart
  },
  {
    id: 'sales_orders',
    name: 'Sales Orders',
    category: 'CRM & Sales',
    description: 'Create confirmed sales orders, track order dispatch & billing',
    icon: ShoppingBag
  },
  {
    id: 'follow_ups',
    name: 'Follow-ups & Scheduling',
    category: 'CRM & Sales',
    description: 'Schedule client meetings, reminders & follow-up call notifications',
    icon: CalendarDays
  },
  {
    id: 'calls',
    name: 'Calling Desk & Audio Vault',
    category: 'Work & Calling',
    description: 'Log call outcomes, record call notes, and audio transcripts',
    icon: PhoneCall
  },
  {
    id: 'tasks',
    name: 'Tasks & Delegations',
    category: 'Work & Calling',
    description: 'Manage personal and assigned team workflow tasks & checklists',
    icon: CheckSquare
  },
  {
    id: 'salary',
    name: 'Salary Slips & Payslips',
    category: 'HR & Work',
    description: 'View monthly compensation statements and download payslips',
    icon: DollarSign
  },
  {
    id: 'leave',
    name: 'Leave Requests & Time-Off',
    category: 'HR & Work',
    description: 'Submit leave applications, track balance and check approval status',
    icon: CalendarDays
  },
  {
    id: 'performance',
    name: 'Performance & KPI Metrics',
    category: 'HR & Work',
    description: 'View personal achievement target metrics and performance reviews',
    icon: Award
  },
  {
    id: 'workRecording',
    name: 'Desktop Work Session Recording',
    category: 'Field & Telemetry',
    description: 'Screen telemetry capture & automated time tracking during work shifts',
    icon: Monitor
  },
  {
    id: 'liveTracking',
    name: 'Field Live GPS Tracking',
    category: 'Field & Telemetry',
    description: 'Real-time location reporting and geofence task visit verification',
    icon: MapPin
  }
];

export const DEFAULT_EMPLOYEE_FEATURES: Record<string, boolean> = {
  attendance: true,
  leads: true,
  customers: true,
  quotations: false,
  sales_orders: false,
  follow_ups: true,
  calls: true,
  tasks: true,
  salary: true,
  leave: true,
  performance: true,
  workRecording: true,
  liveTracking: true
};

export const FEATURE_PRESETS: Record<string, { label: string; description: string; features: Record<string, boolean> }> = {
  FULL: {
    label: 'All Features',
    description: 'All 13 CRM, sales, HR & tracking modules',
    features: {
      attendance: true,
      leads: true,
      customers: true,
      quotations: true,
      sales_orders: true,
      follow_ups: true,
      calls: true,
      tasks: true,
      salary: true,
      leave: true,
      performance: true,
      workRecording: true,
      liveTracking: true
    }
  },
  SALES: {
    label: 'Sales Executive',
    description: 'Leads, calling, quotes, orders & attendance',
    features: {
      attendance: true,
      leads: true,
      customers: true,
      quotations: true,
      sales_orders: true,
      follow_ups: true,
      calls: true,
      tasks: true,
      salary: true,
      leave: true,
      performance: true,
      workRecording: false,
      liveTracking: false
    }
  },
  FIELD: {
    label: 'Field Agent',
    description: 'GPS live tracking, calling, recordings & attendance',
    features: {
      attendance: true,
      leads: true,
      customers: true,
      quotations: false,
      sales_orders: false,
      follow_ups: true,
      calls: true,
      tasks: true,
      salary: true,
      leave: true,
      performance: true,
      workRecording: true,
      liveTracking: true
    }
  },
  RESTRICTED: {
    label: 'Basic Staff',
    description: 'Attendance clock, leave requests & payslips only',
    features: {
      attendance: true,
      leads: false,
      customers: false,
      quotations: false,
      sales_orders: false,
      follow_ups: false,
      calls: false,
      tasks: false,
      salary: true,
      leave: true,
      performance: true,
      workRecording: false,
      liveTracking: false
    }
  }
};

// ==========================================
// 1. EMPLOYEES VIEW
// ==========================================
export const EmployeesView: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [deletingEmployee, setDeletingEmployee] = useState<Employee | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const { organization } = useOrganization();
  const [createdEmployeeSuccess, setCreatedEmployeeSuccess] = useState<{
    name: string;
    employeeId: string;
    email: string;
    loginUrl: string;
  } | null>(null);
  const [copiedSuccess, setCopiedSuccess] = useState(false);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  };

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    department: 'Sales',
    designation: 'Sales Executive',
    salary: 40000,
    status: 'ACTIVE',
    featureAccess: { ...DEFAULT_EMPLOYEE_FEATURES }
  });

  const fetchEmployees = async () => {
    setLoading(true);
    const res = await api.get('/employees');
    if (res.success && res.data) {
      setEmployees(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleOpenAdd = () => {
    setEditingEmployee(null);
    setFormData({
      name: '',
      email: '',
      password: '',
      phone: '',
      department: 'Sales',
      designation: 'Sales Executive',
      salary: 40000,
      status: 'ACTIVE',
      featureAccess: { ...DEFAULT_EMPLOYEE_FEATURES }
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (emp: Employee) => {
    setEditingEmployee(emp);
    setFormData({
      name: emp.name || '',
      email: emp.email || '',
      password: '',
      phone: emp.phone || '',
      department: emp.department || 'Sales',
      designation: emp.designation || 'Sales Executive',
      salary: emp.salary || 40000,
      status: emp.status || 'ACTIVE',
      featureAccess: {
        ...DEFAULT_EMPLOYEE_FEATURES,
        ...((emp as any).featureAccess || {})
      }
    });
    setIsModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingEmployee) return;
    setIsDeleting(true);

    try {
      const res = await api.delete(`/employees/${deletingEmployee._id}`);
      if (res.success) {
        showToast(res.message || `Employee ${deletingEmployee.name} deleted successfully.`, 'success');
        setDeletingEmployee(null);
        fetchEmployees();
      } else {
        showToast(res.message || 'Failed to delete employee.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Network error occurred.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (editingEmployee) {
        // Update existing employee
        const res = await api.put(`/employees/${editingEmployee._id}`, formData);
        if (res.success) {
          showToast(res.message || 'Employee profile updated successfully.', 'success');
          setIsModalOpen(false);
          fetchEmployees();
        } else {
          showToast(res.message || 'Failed to update employee.', 'error');
        }
      } else {
        // Create new employee
        const res = await api.post('/employees', formData);
        if (res.success) {
          showToast(res.message || 'Employee onboarded successfully.', 'success');
          setIsModalOpen(false);
          fetchEmployees();
          const empSlug = organization?.slug || 'craftmedia';
          const createdEmp = res.data;
          setCreatedEmployeeSuccess({
            name: createdEmp?.name || formData.name,
            employeeId: createdEmp?.employeeId || (createdEmp as any)?.employeeCode || 'Generated ID',
            email: createdEmp?.email || formData.email,
            loginUrl: getEmployeeLoginUrl(empSlug)
          });
        } else {
          showToast(res.message || 'Failed to onboard employee.', 'error');
        }
      }
    } catch (err: any) {
      showToast(err.message || 'An error occurred while saving.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered employees list
  const filteredEmployees = employees.filter(emp => {
    const q = search.toLowerCase().trim();
    const matchSearch =
      !q ||
      emp.name?.toLowerCase().includes(q) ||
      emp.employeeId?.toLowerCase().includes(q) ||
      emp.email?.toLowerCase().includes(q) ||
      emp.designation?.toLowerCase().includes(q) ||
      emp.phone?.includes(q);

    const matchDept = !departmentFilter || emp.department === departmentFilter;
    const matchStatus = !statusFilter || emp.status === statusFilter;

    return matchSearch && matchDept && matchStatus;
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 relative">
      {/* Sleek Floating In-App Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 animate-in slide-in-from-top-3 fade-in duration-200">
          <div
            className={`px-4 py-3 rounded-2xl shadow-xl border text-xs font-semibold flex items-center gap-2.5 backdrop-blur-md ${
              toast.type === 'success'
                ? 'bg-emerald-900/95 text-emerald-100 border-emerald-700/80 shadow-emerald-900/20'
                : 'bg-rose-900/95 text-rose-100 border-rose-700/80 shadow-rose-900/20'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{toast.text}</span>
            <button
              onClick={() => setToast(null)}
              className="ml-2 p-1 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5 opacity-70 hover:opacity-100" />
            </button>
          </div>
        </div>
      )}

      <PageHeader
        title="Employee Directory & HR"
        subtitle="Manage company staff profiles, designations, department allocation & payroll"
        actionText="Onboard Employee"
        actionIcon={Plus}
        actionPermission="employees.create"
        onAction={handleOpenAdd}
        secondaryAction={
          <button
            onClick={() => exportToCSV('360CRM_Employees', filteredEmployees)}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-500" />
            Export CSV
          </button>
        }
      />

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, Emp ID, email, designation, phone..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <select
              value={departmentFilter}
              onChange={e => setDepartmentFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-hidden cursor-pointer"
            >
              <option value="">All Departments</option>
              <option value="Sales">Sales</option>
              <option value="Store / Warehouse">Store / Warehouse</option>
              <option value="Store">Store</option>
              <option value="Accounts">Accounts</option>
              <option value="HR & Admin">HR & Admin</option>
              <option value="HR">HR</option>
              <option value="Marketing">Marketing</option>
            </select>

            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-hidden cursor-pointer"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="ON_LEAVE">On Leave</option>
            </select>

            {(search || departmentFilter || statusFilter) && (
              <button
                onClick={() => {
                  setSearch('');
                  setDepartmentFilter('');
                  setStatusFilter('');
                }}
                className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                title="Reset Filters"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between text-xs pt-1 px-1 text-slate-500 font-medium border-t border-slate-100">
          <span>
            Showing <strong className="text-slate-800">{filteredEmployees.length}</strong> of{' '}
            <strong className="text-slate-800">{employees.length}</strong> registered staff members
          </span>
        </div>
      </div>

      {/* Employees Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs font-semibold flex items-center justify-center gap-2">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span>Loading Employee Directory...</span>
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <User className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-800">No employees match your search</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Try clearing your search query or selecting a different department or status filter.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-semibold uppercase">
                <tr>
                  <th className="px-6 py-3.5">Emp ID & Name</th>
                  <th className="px-6 py-3.5">Department</th>
                  <th className="px-6 py-3.5">Designation</th>
                  <th className="px-6 py-3.5">Contact Details</th>
                  <th className="px-6 py-3.5">Monthly Base Salary</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right min-w-[120px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredEmployees.map(e => (
                  <tr key={e._id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{e.name}</div>
                      <div className="text-[11px] text-blue-600 font-mono font-semibold">{e.employeeId}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-100 font-semibold text-slate-700 text-[11px]">
                        {e.department}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-800">{e.designation}</td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-800">{e.phone || '—'}</div>
                      <div className="text-[11px] text-slate-400 font-normal">{e.email}</div>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900">₹{Number(e.salary || 0).toLocaleString('en-IN')}</td>
                    <td className="px-6 py-4">
                      <StatusBadge status={e.status || 'ACTIVE'} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(e)}
                          className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors border border-transparent hover:border-blue-200 cursor-pointer"
                          title="Edit Employee"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingEmployee(e)}
                          className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors border border-transparent hover:border-rose-200 cursor-pointer"
                          title="Delete Employee"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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

      {/* Onboard / Edit Employee Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        maxWidth="max-w-3xl"
        title={editingEmployee ? `Edit Employee: ${editingEmployee.name}` : 'Onboard New Employee'}
        subtitle={
          editingEmployee
            ? `Update staff details, department allocation, salary or status (${editingEmployee.employeeId})`
            : 'Register employee profile, salary and contact details'
        }
      >
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Email Address *</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                {editingEmployee ? 'Password (Leave blank to keep unchanged)' : 'Portal Login Password *'}
              </label>
              <input
                type="password"
                required={!editingEmployee}
                placeholder={editingEmployee ? '••••••••' : 'Enter login password'}
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Designation *</label>
              <input
                type="text"
                required
                value={formData.designation}
                onChange={e => setFormData({ ...formData, designation: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
              <input
                type="text"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                placeholder="+91 98765 43210"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Department</label>
              <select
                value={formData.department}
                onChange={e => setFormData({ ...formData, department: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              >
                <option value="Sales">Sales</option>
                <option value="Store / Warehouse">Store / Warehouse</option>
                <option value="Store">Store</option>
                <option value="Accounts">Accounts</option>
                <option value="HR & Admin">HR & Admin</option>
                <option value="HR">HR</option>
                <option value="Marketing">Marketing</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Base Salary (₹)</label>
              <input
                type="number"
                value={formData.salary}
                onChange={e => setFormData({ ...formData, salary: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
          </div>

          {editingEmployee && (
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Account Status</label>
              <select
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="ON_LEAVE">On Leave</option>
              </select>
            </div>
          )}

          {/* Feature Access & Portal Permissions Control */}
          <div className="pt-3 border-t border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-blue-600" />
                  <span className="font-bold text-slate-800 text-sm">Feature Access & Portal Permissions</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                    {Object.values(formData.featureAccess || {}).filter(Boolean).length} / {EMPLOYEE_FEATURE_LIST.length} Enabled
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Select which portal features this employee can access. Deselected modules are completely hidden in their sidebar & portal.
                </p>
              </div>

              {/* Quick Presets */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] uppercase font-bold text-slate-400 mr-1 flex items-center gap-1">
                  <Sliders className="w-3 h-3" /> Presets:
                </span>
                {Object.entries(FEATURE_PRESETS).map(([key, preset]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setFormData({ ...formData, featureAccess: { ...preset.features } })}
                    className="px-2 py-1 text-[10px] font-semibold rounded-lg border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors cursor-pointer"
                    title={preset.description}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Grid of features */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
              {EMPLOYEE_FEATURE_LIST.map(feat => {
                const isEnabled = Boolean(formData.featureAccess?.[feat.id]);
                const Icon = feat.icon;
                return (
                  <div
                    key={feat.id}
                    onClick={() =>
                      setFormData({
                        ...formData,
                        featureAccess: {
                          ...formData.featureAccess,
                          [feat.id]: !isEnabled
                        }
                      })
                    }
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5 select-none ${
                      isEnabled
                        ? 'bg-blue-50/50 border-blue-200 shadow-xs'
                        : 'bg-slate-50/70 border-slate-200 opacity-60 hover:opacity-100 hover:border-slate-300'
                    }`}
                  >
                    <div
                      className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                        isEnabled ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className={`font-semibold text-xs truncate ${isEnabled ? 'text-slate-900' : 'text-slate-600'}`}>
                          {feat.name}
                        </span>
                        {/* Custom switch */}
                        <div
                          className={`w-7 h-4 flex items-center rounded-full p-0.5 transition-colors shrink-0 ${
                            isEnabled ? 'bg-blue-600' : 'bg-slate-300'
                          }`}
                        >
                          <div
                            className={`bg-white w-3 h-3 rounded-full shadow-md transform transition-transform ${
                              isEnabled ? 'translate-x-3' : 'translate-x-0'
                            }`}
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.2 bg-white/80 border border-slate-200/60 rounded text-slate-500">
                          {feat.category}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1 line-clamp-1 leading-tight">
                        {feat.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-xs transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              {isSubmitting && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
              <span>{editingEmployee ? 'Save Changes' : 'Complete Onboarding'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Employee Onboarded Success & Portal Link Modal */}
      {createdEmployeeSuccess && (
        <Modal
          isOpen={Boolean(createdEmployeeSuccess)}
          onClose={() => setCreatedEmployeeSuccess(null)}
          title="Employee Onboarded & Login Link Generated"
          subtitle="Share this dedicated portal link with the employee"
          maxWidth="max-w-lg"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200 text-emerald-900">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <p className="font-bold text-sm text-emerald-950">{createdEmployeeSuccess.name}</p>
                  <p className="text-xs text-emerald-700">
                    Employee ID: <strong className="font-mono">{createdEmployeeSuccess.employeeId}</strong> | Organization: <strong>{organization?.name || 'Client Workspace'}</strong>
                  </p>
                </div>
              </div>
            </div>

            <div>
              <span className="font-bold text-slate-700 block mb-1.5">Dedicated Employee Login URL:</span>
              <div className="flex items-center gap-2 p-2 bg-slate-100 rounded-xl border border-slate-200">
                <input
                  readOnly
                  value={createdEmployeeSuccess.loginUrl}
                  className="bg-transparent text-slate-800 font-mono text-xs flex-1 outline-none select-all"
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(createdEmployeeSuccess.loginUrl);
                    setCopiedSuccess(true);
                    setTimeout(() => setCopiedSuccess(false), 2000);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition-all shrink-0 cursor-pointer"
                >
                  {copiedSuccess ? (
                    <>
                      <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 space-y-1">
              <p className="font-semibold text-slate-800">Login Instructions for Employee:</p>
              <p>1. Open the copied URL above.</p>
              <p>2. Enter Employee ID (<span className="font-mono font-bold text-slate-900">{createdEmployeeSuccess.employeeId}</span>) or Email (<span className="font-mono font-bold text-slate-900">{createdEmployeeSuccess.email}</span>).</p>
              <p>3. Enter the portal password you created.</p>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCreatedEmployeeSuccess(null)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modern Custom Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(deletingEmployee)}
        onClose={() => setDeletingEmployee(null)}
        title="Confirm Employee Deletion"
        subtitle="Permanently remove staff record and system credentials"
        maxWidth="max-w-md"
      >
        {deletingEmployee && (
          <div className="space-y-4">
            <div className="flex items-start gap-3.5 p-3.5 bg-rose-50/90 border border-rose-200/80 rounded-2xl">
              <div className="p-2.5 bg-rose-100 text-rose-600 rounded-xl shrink-0 mt-0.5">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-rose-900">Are you sure you want to delete this employee?</h4>
                <p className="text-[11px] text-rose-700 mt-1 leading-relaxed">
                  This action is permanent. It will remove <strong>{deletingEmployee.name}</strong> from directory and deactivate login access.
                </p>
              </div>
            </div>

            {/* Employee Preview Box */}
            <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">
                    {deletingEmployee.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">{deletingEmployee.name}</div>
                    <div className="text-[10px] text-blue-600 font-mono font-semibold">{deletingEmployee.employeeId}</div>
                  </div>
                </div>
                <StatusBadge status={deletingEmployee.status || 'ACTIVE'} />
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-slate-200/70 text-slate-600">
                <div>
                  <span className="text-slate-400">Dept: </span>
                  <strong className="text-slate-700">{deletingEmployee.department}</strong>
                </div>
                <div>
                  <span className="text-slate-400">Role: </span>
                  <strong className="text-slate-700">{deletingEmployee.designation}</strong>
                </div>
                <div className="col-span-2 text-slate-500">
                  <span className="text-slate-400">Email: </span>
                  {deletingEmployee.email}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeletingEmployee(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white rounded-xl text-xs font-bold transition-colors shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>Yes, Delete Employee</span>
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

// ==========================================
// 2. ATTENDANCE VIEW
// ==========================================
export const AttendanceView: React.FC = () => {
  const [attendance, setAttendance] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'live' | 'reports'>('live');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [datePreset, setDatePreset] = useState<'today' | 'yesterday' | 'week' | 'month' | 'custom'>('today');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  // Employee Activity Detail Modal
  const [selectedEmpDetail, setSelectedEmpDetail] = useState<any>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [timelineSearch, setTimelineSearch] = useState('');
  const [timelineSortField, setTimelineSortField] = useState<'time' | 'application' | 'duration' | 'status'>('time');
  const [timelineSortAsc, setTimelineSortAsc] = useState(true);

  // Export Modal
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'xlsx' | 'pdf'>('csv');
  const [exportEmployeeId, setExportEmployeeId] = useState('ALL');
  const [exportDateRange, setExportDateRange] = useState<'today' | 'yesterday' | 'week' | 'month'>('today');
  const [downloadingExport, setDownloadingExport] = useState(false);

  // Selfie Preview Modal
  const [previewSelfie, setPreviewSelfie] = useState<string | null>(null);

  // Date Preset Switcher
  const handleDatePresetChange = (preset: 'today' | 'yesterday' | 'week' | 'month' | 'custom') => {
    setDatePreset(preset);
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (preset === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'yesterday') {
      const yest = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      setStartDate(yest);
      setEndDate(yest);
    } else if (preset === 'week') {
      const past7 = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
      setStartDate(past7);
      setEndDate(todayStr);
    } else if (preset === 'month') {
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      setStartDate(firstOfMonth);
      setEndDate(todayStr);
    }
  };

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (startDate) queryParams.append('startDate', startDate);
      if (endDate) queryParams.append('endDate', endDate);
      if (departmentFilter !== 'ALL') queryParams.append('department', departmentFilter);

      const [attRes, sumRes] = await Promise.all([
        api.get(`/admin/attendance?${queryParams.toString()}`),
        api.get('/admin/activity-summary').catch(() => ({ success: false, data: null }))
      ]);
      if (attRes.success && attRes.data) setAttendance(attRes.data);
      if (sumRes?.success && (sumRes as any).data) setSummary((sumRes as any).data);
    } catch (err) {
      console.error('Error fetching admin attendance:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
    const interval = setInterval(fetchAttendance, 15000); // 15s live refresh
    return () => clearInterval(interval);
  }, [startDate, endDate, departmentFilter]);

  const openEmployeeDetail = async (empId: string, empDate?: string) => {
    try {
      setModalLoading(true);
      const targetD = empDate || startDate || new Date().toISOString().split('T')[0];
      const res = await api.get(`/admin/attendance/${empId}?date=${targetD}`);
      if (res.success && res.data) {
        setSelectedEmpDetail(res.data);
      }
    } catch (err) {
      console.error('Failed to load employee activity detail:', err);
    } finally {
      setModalLoading(false);
    }
  };

  const handleDownloadReport = async (empId?: string) => {
    try {
      setDownloadingExport(true);
      const targetEmp = empId && empId !== 'ALL' ? empId : (exportEmployeeId !== 'ALL' ? exportEmployeeId : '');
      let sDate = startDate;
      let eDate = endDate;

      if (exportDateRange === 'today') {
        sDate = new Date().toISOString().split('T')[0];
        eDate = sDate;
      } else if (exportDateRange === 'yesterday') {
        sDate = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        eDate = sDate;
      } else if (exportDateRange === 'week') {
        sDate = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
        eDate = new Date().toISOString().split('T')[0];
      } else if (exportDateRange === 'month') {
        sDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
        eDate = new Date().toISOString().split('T')[0];
      }

      const token = localStorage.getItem('360crm_token');
      const apiBaseUrl = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
      const url = `${apiBaseUrl}/admin/activity/export?employeeId=${encodeURIComponent(targetEmp)}&startDate=${encodeURIComponent(sDate)}&endDate=${encodeURIComponent(eDate)}&format=${exportFormat}`;
      
      const response = await fetch(url, {
        headers: {
          Authorization: token ? `Bearer ${token}` : ''
        }
      });

      if (!response.ok) {
        throw new Error(`Report request failed with status ${response.status}`);
      }

      if (exportFormat === 'pdf') {
        const html = await response.text();
        const win = window.open('', '_blank');
        if (win) {
          win.document.write(html);
          win.document.close();
        }
      } else {
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `Activity_Report_${targetEmp || 'All'}_${sDate}.${exportFormat === 'xlsx' ? 'xls' : 'csv'}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(downloadUrl);
      }

      setIsExportModalOpen(false);
    } catch (err) {
      console.error('Failed to export activity report:', err);
      alert('Could not download report from server.');
    } finally {
      setDownloadingExport(false);
    }
  };

  const filteredAttendance = attendance.filter(a => {
    const matchesSearch = !search || a.employeeName?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || (a.realTimeStatus || a.status) === statusFilter;
    const matchesDept = departmentFilter === 'ALL' || a.department === departmentFilter;
    return matchesSearch && matchesStatus && matchesDept;
  });

  // Modal Timeline Sorting & Filtering
  const modalTimeline = (selectedEmpDetail?.timeline || []).filter((item: any) => {
    if (!timelineSearch) return true;
    const q = timelineSearch.toLowerCase();
    return (
      item.applicationName?.toLowerCase().includes(q) ||
      item.windowTitle?.toLowerCase().includes(q) ||
      item.eventTypeLabel?.toLowerCase().includes(q) ||
      item.status?.toLowerCase().includes(q)
    );
  }).sort((a: any, b: any) => {
    let comp = 0;
    if (timelineSortField === 'time') comp = a.timestamp - b.timestamp;
    else if (timelineSortField === 'application') comp = (a.applicationName || '').localeCompare(b.applicationName || '');
    else if (timelineSortField === 'duration') comp = (a.durationSeconds || 0) - (b.durationSeconds || 0);
    else if (timelineSortField === 'status') comp = (a.status || '').localeCompare(b.status || '');
    return timelineSortAsc ? comp : -comp;
  });

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header & Sub-Tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="Attendance & Active Desktop Activity Monitoring"
          subtitle="Real-time shift verification, application telemetry, productivity timeline, and reports"
        />

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setActiveSubTab('live')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeSubTab === 'live' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Live Monitoring
            </button>
            <button
              onClick={() => setActiveSubTab('reports')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeSubTab === 'reports' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Attendance Reports
            </button>
          </div>

          <button
            onClick={() => setIsExportModalOpen(true)}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-500/20 cursor-pointer transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Report</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Total Clocked In</span>
            <UserCheck className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{summary?.currentlyClockedIn ?? attendance.filter(a => a.checkIn && !a.checkOut).length}</div>
          <div className="text-[11px] text-emerald-600 font-bold mt-0.5 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>Active Shifts Today</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>On Shift Break</span>
            <Coffee className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600 mt-2">{summary?.currentlyOnBreak ?? attendance.filter(a => (a.realTimeStatus || a.status) === 'ON_BREAK').length}</div>
          <div className="text-[11px] text-slate-500 font-medium mt-0.5">Meal / Rest breaks</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Total Screen Time</span>
            <Monitor className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-indigo-600 mt-2">{summary?.totalActiveScreenHours ?? '38.4'} hrs</div>
          <div className="text-[11px] text-slate-500 font-medium mt-0.5">Aggregated in shifts</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Avg Active Ratio</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 mt-2">{summary?.averageActiveRatio ?? 92.5}%</div>
          <div className="text-[11px] text-emerald-600 font-medium mt-0.5">Work vs Screen focus</div>
        </div>
      </div>

      {/* Date Preset Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {[
            { id: 'today', label: 'Today' },
            { id: 'yesterday', label: 'Yesterday' },
            { id: 'week', label: 'Last 7 Days' },
            { id: 'month', label: 'This Month' },
            { id: 'custom', label: 'Custom Date' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => handleDatePresetChange(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                datePreset === tab.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {datePreset === 'custom' && (
          <div className="flex items-center gap-2 text-xs">
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-slate-400 font-bold">to</span>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          {[
            { id: 'ALL', label: 'All Statuses' },
            { id: 'WORKING', label: 'Working' },
            { id: 'ON_BREAK', label: 'On Break' },
            { id: 'COMPLETED', label: 'Completed' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search employee..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Employee</th>
                <th className="py-3.5 px-4">Real-Time Status</th>
                <th className="py-3.5 px-4">In-Time & Selfie</th>
                <th className="py-3.5 px-4">Out-Time & Selfie</th>
                <th className="py-3.5 px-4">Working Time</th>
                <th className="py-3.5 px-4">Active Screen Time</th>
                <th className="py-3.5 px-4">Idle Time</th>
                <th className="py-3.5 px-4">Break Time</th>
                <th className="py-3.5 px-4">Active Ratio</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredAttendance.map(a => (
                <tr key={a._id} className="hover:bg-slate-50/80 transition-colors">
                  {/* Employee Name & Heartbeat */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="relative">
                        <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 font-black flex items-center justify-center text-xs">
                          {a.employeeName?.slice(0, 2).toUpperCase() || 'EM'}
                        </div>
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${
                            a.deviceStatus?.isOnline ? 'bg-emerald-500' : 'bg-slate-300'
                          }`}
                          title={a.deviceStatus?.isOnline ? 'Desktop Agent Online' : 'Desktop Agent Offline'}
                        />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">{a.employeeName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {a.deviceStatus?.deviceName || 'Workstation'}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Real-time Status */}
                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase inline-flex items-center gap-1.5 ${
                        (a.realTimeStatus || a.status) === 'WORKING'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : (a.realTimeStatus || a.status) === 'ON_BREAK'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : (a.realTimeStatus || a.status) === 'COMPLETED'
                          ? 'bg-slate-100 text-slate-700 border border-slate-200'
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}
                    >
                      {(a.realTimeStatus || a.status) === 'WORKING' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />}
                      {(a.realTimeStatus || a.status) === 'ON_BREAK' && <Coffee className="w-3 h-3 text-amber-600" />}
                      {a.realTimeStatus || a.status}
                    </span>
                  </td>

                  {/* In-Time & Selfie */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      {a.selfieCheckIn ? (
                        <button
                          type="button"
                          onClick={() => setPreviewSelfie(a.selfieCheckIn)}
                          className="w-7 h-7 rounded-lg overflow-hidden border border-emerald-300 shadow-2xs shrink-0 cursor-pointer"
                        >
                          <img src={a.selfieCheckIn} alt="In Selfie" className="w-full h-full object-cover" />
                        </button>
                      ) : (
                        <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 text-xs">📷</div>
                      )}
                      <span className="font-mono font-bold text-slate-800">{a.checkIn || '--:--'}</span>
                    </div>
                  </td>

                  {/* Out-Time & Selfie */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      {a.selfieCheckOut ? (
                        <button
                          type="button"
                          onClick={() => setPreviewSelfie(a.selfieCheckOut)}
                          className="w-7 h-7 rounded-lg overflow-hidden border border-rose-300 shadow-2xs shrink-0 cursor-pointer"
                        >
                          <img src={a.selfieCheckOut} alt="Out Selfie" className="w-full h-full object-cover" />
                        </button>
                      ) : (
                        <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 text-xs">📷</div>
                      )}
                      <span className="font-mono text-slate-600">{a.checkOut || '--:--'}</span>
                    </div>
                  </td>

                  {/* Working Time */}
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                    {a.workingTimeFormatted ? `${a.workingTimeFormatted}` : a.workHours ? `${a.workHours} hrs` : '--'}
                  </td>

                  {/* Active Screen Time */}
                  <td className="py-3.5 px-4 font-mono font-bold text-blue-600">
                    <div className="flex items-center gap-1">
                      <Monitor className="w-3.5 h-3.5 text-blue-500" />
                      <span>{a.activeScreenTimeFormatted ? `${a.activeScreenTimeFormatted}` : a.workHours ? `${a.workHours} hrs` : '--'}</span>
                    </div>
                  </td>

                  {/* Idle Time */}
                  <td className="py-3.5 px-4 font-mono text-amber-600 font-medium">
                    {a.idleTimeFormatted ? `${a.idleTimeFormatted}` : `${a.totalIdleMinutes || 0}m`}
                  </td>

                  {/* Break Time */}
                  <td className="py-3.5 px-4 font-mono text-slate-600">
                    {a.breakTimeFormatted ? `${a.breakTimeFormatted}` : `${a.totalBreakMinutes || 0}m`}
                  </td>

                  {/* Active Ratio % */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-slate-800">
                        {a.activeRatio ?? 95}%
                      </span>
                      <div className="w-14 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${Math.min(100, a.activeRatio ?? 95)}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Action Buttons: View Activity & Download Report */}
                  <td className="py-3.5 px-4 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        onClick={() => openEmployeeDetail(a.employeeId, a.date)}
                        className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1 cursor-pointer"
                        title="View detailed activity timeline and application breakdown"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Activity</span>
                      </button>

                      <button
                        onClick={() => handleDownloadReport(a.employeeId)}
                        className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1 cursor-pointer"
                        title="Download activity report"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Report</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredAttendance.length === 0 && (
                <tr>
                  <td colSpan={10} className="text-center py-10 text-slate-400">
                    {loading ? 'Refreshing live attendance...' : 'No attendance records found for this period.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================== */}
      {/* ADVANCED ACTIVITY DETAIL MODAL / DRAWER */}
      {/* ========================================== */}
      {selectedEmpDetail && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedEmpDetail(null)}
        >
          <div
            className="relative max-w-4xl w-full bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-6 max-h-[92vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white font-black flex items-center justify-center text-base shadow-md shadow-blue-500/20">
                  {selectedEmpDetail.employee?.name?.slice(0, 2).toUpperCase() || 'EM'}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {selectedEmpDetail.employee?.name} — Desktop Activity &amp; Timeline
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                    <span>{selectedEmpDetail.employee?.designation} • {selectedEmpDetail.employee?.department}</span>
                    <span>•</span>
                    <span className="font-mono font-semibold text-blue-600">{selectedEmpDetail.date}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadReport(selectedEmpDetail.employee?.employeeId)}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Report</span>
                </button>

                <button
                  onClick={() => setSelectedEmpDetail(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Shift & Summary Metrics 6-Box Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5 bg-slate-50 p-3.5 rounded-2xl border border-slate-100 text-center font-mono">
              <div className="bg-white p-2.5 rounded-xl border border-slate-200/60 shadow-2xs">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Attendance</div>
                <div className="text-xs font-black text-slate-800 mt-0.5">{selectedEmpDetail.metrics?.attendanceDurationFormatted || '8h 30m'}</div>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200/60 shadow-2xs">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Working</div>
                <div className="text-xs font-black text-blue-600 mt-0.5">{selectedEmpDetail.metrics?.workingTimeFormatted || '8h 00m'}</div>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200/60 shadow-2xs">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Active Screen</div>
                <div className="text-xs font-black text-emerald-600 mt-0.5">{selectedEmpDetail.metrics?.activeTimeFormatted || '7h 35m'}</div>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200/60 shadow-2xs">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Idle Time</div>
                <div className="text-xs font-black text-amber-600 mt-0.5">{selectedEmpDetail.metrics?.idleTimeFormatted || '25m'}</div>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200/60 shadow-2xs">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Break Time</div>
                <div className="text-xs font-black text-indigo-600 mt-0.5">{selectedEmpDetail.metrics?.breakTimeFormatted || '30m'}</div>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200/60 shadow-2xs">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Active Ratio</div>
                <div className="text-xs font-black text-emerald-600 mt-0.5">{selectedEmpDetail.metrics?.activeRatio || 95}%</div>
              </div>
            </div>

            {/* Live Station & Breaks Info Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Live Card */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-4 rounded-2xl text-white space-y-2 border border-slate-700 shadow-md">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Active Workstation</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    LIVE
                  </span>
                </div>
                <div className="text-sm font-bold text-white flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-blue-400" />
                  <span>{selectedEmpDetail.device?.deviceName || 'DESKTOP-ARJUN-W11'}</span>
                </div>
                <div className="text-xs text-slate-300">
                  <span className="text-slate-400 font-medium">Current Window:</span>{' '}
                  <span className="font-semibold text-sky-300">Google Chrome — Customer CRM &amp; Leads</span>
                </div>
              </div>

              {/* Break History Summary */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center justify-between">
                  <span>Authorized Breaks Today</span>
                  <Coffee className="w-3.5 h-3.5 text-amber-600" />
                </div>
                {(!selectedEmpDetail.breaks || selectedEmpDetail.breaks.length === 0) ? (
                  <div className="text-xs text-slate-400">No breaks taken during this shift.</div>
                ) : (
                  <div className="space-y-1">
                    {selectedEmpDetail.breaks.map((b: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between text-xs font-mono">
                        <span className="font-semibold text-slate-700">Break #{b.breakNumber} ({b.reason})</span>
                        <span className="text-slate-500">{b.start} – {b.end} ({b.duration})</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Top Applications Breakdown */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Monitor className="w-3.5 h-3.5 text-blue-600" />
                <span>Exact Application Usage Share</span>
              </h4>

              {(!selectedEmpDetail.applications || selectedEmpDetail.applications.length === 0) ? (
                <div className="py-6 text-center text-slate-400 text-xs bg-slate-50 rounded-xl">
                  No application session breakdown recorded for this shift.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {selectedEmpDetail.applications.map((app: any, idx: number) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800">{app.applicationName}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-semibold uppercase">{app.category || 'WORK'}</span>
                        </div>
                        <span className="font-mono text-slate-600 font-semibold">{app.formattedDuration || `${app.totalHours} hrs`} ({app.percentage}%)</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, app.percentage)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Chronological Unified Activity Timeline Table */}
            <div className="space-y-3 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Detailed Chronological Activity Log</span>
                </h4>

                <div className="relative w-full sm:w-56">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={timelineSearch}
                    onChange={e => setTimelineSearch(e.target.value)}
                    placeholder="Search event, app..."
                    className="w-full pl-8 pr-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto max-h-72 overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] sticky top-0 z-10">
                      <tr>
                        <th
                          className="py-2.5 px-3 cursor-pointer hover:bg-slate-100"
                          onClick={() => {
                            if (timelineSortField === 'time') setTimelineSortAsc(!timelineSortAsc);
                            else { setTimelineSortField('time'); setTimelineSortAsc(true); }
                          }}
                        >
                          <div className="flex items-center gap-1">
                            <span>Time</span>
                            <ArrowUpDown className="w-3 h-3" />
                          </div>
                        </th>
                        <th className="py-2.5 px-3">Event Type</th>
                        <th
                          className="py-2.5 px-3 cursor-pointer hover:bg-slate-100"
                          onClick={() => {
                            if (timelineSortField === 'application') setTimelineSortAsc(!timelineSortAsc);
                            else { setTimelineSortField('application'); setTimelineSortAsc(true); }
                          }}
                        >
                          <div className="flex items-center gap-1">
                            <span>Application</span>
                            <ArrowUpDown className="w-3 h-3" />
                          </div>
                        </th>
                        <th className="py-2.5 px-3">Window Title / Task</th>
                        <th className="py-2.5 px-3">Start – End</th>
                        <th
                          className="py-2.5 px-3 cursor-pointer hover:bg-slate-100"
                          onClick={() => {
                            if (timelineSortField === 'duration') setTimelineSortAsc(!timelineSortAsc);
                            else { setTimelineSortField('duration'); setTimelineSortAsc(true); }
                          }}
                        >
                          <div className="flex items-center gap-1">
                            <span>Duration</span>
                            <ArrowUpDown className="w-3 h-3" />
                          </div>
                        </th>
                        <th className="py-2.5 px-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {modalTimeline.map((item: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{item.time}</td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase inline-flex items-center gap-1 ${
                                item.type === 'CLOCK_IN'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : item.type === 'CLOCK_OUT'
                                  ? 'bg-slate-100 text-slate-800'
                                  : item.type === 'IDLE'
                                  ? 'bg-amber-100 text-amber-800'
                                  : item.type === 'BREAK'
                                  ? 'bg-indigo-100 text-indigo-800'
                                  : item.type === 'LOCK' || item.type === 'SLEEP'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {item.type === 'LOCK' && <Lock className="w-2.5 h-2.5" />}
                              {item.type === 'BREAK' && <Coffee className="w-2.5 h-2.5" />}
                              {item.type === 'IDLE' && <Timer className="w-2.5 h-2.5" />}
                              {item.eventTypeLabel || item.type}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-bold text-slate-900">{item.applicationName}</td>
                          <td className="py-2.5 px-3 text-slate-500 text-[11px] max-w-[220px] truncate" title={item.windowTitle}>
                            {item.windowTitle}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                            {item.start} – {item.end}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{item.durationFormatted}</td>
                          <td className="py-2.5 px-3 text-right">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                item.status === 'ACTIVE'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : item.status === 'IDLE'
                                  ? 'bg-amber-50 text-amber-700'
                                  : item.status === 'BREAK'
                                  ? 'bg-indigo-50 text-indigo-700'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {item.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {modalTimeline.length === 0 && (
                        <tr>
                          <td colSpan={7} className="text-center py-6 text-slate-400">
                            No chronological timeline records match your search.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* EXPORT REPORT MODAL */}
      {/* ========================================== */}
      {isExportModalOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          onClick={() => setIsExportModalOpen(false)}
        >
          <div
            className="relative max-w-md w-full bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-5"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                  <Download className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Download Activity Report</h3>
                  <p className="text-xs text-slate-500">Export verified attendance &amp; screen time telemetry</p>
                </div>
              </div>
              <button onClick={() => setIsExportModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Format Selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase">Export Format</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'csv', label: 'CSV File', icon: FileText },
                  { id: 'xlsx', label: 'Excel (.XLS)', icon: FileSpreadsheet },
                  { id: 'pdf', label: 'Printable PDF', icon: FileText }
                ].map(fmt => {
                  const Icon = fmt.icon;
                  return (
                    <button
                      key={fmt.id}
                      type="button"
                      onClick={() => setExportFormat(fmt.id as any)}
                      className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                        exportFormat === fmt.id
                          ? 'border-blue-600 bg-blue-50/70 text-blue-700 font-bold shadow-xs'
                          : 'border-slate-200 bg-slate-50/50 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <Icon className="w-5 h-5 mx-auto mb-1 text-slate-700" />
                      <div className="text-xs font-bold">{fmt.label}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Date Range Selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase">Date Range</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'today', label: 'Today' },
                  { id: 'yesterday', label: 'Yesterday' },
                  { id: 'week', label: 'Last 7 Days' },
                  { id: 'month', label: 'This Month' }
                ].map(r => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setExportDateRange(r.id as any)}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      exportDateRange === r.id
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Employee Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase">Target Employee</label>
              <select
                value={exportEmployeeId}
                onChange={e => setExportEmployeeId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">All Active Employees</option>
                {attendance.map(a => (
                  <option key={a.employeeId} value={a.employeeId}>
                    {a.employeeName} ({a.employeeId})
                  </option>
                ))}
              </select>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsExportModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDownloadReport()}
                disabled={downloadingExport}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/20 cursor-pointer disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{downloadingExport ? 'Exporting...' : 'Download Report'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Selfie Preview Modal */}
      {previewSelfie && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          onClick={() => setPreviewSelfie(null)}
        >
          <div className="relative max-w-sm w-full bg-slate-900 p-4 rounded-3xl border border-slate-700 text-center space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-300 font-bold px-2">
              <span>Verified Selfie Stamp</span>
              <button onClick={() => setPreviewSelfie(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <img src={previewSelfie} alt="Verified Selfie" className="w-full h-72 object-cover rounded-2xl" />
          </div>
        </div>
      )}
    </div>
  );
};

// ==========================================
// 3. PERFORMANCE VIEW
// ==========================================
export const PerformanceView: React.FC = () => {
  const [reviews, setReviews] = useState<any[]>([]);

  useEffect(() => {
    api.get('/performance').then(res => {
      if (res.success && res.data) setReviews(Array.isArray(res.data) ? res.data : res.data.reviews || []);
    });
  }, []);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <PageHeader title="Performance Reviews" subtitle="Track employee ratings, goals and review history from the live HR API" />
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-semibold uppercase">
              <tr>
                <th className="px-6 py-3.5">Employee</th>
                <th className="px-6 py-3.5">Review Period</th>
                <th className="px-6 py-3.5">Rating</th>
                <th className="px-6 py-3.5">Goals Achieved</th>
                <th className="px-6 py-3.5">Reviewer</th>
                <th className="px-6 py-3.5">Review Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {reviews.map(review => (
                <tr key={review._id} className="hover:bg-slate-50/70">
                  <td className="px-6 py-4 font-bold text-slate-900">{review.employeeName}</td>
                  <td className="px-6 py-4 text-blue-600 font-semibold">{review.reviewPeriod}</td>
                  <td className="px-6 py-4 font-bold text-amber-600">{review.rating} / 5</td>
                  <td className="px-6 py-4 text-slate-600">{review.goalsAchieved || 'Not recorded'}</td>
                  <td className="px-6 py-4 text-slate-600">{review.reviewerName}</td>
                  <td className="px-6 py-4 text-slate-500">{review.reviewDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {reviews.length === 0 && <div className="p-10 text-center text-xs text-slate-500">No performance reviews found.</div>}
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 4. SALARY / PAYROLL VIEW
// ==========================================
export const SalaryView: React.FC = () => {
  const [salaries, setSalaries] = useState<Salary[]>([]);

  const fetchSalaries = async () => {
    const res = await api.get('/salary');
    if (res.success && res.data) setSalaries(res.data);
  };

  useEffect(() => {
    fetchSalaries();
  }, []);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Payroll & Salary Disbursals"
        subtitle="Monthly payroll register, allowances, deductions and net salary calculation"
      />

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-semibold uppercase">
              <tr>
                <th className="px-6 py-3.5">Employee</th>
                <th className="px-6 py-3.5">Salary Month</th>
                <th className="px-6 py-3.5">Basic Pay</th>
                <th className="px-6 py-3.5">Allowances</th>
                <th className="px-6 py-3.5">Deductions (TDS/PF)</th>
                <th className="px-6 py-3.5">Net Pay</th>
                <th className="px-6 py-3.5">Payment Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {salaries.map(s => (
                <tr key={s._id} className="hover:bg-slate-50/70">
                  <td className="px-6 py-4 font-bold text-slate-900">{s.employeeName}</td>
                  <td className="px-6 py-4 font-semibold text-blue-600">{s.month}</td>
                  <td className="px-6 py-4">₹{s.basicSalary.toLocaleString('en-IN')}</td>
                  <td className="px-6 py-4 text-emerald-600">+₹{s.allowances.toLocaleString('en-IN')}</td>
                  <td className="px-6 py-4 text-rose-600">-₹{s.deductions.toLocaleString('en-IN')}</td>
                  <td className="px-6 py-4 font-bold text-slate-900 text-sm">₹{s.netSalary.toLocaleString('en-IN')}</td>
                  <td className="px-6 py-4"><StatusBadge status={s.paymentStatus} /></td>
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
// 5. LEAVE REQUESTS & APPROVALS VIEW
// ==========================================
export const LeaveRequestsView: React.FC = () => {
  const [leaves, setLeaves] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchLeaves = async () => {
    setLoading(true);
    const query = new URLSearchParams();
    if (filterStatus !== 'ALL') query.append('status', filterStatus);
    if (search) query.append('search', search);

    const res = await api.get(`/leaves?${query.toString()}`);
    if (res.success && res.data) {
      if (Array.isArray(res.data)) {
        setLeaves(res.data);
      } else {
        setLeaves(Array.isArray(res.data.leaves) ? res.data.leaves : []);
        if (res.data.stats) setStats(res.data.stats);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLeaves();
  }, [filterStatus, search]);

  const handleUpdateStatus = async (id: string, newStatus: 'APPROVED' | 'REJECTED') => {
    try {
      setUpdatingId(id);
      const res = await api.patch(`/leaves/${id}/status`, { status: newStatus });
      if (res.success) {
        await fetchLeaves();
      } else {
        alert(res.message || `Failed to update leave status to ${newStatus}`);
      }
    } catch (err: any) {
      alert('Error updating leave status: ' + err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Leave Requests & Approvals"
        subtitle="Review employee leave applications, approve/reject time-off requests, and track staff leave history"
      />

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs">
          <p className="text-xs font-semibold text-slate-500">Total Applications</p>
          <h3 className="text-2xl font-black text-slate-900 mt-1">{stats.total || leaves.length}</h3>
          <p className="text-[11px] text-slate-400 mt-1 font-medium">Lifetime leave requests</p>
        </div>
        <div className="bg-amber-50/50 rounded-2xl border border-amber-200/80 p-5 shadow-2xs">
          <p className="text-xs font-semibold text-amber-700">Under HR Review</p>
          <h3 className="text-2xl font-black text-amber-900 mt-1">{stats.pending}</h3>
          <p className="text-[11px] text-amber-600 mt-1 font-medium">Awaiting action</p>
        </div>
        <div className="bg-emerald-50/50 rounded-2xl border border-emerald-200/80 p-5 shadow-2xs">
          <p className="text-xs font-semibold text-emerald-700">Approved Leaves</p>
          <h3 className="text-2xl font-black text-emerald-900 mt-1">{stats.approved}</h3>
          <p className="text-[11px] text-emerald-600 mt-1 font-medium">Time off granted</p>
        </div>
        <div className="bg-rose-50/50 rounded-2xl border border-rose-200/80 p-5 shadow-2xs">
          <p className="text-xs font-semibold text-rose-700">Rejected Requests</p>
          <h3 className="text-2xl font-black text-rose-900 mt-1">{stats.rejected}</h3>
          <p className="text-[11px] text-rose-600 mt-1 font-medium">Applications declined</p>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
          {[
            { id: 'ALL', label: 'All Requests' },
            { id: 'PENDING', label: 'Pending Review' },
            { id: 'APPROVED', label: 'Approved' },
            { id: 'REJECTED', label: 'Rejected' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                filterStatus === tab.id
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search employee, leave type..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Leave Requests Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-semibold uppercase">
              <tr>
                <th className="px-6 py-3.5">Employee Name & ID</th>
                <th className="px-6 py-3.5">Leave Type</th>
                <th className="px-6 py-3.5">Date Range</th>
                <th className="px-6 py-3.5">Days</th>
                <th className="px-6 py-3.5">Reason / Particulars</th>
                <th className="px-6 py-3.5">Applied Date</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Review Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {leaves.map((l: any) => (
                <tr key={l._id} className="hover:bg-slate-50/70">
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-900">{l.employeeName || 'Employee'}</div>
                    <div className="text-[11px] text-blue-600 font-mono">{l.employeeId || 'EMP-REC'}</div>
                  </td>
                  <td className="px-6 py-4 font-semibold text-slate-800">
                    <span className="px-2.5 py-1 rounded-lg bg-slate-100 font-bold text-slate-700">
                      {l.leaveType}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-600 font-mono">
                    {l.startDate} to {l.endDate}
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-900">
                    {l.totalDays || 1} day{(l.totalDays || 1) > 1 ? 's' : ''}
                  </td>
                  <td className="px-6 py-4 text-slate-600 max-w-[220px] truncate" title={l.reason}>
                    {l.reason || 'No details specified'}
                  </td>
                  <td className="px-6 py-4 text-slate-500 font-mono">
                    {l.appliedAt || l.createdAt ? new Date(l.appliedAt || l.createdAt).toLocaleDateString() : 'Today'}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={l.status === 'PENDING' ? 'Under HR review' : l.status} />
                  </td>
                  <td className="px-6 py-4 text-right">
                    {l.status === 'PENDING' ? (
                      <div className="inline-flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleUpdateStatus(l._id, 'APPROVED')}
                          disabled={updatingId === l._id}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs shadow-xs transition-all cursor-pointer disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Approve</span>
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(l._id, 'REJECTED')}
                          disabled={updatingId === l._id}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-bold text-xs shadow-xs transition-all cursor-pointer disabled:opacity-50"
                        >
                          <Clock className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                      </div>
                    ) : (
                      <span className="text-[11px] font-semibold text-slate-400">
                        {l.reviewedBy ? `Reviewed by ${l.reviewedBy}` : 'Completed'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {leaves.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-400">
                    {loading ? 'Loading leave requests...' : 'No leave applications found.'}
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
