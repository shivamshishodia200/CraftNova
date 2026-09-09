import React, { useEffect, useState } from 'react';
import { api } from '@/src/services/api';
import { CalendarCheck, Download, RefreshCw, ShieldCheck, Star, UserPlus, Users, Wallet } from 'lucide-react';
import { exportToCSV } from '@/src/components/common/UIComponents';

interface HrDashboardViewProps { onNavigate: (viewId: string) => void; }

export const HrDashboardView: React.FC<HrDashboardViewProps> = ({ onNavigate }) => {
  const [employees, setEmployees] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [salaries, setSalaries] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadHrData = async () => {
    setLoading(true);
    const [employeeRes, attendanceRes, salaryRes, performanceRes] = await Promise.all([
      api.get('/employees'),
      api.get('/attendance'),
      api.get('/salary'),
      api.get('/performance'),
    ]);
    if (employeeRes.success) setEmployees(employeeRes.data || []);
    if (attendanceRes.success) setAttendance(attendanceRes.data || []);
    if (salaryRes.success) setSalaries(salaryRes.data || []);
    if (performanceRes.success) {
      const data = performanceRes.data;
      setReviews(Array.isArray(data) ? data : data?.reviews || []);
    }
    setLoading(false);
  };

  useEffect(() => { loadHrData(); }, []);

  const activeEmployees = employees.filter(employee => employee.status === 'ACTIVE').length;
  const presentToday = attendance.filter(record => record.date === new Date().toISOString().slice(0, 10) && record.status === 'PRESENT').length;
  const pendingSalaries = salaries.filter(salary => salary.paymentStatus === 'PENDING').length;
  const averageRating = reviews.length ? (reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviews.length).toFixed(1) : '0.0';

  const cards = [
    { label: 'Total employees', value: employees.length, detail: `${activeEmployees} active employees`, icon: Users, color: 'blue', view: 'employees' },
    { label: 'Present today', value: presentToday, detail: 'Live attendance records', icon: CalendarCheck, color: 'emerald', view: 'attendance' },
    { label: 'Pending payroll', value: pendingSalaries, detail: 'Salary records to review', icon: Wallet, color: 'amber', view: 'salary' },
    { label: 'Average rating', value: averageRating, detail: `${reviews.length} performance reviews`, icon: Star, color: 'purple', view: 'performance' },
  ];

  const exportHrSummary = () => exportToCSV('360CRM_HR_Dashboard', cards.map(card => ({ Metric: card.label, Value: card.value, Detail: card.detail })));

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-400">HR Management <span>/</span><span className="text-blue-600">Dashboard</span></div>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">People Operations Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">A live view of workforce, attendance, payroll and performance health.</p>
        </div>
        <div className="flex items-center gap-2"><button onClick={loadHrData} className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-500 hover:text-blue-600" title="Refresh HR data"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></button><button onClick={exportHrSummary} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-600/20"><Download className="h-4 w-4" /> Export HR summary</button></div>
      </div>

      <div className="relative overflow-hidden rounded-3xl bg-slate-950 p-6 text-white shadow-xl lg:p-8"><div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-blue-600/20 blur-3xl" /><div className="relative flex items-center gap-4"><div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 shadow-lg shadow-blue-600/30"><ShieldCheck className="h-7 w-7" /></div><div><p className="text-xs font-bold uppercase tracking-wider text-blue-300">HR control center</p><h2 className="mt-1 text-xl font-black">Keep your people data accurate and ready.</h2><p className="mt-1 text-xs text-slate-400">All figures below are loaded from the HR API.</p></div></div></div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{cards.map(card => { const Icon = card.icon; return <button key={card.label} onClick={() => onNavigate(card.view)} className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"><div className="flex items-start justify-between"><div><p className="text-[11px] font-semibold text-slate-500">{card.label}</p><p className="mt-2 text-2xl font-black text-slate-900">{loading ? '...' : card.value}</p></div><span className={`flex h-10 w-10 items-center justify-center rounded-xl bg-${card.color}-50 text-${card.color}-600`}><Icon className="h-5 w-5" /></span></div><p className="mt-4 text-[10px] font-semibold text-slate-400">{card.detail}</p></button>; })}</div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]"><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="text-sm font-black text-slate-900">HR action center</h2><p className="mt-1 text-xs text-slate-500">Jump directly into the workforce workflows.</p></div><UserPlus className="h-5 w-5 text-blue-600" /></div><div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">{[{ title: 'Employee directory', detail: 'Onboard and update employee records.', view: 'employees' }, { title: 'Attendance tracker', detail: 'Review selfie, GPS and shift hours.', view: 'attendance' }, { title: 'Payroll register', detail: 'Review salary and payment status.', view: 'salary' }, { title: 'Performance reviews', detail: 'Track ratings and goals achieved.', view: 'performance' }].map(action => <button key={action.view} onClick={() => onNavigate(action.view)} className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-left hover:border-blue-300 hover:bg-blue-50"><p className="text-xs font-bold text-slate-800">{action.title}</p><p className="mt-1 text-[11px] text-slate-500">{action.detail}</p></button>)}</div></section><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-sm font-black text-slate-900">Workforce snapshot</h2><div className="mt-5 space-y-4"><div><div className="flex justify-between text-xs"><span className="text-slate-500">Active workforce</span><b>{employees.length ? Math.round((activeEmployees / employees.length) * 100) : 0}%</b></div><div className="mt-2 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-blue-600" style={{ width: `${employees.length ? (activeEmployees / employees.length) * 100 : 0}%` }} /></div></div><div><div className="flex justify-between text-xs"><span className="text-slate-500">Attendance today</span><b>{employees.length ? Math.round((presentToday / employees.length) * 100) : 0}%</b></div><div className="mt-2 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-emerald-500" style={{ width: `${employees.length ? (presentToday / employees.length) * 100 : 0}%` }} /></div></div><div className="border-t border-slate-100 pt-4 text-xs text-slate-500">Last refreshed: <span className="font-semibold text-slate-800">{new Date().toLocaleTimeString()}</span></div></div></section></div>
    </div>
  );
};
