import React, { useState, useEffect } from 'react';
import {
  Monitor,
  Mic,
  MapPin,
  Clock,
  AlertTriangle,
  RefreshCw,
  Play,
  Pause,
  Upload,
  ChevronUp,
  ChevronDown,
  X,
  CheckCircle2,
  Wifi,
  WifiOff
} from 'lucide-react';
import { screenRecordingService } from '@/src/services/screenRecordingService';
import { recordingUploadQueue } from '@/src/services/recordingUploadQueue';
import { employeeTrackingService } from '@/src/services/employeeTrackingService';
import { api } from '@/src/services/api';
import { WorkSessionDoc, WorkSessionPolicyDoc } from '@/craftmedia_backend/database/types';

interface PersistentRecordingIndicatorProps {
  session: WorkSessionDoc | null;
  policy: WorkSessionPolicyDoc | null;
  onRefreshSession?: () => void;
}

export const PersistentRecordingIndicator: React.FC<PersistentRecordingIndicatorProps> = ({
  session,
  policy,
  onRefreshSession
}) => {
  const [expanded, setExpanded] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [pendingUploads, setPendingUploads] = useState(0);
  const [gpsAccuracy, setGpsAccuracy] = useState<number>(15);
  const [trackingState, setTrackingState] = useState<'ACTIVE' | 'OFFLINE' | 'ERROR'>('ACTIVE');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isPaused, setIsPaused] = useState(false);
  const [interrupted, setInterrupted] = useState(false);
  const [resuming, setResuming] = useState(false);

  // 1. Shift duration live timer
  useEffect(() => {
    if (!session || session.status !== 'ACTIVE') return;

    const startTs = new Date(session.startedAt).getTime();
    const updateTimer = () => {
      const now = Date.now();
      const secs = Math.max(0, Math.floor((now - startTs) / 1000));
      setElapsedSeconds(secs);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [session?.startedAt, session?.status]);

  // 2. Upload queue subscription
  useEffect(() => {
    const unsub = recordingUploadQueue.subscribe(count => {
      setPendingUploads(count);
    });
    return unsub;
  }, []);

  // 3. GPS tracking subscription
  useEffect(() => {
    const unsub = employeeTrackingService.subscribe((loc, acc, stat) => {
      if (acc > 0) setGpsAccuracy(acc);
      setTrackingState(stat);
    });
    return unsub;
  }, []);

  // 4. Online/Offline network monitoring
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // 5. Check if screen recording is still active
  useEffect(() => {
    if (!session || session.status !== 'ACTIVE') return;

    const checkTrack = () => {
      const isScreenActive = screenRecordingService.hasActiveScreenTrack();
      if (!isScreenActive && session.screenRecordingStatus === 'ACTIVE') {
        setInterrupted(true);
      } else {
        setInterrupted(false);
      }
    };

    const interval = setInterval(checkTrack, 3000);
    return () => clearInterval(interval);
  }, [session?.screenRecordingStatus, session?.status]);

  // Format seconds to HH:MM:SS
  const formatTime = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Resume Recording Handler
  const handleResumeRecording = async () => {
    if (!session) return;
    setResuming(true);
    try {
      const withAudio = Boolean(policy?.microphoneRecordingEnabled);
      await screenRecordingService.requestDisplayStream(withAudio);
      await screenRecordingService.startRecording({
        requireAudio: withAudio,
        chunkDurationMinutes: policy?.recordingChunkMinutes || 10,
        onChunkReady: (blob, segNum, dur, meta) => {
          recordingUploadQueue.enqueue(session._id, segNum, dur, blob, meta);
        },
        onInterrupted: () => setInterrupted(true)
      });


      await api.post(`/employee/work-session/${session._id}/recording-status`, {
        status: 'ACTIVE',
        reason: 'Employee resumed screen recording'
      });

      setInterrupted(false);
      if (onRefreshSession) onRefreshSession();
    } catch (err: any) {
      console.warn('Could not resume recording:', err);
    } finally {
      setResuming(false);
    }
  };

  if (!session || session.status !== 'ACTIVE') {
    return null;
  }

  const isRecordingActive = screenRecordingService.hasActiveScreenTrack() && !isPaused;

  return (
    <>
      {/* 1. Floating Unobtrusive Enterprise Bar / Pill */}
      <div className="fixed bottom-4 right-4 z-40 animate-in slide-in-from-bottom-5 duration-300">
        {/* Interruption Alert Banner */}
        {interrupted && (
          <div className="mb-2 p-3 bg-amber-500/95 text-slate-950 font-semibold rounded-2xl shadow-xl border border-amber-400 flex items-center justify-between gap-3 text-xs animate-bounce">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-slate-950 shrink-0" />
              <span>Screen recording interrupted. Policy requires active screen share.</span>
            </div>
            <button
              onClick={handleResumeRecording}
              disabled={resuming}
              className="px-3 py-1 bg-slate-950 text-white rounded-xl text-xs font-bold hover:bg-slate-900 transition-colors shrink-0 flex items-center gap-1 cursor-pointer"
            >
              {resuming ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              <span>Resume Recording</span>
            </button>
          </div>
        )}

        {/* Main Status Pill */}
        <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl p-2.5 sm:px-4 shadow-2xl text-white flex items-center gap-3 sm:gap-4 text-xs">
          {/* Active Pulse Indicator */}
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                interrupted ? 'bg-amber-400 animate-ping' : isRecordingActive ? 'bg-emerald-400 animate-pulse' : 'bg-blue-400'
              }`}
            />
            <span className="font-bold text-slate-200 hidden sm:inline">Work Session</span>
          </div>

          {/* Shift Duration */}
          <div className="flex items-center gap-1.5 font-mono font-bold text-emerald-400 bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-700/60">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{formatTime(elapsedSeconds)}</span>
          </div>

          {/* Screen Status Badge */}
          <div className="flex items-center gap-1 text-[11px] text-slate-300">
            <Monitor className="w-3.5 h-3.5 text-indigo-400" />
            <span className={isRecordingActive ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
              {interrupted ? 'Interrupted' : isRecordingActive ? 'Active' : 'Off'}
            </span>
          </div>

          {/* Microphone Status */}
          {policy?.microphoneRecordingEnabled && (
            <div className="hidden md:flex items-center gap-1 text-[11px] text-slate-300">
              <Mic className="w-3.5 h-3.5 text-purple-400" />
              <span>{screenRecordingService.hasActiveMicTrack() ? 'Active' : 'Disabled'}</span>
            </div>
          )}

          {/* GPS Accuracy */}
          <div className="hidden lg:flex items-center gap-1 text-[11px] text-slate-300">
            <MapPin className="w-3.5 h-3.5 text-blue-400" />
            <span>±{gpsAccuracy}m</span>
          </div>

          {/* Pending Uploads Queue */}
          {pendingUploads > 0 && (
            <div className="flex items-center gap-1 text-[11px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
              <Upload className="w-3 h-3 animate-bounce" />
              <span>{pendingUploads} queued</span>
            </div>
          )}

          {/* Expand Details Trigger */}
          <button
            type="button"
            onClick={() => setExpanded(prev => !prev)}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="View Session Telemetry"
          >
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 2. Expanded Session Health Details Modal */}
      {expanded && (
        <div className="fixed bottom-20 right-4 z-40 bg-slate-900 border border-slate-700/80 rounded-3xl p-5 shadow-2xl max-w-sm w-full text-white space-y-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div>
              <h4 className="text-xs font-bold text-white">Work Session Telemetry</h4>
              <p className="text-[10px] text-slate-400">Shift Started: {session.shiftStart || 'Today'}</p>
            </div>
            <button onClick={() => setExpanded(false)} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 bg-slate-800/60 rounded-xl border border-slate-700/60 space-y-1">
              <span className="text-[10px] text-slate-400">Screen Recording</span>
              <div className="flex items-center gap-1.5 font-bold text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{isRecordingActive ? 'Active' : 'Off'}</span>
              </div>
            </div>

            <div className="p-2.5 bg-slate-800/60 rounded-xl border border-slate-700/60 space-y-1">
              <span className="text-[10px] text-slate-400">GPS Live Tracking</span>
              <div className="flex items-center gap-1.5 font-bold text-blue-400">
                <MapPin className="w-3.5 h-3.5" />
                <span>±{gpsAccuracy}m Accuracy</span>
              </div>
            </div>

            <div className="p-2.5 bg-slate-800/60 rounded-xl border border-slate-700/60 space-y-1">
              <span className="text-[10px] text-slate-400">Queued Uploads</span>
              <div className="flex items-center gap-1.5 font-bold text-amber-400">
                <Upload className="w-3.5 h-3.5" />
                <span>{pendingUploads} Segments</span>
              </div>
            </div>

            <div className="p-2.5 bg-slate-800/60 rounded-xl border border-slate-700/60 space-y-1">
              <span className="text-[10px] text-slate-400">Network State</span>
              <div className="flex items-center gap-1.5 font-bold">
                {isOnline ? (
                  <>
                    <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Online</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3.5 h-3.5 text-rose-400" />
                    <span className="text-rose-400">Offline (Queueing)</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {interrupted && (
            <button
              type="button"
              onClick={handleResumeRecording}
              disabled={resuming}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              {resuming ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              <span>Resume Screen Recording</span>
            </button>
          )}
        </div>
      )}
    </>
  );
};
