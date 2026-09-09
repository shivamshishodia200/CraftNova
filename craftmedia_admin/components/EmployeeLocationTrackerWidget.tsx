import React, { useState, useEffect, useRef } from 'react';
import { api } from '@/src/services/api';
import { useAuth } from '@/src/context/AuthContext';
import {
  MapPin,
  Radio,
  ShieldCheck,
  ShieldAlert,
  Battery,
  BatteryCharging,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Info,
  Clock,
  Navigation
} from 'lucide-react';

export const EmployeeLocationTrackerWidget: React.FC = () => {
  const { user } = useAuth();
  const [trackingStatus, setTrackingStatus] = useState<{
    hasProfile: boolean;
    isTrackingActive: boolean;
    trackingMode: string;
    consentStatus: string;
    reason?: string;
    shiftStart?: string;
    shiftEnd?: string;
    updateFrequencySeconds?: number;
    latestLocation?: any;
  } | null>(null);

  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [lastBroadcastTime, setLastBroadcastTime] = useState<string | null>(null);
  const [lastAccuracy, setLastAccuracy] = useState<number | null>(null);
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [isCharging, setIsCharging] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [isConsentModalOpen, setIsConsentModalOpen] = useState(false);

  const watchIdRef = useRef<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Fetch current employee tracking status & policy
  const fetchMyStatus = async () => {
    try {
      const res = await api.get('/employee-tracking/my-status');
      if (res.success && res.data) {
        setTrackingStatus(res.data);
        if (res.data.consentStatus === 'PENDING') {
          setIsConsentModalOpen(true);
        }
      }
    } catch (err) {
      console.error('Error fetching employee tracking status:', err);
    }
  };

  useEffect(() => {
    fetchMyStatus();
  }, []);

  // 2. Battery API Listener
  useEffect(() => {
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        setBatteryLevel(Math.round(battery.level * 100));
        setIsCharging(battery.charging);

        battery.addEventListener('levelchange', () => {
          setBatteryLevel(Math.round(battery.level * 100));
        });
        battery.addEventListener('chargingchange', () => {
          setIsCharging(battery.charging);
        });
      }).catch(() => {});
    }
  }, []);

  // 3. Location Broadcaster Function
  const broadcastCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setGpsError(null);
        const { latitude, longitude, accuracy, speed, heading, altitude } = pos.coords;
        setLastAccuracy(Math.round(accuracy));
        setLastBroadcastTime(new Date().toLocaleTimeString());

        try {
          const payload = {
            latitude,
            longitude,
            accuracy: Math.round(accuracy),
            speed: speed !== null ? speed : undefined,
            heading: heading !== null ? heading : undefined,
            altitude: altitude !== null ? altitude : undefined,
            batteryLevel: batteryLevel !== null ? batteryLevel : undefined,
            isCharging,
            recordedAt: new Date(pos.timestamp).toISOString(),
            source: 'WEB_BROWSER',
            platform: navigator.userAgent
          };

          const res = await api.post('/employee-tracking/location', payload);
          if (res.success) {
            setIsBroadcasting(true);
          }
        } catch (err) {
          // Store in offline queue if network drops
          try {
            const queueKey = '360crm_offline_location_queue';
            const existingQueue = JSON.parse(localStorage.getItem(queueKey) || '[]');
            if (existingQueue.length < 50) {
              existingQueue.push({
                latitude,
                longitude,
                accuracy: Math.round(accuracy),
                recordedAt: new Date(pos.timestamp).toISOString(),
                source: 'OFFLINE_SYNC'
              });
              localStorage.setItem(queueKey, JSON.stringify(existingQueue));
            }
          } catch {}
        }
      },
      (err) => {
        setGpsError(`Location access ${err.message.toLowerCase()}`);
        setIsBroadcasting(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000
      }
    );
  };

  // 4. Start/Stop periodic transmission based on policy
  useEffect(() => {
    if (trackingStatus?.isTrackingActive && trackingStatus.consentStatus === 'GRANTED') {
      // Immediate broadcast
      broadcastCurrentLocation();

      // Periodic broadcast interval
      const intervalSec = trackingStatus.updateFrequencySeconds || 60;
      intervalRef.current = setInterval(() => {
        broadcastCurrentLocation();
      }, intervalSec * 1000);

      // Sync offline queue if present
      const queueKey = '360crm_offline_location_queue';
      try {
        const queued = JSON.parse(localStorage.getItem(queueKey) || '[]');
        if (queued.length > 0) {
          api.post('/employee-tracking/location/batch', { packets: queued }).then(() => {
            localStorage.removeItem(queueKey);
          }).catch(() => {});
        }
      } catch {}
    } else {
      setIsBroadcasting(false);
      if (intervalRef.current) clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [trackingStatus?.isTrackingActive, trackingStatus?.consentStatus, batteryLevel, isCharging]);

  // Handle consent grant/deny
  const handleConsentAction = async (status: 'GRANTED' | 'DENIED') => {
    try {
      const res = await api.post('/employee-tracking/my-consent', { status });
      if (res.success) {
        setIsConsentModalOpen(false);
        fetchMyStatus();
      }
    } catch (err) {
      console.error('Error submitting location consent:', err);
    }
  };

  if (!trackingStatus || !trackingStatus.hasProfile) return null;

  return (
    <>
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              trackingStatus.isTrackingActive && isBroadcasting
                ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                : 'bg-slate-100 text-slate-500 border border-slate-200'
            }`}>
              {trackingStatus.isTrackingActive && isBroadcasting ? (
                <Radio className="w-4 h-4 animate-pulse text-emerald-600" />
              ) : (
                <MapPin className="w-4 h-4 text-slate-400" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-xs text-slate-800">Field & Work Location Status</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                  trackingStatus.isTrackingActive && isBroadcasting
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-slate-100 text-slate-600'
                }`}>
                  {trackingStatus.isTrackingActive ? '● Active' : '○ Standby'}
                </span>
              </div>
              <div className="text-[11px] text-slate-500">
                {trackingStatus.isTrackingActive
                  ? `Broadcasting for shift (${trackingStatus.shiftStart} - ${trackingStatus.shiftEnd})`
                  : (trackingStatus.reason || 'Tracking paused outside working shift')}
              </div>
            </div>
          </div>

          <button
            onClick={() => broadcastCurrentLocation()}
            className="px-2.5 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 border border-blue-200 rounded-xl transition flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" />
            Sync Now
          </button>
        </div>

        {/* Telemetry Chips */}
        <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 text-[11px]">
          <div>
            <span className="text-slate-400 block text-[10px]">Last Update</span>
            <span className="font-semibold text-slate-700">{lastBroadcastTime || 'Awaiting signal'}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">GPS Accuracy</span>
            <span className="font-semibold text-slate-700">{lastAccuracy ? `&plusmn;${lastAccuracy}m` : 'N/A'}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">Device Battery</span>
            <span className="font-semibold text-slate-700 flex items-center gap-1">
              {isCharging ? <BatteryCharging className="w-3 h-3 text-emerald-500" /> : <Battery className="w-3 h-3 text-slate-400" />}
              {batteryLevel !== null ? `${batteryLevel}%` : 'Standard'}
            </span>
          </div>
        </div>

        {gpsError && (
          <div className="p-2 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-[11px] flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>{gpsError}</span>
          </div>
        )}

        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-blue-500" />
            Privacy Protection: No off-hours tracking
          </span>
          <button
            onClick={() => setIsConsentModalOpen(true)}
            className="text-blue-600 hover:underline font-medium"
          >
            Consent & Privacy Policy
          </button>
        </div>
      </div>

      {/* Consent Modal */}
      {isConsentModalOpen && (
        <div className="fixed inset-0 z-1000 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4 text-xs animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-800">Workforce Location Policy & Consent</h3>
                <p className="text-slate-500 text-[11px]">360CRM Transparent Privacy Agreement</p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2 text-slate-600 text-[11px] leading-relaxed">
              <p>
                <strong>What is tracked:</strong> Approximate GPS coordinates, travel distance, and office/client site geofence entry/exit.
              </p>
              <p>
                <strong>When it is active:</strong> Strictly during your assigned company work hours ({trackingStatus.shiftStart || '09:30'} to {trackingStatus.shiftEnd || '18:30'}) or active checked-in shift.
              </p>
              <p className="text-blue-700 font-medium">
                <strong>Anti-Surveillance Guarantee:</strong> No continuous location tracking occurs outside scheduled shift hours or while on leave.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => handleConsentAction('DENIED')}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition"
              >
                Decline
              </button>
              <button
                onClick={() => handleConsentAction('GRANTED')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition"
              >
                I Accept & Enable Tracking
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
