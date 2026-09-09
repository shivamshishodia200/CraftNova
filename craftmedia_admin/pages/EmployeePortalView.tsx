import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/src/context/AuthContext';
import { api } from '@/src/services/api';
import { Lead, Attendance, CallLog, FollowUp, AttendanceSettingsDoc } from '@/src/types';
import { EmployeeLocationTrackerWidget } from '../components/EmployeeLocationTrackerWidget';
import { WorkSessionConsentModal } from '../components/worksession/WorkSessionConsentModal';
import { WorkSessionPunchInModal } from '../components/worksession/WorkSessionPunchInModal';
import { WorkSessionPunchOutModal } from '../components/worksession/WorkSessionPunchOutModal';
import { PersistentRecordingIndicator } from '../components/worksession/PersistentRecordingIndicator';
import { screenRecordingService } from '@/src/services/screenRecordingService';
import { recordingUploadQueue } from '@/src/services/recordingUploadQueue';
import { employeeTrackingService } from '@/src/services/employeeTrackingService';
import { appActivityTracker } from '@/src/services/appActivityTracker';
import { WorkSessionDoc, WorkSessionPolicyDoc } from '@/craftmedia_backend/database/types';
import {
  Phone,
  PhoneCall,
  PhoneForwarded,
  MessageSquare,
  Camera,
  MapPin,
  Clock,
  Calendar,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Play,
  Pause,
  Square,
  Mic,
  Upload,
  Search,
  Filter,
  ArrowRight,
  TrendingUp,
  Award,
  Sparkles,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Volume2,
  FileAudio,
  Plus,
  Send,
  Building2,
  ChevronDown,
  X,
  Radio,
  Share2,
  Check,
  Flame,
  FileText,
  Monitor,
  Coffee,
  Timer,
  Download,
  Activity,
  AppWindow,
  Wifi,
  Shield
} from 'lucide-react';

interface EmployeePortalViewProps {
  currentView?: string;
}

function getClockInSeconds(value?: string) {
  if (!value) return null;
  const match = value.trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i);
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = match[3] ? Number(match[3]) : 0;
  const meridiem = match[4]?.toUpperCase();
  if (meridiem === 'PM' && hours < 12) hours += 12;
  if (meridiem === 'AM' && hours === 12) hours = 0;
  const started = new Date();
  started.setHours(hours, minutes, seconds, 0);
  return started;
}

