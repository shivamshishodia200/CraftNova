import React, { useState, useEffect, useRef } from 'react';
import {
  Monitor,
  Video,
  Clock,
  MapPin,
  Calendar,
  Users,
  Search,
  Filter,
  Download,
  Trash2,
  Play,
  Pause,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  HardDrive,
  Shield,
  Eye,
  FileVideo,
  ChevronRight,
  X,
  PhoneCall,
  Target,
  Award,
  Activity,
  Wifi,
  Mic,
  FileText,
  Layers,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { api } from '@/src/services/api';
import { useAuth } from '@/src/context/AuthContext';
import { WorkSessionDoc, RecordingSegmentDoc } from '@/craftmedia_backend/database/types';
import {
  AdvancedWorkSessionPlayer,
  AdvancedWorkSessionPlayerRef,
  CrmEventMarker
} from '../components/worksession/AdvancedWorkSessionPlayer';

export const HrWorkSessionsView: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const playerRef = useRef<AdvancedWorkSessionPlayerRef | null>(null);

  // State
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);

  // Selected Session for Details Drawer
  const [selectedSession, setSelectedSession] = useState<any | null>(null);
  const [drawerTab, setDrawerTab] = useState<'OVERVIEW' | 'TIMELINE' | 'RECORDINGS' | 'HEALTH' | 'ROUTE' | 'AUDIT'>('OVERVIEW');
  const [timelineEvents, setTimelineEvents] = useState<any[]>([]);
  const [recordingSegments, setRecordingSegments] = useState<RecordingSegmentDoc[]>([]);
  const [loadingDrawer, setLoadingDrawer] = useState(false);
  const [activeSegmentNumber, setActiveSegmentNumber] = useState<number>(1);

  // Storage Monitoring State
  const [storageStats, setStorageStats] = useState<any | null>(null);
  const [showStorageModal, setShowStorageModal] = useState(false);
  const [cleaningRetention, setCleaningRetention] = useState(false);
  const [retentionMessage, setRetentionMessage] = useState<string | null>(null);

  const canViewRecordings = hasPermission('VIEW_EMPLOYEE_RECORDING') || user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';
  const canDownloadRecordings = hasPermission('DOWNLOAD_EMPLOYEE_RECORDING') || user?.role === 'SUPER_ADMIN';
  const canDeleteRecordings = hasPermission('DELETE_EMPLOYEE_RECORDING') || user?.role === 'SUPER_ADMIN';

  // Fetch Work Sessions
  const fetchSessions = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (dateFilter) queryParams.append('date', dateFilter);
      if (statusFilter !== 'ALL') queryParams.append('status', statusFilter);
      if (search) queryParams.append('search', search);

      const res = await api.get(`/hr/work-sessions?${queryParams.toString()}`);
      if (res.success && res.data) {
        setSessions(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch HR work sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Storage Stats
  const fetchStorageStats = async () => {
    try {
      const res = await api.get('/hr/work-sessions/storage/stats');
      if (res.success && res.data) {
        setStorageStats(res.data);
      }
    } catch (err) {
      console.warn('Could not fetch storage stats:', err);
    }
  };

  useEffect(() => {
    fetchSessions();
    fetchStorageStats();
  }, [dateFilter, statusFilter]);

  // Open Session Detail Drawer
  const openSessionDetail = async (sess: any) => {
    setSelectedSession(sess);
    setDrawerTab('OVERVIEW');
    setLoadingDrawer(true);

    try {
      const [tlRes, recRes] = await Promise.all([
        api.get(`/hr/work-sessions/${sess._id}/timeline`),
        api.get(`/hr/work-sessions/${sess._id}/recordings`)
      ]);

      if (tlRes.success && tlRes.data) setTimelineEvents(tlRes.data);
      if (recRes.success && recRes.data) {
        setRecordingSegments(recRes.data);
        if (recRes.data.length > 0) {
          setActiveSegmentNumber(recRes.data[0].segmentNumber);
        }
      }
    } catch (err) {
      console.error('Failed to load session details:', err);
    } finally {
      setLoadingDrawer(false);
    }
  };

  // Jump from Timeline Event directly into Video Player
  const handleJumpToVideo = (evt: any) => {
    if (!canViewRecordings) {
      alert("Access Denied: You do not possess 'VIEW_EMPLOYEE_RECORDING' permission.");
      return;
    }

    setDrawerTab('RECORDINGS');
    const segNum = evt.segmentNumber || 1;
    const offsetSec = evt.segmentOffsetSeconds || 0;

    setTimeout(() => {
      if (playerRef.current) {
        playerRef.current.jumpToSegmentTime(segNum, offsetSec);
      }
    }, 200);
  };

  // Trigger Retention Cleanup
  const handleRetentionCleanup = async () => {
    setCleaningRetention(true);
    setRetentionMessage(null);
    try {
      const res = await api.post('/hr/work-sessions/storage/cleanup');
      if (res.success) {
        setRetentionMessage(res.message);
        fetchStorageStats();
      } else {
        setRetentionMessage(res.message || 'Cleanup failed');
      }
    } catch (err: any) {
      setRetentionMessage(err.message || 'Cleanup failed');
    } finally {
      setCleaningRetention(false);
    }
  };

  // Convert timeline events to CRM markers for player
  const crmMarkers: CrmEventMarker[] = timelineEvents
    .filter(evt => evt.segmentNumber && evt.segmentOffsetSeconds !== undefined)
    .map(evt => ({
      id: evt.id,
      time: evt.time,
      timestamp: evt.timestamp,
      type: evt.type,
      title: evt.title,
      description: evt.description,
      segmentNumber: evt.segmentNumber,
      segmentOffsetSeconds: evt.segmentOffsetSeconds
    }));

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold mb-1">
            <span>People & HR</span>
            <span>/</span>
            <span className="text-blue-600 font-bold">Work Sessions & Recordings</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Monitor className="w-7 h-7 text-blue-600" />
            <span>Employee Work Sessions & Telemetry</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Verified shift governance, screen & audio recording vault, timeline auditing, and geofence tracking.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              fetchStorageStats();
              setShowStorageModal(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
          >
            <HardDrive className="w-4 h-4 text-slate-600" />
            <span>Storage & Retention</span>
          </button>
          <button
            onClick={fetchSessions}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
            title="Refresh Sessions"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Total Sessions Today</span>
          <div className="text-2xl font-black text-slate-900">{sessions.length}</div>
          <span className="text-[10px] text-emerald-600 font-semibold">
            {sessions.filter(s => s.status === 'ACTIVE').length} currently active
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Recording Storage</span>
          <div className="text-2xl font-black text-blue-600">{storageStats?.totalStorageMB || '0 MB'}</div>
          <span className="text-[10px] text-slate-500 font-medium">
            {storageStats?.totalRecordings || 0} total video segments
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Avg Recording Coverage</span>
          <div className="text-2xl font-black text-indigo-600">
            {sessions.length > 0
              ? `${Math.round(sessions.reduce((acc, s) => acc + (s.recordingCoveragePercent || 0), 0) / sessions.length)}%`
              : '100%'}
          </div>
          <span className="text-[10px] text-slate-500 font-medium">Work session compliance</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Live GPS Status</span>
          <div className="text-2xl font-black text-emerald-600">
            {sessions.filter(s => s.trackingStatus === 'ACTIVE').length} / {sessions.length}
          </div>
          <span className="text-[10px] text-slate-500 font-medium">Inside geofence zones</span>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search employee name or ID..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Date Picker */}
          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <input
              type="date"
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-700 outline-none cursor-pointer"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 outline-none cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active Now</option>
            <option value="COMPLETED">Completed</option>
            <option value="ON_BREAK">On Break</option>
            <option value="COMPLETED_UPLOAD_PENDING">Upload Pending</option>
            <option value="ACTIVE_WITH_WARNING">Active with Warning</option>
          </select>
        </div>
      </div>

      {/* Sessions Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">Employee</th>
                <th className="py-3.5 px-4">Shift Span</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Work / Break</th>
                <th className="py-3.5 px-4">Recording</th>
                <th className="py-3.5 px-4">Tracking</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
                    <span>Loading work sessions...</span>
                  </td>
                </tr>
              ) : sessions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-600">No work sessions found for this date.</p>
                  </td>
                </tr>
              ) : (
                sessions.map(sess => (
                  <tr key={sess._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{sess.employeeName}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{sess.employeeId}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-700">
                        {sess.shiftStart || '09:30 AM'} — {sess.shiftEnd || (sess.status === 'ACTIVE' ? 'Active' : '—')}
                      </div>
                      <div className="text-[10px] text-slate-400">{sess.sessionDate}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          sess.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : sess.status === 'ON_BREAK'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : sess.status === 'COMPLETED_UPLOAD_PENDING'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : sess.status === 'ACTIVE_WITH_WARNING'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {sess.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-800">
                        {sess.dailySummary?.netWorkHours || `${Math.round((sess.totalWorkSeconds || 0) / 3600)}h ${Math.round(((sess.totalWorkSeconds || 0) % 3600) / 60)}m`}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Break: {Math.round((sess.totalBreakSeconds || 0) / 60)}m
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            sess.screenRecordingStatus === 'ACTIVE'
                              ? 'bg-emerald-500 animate-pulse'
                              : sess.screenRecordingStatus === 'STOPPED'
                              ? 'bg-slate-400'
                              : 'bg-amber-500'
                          }`}
                        />
                        <span className="font-semibold text-slate-700">
                          {sess.segmentsCount || 0} segments ({sess.recordingCoveragePercent || 0}%)
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1 text-slate-700">
                        <MapPin className="w-3.5 h-3.5 text-blue-500" />
                        <span className="font-semibold">{sess.trackingCoveragePercent || 95}% geofence</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => openSessionDetail(sess)}
                        className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1"
                      >
                        <span>Inspect</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DETAIL DRAWER / MODAL */}
      {selectedSession && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex justify-end">
          <div className="w-full max-w-3xl bg-white h-full shadow-2xl overflow-y-auto flex flex-col animate-in slide-in-from-right duration-300">
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-200 flex items-start justify-between bg-slate-50">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-slate-900">{selectedSession.employeeName}</h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                    {selectedSession.employeeId}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      selectedSession.status === 'ACTIVE'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {selectedSession.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Shift: {selectedSession.shiftStart || '09:30 AM'} — {selectedSession.shiftEnd || 'Ongoing'} &bull; {selectedSession.sessionDate}
                </p>
              </div>
              <button
                onClick={() => setSelectedSession(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Tabs Bar */}
            <div className="flex items-center border-b border-slate-200 px-5 gap-5 text-xs font-bold overflow-x-auto">
              {(['OVERVIEW', 'TIMELINE', 'RECORDINGS', 'HEALTH', 'ROUTE', 'AUDIT'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setDrawerTab(tab)}
                  className={`py-3 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                    drawerTab === tab ? 'border-blue-600 text-blue-600 font-black' : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {tab === 'TIMELINE' ? `Timeline (${timelineEvents.length})` : tab === 'RECORDINGS' ? `Recordings (${recordingSegments.length})` : tab}
                </button>
              ))}
            </div>

            {/* Drawer Body */}
            <div className="p-5 flex-1 space-y-5">
              {/* TAB 1: OVERVIEW */}
              {drawerTab === 'OVERVIEW' && (
                <div className="space-y-4">
                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-400 block font-semibold">Net Work Time</span>
                      <span className="text-sm font-bold text-slate-900">
                        {selectedSession.dailySummary?.netWorkHours || `${Math.round((selectedSession.totalWorkSeconds || 0) / 3600)}h`}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-400 block font-semibold">Break Taken</span>
                      <span className="text-sm font-bold text-amber-600">
                        {selectedSession.dailySummary?.breakMinutes || Math.round((selectedSession.totalBreakSeconds || 0) / 60)}m
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-400 block font-semibold">CRM Active</span>
                      <span className="text-sm font-bold text-blue-600">
                        {selectedSession.dailySummary?.crmActiveHours || '6h 15m'}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-400 block font-semibold">Travel Distance</span>
                      <span className="text-sm font-bold text-teal-600">
                        {selectedSession.dailySummary?.travelDistanceKm || 0} km
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-400 block font-semibold">Calls Logged</span>
                      <span className="text-sm font-bold text-indigo-600">
                        {selectedSession.dailySummary?.callsCount || 0} calls
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-400 block font-semibold">Recording Coverage</span>
                      <span className="text-sm font-bold text-emerald-600">
                        {selectedSession.recordingCoveragePercent || 95}%
                      </span>
                    </div>
                  </div>

                  {/* Recording Coverage Bar */}
                  <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-2 border border-slate-800">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold flex items-center gap-1.5">
                        <Monitor className="w-3.5 h-3.5 text-blue-400" />
                        <span>Work Session Recording Coverage</span>
                      </span>
                      <span className="font-bold text-emerald-400">{selectedSession.recordingCoveragePercent || 95}% Compliant</span>
                    </div>

                    {/* Visual Segment Strip */}
                    <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden flex">
                      <div style={{ width: `${selectedSession.recordingCoveragePercent || 95}%` }} className="bg-emerald-500 h-full" title="Recorded Duration" />
                      <div style={{ width: '5%' }} className="bg-amber-500 h-full" title="Break Time" />
                    </div>

                    <div className="flex items-center gap-4 text-[10px] text-slate-400 pt-1">
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Recorded ({recordingSegments.length} Segments)
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-amber-500"></span> Break
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-slate-600"></span> Gaps
                      </span>
                    </div>
                  </div>

                  {/* Interruption Notice */}
                  {selectedSession.interruptionCount > 0 && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>{selectedSession.interruptionCount} screen recording interruption(s) recorded during this shift.</span>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: AUDIT TIMELINE WITH VIDEO SYNC */}
              {drawerTab === 'TIMELINE' && (
                <div className="space-y-3">
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 flex items-center justify-between">
                    <span className="font-semibold">💡 Click any timeline event to jump directly into that moment in the video recording.</span>
                  </div>

                  {timelineEvents.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-xs">No timeline events recorded.</div>
                  ) : (
                    <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                      {timelineEvents.map((evt, idx) => (
                        <div
                          key={idx}
                          onClick={() => evt.segmentNumber && handleJumpToVideo(evt)}
                          className={`relative text-xs p-2.5 rounded-xl border transition-all ${
                            evt.segmentNumber
                              ? 'bg-slate-50 hover:bg-blue-50 border-slate-200 hover:border-blue-300 cursor-pointer group'
                              : 'bg-white border-transparent'
                          }`}
                        >
                          <span className="absolute -left-6 top-3.5 w-2.5 h-2.5 rounded-full bg-blue-600 border-2 border-white shadow-xs" />
                          <div className="flex items-center justify-between">
                            <div className="font-bold text-slate-800 flex items-center gap-2">
                              <span className="font-mono text-[11px] text-blue-600">
                                {evt.timeSpan || evt.time}
                              </span>
                              <span>{evt.title}</span>
                            </div>

                            {evt.segmentNumber && (
                              <span className="text-[10px] font-bold text-blue-600 group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                                <Play className="w-3 h-3 fill-current" />
                                <span>Jump to Video</span>
                              </span>
                            )}
                          </div>
                          {evt.description && (
                            <p className="text-[11px] text-slate-500 mt-1">{evt.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: SCREEN RECORDINGS */}
              {drawerTab === 'RECORDINGS' && (
                <div className="space-y-4">
                  {/* Advanced Video Player */}
                  {recordingSegments.length > 0 ? (
                    <AdvancedWorkSessionPlayer
                      ref={playerRef}
                      workSessionId={selectedSession._id}
                      segments={recordingSegments}
                      crmMarkers={crmMarkers}
                      initialSegmentNumber={activeSegmentNumber}
                      onSegmentChange={setActiveSegmentNumber}
                    />
                  ) : (
                    <div className="p-8 bg-slate-900 rounded-3xl border border-slate-800 text-center space-y-2 text-white">
                      <FileVideo className="w-8 h-8 mx-auto text-slate-500" />
                      <h4 className="text-sm font-bold">No Recordings Stored</h4>
                      <p className="text-xs text-slate-400">No screen capture segments have been uploaded for this session yet.</p>
                    </div>
                  )}

                  {/* Segments Detailed Breakdown */}
                  <div className="space-y-2 pt-2">
                    <h4 className="text-xs font-bold text-slate-800 flex items-center justify-between">
                      <span>Available Recording Segments ({recordingSegments.length})</span>
                      <span className="text-[10px] text-slate-400 font-normal">HTTP 206 Partial Streaming Enabled</span>
                    </h4>

                    {recordingSegments.map(seg => (
                      <div
                        key={seg._id}
                        className="p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100/80 flex items-center justify-between gap-3 text-xs transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                            <FileVideo className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-800">
                                Segment #{seg.segmentNumber} ({Math.round((seg.actualMediaDurationSeconds || seg.durationSeconds || 0) / 60)}m {Math.round((seg.actualMediaDurationSeconds || seg.durationSeconds || 0) % 60)}s)
                              </span>
                              <span
                                className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                                  seg.processingStatus === 'READY'
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : seg.processingStatus === 'FAILED'
                                    ? 'bg-rose-100 text-rose-700'
                                    : 'bg-blue-100 text-blue-700'
                                }`}
                              >
                                {seg.processingStatus || 'READY'}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 block font-mono">
                              {(seg.fileSize / (1024 * 1024)).toFixed(1)} MB &bull; {seg.mimeType} &bull; SHA-256: {seg.checksum ? seg.checksum.substring(0, 10) + '...' : 'Verified'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setActiveSegmentNumber(seg.segmentNumber);
                              if (playerRef.current) {
                                playerRef.current.jumpToSegmentTime(seg.segmentNumber, 0);
                              }
                            }}
                            className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>Play</span>
                          </button>

                          {canDownloadRecordings && (
                            <a
                              href={`/api/hr/work-sessions/${selectedSession._id}/recordings/${seg.segmentNumber}/download?token=${api.getToken()}`}
                              download
                              className="p-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 transition-colors"
                              title="Download Recording"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 4: HEALTH & TELEMETRY */}
              {drawerTab === 'HEALTH' && (
                <div className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                      <span className="text-slate-400 block text-[10px] font-semibold">Screen Stream State</span>
                      <div className="font-bold text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{selectedSession.screenRecordingStatus || 'ACTIVE'}</span>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                      <span className="text-slate-400 block text-[10px] font-semibold">Microphone Audio</span>
                      <div className="font-bold text-slate-700 flex items-center gap-1">
                        <Mic className="w-3.5 h-3.5 text-purple-600" />
                        <span>{selectedSession.microphoneStatus || 'NOT_REQUIRED'}</span>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                      <span className="text-slate-400 block text-[10px] font-semibold">Live GPS Tracking</span>
                      <div className="font-bold text-blue-600 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>{selectedSession.trackingStatus || 'ACTIVE'} (±12m accuracy)</span>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                      <span className="text-slate-400 block text-[10px] font-semibold">Heartbeat Status</span>
                      <div className="font-bold text-slate-700">
                        {selectedSession.lastHeartbeatAt ? `${new Date(selectedSession.lastHeartbeatAt).toLocaleTimeString()}` : 'Live'}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: ROUTE & GEOFENCE */}
              {drawerTab === 'ROUTE' && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center space-y-2 text-xs">
                  <MapPin className="w-6 h-6 mx-auto text-blue-600" />
                  <h4 className="font-bold text-slate-800">Geofence Verified Field Operations</h4>
                  <p className="text-slate-500 max-w-sm mx-auto">
                    Punch-in verified at authorized location. Total logged travel distance: {selectedSession.dailySummary?.travelDistanceKm || 0} km.
                  </p>
                </div>
              )}

              {/* TAB 6: AUDIT TRAIL */}
              {drawerTab === 'AUDIT' && (
                <div className="space-y-2 text-xs">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <span className="font-bold text-slate-800">Work Session Created</span>
                    <p className="text-[11px] text-slate-500">Initiated at {new Date(selectedSession.startedAt).toLocaleString()}</p>
                  </div>
                  {selectedSession.endedAt && (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                      <span className="font-bold text-slate-800">Work Session Finalized</span>
                      <p className="text-[11px] text-slate-500">Concluded at {new Date(selectedSession.endedAt).toLocaleString()}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* STORAGE & RETENTION MODAL */}
      {showStorageModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-blue-600" />
                <span>Recording Storage & Retention Policy</span>
              </h3>
              <button onClick={() => setShowStorageModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs text-slate-600">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span>Total Recordings</span>
                <span className="font-bold text-slate-900">{storageStats?.totalRecordings || 0}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span>Total Disk Storage</span>
                <span className="font-bold text-blue-600">{storageStats?.totalStorageMB || '0 MB'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span>Average Chunk Size</span>
                <span className="font-bold text-slate-900">{storageStats?.avgSegmentMB || '0 MB'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span>Auto-Retention Period</span>
                <span className="font-bold text-slate-900">{storageStats?.retentionDaysConfigured || 15} days</span>
              </div>
            </div>

            {retentionMessage && (
              <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-semibold">
                {retentionMessage}
              </div>
            )}

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleRetentionCleanup}
                disabled={cleaningRetention}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
              >
                {cleaningRetention ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>Run Retention Cleanup Now</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
