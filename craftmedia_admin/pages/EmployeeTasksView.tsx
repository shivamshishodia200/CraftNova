import React, { useState } from 'react';
import { api } from '@/src/services/api';
import { CheckSquare, Clock3, Paperclip, Plus, X, CheckCircle2, AlertCircle, Calendar } from 'lucide-react';
import { EmployeePage, Stats, useEmployeeRecords } from './EmployeeModuleShared';

export const EmployeeTasksView: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
  const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 10));

  const data = useEmployeeRecords('/employee/tasks', []);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) {
      alert('Task title is required.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.post('/employee/tasks', {
        title,
        description,
        priority,
        dueDate
      });

      if (res.success) {
        setIsModalOpen(false);
        setTitle('');
        setDescription('');
        setPriority('MEDIUM');
        await data.reload();
      } else {
        alert(res.message || 'Failed to create task');
      }
    } catch (err: any) {
      alert('Error creating task: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const updateTask = async (id: string, nextStatus: string) => {
    try {
      await api.patch(`/employee/tasks/${id}`, { status: nextStatus });
      await data.reload();
    } catch (err: any) {
      console.error('Error updating task status:', err);
    }
  };

  const columns = [
    { id: 'PENDING', label: 'TO DO', color: 'bg-slate-100 text-slate-700' },
    { id: 'IN_PROGRESS', label: 'IN PROGRESS', color: 'bg-blue-50 text-blue-700' },
    { id: 'REVIEW', label: 'REVIEW', color: 'bg-amber-50 text-amber-700' },
    { id: 'COMPLETED', label: 'COMPLETED', color: 'bg-emerald-50 text-emerald-700' }
  ];

  return (
    <EmployeePage
      eyebrow="Execution workspace"
      title="My Tasks"
      description="Plan today's priorities and move work forward without losing context."
      icon={CheckSquare}
      action="Create task"
      onAction={() => setIsModalOpen(true)}
    >
      <Stats
        items={[
          { label: "Today's tasks", value: String(data.records.length), detail: data.loading ? 'Loading...' : 'Live task queue', tone: 'text-blue-600' },
          { label: 'Pending / To Do', value: String(data.records.filter(t => t.status === 'PENDING' || t.status === 'TO DO').length), detail: 'Needs action', tone: 'text-amber-600' },
          { label: 'In Progress', value: String(data.records.filter(t => t.status === 'IN_PROGRESS' || t.status === 'IN PROGRESS').length), detail: 'Ongoing work', tone: 'text-blue-600' },
          { label: 'Completed', value: String(data.records.filter(t => t.status === 'COMPLETED').length), detail: 'Finished tasks', tone: 'text-emerald-600' }
        ]}
      />

      {data.error && (
        <div className="rounded-xl bg-amber-50 p-3 text-xs font-semibold text-amber-700 border border-amber-200">
          {data.error}
        </div>
      )}

      {/* Task Kanban Columns */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {columns.map(col => {
          const colTasks = data.records.filter(t => t.status === col.id || (col.id === 'PENDING' && t.status === 'TO DO'));
          return (
            <div key={col.id} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5 flex flex-col min-h-[360px]">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${col.color}`}>
                    {col.label}
                  </span>
                </div>
                <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-slate-500 shadow-2xs border border-slate-200">
                  {colTasks.length}
                </span>
              </div>

              <div className="space-y-2.5 flex-1">
                {colTasks.map(task => (
                  <div
                    key={task.id}
                    className="w-full rounded-xl border border-slate-200 bg-white p-3.5 text-left shadow-xs hover:shadow-md hover:border-blue-300 transition-all space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-bold text-slate-900 leading-snug">{task.name}</p>
                    </div>

                    {task.detail && (
                      <p className="text-[11px] text-slate-500 line-clamp-2">{task.detail}</p>
                    )}

                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-100">
                      <span className="flex items-center gap-1 font-medium">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {task.date || 'Today'}
                      </span>

                      {/* Quick Move Action */}
                      <select
                        value={task.status === 'TO DO' ? 'PENDING' : task.status}
                        onChange={e => updateTask(task.id, e.target.value)}
                        className="text-[10px] font-bold bg-slate-50 border border-slate-200 rounded-md px-1.5 py-0.5 text-slate-700 cursor-pointer"
                      >
                        <option value="PENDING">To Do</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="REVIEW">Review</option>
                        <option value="COMPLETED">Completed</option>
                      </select>
                    </div>
                  </div>
                ))}

                {colTasks.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-36 text-center border-2 border-dashed border-slate-200 rounded-xl p-4">
                    <p className="text-[11px] text-slate-400 font-medium">No tasks in {col.label.toLowerCase()}</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Task Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-slate-200 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-blue-600" />
                <span>Create New Task</span>
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Task Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Call Rajesh to discuss valve pricing"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Description / Details</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Additional context or meeting notes..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={e => setPriority(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High 🔥</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Due Date *</label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
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
                  <span>{submitting ? 'Creating...' : 'Create Task'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </EmployeePage>
  );
};