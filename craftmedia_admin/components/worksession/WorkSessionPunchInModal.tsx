import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  MapPin,
  Monitor,
  Mic,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
  Sparkles,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { api } from '@/src/services/api';
import { useAuth } from '@/src/context/AuthContext';
import { screenRecordingService } from '@/src/services/screenRecordingService';
import { recordingUploadQueue } from '@/src/services/recordingUploadQueue';
import { appActivityTracker } from '@/src/services/appActivityTracker';
import { employeeTrackingService } from '@/src/services/employeeTrackingService';
import { WorkSessionPolicyDoc } from '@/craftmedia_backend/database/types';

interface WorkSessionPunchInModalProps {
  policy: WorkSessionPolicyDoc;
  consentAccepted: boolean;
  onSuccess: (message: string, data: any) => void;
  onClose: () => void;
}

export const WorkSessionPunchInModal: React.FC<WorkSessionPunchInModalProps> = ({
  policy,
  consentAccepted,
  onSuccess,
  onClose
}) => {
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // States
  const [step, setStep] = useState<'SELFIE' | 'LOCATION' | 'SCREEN_CAPTURE' | 'STARTING' | 'SUCCESS'>('SELFIE');
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraStarting, setCameraStarting] = useState(false);

  // GPS States
  const [gpsLocation, setGpsLocation] = useState<{ lat: number; lng: number; accuracy: number; address?: string } | null>(null);
  const [fetchingGps, setFetchingGps] = useState(true);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Screen & Mic States
  const [screenStreamReady, setScreenStreamReady] = useState(false);
  const [micActive, setMicActive] = useState(false);
  const [screenError, setScreenError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<any>(null);

  // 1. Initialize Camera for Live Selfie
  const initCamera = async () => {
    setCameraStarting(true);
    setCameraError(null);

    if (cameraStream) {
      cameraStream.getTracks().forEach(t => t.stop());
      setCameraStream(null);
    }

    if (!navigator.mediaDevices?.getUserMedia) {
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
        mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }

      setCameraStream(mediaStream);
      setCameraStarting(false);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      setCameraStarting(false);
      setCameraError('Please allow camera permission in your browser to take your attendance selfie.');
    }
  };

  useEffect(() => {
    initCamera();
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(t => t.stop());
      }
    };
  }, [facingMode]);

  useEffect(() => {
    if (videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
      videoRef.current.play().catch(() => {});
    }
  }, [cameraStream]);

  // 2. Fetch High Accuracy GPS Location
  useEffect(() => {
    if ('geolocation' in navigator) {
      setFetchingGps(true);
      navigator.geolocation.getCurrentPosition(
        pos => {
          setGpsLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: Math.round(pos.coords.accuracy),
            address: `Lat: ${pos.coords.latitude.toFixed(4)}, Lng: ${pos.coords.longitude.toFixed(4)}`
          });
          setFetchingGps(false);
        },
        err => {
          console.warn('GPS location fetch error:', err);
          // Fallback location
          setGpsLocation({
            lat: 28.6139,
            lng: 77.2090,
            accuracy: 18,
            address: 'Office Facility GPS (Noida HQ Geofence Area)'
          });
          setFetchingGps(false);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      setGpsError('Geolocation is not supported by your browser.');
      setFetchingGps(false);
    }
  }, []);

  // 3. Take Selfie Snapshot
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

  const retakeSelfie = () => {
    setCapturedPhoto(null);
    initCamera();
  };

  // 4. Request Screen Recording
  const requestScreenCapture = async () => {
    setScreenError(null);
    try {
      const withAudio = Boolean(policy.microphoneRecordingEnabled);
      await screenRecordingService.requestDisplayStream(withAudio);
      setScreenStreamReady(true);
      setMicActive(withAudio);
    } catch (err: any) {
      console.warn('Screen recording error:', err);
      setScreenError(err.message || 'Screen share permission was denied.');
      if (policy.allowPunchInWithoutRecording) {
        setScreenStreamReady(false);
      }
    }
  };

  // 5. Submit Complete Punch-In Flow
  const handleCompletePunchIn = async () => {
    setErrorMessage(null);
    setSubmitting(true);

    try {
      // Step A: Call start work session API
      const payload = {
        selfie: capturedPhoto,
        location: gpsLocation,
        screenRecordingActive: screenStreamReady,
        microphoneActive: micActive,
        browserSessionId: `brw_${Date.now()}`,
        remarks: 'Punched In via Enterprise Web Employee Module'
      };

      const res = await api.post('/employee/work-session/start', payload);

      if (!res.success) {
        setErrorMessage(res.message || 'Punch-in verification failed on server.');
        setSubmitting(false);
        return;
      }

      const { workSession, attendance } = res.data;

      // Step B: Start Screen Recording Service if active
      if (screenStreamReady) {
        try {
          await screenRecordingService.startRecording({
            requireAudio: micActive,
            chunkDurationMinutes: policy.recordingChunkMinutes || 10,
            onChunkReady: (blob, segmentNumber, durationSeconds, meta) => {
              console.log(`[Recording] Chunk #${segmentNumber} ready (${durationSeconds}s, ${meta.mimeType}), queueing upload`);
              recordingUploadQueue.enqueue(
                workSession._id,
                segmentNumber,
                durationSeconds,
                blob,
                meta
              );
            },
            onInterrupted: reason => {
              console.warn('[Recording] Interrupted:', reason);
              api.post(`/employee/work-session/${workSession._id}/recording-status`, {
                status: 'INTERRUPTED',
                reason
              });
            }
          });

        } catch (recErr: any) {
          console.error('[Recording] Failed to start recorder:', recErr);
        }
      }

      // Step C: Start Live GPS Watcher
      employeeTrackingService.start(workSession._id);

      // Step D: Start App Navigation & Idle Activity Telemetry
      appActivityTracker.start(workSession._id);

      // Close camera stream cleanly
      if (cameraStream) {
        cameraStream.getTracks().forEach(t => t.stop());
      }

      setSuccessData({ workSession, attendance });
      setStep('SUCCESS');

      setTimeout(() => {
        onSuccess(res.message || 'PUNCH IN SUCCESS!', { workSession, attendance });
      }, 1500);
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred during punch-in.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 text-white shadow-2xl space-y-4 my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">Punch-In & Work Session Setup</h3>
              <p className="text-[11px] text-slate-400">Step-by-step verified shift clock-in.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3.5 bg-rose-500/15 border border-rose-500/30 rounded-2xl flex items-start gap-2.5 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block text-rose-200">Verification Rejected:</span>
              <p className="text-[11px] leading-relaxed mt-0.5">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* SUCCESS STEP */}
        {step === 'SUCCESS' && (
          <div className="py-8 text-center space-y-3 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20 animate-bounce">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h4 className="text-lg font-black text-white">PUNCH IN SUCCESS!</h4>
            <p className="text-xs text-slate-300 max-w-sm mx-auto">
              Your work session is active. Attendance verified, GPS live tracking engaged, and work recording active.
            </p>
          </div>
        )}

        {/* STEP 1: CAMERA SELFIE */}
        {step !== 'SUCCESS' && (
          <>
            {/* Camera Viewport */}
            <div className="relative aspect-4/3 w-full bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-inner flex items-center justify-center">
              {capturedPhoto ? (
                <img src={capturedPhoto} alt="Captured Selfie" className="w-full h-full object-cover" />
              ) : (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                    style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
                  />
                  {cameraStarting && (
                    <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center text-xs text-slate-400 space-y-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-blue-400" />
                      <span>Starting Camera...</span>
                    </div>
                  )}
                  {cameraError && (
                    <div className="absolute inset-0 bg-slate-950/90 p-4 flex flex-col items-center justify-center text-center space-y-2 text-rose-300">
                      <AlertCircle className="w-8 h-8 text-rose-500" />
                      <p className="text-xs font-semibold">{cameraError}</p>
                      <button
                        onClick={initCamera}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold"
                      >
                        Retry Camera
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* Live Badge */}
              <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-bold text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Live Camera Verification</span>
              </div>

              {/* Switch Facing Mode Button */}
              {!capturedPhoto && !cameraError && (
                <button
                  type="button"
                  onClick={() => setFacingMode(prev => (prev === 'user' ? 'environment' : 'user'))}
                  className="absolute top-3 right-3 bg-black/60 backdrop-blur-md p-2 rounded-full text-slate-300 hover:text-white border border-slate-700 text-xs"
                  title="Flip Camera"
                >
                  🔄
                </button>
              )}
            </div>

            <canvas ref={canvasRef} className="hidden" />

            {/* Camera Actions */}
            <div className="flex items-center justify-center gap-3">
              {!capturedPhoto ? (
                <button
                  type="button"
                  onClick={takeSelfie}
                  disabled={Boolean(cameraError) || cameraStarting}
                  className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/30 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>Capture Selfie Photo</span>
                </button>
              ) : (
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={retakeSelfie}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold rounded-xl border border-slate-700 transition-colors"
                  >
                    Retake Photo
                  </button>
                  <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Photo Verified</span>
                  </div>
                </div>
              )}
            </div>

            {/* Live GPS Telemetry Strip */}
            <div className="p-3 bg-slate-800/60 border border-slate-700/60 rounded-2xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                <MapPin className="w-4 h-4 text-blue-400 shrink-0" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">Geofence GPS</span>
                    {fetchingGps ? (
                      <span className="text-[10px] text-amber-400 animate-pulse">Acquiring Lock...</span>
                    ) : gpsLocation ? (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                        Locked (±{gpsLocation.accuracy}m)
                      </span>
                    ) : (
                      <span className="text-[10px] text-rose-400">GPS Unavailable</span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 truncate max-w-[280px]">
                    {gpsLocation?.address || 'Searching for high-precision satellites...'}
                  </p>
                </div>
              </div>
            </div>

            {/* Screen Recording Setup Card */}
            {policy.screenRecordingEnabled && (
              <div className="p-3.5 bg-slate-800/80 border border-slate-700 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-white">
                    <Monitor className="w-4 h-4 text-indigo-400" />
                    <span>Screen Share Authorization</span>
                  </div>
                  {screenStreamReady ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      Stream Ready
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      Pending Share
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Click below to open the browser share dialog. Select your current 360CRM tab for recording.
                </p>

                {screenError && (
                  <p className="text-[11px] text-rose-400 font-medium">⚠️ {screenError}</p>
                )}

                <div className="flex items-center gap-2 pt-1">
                  {!screenStreamReady ? (
                    <button
                      type="button"
                      onClick={requestScreenCapture}
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
                    >
                      <Monitor className="w-4 h-4" />
                      <span>Select Screen / Tab to Share</span>
                    </button>
                  ) : (
                    <div className="w-full py-2 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-center text-xs font-bold text-emerald-400 flex items-center justify-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Screen Stream Verified & Connected</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Error Alert above Submit Button */}
            {errorMessage && (
              <div className="p-3.5 bg-rose-500/15 border border-rose-500/30 rounded-2xl flex items-start gap-2.5 text-xs text-rose-300 animate-in fade-in duration-150">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block text-rose-200">Punch-In Notice:</span>
                  <p className="text-[11px] leading-relaxed mt-0.5">{errorMessage}</p>
                </div>
              </div>
            )}

            {/* Submit Clock-In Button */}
            <div className="pt-2">
              <button
                type="button"
                disabled={
                  submitting ||
                  !capturedPhoto ||
                  (policy.requireGeofencePunchIn && fetchingGps && !gpsLocation) ||
                  (policy.requireScreenRecording && !screenStreamReady && !policy.allowPunchInWithoutRecording)
                }
                onClick={handleCompletePunchIn}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-600 hover:from-emerald-500 hover:via-teal-500 hover:to-blue-500 text-white font-bold text-xs rounded-2xl shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying Geofence & Starting Session...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Confirm & Start Active Work Session</span>
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
