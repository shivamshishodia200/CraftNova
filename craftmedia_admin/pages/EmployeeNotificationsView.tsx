import React, { useState, useEffect } from 'react';
import { api } from '@/src/services/api';
import { Archive, Bell, Check, CheckCheck } from 'lucide-react';
import { EmployeePage, Stats, useEmployeeRecords } from './EmployeeModuleShared';

const initialNotifications = [
  { title: 'New task assigned', detail: 'Rohan Sharma assigned “Confirm delivery schedule”.', time: '12 min ago', type: 'Tasks' },
  { title: 'Quotation approved', detail: 'QT-1042 was approved by the customer.', time: '2 hours ago', type: 'Sales' },
  { title: 'Leave request updated', detail: 'Your sick leave request was approved.', time: 'Yesterday', type: 'HR' }
];

export const EmployeeNotificationsView: React.FC = () => {
  const data = useEmployeeRecords(
    '/employee/notifications',
    initialNotifications.map((note, index) => ({
      id: String(index + 1),
      name: note.title,
      detail: note.detail,
      status: 'UNREAD',
      date: note.time
    }))
  );

  const [items, setItems] = useState(data.records);

  useEffect(() => {
    setItems(data.records);
  }, [data.records]);

  const markAllRead = async () => {
    setItems(prev => prev.map(item => ({ ...item, status: 'READ' })));
    try {
      await api.patch('/employee/notifications/all/read');
      await data.reload();
    } catch (e) {
      console.error(e);
    }
  };

  const markRead = async (id: string) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, status: 'READ' } : item));
    try {
      await api.patch(`/employee/notifications/${id}/read`);
      await data.reload();
    } catch (e) {
      console.error(e);
    }
  };

  const archiveNotif = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const unreadCount = items.filter(row => row.status === 'UNREAD').length;

  return (
    <EmployeePage
      onAction={markAllRead}
      eyebrow="Inbox workspace"
      title="Notifications"
      description="Stay on top of assignments, sales activity and important HR updates."
      icon={Bell}
      action="Mark all read"
    >
      <Stats
        items={[
          { label: 'Unread', value: String(unreadCount), detail: 'Needs attention', tone: 'text-blue-600' },
          { label: 'Tasks', value: String(items.filter(row => row.detail.toLowerCase().includes('task')).length), detail: 'Assigned today', tone: 'text-amber-600' },
          { label: 'Sales', value: String(items.filter(row => row.detail.toLowerCase().includes('quotation')).length), detail: 'Customer activity', tone: 'text-emerald-600' },
          { label: 'Total Notifications', value: String(items.length), detail: data.loading ? 'Loading...' : 'Latest updates', tone: 'text-slate-600' }
        ]}
      />

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 p-4">
          <div className="flex items-center gap-2">
            <button className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">All Notifications</button>
            <button
              onClick={markAllRead}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 cursor-pointer ml-2"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark all read</span>
            </button>
          </div>
          <span className="text-xs font-medium text-slate-500">{unreadCount} unread messages</span>
        </div>

        <div className="divide-y divide-slate-100">
          {items.map(note => (
            <div key={note.id} className={`flex items-start gap-4 p-5 transition-colors ${note.status === 'UNREAD' ? 'bg-blue-50/30' : 'hover:bg-slate-50'}`}>
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${note.status === 'UNREAD' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                <Bell className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-slate-800">{note.name}</h3>
                  {note.status === 'UNREAD' && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-800">New</span>
                  )}
                </div>
                <p className="mt-1 text-xs text-slate-600">{note.detail}</p>
                <p className="mt-2 text-[10px] font-semibold text-slate-400">{note.date}</p>
              </div>
              <div className="flex gap-1">
                {note.status === 'UNREAD' && (
                  <button
                    onClick={() => markRead(note.id)}
                    className="rounded-lg p-2 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 cursor-pointer"
                    title="Mark read"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={() => archiveNotif(note.id)}
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
                  title="Archive"
                >
                  <Archive className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}

          {items.length === 0 && (
            <div className="p-8 text-center text-xs text-slate-500">
              No notifications found. All clear!
            </div>
          )}
        </div>
      </section>
    </EmployeePage>
  );
};
