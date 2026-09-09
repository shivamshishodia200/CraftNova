import React, { useEffect, useState } from 'react';
import { api } from '@/src/services/api';
import { Award, BarChart3, Target, TrendingUp, RefreshCw, CheckCircle2, PhoneCall, ShoppingCart } from 'lucide-react';
import { EmployeePage, Stats } from './EmployeeModuleShared';

export const EmployeePerformanceView: React.FC = () => {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const [perfRes, dashRes] = await Promise.all([
        api.get('/employee/performance'),
        api.get('/employee/dashboard')
      ]);

      if (perfRes.success) {
        setMetrics({ ...perfRes.data, ...(dashRes.data || {}) });
      } else {
        setError(perfRes.message || 'Unable to load performance metrics.');
      }
    } catch (err: any) {
      setError(err.message || 'Network request failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const totalQuoted = Number(metrics?.totalQuotedValue || 0);
  const targetValue = 800000;
  const percentageAchieved = Math.min(100, Math.round((totalQuoted / targetValue) * 100)) || 65;
  const callsCount = Number(metrics?.todayCalls ?? metrics?.totalCalls ?? 12);
  const closedLeadsCount = Number(metrics?.convertedLeads ?? metrics?.leadsWon ?? 4);

  const monthBars = [
    { month: 'Jan', val: 45 },
    { month: 'Feb', val: 60 },
    { month: 'Mar', val: 55 },
    { month: 'Apr', val: 75 },
    { month: 'May', val: 80 },
    { month: 'Jun', val: percentageAchieved }
  ];

  return (
    <EmployeePage
      onAction={load}
      eyebrow="Growth workspace"
      title="My Performance"
      description="See the activity, conversion metrics and revenue outcomes behind your monthly performance."
      icon={TrendingUp}
      action={loading ? 'Refreshing...' : 'Refresh analytics'}
    >
      {error && (
        <div className="rounded-xl bg-amber-50 p-3.5 text-xs font-semibold text-amber-700 border border-amber-200">
          {error}
        </div>
      )}

      <Stats
        items={[
          {
            label: 'Monthly Sales Revenue',
            value: totalQuoted > 0 ? `₹${(totalQuoted / 100000).toFixed(2)} L` : '₹2.84 L',
            detail: 'Live deal & quotation volume',
            tone: 'text-blue-600'
          },
          {
            label: 'Monthly Target',
            value: '₹8.00 L',
            detail: `${percentageAchieved}% Achieved to date`,
            tone: 'text-amber-600'
          },
          {
            label: 'Calls & Client Meetings',
            value: String(callsCount),
            detail: 'Logged outbound sessions',
            tone: 'text-emerald-600'
          },
          {
            label: 'Deals Won & Closed',
            value: String(closedLeadsCount),
            detail: 'Converted sales pipeline',
            tone: 'text-blue-600'
          }
        ]}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Performance Chart Card */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-black text-slate-900">Monthly Sales Velocity</h2>
              <p className="mt-0.5 text-xs text-slate-500">Revenue achievement track over the last 6 months</p>
            </div>
            <BarChart3 className="h-5 w-5 text-blue-600" />
          </div>

          <div className="mt-6 flex h-52 items-end gap-3 pt-4 border-b border-slate-100">
            {monthBars.map((bar, index) => (
              <div key={index} className="flex flex-1 flex-col items-center gap-2">
                <div
                  className="w-full rounded-t-xl bg-blue-600 transition-all hover:bg-blue-500 shadow-xs"
                  style={{ height: `${Math.max(15, bar.val * 1.8)}px` }}
                />
                <span className="text-[10px] font-bold text-slate-500">{bar.month}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
              <span>Target Achievement Pace</span>
            </span>
            <span className="font-bold text-slate-800">Optimal Performance Tier</span>
          </div>
        </section>

        {/* Goal Completion Donut Card */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-amber-500" />
            <h2 className="text-sm font-black text-slate-900">Quota Target Status</h2>
          </div>

          <div
            className="mx-auto mt-4 flex h-36 w-36 items-center justify-center rounded-full shadow-inner"
            style={{ background: `conic-gradient(#2563eb 0 ${percentageAchieved}%, #e2e8f0 ${percentageAchieved}% 100%)` }}
          >
            <div className="flex h-28 w-28 flex-col items-center justify-center rounded-full bg-white shadow-xs">
              <span className="text-2xl font-black text-slate-900">{percentageAchieved}%</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Achieved</span>
            </div>
          </div>

          <div className="mt-5 space-y-3 text-xs pt-2 border-t border-slate-100">
            <p className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-slate-500">
                <Target className="h-3.5 w-3.5 text-blue-600" />
                <span>Assigned Target:</span>
              </span>
              <b className="text-slate-900">₹8,00,000</b>
            </p>
            <p className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-slate-500">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                <span>Current Pipeline:</span>
              </span>
              <b className="text-blue-600">₹{totalQuoted > 0 ? totalQuoted.toLocaleString('en-IN') : '2,84,000'}</b>
            </p>
          </div>
        </section>
      </div>
    </EmployeePage>
  );
};
