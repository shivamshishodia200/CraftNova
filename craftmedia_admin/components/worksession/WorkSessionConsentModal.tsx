import React, { useState } from 'react';
import {
  Shield,
  Camera,
  MapPin,
  Monitor,
  Mic,
  CheckCircle2,
  FileText,
  X,
  AlertTriangle,
  Lock,
  Clock,
  ArrowRight
} from 'lucide-react';
import { WorkSessionPolicyDoc } from '@/craftmedia_backend/database/types';

interface WorkSessionConsentModalProps {
  policy: WorkSessionPolicyDoc;
  onAccept: (consents: {
    camera: boolean;
    location: boolean;
    screenRecording: boolean;
    microphone: boolean;
  }) => void;
  onCancel: () => void;
}

export const WorkSessionConsentModal: React.FC<WorkSessionConsentModalProps> = ({
  policy,
  onAccept,
  onCancel
}) => {
  const [cameraConsent, setCameraConsent] = useState(true);
  const [locationConsent, setLocationConsent] = useState(true);
  const [screenConsent, setScreenConsent] = useState(policy.screenRecordingEnabled);
  const [micConsent, setMicConsent] = useState(policy.microphoneRecordingEnabled);
  const [showPolicyModal, setShowPolicyModal] = useState(false);

  const canContinue =
    (!policy.requireSelfiePunchIn || cameraConsent) &&
    (!policy.requireGeofencePunchIn || locationConsent) &&
    (!policy.requireScreenRecording || screenConsent || policy.allowPunchInWithoutRecording);

  const handleContinue = () => {
    onAccept({
      camera: cameraConsent,
      location: locationConsent,
      screenRecording: screenConsent,
      microphone: micConsent
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 text-white shadow-2xl space-y-5 my-auto animate-in fade-in zoom-in-95 duration-200 relative">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-lg shadow-blue-600/30">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-white tracking-tight">Work Session Permissions</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  v{policy.privacyPolicyVersion || '1.0.0'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Transparent workplace attendance, geofencing & activity compliance.
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Enterprise Privacy Banner */}
        <div className="p-3.5 bg-blue-500/10 border border-blue-500/25 rounded-2xl flex items-start gap-3 text-xs text-blue-200">
          <Lock className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold text-blue-300">Privacy Guarantee & Non-Covert Policy</span>
            <p className="text-[11px] leading-relaxed text-blue-200/80">
              Recording and location telemetry operate strictly during your active work shift and terminate automatically
              upon Punch-Out. No secret or off-hours recording is ever conducted.
            </p>
          </div>
        </div>

        {/* Permission Checklist */}
        <div className="space-y-3">
          {/* 1. Camera Selfie */}
          <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400 shrink-0">
                <Camera className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-white">Camera Permission</h4>
                  {policy.requireSelfiePunchIn && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300">
                      Required
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Used solely to capture your live punch-in photo selfie for identity attendance verification.
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={cameraConsent}
              disabled={policy.requireSelfiePunchIn}
              onChange={e => setCameraConsent(e.target.checked)}
              className="mt-1 w-4 h-4 rounded border-slate-700 text-blue-600 focus:ring-0 accent-blue-600 cursor-pointer"
            />
          </div>

          {/* 2. Geofence Location */}
          <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 shrink-0">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-white">High-Accuracy Location (GPS)</h4>
                  {policy.requireGeofencePunchIn && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300">
                      Required
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Verifies you are at an authorized office or client site. Pings coordinates during active work hours only.
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={locationConsent}
              disabled={policy.requireGeofencePunchIn}
              onChange={e => setLocationConsent(e.target.checked)}
              className="mt-1 w-4 h-4 rounded border-slate-700 text-blue-600 focus:ring-0 accent-blue-600 cursor-pointer"
            />
          </div>

          {/* 3. Screen Recording */}
          <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-400 shrink-0">
                <Monitor className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-white">Screen Work Recording</h4>
                  {policy.requireScreenRecording ? (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
                      Company Policy
                    </span>
                  ) : (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-700 text-slate-300">
                      Optional
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Browser will show native screen selection. We recommend selecting your active 360CRM browser tab.
                  Auto-rotates into 10–20 minute review segments.
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={screenConsent}
              onChange={e => setScreenConsent(e.target.checked)}
              className="mt-1 w-4 h-4 rounded border-slate-700 text-blue-600 focus:ring-0 accent-blue-600 cursor-pointer"
            />
          </div>

          {/* 4. Microphone Recording */}
          {policy.microphoneRecordingEnabled && (
            <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-purple-500/15 text-purple-400 shrink-0">
                  <Mic className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-white">Work Audio / Microphone</h4>
                    {policy.requireMicrophoneRecording && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300">
                        Audio Enabled
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Records audio during client calls and authorized sessions. Microphone status is always visible.
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={micConsent}
                onChange={e => setMicConsent(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-slate-700 text-blue-600 focus:ring-0 accent-blue-600 cursor-pointer"
              />
            </div>
          )}
        </div>

        {/* Retention & Access Notice */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 pt-1 border-t border-slate-800">
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>Retention: {policy.recordingRetentionDays || 15} days auto-purge</span>
          </span>
          <button
            type="button"
            onClick={() => setShowPolicyModal(true)}
            className="text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>View Privacy Policy</span>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canContinue}
            onClick={handleContinue}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-blue-600/25 flex items-center gap-2 disabled:opacity-50 transition-all cursor-pointer"
          >
            <span>Allow & Continue to Punch-In</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Embedded Privacy Policy Modal */}
        {showPolicyModal && (
          <div className="fixed inset-0 bg-black/80 z-60 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 text-white space-y-4 shadow-2xl max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h4 className="text-sm font-bold flex items-center gap-2">
                  <Shield className="w-4 h-4 text-blue-400" />
                  <span>360CRM Corporate Privacy Policy</span>
                </h4>
                <button
                  onClick={() => setShowPolicyModal(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="text-xs text-slate-300 space-y-3 leading-relaxed">
                <p>
                  <strong>1. Purpose of Work Recording:</strong> Screen and audio telemetry are utilized solely for work
                  verification, customer support auditing, and operational excellence during authorized duty hours.
                </p>
                <p>
                  <strong>2. Zero Personal Surveillance:</strong> 360CRM does not record off-duty hours, typed personal
                  passwords, form passwords, or sensitive payment credentials. We recommend capturing only the 360CRM browser tab.
                </p>
                <p>
                  <strong>3. Access Rights:</strong> Recordings are accessible solely to authorized HR and Manager roles with
                  explicit compliance permissions. All playback sessions are timestamped and audit-logged.
                </p>
                <p>
                  <strong>4. Data Retention:</strong> Video recordings are automatically deleted after{' '}
                  {policy.recordingRetentionDays || 15} calendar days, unless flagged under formal enterprise legal hold.
                </p>
              </div>

              <div className="pt-2 text-right">
                <button
                  onClick={() => setShowPolicyModal(false)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-xs font-bold rounded-xl text-white"
                >
                  I Understand
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
