import React, { useEffect, useState } from 'react';
import { ArrowUpRight, Download, Filter, Plus, Search, X } from 'lucide-react';
import { api } from '@/src/services/api';

export type EmployeeRecord = { id: string; name: string; detail: string; status: string; value?: string; date?: string; source?: any };

export const toEmployeeRecord = (item: any, index: number): EmployeeRecord => ({
  id: item?._id || item?.id || `record-${index}`,
  name: item?.name || item?.title || item?.quotationNumber || item?.salesOrderNumber || item?.month || 'Workspace record',
  detail: item?.companyName || item?.customerName || item?.description || item?.message || item?.reason || item?.email || 'Employee workspace record',
  status: item?.status || item?.paymentStatus || (item?.isRead === false ? 'UNREAD' : 'READ'),
  value: item?.totalSpent ? `₹${Number(item.totalSpent).toLocaleString('en-IN')}` : item?.grandTotal ? `₹${Number(item.grandTotal).toLocaleString('en-IN')}` : item?.netSalary ? `₹${Number(item.netSalary).toLocaleString('en-IN')}` : undefined,
  date: item?.createdAt || item?.appliedAt || item?.dueDate || item?.orderDate || item?.month,
  source: item,
});

export const useEmployeeRecords = (endpoint: string, fallback: EmployeeRecord[], unwrap?: (data: any) => any[]) => {
  const [records, setRecords] = useState<EmployeeRecord[]>(fallback);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = async () => {
    setLoading(true);
    setError('');
    const response = await api.get(endpoint);
    if (response.success && response.data) {
      const list = unwrap ? unwrap(response.data) : response.data;
      setRecords(Array.isArray(list) ? list.map(toEmployeeRecord) : []);
    } else {
      setError(response.message || 'Unable to load live data.');
      setRecords(fallback);
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, [endpoint]);
  return { records, loading, error, reload: load };
};

export const EmployeePage: React.FC<{ eyebrow: string; title: string; description: string; icon: React.ElementType; action: string; onAction?: () => void; children: React.ReactNode }> = ({ eyebrow, title, description, icon: Icon, action, onAction, children }) => {
  return <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
    <div className="flex items-center justify-between border-b border-slate-200 pb-4"><div className="text-[11px] font-semibold text-slate-400">My Workspace <span className="mx-2">/</span><span className="text-blue-600">{title}</span></div><div className="hidden gap-2 sm:flex"><button className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500" title="Export"><Download className="h-4 w-4" /></button><button onClick={onAction} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white shadow-lg shadow-blue-600/20"><Plus className="h-4 w-4" />{action}</button></div></div>
    <div className="relative overflow-hidden rounded-3xl bg-slate-950 p-6 text-white shadow-xl lg:p-8"><div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-blue-600/20 blur-3xl" /><div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><div className="mb-4 flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600"><Icon className="h-5 w-5" /></span><span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300">{eyebrow}</span></div><h1 className="text-2xl font-black tracking-tight sm:text-3xl">{title}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">{description}</p></div><button onClick={onAction} className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-xs font-bold text-slate-900 hover:bg-blue-50 sm:hidden"><Plus className="h-4 w-4 text-blue-600" />{action}</button></div></div>
    {children}
  </div>;
};

export const Stats: React.FC<{ items: Array<{ label: string; value: string; detail: string; tone?: string }> }> = ({ items }) => <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{items.map(item => <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-[11px] font-semibold text-slate-500">{item.label}</p><p className="mt-2 text-xl font-black text-slate-900">{item.value}</p><p className={`mt-2 text-[10px] font-bold ${item.tone || 'text-slate-400'}`}>{item.detail}</p></div>)}</div>;

export const RecordTable: React.FC<{ records: EmployeeRecord[]; columns?: string[]; searchPlaceholder?: string; onOpen?: (record: EmployeeRecord) => void; loading?: boolean; error?: string }> = ({ records, columns = ['Record', 'Details', 'Status', 'Value', 'Date', 'Actions'], searchPlaceholder = 'Search records...', onOpen, loading, error }) => { const [query, setQuery] = useState(''); const filtered = records.filter(record => `${record.name} ${record.detail} ${record.status}`.toLowerCase().includes(query.toLowerCase())); return <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-sm font-black text-slate-900">Workspace records</h2><p className="mt-1 text-xs text-slate-500">{filtered.length} records available</p></div><div className="flex gap-2"><div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"><Search className="h-4 w-4 text-slate-400" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder={searchPlaceholder} className="w-36 bg-transparent text-xs outline-none sm:w-52" /></div><button className="rounded-xl border border-slate-200 p-2 text-slate-500" title="Filters"><Filter className="h-4 w-4" /></button></div></div>{loading && <div className="border-b border-blue-100 bg-blue-50 px-5 py-3 text-xs font-semibold text-blue-700">Loading live data...</div>}{error && <div className="border-b border-amber-100 bg-amber-50 px-5 py-3 text-xs font-semibold text-amber-700">{error} Showing available workspace data.</div>}<div className="overflow-x-auto"><table className="w-full text-left"><thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-400"><tr>{columns.map(column => <th key={column} className="px-5 py-3">{column}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{filtered.map(record => <tr key={record.id} className="group hover:bg-slate-50"><td className="px-5 py-4"><button onClick={() => onOpen?.(record)} className="flex items-center gap-3 text-left"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-[10px] font-black text-blue-700">{record.name.slice(0, 2).toUpperCase()}</span><span className="text-xs font-bold text-slate-800 group-hover:text-blue-600">{record.name}</span></button></td><td className="max-w-[240px] truncate px-5 py-4 text-xs text-slate-500">{record.detail}</td><td className="px-5 py-4"><span className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-700">{record.status}</span></td><td className="px-5 py-4 text-xs font-bold text-slate-800">{record.value || '—'}</td><td className="px-5 py-4 text-xs text-slate-500">{record.date || '—'}</td><td className="px-5 py-4 text-right"><button onClick={() => onOpen?.(record)} className="rounded-lg p-2 text-slate-400 hover:bg-blue-50 hover:text-blue-600" title="View"><ArrowUpRight className="h-4 w-4" /></button></td></tr>)}</tbody></table></div>{filtered.length === 0 && <div className="p-10 text-center text-xs text-slate-500">No records found.</div>}</section>; };

export const DetailDrawer: React.FC<{ record: EmployeeRecord | null; onClose: () => void }> = ({ record, onClose }) => record ? <><div onClick={onClose} className="fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-sm" /><aside className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-white shadow-2xl"><div className="flex items-center justify-between border-b border-slate-200 p-5"><div><p className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Record details</p><h2 className="mt-1 text-lg font-black text-slate-900">{record.name}</h2></div><button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button></div><div className="space-y-6 p-5"><div className="rounded-2xl bg-slate-50 p-4"><p className="text-sm font-bold text-slate-800">{record.detail}</p><p className="mt-3 text-xs text-slate-500">Status: <b className="text-blue-600">{record.status}</b></p></div><div><h3 className="text-sm font-black text-slate-900">Activity timeline</h3><div className="mt-4 space-y-4 border-l border-slate-200 pl-5 text-xs text-slate-600"><p>Record updated today at 10:24 AM</p><p>Record created in your workspace</p></div></div><textarea placeholder="Add notes..." className="h-24 w-full rounded-xl border border-slate-200 p-3 text-xs outline-none focus:border-blue-400" /></div><div className="mt-auto border-t border-slate-200 p-5"><button className="w-full rounded-xl bg-blue-600 py-3 text-xs font-bold text-white">Save activity</button></div></aside></> : null;