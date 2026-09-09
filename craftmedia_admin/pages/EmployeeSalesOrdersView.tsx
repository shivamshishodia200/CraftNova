import React, { useState } from 'react';
import { CheckCircle2, PackageCheck, ShoppingBag, Plus, X, RefreshCw } from 'lucide-react';
import { DetailDrawer, EmployeePage, EmployeeRecord, RecordTable, Stats, useEmployeeRecords } from './EmployeeModuleShared';
import { api } from '@/src/services/api';

export const EmployeeSalesOrdersView: React.FC = () => {
  const [selected, setSelected] = useState<EmployeeRecord | null>(null);
  const data = useEmployeeRecords('/employee/sales-orders', []);

  return (
    <EmployeePage
      eyebrow="Fulfilment workspace"
      title="Sales Orders"
      description="Track order progress from confirmation through delivery."
      icon={ShoppingBag}
      action="Refresh orders"
      onAction={() => data.reload()}
    >
      <Stats
        items={[
          { label: "Total Orders", value: String(data.records.length), detail: data.loading ? 'Loading...' : 'Live order database', tone: 'text-blue-600' },
          { label: 'In Fulfilment', value: String(data.records.filter(row => row.status === 'PROCESSING' || row.status === 'IN_PROCESS').length), detail: 'Warehouse processing', tone: 'text-amber-600' },
          { label: 'Delivered', value: String(data.records.filter(row => row.status === 'DELIVERED' || row.status === 'COMPLETED').length), detail: 'Dispatched & delivered', tone: 'text-emerald-600' },
          { label: 'Revenue Booked', value: `₹${(data.records.reduce((sum, row) => sum + Number((row.value || '').replace(/[^0-9.]/g, '')), 0) / 100000).toFixed(2)} L`, detail: 'Current total value', tone: 'text-blue-600' }
        ]}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {['Packing & Warehouse Allocation', 'Logistics Dispatch', 'Delivered & Billed'].map((step, index) => (
          <div key={step} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${
              index === 2 ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'
            }`}>
              {index === 2 ? <CheckCircle2 className="h-4 w-4" /> : <PackageCheck className="h-4 w-4" />}
            </span>
            <div>
              <p className="text-xs font-bold text-slate-800">{step}</p>
              <p className="mt-0.5 text-[10px] text-slate-500">Live fulfilment stage {index + 1}/3</p>
            </div>
          </div>
        ))}
      </div>

      <RecordTable
        records={data.records}
        searchPlaceholder="Search order number or client..."
        onOpen={setSelected}
        loading={data.loading}
        error={data.error}
      />

      <DetailDrawer record={selected} onClose={() => setSelected(null)} />
    </EmployeePage>
  );
};