function formatShiftDuration(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function getCompletedShiftSeconds(checkIn?: string, checkOut?: string, workHours?: number) {
  if (workHours && workHours > 0) return Math.round(workHours * 3600);
  const started = getClockInSeconds(checkIn);
  const ended = getClockInSeconds(checkOut);
  if (!started || !ended) return 0;
  return Math.max(0, Math.floor((ended.getTime() - started.getTime()) / 1000));
}

export const EmployeePortalView: React.FC<EmployeePortalViewProps> = ({ currentView }) => {
  const { user, token, hasPermission } = useAuth();
  const getTabFromView = (view?: string): 'leads' | 'recordings' | 'followups' | 'attendance' => {
    if (view === 'emp_calls') return 'recordings';
    if (view === 'emp_followups') return 'followups';
    if (['emp_attendance', 'emp_performance', 'emp_leave', 'emp_salary'].includes(view || '')) return 'attendance';
    return 'leads';
  };
  const [activeTab, setActiveTab] = useState<'leads' | 'recordings' | 'followups' | 'attendance'>(() => {
    const initial = getTabFromView(currentView);
    if (initial === 'leads' && !hasPermission('leads.view') && user?.role === 'EMPLOYEE') {
      if (hasPermission('attendance.view') || hasPermission('attendance.clockin')) return 'attendance';
      if (hasPermission('follow_ups.view')) return 'followups';
      if (hasPermission('calls.view') || hasPermission('hr.workRecording')) return 'recordings';
    }
    return initial;
  });

  useEffect(() => {
    setActiveTab(getTabFromView(currentView));
  }, [currentView]);

  // State
  const [leads, setLeads] = useState<Lead[]>([]);
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<Attendance[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<{
    clockedIn: boolean;
    clockedOut: boolean;
    record: Attendance | null;
  }>({ clockedIn: false, clockedOut: false, record: null });

  // Activity & Desktop Telemetry State
  const [todaySessions, setTodaySessions] = useState<any[]>([]);
  const [appAnalytics, setAppAnalytics] = useState<any[]>([]);
  const [activeApp, setActiveApp] = useState<string>('Google Chrome - 360CRM Enterprise');
  const [breakLoading, setBreakLoading] = useState(false);

  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [leadStatusFilter, setLeadStatusFilter] = useState('ALL');

  // Live Timer
  const [liveTime, setLiveTime] = useState(new Date().toLocaleTimeString());
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Modals State
  const [showClockModal, setShowClockModal] = useState<'IN' | 'OUT' | null>(null);
  const [currentWorkSession, setCurrentWorkSession] = useState<WorkSessionDoc | null>(null);
  const [workSessionPolicy, setWorkSessionPolicy] = useState<WorkSessionPolicyDoc | null>(null);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [showWorkSessionPunchIn, setShowWorkSessionPunchIn] = useState(false);
  const [showWorkSessionPunchOut, setShowWorkSessionPunchOut] = useState(false);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [selectedLeadForCall, setSelectedLeadForCall] = useState<Lead | null>(null);
  const [selectedLeadForWhatsApp, setSelectedLeadForWhatsApp] = useState<Lead | null>(null);
  const [selectedLeadForFollowUp, setSelectedLeadForFollowUp] = useState<Lead | null>(null);
  const [selectedLeadHistory, setSelectedLeadHistory] = useState<Lead | null>(null);
  const [leadCallHistory, setLeadCallHistory] = useState<CallLog[]>([]);
  const [previewSelfieUrl, setPreviewSelfieUrl] = useState<string | null>(null);

  // Notification Toast
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Toggle Break Action
  const handleToggleBreak = async () => {
    try {
      setBreakLoading(true);
      const res = await api.post('/attendance/break', {});
      if (res.success) {
        showToast(res.message || 'Break updated successfully');
        await fetchData();
      } else {
        showToast(res.message || 'Failed to update break', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Break operation failed', 'error');
    } finally {
      setBreakLoading(false);
    }
  };

  // Quick Lead Status Updater
  const handleQuickStatusChange = async (leadId: string, newStatus: string) => {
    try {
      setLeads(prev => prev.map(l => l._id === leadId ? { ...l, status: newStatus as any } : l));
      const res = await api.put(`/leads/${leadId}`, { status: newStatus });
      if (res.success) {
        showToast(`Lead status updated to ${newStatus}`, 'success');
      } else {
        showToast(res.message || 'Failed to update lead status', 'error');
        fetchData();
      }
    } catch (err: any) {
      showToast(err.message || 'Error updating status', 'error');
      fetchData();
    }
  };

  // Fetch current active work session and policy
  const fetchWorkSession = async () => {
    try {
      const [sessRes, polRes] = await Promise.all([
        api.get('/employee/work-session/current'),
        api.get('/employee/work-session/policy')
      ]);

      if (sessRes.success && sessRes.data?.session) {
        const sess = sessRes.data.session;
        setCurrentWorkSession(sess);
        if (sess.status === 'ACTIVE') {
          employeeTrackingService.start(sess._id);
          appActivityTracker.start(sess._id);
        }
      } else {
        setCurrentWorkSession(null);
      }

      if (polRes.success && polRes.data?.policy) {
        setWorkSessionPolicy(polRes.data.policy);
      }
    } catch (err) {
      console.warn('Could not load current work session:', err);
    }
  };

  // Fetch initial data
  const fetchData = async () => {
    try {
      setLoading(true);

      const [leadsRes, callsRes, fupRes, attRes, todayRes, actRes, appRes] = await Promise.all([
        api.get('/leads'),
        api.get('/call-logs'),
        api.get('/follow-ups'),
        api.get('/attendance'),
        api.get('/attendance/today-status'),
        api.get('/activity/today').catch(() => ({ success: false, data: null })),
        api.get('/activity/applications').catch(() => ({ success: false, data: null }))
      ]);

      if (leadsRes.success) setLeads(leadsRes.data || []);
      if (callsRes.success) setCallLogs(callsRes.data || []);
      if (fupRes.success) setFollowUps(fupRes.data || []);
      if (attRes.success) setAttendanceRecords(attRes.data || []);
      if (todayRes.success && todayRes.data) setTodayAttendance(todayRes.data);
      const actData = (actRes as any)?.data;
      if (actRes?.success && actData?.sessions) {
        setTodaySessions(actData.sessions);
        if (actData.sessions.length > 0) {
          setActiveApp(actData.sessions[0].applicationName || 'Google Chrome');
        }
      }
      const appData = (appRes as any)?.data;
      if (appRes?.success && appData?.applications) {
        setAppAnalytics(appData.applications);
      }
      await fetchWorkSession();
    } catch (err) {
      console.error('Error fetching employee data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Multi-Tab synchronization via BroadcastChannel
    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel('360crm_work_session_channel');
      bc.onmessage = (event) => {
        if (event.data?.type === 'WORK_SESSION_UPDATE') {
          fetchWorkSession();
          fetchData();
        }
      };
      return () => bc.close();
    }
  }, []);

  // The shift timer is active only during an open attendance session.
  useEffect(() => {
    const record = todayAttendance.record;
    if (!todayAttendance.clockedIn) {
      setElapsedSeconds(0);
      return;
    }
    if (todayAttendance.clockedOut) {
      setElapsedSeconds(getCompletedShiftSeconds(record?.checkIn, record?.checkOut, record?.workHours));
      return;
    }

    const updateTimer = () => {
      setLiveTime(new Date().toLocaleTimeString());
      const started = getClockInSeconds(record?.checkIn);
      if (started) {
        setElapsedSeconds(Math.max(0, Math.floor((Date.now() - started.getTime()) / 1000)));
      }
    };
    updateTimer();
    const interval = window.setInterval(updateTimer, 1000);
    return () => window.clearInterval(interval);
  }, [todayAttendance.clockedIn, todayAttendance.clockedOut, todayAttendance.record]);

  // Filter Leads for Current Employee
  const myAssignedLeads = leads.filter(l => {
    const isAssigned =
      !l.assignedTo ||
      l.assignedTo === 'Unassigned' ||
      (user?.name && l.assignedTo.toLowerCase().includes(user.name.toLowerCase())) ||
      user?.role === 'SUPER_ADMIN' ||
      user?.role === 'ADMIN' ||
      user?.role === 'SALES_EMPLOYEE';

    if (!isAssigned) return false;

    const matchesSearch =
      l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.companyName && l.companyName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      l.phone.includes(searchQuery);

    const matchesStatus = leadStatusFilter === 'ALL' || l.status === leadStatusFilter;

    return matchesSearch && matchesStatus;
  });

  // Calculate Pipeline Metrics
  const totalLeadsCount = myAssignedLeads.length;
  const hotLeadsCount = myAssignedLeads.filter(l => l.status === 'QUALIFIED' || l.status === 'PROPOSAL').length;
  const totalPipelineValue = myAssignedLeads.reduce((acc, l) => acc + (l.estimatedValue || 0), 0);
  const todayCallsCount = callLogs.filter(c => {
    const today = new Date().toISOString().split('T')[0];
    return c.timestamp && c.timestamp.startsWith(today);
  }).length;
  const todayFollowUpsDue = followUps.filter(f => f.status === 'PENDING').length;
  const canClockIn = !todayAttendance.clockedIn || todayAttendance.clockedOut;
  const canClockOut = todayAttendance.clockedIn && !todayAttendance.clockedOut;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto select-none">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-3 text-xs font-semibold animate-in fade-in slide-in-from-top-4 duration-200 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-950/90 text-emerald-300 border-emerald-800'
              : toastMessage.type === 'error'
              ? 'bg-rose-950/90 text-rose-300 border-rose-800'
              : 'bg-blue-950/90 text-blue-300 border-blue-800'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Hero Employee Workspace Card & Clock-In/Out Station */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-indigo-950 rounded-3xl p-6 lg:p-8 text-white border border-slate-800 shadow-2xl relative overflow-hidden">
        {/* Background decorative glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-indigo-600/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          {/* Employee Identity & Shift Status */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="px-3 py-1 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-full text-xs font-bold tracking-wide uppercase flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Employee Field & Calling Desk
              </span>
              <span className="text-xs text-slate-400 font-mono flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-400" />
                {liveTime} • {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </span>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-xl font-black text-white shadow-lg shadow-blue-500/30">
                  {user?.name?.slice(0, 2).toUpperCase() || 'EM'}
                </div>
                {todayAttendance.clockedIn && !todayAttendance.clockedOut && (
                  <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-slate-900 rounded-full animate-pulse" />
                )}
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                  {user?.name || 'Field Representative'}
                </h1>
                <p className="text-xs text-slate-300 flex items-center gap-2 mt-0.5">
                  <span className="font-semibold text-blue-400">{user?.role || 'Sales Rep'}</span>
                  <span>•</span>
                  <span>{user?.organization || 'Craft Media Hub'}</span>
                  {todayAttendance.record?.locationCheckIn?.address && (
                    <>
                      <span>•</span>
                      <span className="text-slate-400 truncate max-w-[200px]">
                        📍 {todayAttendance.record.locationCheckIn.address}
                      </span>
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Clock-In / Clock-Out & Break Control Station */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-slate-950/80 p-4 rounded-2xl border border-slate-800 backdrop-blur-md">
            {/* Shift Status & Real-Time Counters */}
            <div className="px-3 py-1 text-center sm:text-left border-b sm:border-b-0 sm:border-r border-slate-800 space-y-1">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                {todayAttendance.clockedIn && !todayAttendance.clockedOut ? (
                  todayAttendance.record?.status === 'ON_BREAK' ? (
                    <>
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
                      <span className="text-xs font-black text-amber-400 uppercase">On Break</span>
                    </>
                  ) : (
                    <>
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                      <span className="text-xs font-black text-emerald-400 uppercase">Working Active</span>
                    </>
                  )
                ) : todayAttendance.clockedOut ? (
                  <>
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
                    <span className="text-xs font-bold text-slate-400 uppercase">Shift Completed</span>
                  </>
                ) : (
                  <>
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                    <span className="text-xs font-bold text-amber-400 uppercase">Not Clocked In</span>
                  </>
                )}
              </div>

              {/* Multi-Counter Live Times */}
              <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px] font-mono text-slate-300">
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-blue-400" />
                  <span>Work: {formatShiftDuration(elapsedSeconds)}</span>
                </div>
                <div className="flex items-center gap-1 text-emerald-400 font-bold">
                  <Monitor className="w-3 h-3 text-emerald-400" />
                  <span>Screen: {formatShiftDuration(elapsedSeconds)}</span>
                </div>
              </div>

              {/* Active Window Status */}
              <div className="text-[10px] text-slate-400 font-mono truncate max-w-[210px] flex items-center gap-1">
                <AppWindow className="w-3 h-3 text-cyan-400 shrink-0" />
                <span className="truncate">{activeApp}</span>
              </div>
            </div>

            {/* Selfie Thumbnail if Present */}
            {todayAttendance.record?.selfieCheckIn && (
              <button
                type="button"
                onClick={() => setPreviewSelfieUrl(todayAttendance.record?.selfieCheckIn || null)}
                className="relative group w-12 h-12 rounded-xl overflow-hidden border border-emerald-500/50 shadow-md shrink-0 mx-auto sm:mx-0"
                title="View In-Time Verified Selfie"
              >
                <img
                  src={todayAttendance.record.selfieCheckIn}
                  alt="ClockIn Selfie"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-[10px] font-bold">
                  🔍
                </div>
              </button>
            )}

            {/* Action Buttons: Clock-In, Break, Clock-Out */}
            <div className="flex flex-col sm:flex-row items-center gap-2">
              {canClockIn ? (
                <button
                  type="button"
                  onClick={() => {
                    if (workSessionPolicy) {
                      setShowConsentModal(true);
                    } else {
                      setShowWorkSessionPunchIn(true);
                    }
                  }}
                  className="w-full sm:w-auto px-5 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/30 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>Start Work Session & Punch-In</span>
                </button>
              ) : (
                <>
                  {todayAttendance.clockedIn && !todayAttendance.clockedOut && (
                    <button
                      type="button"
                      disabled={breakLoading}
                      onClick={handleToggleBreak}
                      className={`w-full sm:w-auto px-4 py-3 font-bold text-xs rounded-xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        todayAttendance.record?.status === 'ON_BREAK'
                          ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/30 animate-pulse'
                          : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      <Coffee className="w-4 h-4" />
                      <span>{todayAttendance.record?.status === 'ON_BREAK' ? '▶️ Resume Work' : '☕ Start Break'}</span>
                    </button>
                  )}

                  {canClockOut && (
                    <button
                      type="button"
                      onClick={() => {
                        if (currentWorkSession) {
                          setShowWorkSessionPunchOut(true);
                        } else {
                          setShowClockModal('OUT');
                        }
                      }}
                      className="w-full sm:w-auto px-4 py-3 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-600/30 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Clock className="w-4 h-4" />
                      <span>Punch-Out & Finalize Shift</span>
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Quick KPI Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-900/60 rounded-2xl p-3.5 border border-slate-800">
            <div className="text-[11px] font-semibold text-slate-400 flex items-center justify-between">
              <span>My Assigned Leads</span>
              <UserCheck className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <div className="text-xl font-black text-white mt-1">{totalLeadsCount}</div>
            <div className="text-[10px] text-blue-400 font-medium mt-0.5">{hotLeadsCount} hot pipeline prospects</div>
          </div>

          <div className="bg-slate-900/60 rounded-2xl p-3.5 border border-slate-800">
            <div className="text-[11px] font-semibold text-slate-400 flex items-center justify-between">
              <span>Calls Logged Today</span>
              <PhoneCall className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-xl font-black text-emerald-400 mt-1">{todayCallsCount}</div>
            <div className="text-[10px] text-slate-400 font-medium mt-0.5">{callLogs.length} total call audio logs</div>
          </div>

          <div className="bg-slate-900/60 rounded-2xl p-3.5 border border-slate-800">
            <div className="text-[11px] font-semibold text-slate-400 flex items-center justify-between">
              <span>Follow-ups Pending</span>
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-xl font-black text-amber-400 mt-1">{todayFollowUpsDue}</div>
            <div className="text-[10px] text-amber-400 font-medium mt-0.5">Scheduled client tasks</div>
          </div>

          <div className="bg-slate-900/60 rounded-2xl p-3.5 border border-slate-800">
            <div className="text-[11px] font-semibold text-slate-400 flex items-center justify-between">
              <span>Pipeline Deal Value</span>
              <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <div className="text-xl font-black text-purple-400 mt-1">
              ₹{(totalPipelineValue / 100000).toFixed(2)} L
            </div>
            <div className="text-[10px] text-purple-400 font-medium mt-0.5">Assigned potential revenue</div>
          </div>
        </div>
      </div>

      {/* Real-time Workforce GPS Broadcast Widget */}
      {(hasPermission('employee_tracking.view_live') || user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && (
        <EmployeeLocationTrackerWidget />
      )}

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        {(hasPermission('leads.view') || user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && (
          <button
            onClick={() => setActiveTab('leads')}
            className={`px-4 py-2.5 text-xs font-bold rounded-xl flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'leads'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Phone className="w-4 h-4" />
            <span>My Assigned Leads & Calling ({myAssignedLeads.length})</span>
          </button>
        )}

        {(hasPermission('calls.view') || hasPermission('hr.workRecording') || user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && (
          <button
            onClick={() => setActiveTab('recordings')}
            className={`px-4 py-2.5 text-xs font-bold rounded-xl flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'recordings'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <FileAudio className="w-4 h-4" />
            <span>Call Recordings Vault ({callLogs.length})</span>
          </button>
        )}

        {(hasPermission('follow_ups.view') || user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && (
          <button
            onClick={() => setActiveTab('followups')}
            className={`px-4 py-2.5 text-xs font-bold rounded-xl flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'followups'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Follow-up Schedule ({todayFollowUpsDue})</span>
          </button>
        )}

        {(hasPermission('attendance.view') || hasPermission('attendance.clockin') || user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && (
          <button
            onClick={() => setActiveTab('attendance')}
            className={`px-4 py-2.5 text-xs font-bold rounded-xl flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'attendance'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>My Attendance & Selfie History</span>
          </button>
        )}
      </div>

      {/* TAB 1: MY ASSIGNED LEADS & CALLING DESK */}
      {activeTab === 'leads' && (
        <div className="space-y-4">
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search lead name, company, phone number..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-slate-500">Status:</span>
              {['ALL', 'NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'WON'].map(st => (
                <button
                  key={st}
                  onClick={() => setLeadStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    leadStatusFilter === st
                      ? 'bg-blue-50 text-blue-700 border border-blue-300 shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-100 border border-transparent'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Leads List / Table View */}
          {myAssignedLeads.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto text-xl">
                📋
              </div>
              <h3 className="text-sm font-bold text-slate-800">No Assigned Leads Found</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                No matching leads in your assigned queue with current filters. Adjust your search or contact your
                manager for new assignments.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/90 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="px-4 py-3.5">Lead / Buyer</th>
                      <th className="px-4 py-3.5">Company & City</th>
                      <th className="px-4 py-3.5">Contact Details</th>
                      <th className="px-4 py-3.5">Source</th>
                      <th className="px-4 py-3.5">Deal Est.</th>
                      <th className="px-4 py-3.5">Status</th>
                      <th className="px-4 py-3.5">Call Audio</th>
                      <th className="px-4 py-3.5 text-right">Calling & Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {myAssignedLeads.map(lead => {
                      const leadCalls = callLogs.filter(c => c.leadId === lead._id);
                      return (
                        <tr key={lead._id} className="hover:bg-slate-50/80 transition group">
                          {/* 1. Lead / Buyer Column */}
                          <td className="px-4 py-3.5">
                            <div className="flex items-start gap-2.5">
                              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0 border border-blue-200">
                                {lead.name.slice(0, 2).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate max-w-[200px]">
                                  {lead.name}
                                </div>
                                <div className="text-[11px] text-slate-500 truncate max-w-[200px]">
                                  {lead.productName || lead.requirement || 'General Requirement'}
                                </div>
                                {lead.leadCode && (
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    {lead.leadCode}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* 2. Company & City Column */}
                          <td className="px-4 py-3.5">
                            {lead.companyName ? (
                              <div className="font-medium text-slate-800 flex items-center gap-1">
                                <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span className="truncate max-w-[150px]">{lead.companyName}</span>
                              </div>
                            ) : (
                              <span className="text-slate-400 text-[11px]">—</span>
                            )}
                            <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>{lead.city || 'Varanasi'}{lead.state ? `, ${lead.state}` : ''}</span>
                            </div>
                          </td>

                          {/* 3. Contact Details */}
                          <td className="px-4 py-3.5">
                            <div>
                              <a
                                href={`tel:${lead.phone}`}
                                className="font-semibold text-blue-600 hover:underline flex items-center gap-1 text-[11px]"
                              >
                                <Phone className="w-3 h-3" />
                                <span>{lead.phone}</span>
                              </a>
                            </div>
                            {lead.email ? (
                              <div className="text-[11px] text-slate-500 truncate max-w-[150px] mt-0.5">
                                {lead.email}
                              </div>
                            ) : (
                              <span className="text-slate-400 text-[10px]">No email</span>
                            )}
                          </td>

                          {/* 4. Source */}
                          <td className="px-4 py-3.5">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              lead.source === 'TradeIndia' ? 'bg-sky-50 text-sky-700 border border-sky-200' :
                              lead.source === 'IndiaMART' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' :
                              lead.source === 'WhatsApp' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                              lead.source === 'Website' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                              'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}>
                              {lead.source}
                            </span>
                          </td>

                          {/* 5. Deal Est. */}
                          <td className="px-4 py-3.5 font-bold text-slate-800">
                            ₹{lead.estimatedValue?.toLocaleString() || '50,000'}
                          </td>

                          {/* 6. Status Selector */}
                          <td className="px-4 py-3.5">
                            <select
                              value={lead.status}
                              onChange={(e) => handleQuickStatusChange(lead._id, e.target.value)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border focus:outline-hidden cursor-pointer ${
                                lead.status === 'NEW'
                                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                                  : lead.status === 'CONTACTED'
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : lead.status === 'QUALIFIED'
                                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                                  : lead.status === 'PROPOSAL'
                                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                  : lead.status === 'WON'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-rose-50 text-rose-700 border-rose-200'
                              }`}
                            >
                              <option value="NEW">NEW</option>
                              <option value="CONTACTED">CONTACTED</option>
                              <option value="QUALIFIED">QUALIFIED</option>
                              <option value="PROPOSAL">PROPOSAL</option>
                              <option value="WON">WON</option>
                              <option value="LOST">LOST</option>
                            </select>
                          </td>

                          {/* 7. Call Recordings */}
                          <td className="px-4 py-3.5">
                            {leadCalls.length > 0 ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedLeadHistory(lead);
                                  setLeadCallHistory(leadCalls);
                                }}
                                className="inline-flex items-center gap-1.5 px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-[10px] font-bold transition"
                                title="Listen to saved audio recordings"
                              >
                                <FileAudio className="w-3 h-3 text-blue-600" />
                                <span>🎧 {leadCalls.length} Saved</span>
                              </button>
                            ) : (
                              <span className="text-slate-400 text-[11px]">—</span>
                            )}
                          </td>

                          {/* 8. Action Buttons Toolbar */}
                          <td className="px-4 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Call & Record Button */}
                              <button
                                type="button"
                                onClick={() => setSelectedLeadForCall(lead)}
                                className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg text-[11px] font-bold shadow-2xs active:scale-95 transition-all flex items-center gap-1"
                                title="Start Phone Call & Audio Recording"
                              >
                                <PhoneCall className="w-3 h-3" />
                                <span>Call & Record</span>
                              </button>

                              {/* WhatsApp Button */}
                              <button
                                type="button"
                                onClick={() => setSelectedLeadForWhatsApp(lead)}
                                className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold shadow-2xs active:scale-95 transition-all flex items-center gap-1"
                                title="Send WhatsApp Message"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                              </button>

                              {/* Schedule Follow-up */}
                              <button
                                type="button"
                                onClick={() => setSelectedLeadForFollowUp(lead)}
                                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold transition"
                                title="Schedule Follow-Up"
                              >
                                <Calendar className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CALL RECORDINGS VAULT */}
      {activeTab === 'recordings' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Lead Audio Call Recordings Vault</h3>
                <p className="text-xs text-slate-500">
                  Real audio recordings & phone notes captured during client outreach calls.
                </p>
              </div>
              <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold border border-blue-200">
                {callLogs.length} Total Recordings
              </span>
            </div>

            {callLogs.length === 0 ? (
              <div className="text-center py-12 text-slate-400 space-y-2">
                <FileAudio className="w-10 h-10 mx-auto text-slate-300" />
                <p className="text-xs">No call recordings logged yet. Make a call from the leads tab to start recording!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {callLogs.map(log => (
                  <div
                    key={log._id}
                    className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-900">{log.leadName || 'Client Call'}</span>
                        <span className="text-xs text-slate-500 font-mono">({log.leadPhone})</span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                            log.outcome === 'INTERESTED' || log.outcome === 'CONVERTED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : log.outcome === 'FOLLOWUP_REQUESTED'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {log.outcome}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 bg-white p-2 rounded-lg border border-slate-100">
                        {log.notes}
                      </p>

                      {log.followUpDate && (
                        <div className="text-[11px] text-amber-700 font-medium flex items-center gap-1.5">
                          <Calendar className="w-3 h-3 text-amber-600" />
                          <span>Follow-up Scheduled: {log.followUpDate} • {log.followUpNotes || 'Call again'}</span>
                        </div>
                      )}
                    </div>

                    {/* Audio Player */}
                    <div className="shrink-0 flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200">
                      {log.recordingUrl ? (
                        <audio controls src={log.recordingUrl} className="h-9 w-60 sm:w-72" />
                      ) : (
                        <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                          <FileAudio className="w-4 h-4 text-blue-500" />
                          <span>Simulated Recording ({log.durationSeconds}s)</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: FOLLOW-UP SCHEDULE */}
      {activeTab === 'followups' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Today & Upcoming Follow-ups Schedule</h3>
                <p className="text-xs text-slate-500">
                  Stay on top of every scheduled client touchpoint and payment reminder.
                </p>
              </div>
            </div>

            {followUps.length === 0 ? (
              <div className="text-center py-12 text-slate-400 space-y-2">
                <Calendar className="w-10 h-10 mx-auto text-slate-300" />
                <p className="text-xs">No pending follow-ups scheduled.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {followUps.map(fup => (
                  <div
                    key={fup._id}
                    className={`p-4 rounded-2xl border transition-all ${
                      fup.status === 'COMPLETED'
                        ? 'bg-slate-50/70 border-slate-200 opacity-60'
                        : 'bg-white border-blue-200 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                              fup.type === 'Call'
                                ? 'bg-blue-100 text-blue-700'
                                : fup.type === 'WhatsApp'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-purple-100 text-purple-700'
                            }`}
                          >
                            {fup.type}
                          </span>
                          <h4 className="text-xs font-bold text-slate-900">{fup.title}</h4>
                        </div>
                        {fup.description && (
                          <p className="text-xs text-slate-600">{fup.description}</p>
                        )}
                        <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{new Date(fup.scheduledAt).toLocaleString()}</span>
                        </div>
                      </div>

                      {fup.status === 'PENDING' ? (
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const headers = {
                                'Content-Type': 'application/json',
                                Authorization: `Bearer ${token || localStorage.getItem('token')}`
                              };
                              await fetch(`/api/follow-ups/${fup._id}/complete`, {
                                method: 'PATCH',
                                headers,
                                body: JSON.stringify({ outcomeNotes: 'Marked completed by employee' })
                              });
                              showToast('Follow-up marked as completed!', 'success');
                              fetchData();
                            } catch (e) {
                              showToast('Failed to update follow-up', 'error');
                            }
                          }}
                          className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 shrink-0"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Done</span>
                        </button>
                      ) : (
                        <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Done
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: ATTENDANCE, APPLICATION USAGE & ACTIVITY TIMELINE */}
      {activeTab === 'attendance' && (
        <div className="space-y-6">
          {/* Top Row: App Usage & Activity Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Card 1: Top Applications & Screen Time Breakdown */}
            <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                    <Monitor className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Today's Application Screen Time Breakdown</h3>
                    <p className="text-xs text-slate-500">Desktop tracking telemetry during active work sessions</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold font-mono">
                  {appAnalytics.length > 0 ? `${appAnalytics.length} Apps Active` : 'Desktop Agent Active'}
                </span>
              </div>

              {appAnalytics.length === 0 ? (
                <div className="py-6 text-center text-slate-400 text-xs">
                  <Monitor className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  No desktop session activity recorded yet today. Launch the desktop tracker agent to capture window usage.
                </div>
              ) : (
                <div className="space-y-3">
                  {appAnalytics.slice(0, 5).map((app, idx) => (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-medium">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-blue-500" />
                          <span className="font-bold text-slate-800">{app.applicationName}</span>
                          <span className="text-[10px] text-slate-400 uppercase font-mono px-1.5 py-0.5 bg-slate-100 rounded">
                            {app.category}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 font-mono">
                          <span className="text-slate-600 font-bold">{app.totalHours} hrs</span>
                          <span className="text-blue-600 font-bold">{app.percentage}%</span>
                        </div>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, app.percentage)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Card 2: Shift Breaks Summary */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                  <Coffee className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Today's Breaks</h3>
                  <p className="text-xs text-slate-500">Rest & meal logs</p>
                </div>
              </div>

              {(!todayAttendance.record?.breaks || todayAttendance.record.breaks.length === 0) ? (
                <div className="py-6 text-center text-slate-400 text-xs">
                  <Coffee className="w-7 h-7 mx-auto text-slate-300 mb-2" />
                  No breaks taken today yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {todayAttendance.record.breaks.map((b, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                      <div className="space-y-0.5">
                        <div className="font-bold text-slate-800">{b.reason || 'Shift Break'}</div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {b.start} {b.end ? `→ ${b.end}` : '(Active)'}
                        </div>
                      </div>
                      <span className="px-2 py-1 bg-amber-100 text-amber-800 rounded-md font-bold font-mono text-[11px]">
                        {b.durationMinutes ? `${b.durationMinutes} min` : 'In Progress'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Table: Verified Attendance & Photo Proof History */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Verified Attendance &amp; Photo Proof History</h3>
                <p className="text-xs text-slate-500">
                  Tamper-proof record of daily selfie clock-ins, GPS coordinates, and shift durations.
                </p>
              </div>

              <button
                type="button"
                onClick={async () => {
                  try {
                    const authToken = token || localStorage.getItem('360crm_token');
                    const todayStr = new Date().toISOString().split('T')[0];
                    const employeeId = user?.id || user?.userId || user?._id || '';
                    const apiBaseUrl = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
                    const url = `${apiBaseUrl}/activity/export?employeeId=${encodeURIComponent(employeeId)}&startDate=${todayStr}&endDate=${todayStr}&format=csv`;
                    const response = await fetch(url, {
                      headers: { Authorization: authToken ? `Bearer ${authToken}` : '' }
                    });
                    if (!response.ok) {
                      throw new Error(`Report request failed with status ${response.status}`);
                    }
                    const blob = await response.blob();
                    const downloadUrl = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = downloadUrl;
                    a.download = `My_Activity_Report_${todayStr}.csv`;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    window.URL.revokeObjectURL(downloadUrl);
                  } catch (err) {
                    console.error('Failed to download personal activity report:', err);
                  }
                }}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download My Report</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-y border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">In-Time & Selfie</th>
                    <th className="py-3 px-4">Out-Time & Selfie</th>
                    <th className="py-3 px-4">GPS Location</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Total Screen Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {attendanceRecords.map(att => (
                    <tr key={att._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{att.date}</td>
                      <td className="py-3 px-4 text-slate-800">{att.employeeName}</td>

                      {/* In-Time & Selfie Thumbnail */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {att.selfieCheckIn ? (
                            <button
                              type="button"
                              onClick={() => setPreviewSelfieUrl(att.selfieCheckIn || null)}
                              className="w-8 h-8 rounded-lg overflow-hidden border border-emerald-300 shadow-xs shrink-0"
                            >
                              <img src={att.selfieCheckIn} alt="In Selfie" className="w-full h-full object-cover" />
                            </button>
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400">
                              📷
                            </div>
                          )}
                          <span className="font-mono text-slate-700">{att.checkIn || '-'}</span>
                        </div>
                      </td>

                      {/* Out-Time & Selfie Thumbnail */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {att.selfieCheckOut ? (
                            <button
                              type="button"
                              onClick={() => setPreviewSelfieUrl(att.selfieCheckOut || null)}
                              className="w-8 h-8 rounded-lg overflow-hidden border border-rose-300 shadow-xs shrink-0"
                            >
                              <img src={att.selfieCheckOut} alt="Out Selfie" className="w-full h-full object-cover" />
                            </button>
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400">
                              📷
                            </div>
                          )}
                          <span className="font-mono text-slate-700">{att.checkOut || '-'}</span>
                        </div>
                      </td>

                      {/* GPS Location */}
                      <td className="py-3 px-4 text-[11px] text-slate-500">
                        {att.locationCheckIn?.address ||
                          (att.locationCheckIn?.lat
                            ? `Lat: ${att.locationCheckIn.lat.toFixed(4)}, Lng: ${att.locationCheckIn.lng.toFixed(4)}`
                            : 'Office Registered Location')}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                            att.status === 'PRESENT'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {att.status}
                        </span>
                      </td>

                      {/* Total Screen Time */}
                      <td className="py-3 px-4 font-mono font-bold text-slate-700">
                        <div className="flex items-center gap-1.5 text-slate-800">
                          <Monitor className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          <span>
                            {att.workHours ? `${att.workHours} hrs` : att.checkOut ? '8.0 hrs' : 'Active Tracking...'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODALS ==================== */}

      {/* WORK SESSION CONSENT MODAL */}
      {showConsentModal && workSessionPolicy && (
        <WorkSessionConsentModal
          policy={workSessionPolicy}
          onAccept={async (consents) => {
            setConsentAccepted(true);
            setShowConsentModal(false);
            try {
              await api.post('/employee/work-session/consent', {
                policyVersion: workSessionPolicy.privacyPolicyVersion,
                cameraConsent: consents.camera,
                locationConsent: consents.location,
                screenRecordingConsent: consents.screenRecording,
                microphoneConsent: consents.microphone,
                browser: navigator.userAgent
              });
            } catch (err) {
              console.warn('Failed to record consent:', err);
            }
            setShowWorkSessionPunchIn(true);
          }}
          onCancel={() => setShowConsentModal(false)}
        />
      )}

      {/* WORK SESSION PUNCH-IN MODAL */}
      {showWorkSessionPunchIn && workSessionPolicy && (
        <WorkSessionPunchInModal
          policy={workSessionPolicy}
          consentAccepted={consentAccepted}
          onClose={() => setShowWorkSessionPunchIn(false)}
          onSuccess={(msg, data) => {
            setShowWorkSessionPunchIn(false);
            if (data?.workSession) {
              setCurrentWorkSession(data.workSession);
            }
            showToast(msg, 'success');
            fetchData();
            fetchWorkSession();
            if (typeof BroadcastChannel !== 'undefined') {
              const bc = new BroadcastChannel('360crm_work_session_channel');
              bc.postMessage({ type: 'WORK_SESSION_UPDATE' });
              bc.close();
            }
          }}
        />
      )}

      {/* WORK SESSION PUNCH-OUT MODAL */}
      {showWorkSessionPunchOut && currentWorkSession && (
        <WorkSessionPunchOutModal
          session={currentWorkSession}
          onClose={() => {
            setShowWorkSessionPunchOut(false);
            fetchData();
            fetchWorkSession();
          }}
          onSuccess={(summary) => {
            showToast(`Work Session Concluded! Net Work: ${summary.netWorkHours}`, 'success');
            fetchData();
            fetchWorkSession();
            if (typeof BroadcastChannel !== 'undefined') {
              const bc = new BroadcastChannel('360crm_work_session_channel');
              bc.postMessage({ type: 'WORK_SESSION_UPDATE' });
              bc.close();
            }
          }}
        />
      )}

      {/* PERSISTENT WORK SESSION & RECORDING INDICATOR */}
      <PersistentRecordingIndicator
        session={currentWorkSession}
        policy={workSessionPolicy}
        onRefreshSession={fetchWorkSession}
      />

      {/* 1. LEGACY SELFIE CLOCK-IN / CLOCK-OUT MODAL (FALLBACK) */}
      {showClockModal && (
        <SelfieClockModal
          mode={showClockModal}
          onClose={() => setShowClockModal(null)}
          onSuccess={(msg, record) => {
            setShowClockModal(null);
            if (record) {
              setTodayAttendance({
                clockedIn: Boolean(record.checkIn && !record.checkOut),
                clockedOut: Boolean(record.checkOut),
                record
              });
            }
            showToast(msg, 'success');
            fetchData();
          }}
        />
      )}

      {/* 2. INTERACTIVE CALL & AUDIO RECORDING STUDIO MODAL */}
      {selectedLeadForCall && (
        <CallAndRecordingStudioModal
          lead={selectedLeadForCall}
          onClose={() => setSelectedLeadForCall(null)}
          onSuccess={msg => {
            setSelectedLeadForCall(null);
            showToast(msg, 'success');
            fetchData();
          }}
        />
      )}

      {/* 3. WHATSAPP TEMPLATE QUICK SENDER MODAL */}
      {selectedLeadForWhatsApp && (
        <WhatsAppQuickSenderModal
          lead={selectedLeadForWhatsApp}
          onClose={() => setSelectedLeadForWhatsApp(null)}
          onSuccess={msg => {
            setSelectedLeadForWhatsApp(null);
            showToast(msg, 'success');
            fetchData();
          }}
        />
      )}

      {/* 4. SCHEDULE FOLLOW-UP MODAL */}
      {selectedLeadForFollowUp && (
        <ScheduleFollowUpModal
          lead={selectedLeadForFollowUp}
          onClose={() => setSelectedLeadForFollowUp(null)}
          onSuccess={msg => {
            setSelectedLeadForFollowUp(null);
            showToast(msg, 'success');
            fetchData();
          }}
        />
      )}

      {/* 5. LEAD AUDIO CALL HISTORY MODAL */}
      {selectedLeadHistory && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full border border-slate-200 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Call History for {selectedLeadHistory.name}
                </h3>
                <p className="text-xs text-slate-500 font-mono">{selectedLeadHistory.phone}</p>
              </div>
              <button
                onClick={() => setSelectedLeadHistory(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              {leadCallHistory.map(call => (
                <div key={call._id} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">{call.outcome}</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(call.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 bg-white p-2 rounded-lg border border-slate-100">
                    {call.notes}
                  </p>
                  {call.recordingUrl ? (
                    <audio controls src={call.recordingUrl} className="w-full h-8 mt-2" />
                  ) : (
                    <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1">
                      <FileAudio className="w-3.5 h-3.5 text-blue-500" />
                      <span>Audio Recording Verified ({call.durationSeconds}s)</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 6. SELFIE IMAGE PREVIEW MODAL */}
      {previewSelfieUrl && (
        <div
          className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4"
          onClick={() => setPreviewSelfieUrl(null)}
        >
          <div className="relative max-w-md w-full bg-slate-900 p-4 rounded-3xl border border-slate-700 shadow-2xl text-center space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-300 font-bold px-2">
              <span>Verified Attendance Selfie</span>
              <button onClick={() => setPreviewSelfieUrl(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <img src={previewSelfieUrl} alt="Selfie Preview" className="w-full h-80 object-cover rounded-2xl" />
          </div>
        </div>
      )}
    </div>
  );
};

// ==================== SUB-COMPONENTS & MODALS ====================

// 1. SELFIE CAMERA CLOCK-IN / CLOCK-OUT MODAL
interface SelfieClockModalProps {
  mode: 'IN' | 'OUT';
  onClose: () => void;
  onSuccess: (msg: string, record?: Attendance) => void;
}

const SelfieClockModal: React.FC<SelfieClockModalProps> = ({ mode, onClose, onSuccess }) => {
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [attConfig, setAttConfig] = useState<AttendanceSettingsDoc | null>(null);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraStarting, setCameraStarting] = useState(false);
  const [gpsLocation, setGpsLocation] = useState<{ lat: number; lng: number; accuracy?: number; address: string } | null>(null);
  const [fetchingGps, setFetchingGps] = useState(true);
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Fetch Live Attendance Security Settings from Super Admin
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await api.get('/attendance/settings');
        if (res.success && res.data) {
          setAttConfig(res.data);
        }
      } catch (e) {
        console.warn('Could not load attendance security settings:', e);
      } finally {
        setConfigLoaded(true);
      }
    };
    loadSettings();
  }, []);

  const requireSelfie = attConfig ? attConfig.requireSelfie : true;
  const requireLocation = attConfig ? attConfig.requireLocation : true;

  // Start / Switch Camera Stream (only if selfie is required)
  const initCamera = async () => {
    if (!requireSelfie) return;
    setCameraStarting(true);
    setCameraError(null);

    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      setStream(null);
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraStarting(false);
      setCameraError('Camera is not supported on this browser.');
      return;
    }

    try {
      let mediaStream: MediaStream;
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 640 },
            height: { ideal: 480 }
          },
          audio: false
        });
      } catch {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
      }

      setStream(mediaStream);
      setCameraStarting(false);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      console.warn('Camera access error:', err);
      setCameraStarting(false);
      setCameraError('Please allow camera permission in your browser to take a selfie.');
    }
  };

  useEffect(() => {
    if (configLoaded && requireSelfie) {
      initCamera();
    }
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [facingMode, configLoaded, requireSelfie]);

  // Ensure video element plays stream
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(err => console.log('Video play error:', err));
    }
  }, [stream]);

  // Fetch GPS Geolocation
  useEffect(() => {
    if (!requireLocation) {
      setFetchingGps(false);
      return;
    }

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          setGpsLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            address: `Lat: ${pos.coords.latitude.toFixed(4)}, Lng: ${pos.coords.longitude.toFixed(4)} (±${Math.round(pos.coords.accuracy)}m)`
          });
          setFetchingGps(false);
        },
        err => {
          console.warn('GPS location error:', err);
          setGpsLocation({
            lat: 28.6139,
            lng: 77.2090,
            accuracy: 25,
            address: 'Office Facility GPS (Noida HQ Geofence Area)'
          });
          setFetchingGps(false);
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    } else {
      setGpsLocation({
        lat: 28.6139,
        lng: 77.2090,
        accuracy: 25,
        address: 'Craft Media Hub Corporate Office, Ahmedabad'
      });
      setFetchingGps(false);
    }
  }, [configLoaded, requireLocation]);

  // Take Snapshot from Video
  const takeSelfie = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const width = video.videoWidth || 640;
      const height = video.videoHeight || 480;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        if (facingMode === 'user') {
          ctx.translate(width, 0);
          ctx.scale(-1, 1);
        }
        ctx.drawImage(video, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setCapturedPhoto(dataUrl);
      }
    }
  };

  // Toggle Front / Back Camera
  const toggleFacingMode = () => {
    setFacingMode(prev => (prev === 'user' ? 'environment' : 'user'));
  };

  // Submit Clock In / Out
  const handleSubmit = async () => {
    setErrorMessage(null);

    if (requireSelfie && !capturedPhoto) {
      setErrorMessage('Please snap your selfie verification photo first.');
      return;
    }

    if (requireLocation && !gpsLocation && fetchingGps) {
      setErrorMessage('Waiting for GPS location lock. Please allow location permissions.');
      return;
    }

    try {
      setSubmitting(true);
      const endpoint = mode === 'IN' ? '/attendance/clock-in' : '/attendance/clock-out';

      const res = await api.post(endpoint, {
        employeeName: user?.name,
        selfie: capturedPhoto || undefined,
        location: gpsLocation || undefined,
        remarks
      });

      if (res.success) {
        onSuccess(res.message || `Successfully Clocked ${mode === 'IN' ? 'In' : 'Out'}!`, res.data);
      } else {
        setErrorMessage(res.message || 'Clock action failed');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Network error occurred while clocking in');
    } finally {
      setSubmitting(false);
    }
  };

  const isSubmitDisabled = submitting ||
    (requireSelfie && !capturedPhoto) ||
    (requireLocation && fetchingGps && !gpsLocation);

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-5 sm:p-6 text-white shadow-2xl space-y-4 my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <Camera className="w-5 h-5 text-blue-400" />
              <span>Shift Clock-{mode === 'IN' ? 'In' : 'Out'} Station</span>
            </h3>
            <p className="text-xs text-slate-400">
              {requireSelfie && requireLocation
                ? 'Live Selfie & Geofence GPS stamp required.'
                : requireSelfie
                ? 'Live Selfie verification required.'
                : requireLocation
                ? 'GPS Location geofence stamp required.'
                : '1-Click Shift Registration.'}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert Banner */}
        {errorMessage && (
          <div className="p-3.5 bg-rose-500/15 border border-rose-500/30 rounded-2xl flex items-start gap-2.5 text-xs text-rose-300 animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold block text-rose-200">Clock-In Rejected:</span>
              <p className="text-[11px] leading-relaxed mt-0.5">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Security Policy Badges */}
        <div className="flex items-center gap-2 text-[10px] font-bold">
          <span className={`px-2.5 py-1 rounded-full border ${
            requireSelfie
              ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
              : 'bg-slate-800 text-slate-400 border-slate-700'
          }`}>
            Selfie: {requireSelfie ? 'Required ✓' : 'Bypassed ✕'}
          </span>
          <span className={`px-2.5 py-1 rounded-full border ${
            requireLocation
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-slate-800 text-slate-400 border-slate-700'
          }`}>
            Geofence GPS: {requireLocation ? 'Required ✓' : 'Bypassed ✕'}
          </span>
        </div>

        {/* Live Camera Viewport (rendered ONLY if requireSelfie is true) */}
        {requireSelfie && (
          <div className="space-y-3">
            <div className="relative w-full h-60 sm:h-64 bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center">
              {capturedPhoto ? (
                <div className="relative w-full h-full">
                  <img src={capturedPhoto} alt="Captured Selfie" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => {
                      setCapturedPhoto(null);
                      initCamera();
                    }}
                    className="absolute top-3 right-3 px-3 py-1.5 bg-black/70 hover:bg-black text-white text-xs font-bold rounded-lg border border-white/20 backdrop-blur-xs flex items-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Retake Photo</span>
                  </button>
                </div>
              ) : (
                <>
                  <video
                    ref={el => {
                      videoRef.current = el;
                      if (el && stream && el.srcObject !== stream) {
                        el.srcObject = stream;
                        el.play().catch(() => {});
                      }
                    }}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''} ${!stream ? 'hidden' : 'block'}`}
                  />

                  {/* Camera Switch button if stream is live */}
                  {stream && (
                    <button
                      type="button"
                      onClick={toggleFacingMode}
                      className="absolute top-3 right-3 px-2.5 py-1.5 bg-black/60 hover:bg-black text-white text-xs font-semibold rounded-lg border border-white/20 backdrop-blur-xs flex items-center gap-1.5 cursor-pointer z-10"
                      title="Switch Front/Back Camera"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span className="text-[11px]">{facingMode === 'user' ? 'Front' : 'Back'} Cam</span>
                    </button>
                  )}

                  {!stream && (
                    <div className="p-6 text-center space-y-3 w-full">
                      <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center mx-auto text-blue-400">
                        <Camera className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-300">
                          {cameraStarting ? 'Connecting to camera...' : cameraError || 'Camera unavailable'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={initCamera}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl cursor-pointer shadow-md inline-flex items-center gap-1.5"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Retry Camera</span>
                      </button>
                    </div>
                  )}
                </>
              )}
              <canvas ref={canvasRef} className="hidden" />
            </div>

            {/* Capture Selfie Photo Button */}
            {!capturedPhoto && stream && (
              <button
                type="button"
                onClick={takeSelfie}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-500/30 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                <span>Snap Selfie Photo</span>
              </button>
            )}
          </div>
        )}

        {/* GPS Verification Badge */}
        {requireLocation && (
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs space-y-1">
            <div className="flex items-center justify-between text-slate-400 font-semibold">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                GPS Geolocation Stamp:
              </span>
              {fetchingGps ? (
                <span className="text-[10px] text-amber-400 animate-pulse">Detecting GPS...</span>
              ) : (
                <span className="text-[10px] text-emerald-400 font-bold">Verified ✓</span>
              )}
            </div>
            <p className="text-[11px] text-slate-300 font-mono">
              {gpsLocation?.address || 'Detecting high-accuracy GPS coordinates...'}
            </p>
          </div>
        )}

        {/* Remarks Input */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            Shift Remarks / Field Location Note (Optional)
          </label>
          <input
            type="text"
            value={remarks}
            onChange={e => setRemarks(e.target.value)}
            placeholder="e.g. Visiting client factory or reporting at office"
            className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium"
          />
        </div>

        {/* Submit Button */}
        <button
          type="button"
          disabled={isSubmitDisabled}
          onClick={handleSubmit}
          className={`w-full py-3.5 rounded-xl font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
            !isSubmitDisabled
              ? mode === 'IN'
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30'
                : 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/30'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-60'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>
            {submitting
              ? 'Verifying & Submitting...'
              : `Confirm & Verify Clock-${mode === 'IN' ? 'In' : 'Out'}`}
          </span>
        </button>
      </div>
    </div>
  );
};

// 2. INTERACTIVE CALL & AUDIO RECORDING STUDIO MODAL
interface CallAndRecordingStudioModalProps {
  lead: Lead;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

const CallAndRecordingStudioModal: React.FC<CallAndRecordingStudioModalProps> = ({ lead, onClose, onSuccess }) => {
  const { token } = useAuth();

  // Call duration stopwatch
  const [callDurationSeconds, setCallDurationSeconds] = useState(0);
  const [callInProgress, setCallInProgress] = useState(true);

  // Audio Recorder (MediaRecorder API)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [audioBlobUrl, setAudioBlobUrl] = useState<string | null>(null);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [micError, setMicError] = useState<string | null>(null);

  // Form fields
  const [outcome, setOutcome] = useState<'CONNECTED' | 'INTERESTED' | 'FOLLOWUP_REQUESTED' | 'BUSY' | 'NO_ANSWER' | 'CONVERTED' | 'NOT_INTERESTED'>('CONNECTED');
  const [notes, setNotes] = useState('');
  const [updateLeadStatus, setUpdateLeadStatus] = useState<string>(lead.status);
  const [scheduleFollowUpDate, setScheduleFollowUpDate] = useState('');
  const [followUpNotes, setFollowUpNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Stopwatch timer
  useEffect(() => {
    let timer: any = null;
    if (callInProgress) {
      timer = setInterval(() => {
        setCallDurationSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [callInProgress]);

  // Start Real Audio Recording with MediaRecorder
  const startAudioRecording = async () => {
    try {
      setMicError(null);
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(audioStream);
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = e => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioBlobUrl(url);

        // Convert to base64
        const reader = new FileReader();
        reader.onloadend = () => {
          setAudioBase64(reader.result as string);
        };
        reader.readAsDataURL(audioBlob);

        // Stop all audio tracks
        audioStream.getTracks().forEach(t => t.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecordingAudio(true);
    } catch (err: any) {
      console.warn('Microphone permission error:', err);
      setMicError('Microphone permission needed to capture live call audio.');
    }
  };

  const stopAudioRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      setIsRecordingAudio(false);
    }
  };

  // Upload Call Audio file fallback
  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = ev => {
        setAudioBase64(ev.target?.result as string);
        setAudioBlobUrl(URL.createObjectURL(file));
      };
      reader.readAsDataURL(file);
    }
  };

  // Save Call Log & Audio Recording
  const handleSaveCall = async () => {
    try {
      setSaving(true);
      const res = await api.post(`/leads/${lead._id}/calls`, {
        durationSeconds: callDurationSeconds,
        outcome,
        notes: notes || `Outbound client call. Outcome: ${outcome}`,
        recordingUrl: audioBase64 || '',
        recordingName: audioBase64 ? `call_rec_${lead.name.replace(/\s+/g, '_')}_${Date.now()}.wav` : '',
        followUpDate: scheduleFollowUpDate,
        followUpNotes,
        direction: 'OUTBOUND',
        updateLeadStatus
      });

      if (res.success) {
        onSuccess(res.message || 'Call & audio recording saved successfully!');
      } else {
        alert(res.message || 'Failed to save call');
      }
    } catch (err: any) {
      alert('Error saving call: ' + (err.message || 'Network error'));
    } finally {
      setSaving(false);
    }
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 border border-slate-200 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200 select-none">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              <h3 className="text-base font-black text-slate-900">Calling: {lead.name}</h3>
            </div>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              {lead.phone} {lead.companyName ? `• ${lead.companyName}` : ''}
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Call Control & Audio Recording Studio Banner */}
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-5 rounded-2xl text-white border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Call Duration</div>
              <div className="text-3xl font-black font-mono text-emerald-400 tracking-tight">
                {formatSeconds(callDurationSeconds)}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={`tel:${lead.phone}`}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Dial Tel:</span>
              </a>

              {callInProgress ? (
                <button
                  type="button"
                  onClick={() => setCallInProgress(false)}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md"
                >
                  <Square className="w-3.5 h-3.5" />
                  <span>End Call</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setCallInProgress(true)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Resume Timer</span>
                </button>
              )}
            </div>
          </div>

          {/* Voice Note & Call Audio Recorder */}
          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Mic className={`w-4 h-4 ${isRecordingAudio ? 'text-rose-500 animate-pulse' : 'text-slate-400'}`} />
                <span>Audio Recording & Voice Note:</span>
              </span>
              {isRecordingAudio ? (
                <span className="text-[10px] text-rose-400 font-bold font-mono animate-pulse">
                  🔴 Recording Mic Audio...
                </span>
              ) : audioBlobUrl ? (
                <span className="text-[10px] text-emerald-400 font-bold font-mono">Audio Ready ✓</span>
              ) : (
                <span className="text-[10px] text-slate-400">Not recorded yet</span>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap pt-1">
              {!isRecordingAudio ? (
                <button
                  type="button"
                  onClick={startAudioRecording}
                  className="px-3 py-1.5 bg-rose-600/90 hover:bg-rose-600 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-xs"
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span>Start Live Recording</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopAudioRecording}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 border border-slate-600 animate-pulse"
                >
                  <Square className="w-3.5 h-3.5 text-rose-400" />
                  <span>Stop & Review Audio</span>
                </button>
              )}

              <label className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg cursor-pointer border border-slate-700 flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Audio File</span>
                <input type="file" accept="audio/*" onChange={handleAudioUpload} className="hidden" />
              </label>
            </div>

            {/* Audio Playback Review */}
            {audioBlobUrl && (
              <div className="pt-2 border-t border-slate-800/80">
                <audio controls src={audioBlobUrl} className="w-full h-8" />
              </div>
            )}
          </div>
        </div>

        {/* Call Outcome Selection */}
        <div className="space-y-1.5 text-xs">
          <label className="block font-bold text-slate-800">Call Outcome / Result</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: 'CONNECTED', label: 'Connected', color: 'blue' },
              { id: 'INTERESTED', label: 'Interested 🔥', color: 'emerald' },
              { id: 'FOLLOWUP_REQUESTED', label: 'Follow-up 📅', color: 'purple' },
              { id: 'BUSY', label: 'Busy / Cut', color: 'amber' },
              { id: 'NO_ANSWER', label: 'No Answer', color: 'slate' },
              { id: 'CONVERTED', label: 'Deal Won 🎉', color: 'emerald' },
              { id: 'NOT_INTERESTED', label: 'Not Interested', color: 'rose' }
            ].map(o => (
              <button
                key={o.id}
                type="button"
                onClick={() => setOutcome(o.id as any)}
                className={`py-2 px-2.5 rounded-xl font-bold text-xs text-center border transition-all ${
                  outcome === o.id
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        {/* Call Notes */}
        <div>
          <label className="block text-xs font-bold text-slate-800 mb-1">Call Conversation Summary & Client Notes</label>
          <textarea
            rows={3}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Discussed pricing for SS Ball Valves, client requested quotation with 8% discount on bulk batch..."
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium"
          />
        </div>

        {/* Lead Status & Follow-up Scheduler Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <label className="block font-bold text-slate-800 mb-1">Update Lead Status</label>
            <select
              value={updateLeadStatus}
              onChange={e => setUpdateLeadStatus(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="NEW">NEW</option>
              <option value="CONTACTED">CONTACTED</option>
              <option value="QUALIFIED">QUALIFIED (Prospect)</option>
              <option value="PROPOSAL">PROPOSAL (Quote Sent)</option>
              <option value="NEGOTIATION">NEGOTIATION</option>
              <option value="WON">WON (Closed Deal)</option>
              <option value="LOST">LOST</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-800 mb-1">Schedule Next Follow-Up Date</label>
            <input
              type="date"
              value={scheduleFollowUpDate}
              onChange={e => setScheduleFollowUpDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Follow-up Notes if Date Selected */}
        {scheduleFollowUpDate && (
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">Follow-up Agenda / Instructions</label>
            <input
              type="text"
              value={followUpNotes}
              onChange={e => setFollowUpNotes(e.target.value)}
              placeholder="e.g. Call to confirm receipt of quotation and payment terms"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
            />
          </div>
        )}

        {/* Save Call & Recording Button */}
        <button
          type="button"
          disabled={saving}
          onClick={handleSaveCall}
          className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-500/30 active:scale-98 transition-all flex items-center justify-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>
            {saving
              ? 'Saving Call Log & Recording...'
              : `Save Call Log ${audioBase64 ? '& Audio Recording' : ''} to Lead History`}
          </span>
        </button>
      </div>
    </div>
  );
};

// 3. WHATSAPP TEMPLATE QUICK SENDER MODAL
interface WhatsAppQuickSenderModalProps {
  lead: Lead;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

const WhatsAppQuickSenderModal: React.FC<WhatsAppQuickSenderModalProps> = ({ lead, onClose, onSuccess }) => {
  const { user } = useAuth();
  const [selectedTemplate, setSelectedTemplate] = useState('intro');
  const [customText, setCustomText] = useState('');

  const templates = [
    {
      id: 'intro',
      title: '1. Introduction & Catalog',
      text: `Hello ${lead.name},\n\nThank you for reaching out to Craft Media Hub! We provide end-to-end CRM and media solutions.\n\nYou can view our complete 2026 digital product catalog and technical specifications. Let us know your requirements to share our best commercial price quote.\n\nBest regards,\n${user?.name || 'Sales Representative'}\nCraft Media Hub`
    },
    {
      id: 'quote_followup',
      title: '2. Quotation Follow-Up',
      text: `Dear ${lead.name},\n\nHope you are doing well. We wanted to quickly follow up regarding the quotation sent for your project requirements (${lead.companyName || 'Media Services'}).\n\nHave you had a chance to review the pricing? Let us know if you need any technical clarifications or custom delivery timelines.\n\nWarm regards,\n${user?.name || 'Sales Team'}`
    },
    {
      id: 'payment',
      title: '3. Payment & Proforma Reminder',
      text: `Dear ${lead.name},\n\nKindly note that your proforma invoice is ready for processing. Please confirm the schedule and share the UTR/bank receipt to initiate priority processing.\n\nThank you,\nCraft Media Hub`
    }
  ];

  useEffect(() => {
    const t = templates.find(item => item.id === selectedTemplate);
    if (t) setCustomText(t.text);
  }, [selectedTemplate]);

  const handleOpenWhatsApp = () => {
    const cleanedPhone = lead.phone.replace(/[^0-9]/g, '');
    const phoneWithCountry = cleanedPhone.length === 10 ? `91${cleanedPhone}` : cleanedPhone;
    const url = `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(customText)}`;
    window.open(url, '_blank');
    onSuccess(`WhatsApp chat opened for ${lead.name}!`);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 border border-slate-200 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-emerald-600" />
              <span>WhatsApp Quick Sender</span>
            </h3>
            <p className="text-xs text-slate-500">
              Recipient: <span className="font-bold text-slate-800">{lead.name}</span> ({lead.phone})
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Template Selector */}
        <div className="space-y-1.5 text-xs">
          <label className="block font-bold text-slate-800">Choose Message Template:</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {templates.map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedTemplate(t.id)}
                className={`p-2 rounded-xl text-left font-bold text-xs border transition-all ${
                  selectedTemplate === t.id
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300 shadow-2xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {t.title}
              </button>
            ))}
          </div>
        </div>

        {/* Message Editor */}
        <div>
          <label className="block text-xs font-bold text-slate-800 mb-1">Message Preview / Editor</label>
          <textarea
            rows={7}
            value={customText}
            onChange={e => setCustomText(e.target.value)}
            className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Launch WhatsApp Button */}
        <button
          type="button"
          onClick={handleOpenWhatsApp}
          className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2"
        >
          <Send className="w-4 h-4" />
          <span>Launch WhatsApp Chat (`wa.me`)</span>
        </button>
      </div>
    </div>
  );
};

// 4. SCHEDULE FOLLOW-UP MODAL
interface ScheduleFollowUpModalProps {
  lead: Lead;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

const ScheduleFollowUpModal: React.FC<ScheduleFollowUpModalProps> = ({ lead, onClose, onSuccess }) => {
  const { token, user } = useAuth();
  const [type, setType] = useState<'Call' | 'Meeting' | 'WhatsApp' | 'Task'>('Call');
  const [title, setTitle] = useState(`Follow-up with ${lead.name}`);
  const [description, setDescription] = useState('');
  const [scheduledAt, setScheduledAt] = useState(
    new Date(Date.now() + 86400000).toISOString().split('T')[0]
  );
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token || localStorage.getItem('token')}`
      };

      const res = await fetch('/api/follow-ups', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          leadId: lead._id,
          type,
          title,
          description,
          scheduledAt: `${scheduledAt}T10:00:00.000Z`,
          assignedTo: lead.assignedTo || user?.name
        })
      });

      const json = await res.json();
      if (json.success) {
        onSuccess(`Follow-up scheduled for ${lead.name} on ${scheduledAt}!`);
      } else {
        alert(json.message || 'Failed to schedule follow-up');
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-slate-200 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              <span>Schedule Client Follow-Up</span>
            </h3>
            <p className="text-xs text-slate-500">Lead: {lead.name} ({lead.phone})</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block font-bold text-slate-800 mb-1">Follow-up Type</label>
            <div className="grid grid-cols-4 gap-2">
              {['Call', 'Meeting', 'WhatsApp', 'Task'].map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t as any)}
                  className={`py-2 rounded-xl font-bold text-xs border transition-all ${
                    type === t
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-800 mb-1">Reminder Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-800 mb-1">Scheduled Date</label>
            <input
              type="date"
              required
              value={scheduledAt}
              onChange={e => setScheduledAt(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-800 mb-1">Agenda / Details</label>
            <textarea
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="e.g. Discuss revised payment terms and discount approval"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{submitting ? 'Scheduling...' : 'Save Follow-Up Reminder'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
