import React, { useState } from 'react';
import { Download, FileText, Printer, Wallet } from 'lucide-react';
import { DetailDrawer, EmployeePage, EmployeeRecord, RecordTable, Stats, useEmployeeRecords } from './EmployeeModuleShared';
const slips: EmployeeRecord[] = [{ id: '1', name: 'August 2026', detail: 'Payroll processed • Bank transfer', status: 'PAID', value: '₹74,800', date: '31 Aug 2026' }, { id: '2', name: 'July 2026', detail: 'Payroll processed • Bank transfer', status: 'PAID', value: '₹72,400', date: '31 Jul 2026' }, { id: '3', name: 'June 2026', detail: 'Payroll processed • Bank transfer', status: 'PAID', value: '₹72,400', date: '30 Jun 2026' }];
export const EmployeeSalaryView: React.FC = () => { 
  const [selected, setSelected] = useState<EmployeeRecord | null>(null); 
  const data = useEmployeeRecords('/employee/salary', slips, value => value?.salaryHistory || []); 
  const latest = data.records[0]; 
  const handleDownload = () => alert('Downloading latest salary slip PDF...');
  
  return <EmployeePage eyebrow="Payroll workspace" title="My Salary Slips" description="Access your salary history and download payroll documents securely." icon={Wallet} action="Download latest" onAction={handleDownload}>
    <Stats items={[{ label: 'Net salary', value: latest?.value || '₹0', detail: latest?.name || 'Latest month', tone: 'text-emerald-600' }, { label: 'Basic salary', value: '₹48,000', detail: 'From payroll record', tone: 'text-blue-600' }, { label: 'Allowances', value: '₹32,500', detail: 'Included benefits', tone: 'text-blue-600' }, { label: 'Deductions', value: '₹5,700', detail: 'Tax + PF', tone: 'text-rose-600' }]} />
    <div className="flex flex-wrap gap-2">
      <button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600"><FileText className="h-4 w-4 text-blue-600" />Filter by year</button>
      <button onClick={handleDownload} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600"><Download className="h-4 w-4" />Download PDF</button>
      <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600"><Printer className="h-4 w-4" />Print</button>
    </div>
    <RecordTable records={data.records} searchPlaceholder="Search salary slip..." onOpen={setSelected} loading={data.loading} error={data.error} />
    <DetailDrawer record={selected} onClose={() => setSelected(null)} />
  </EmployeePage>; 
};
