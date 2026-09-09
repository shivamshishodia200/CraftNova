/**
 * Enterprise Tracking Engine Types and Contracts
 */

export interface RawLocationPacket {
  latitude: number;
  longitude: number;
  accuracy: number;
  speed?: number; // m/s or km/h
  heading?: number;
  altitude?: number;
  batteryLevel?: number; // 0 to 100
  isCharging?: boolean;
  recordedAt?: string; // ISO string
  deviceId?: string;
  platform?: string;
  source?: 'GPS' | 'NETWORK' | 'WEB_BROWSER' | 'MOBILE_APP' | 'OFFLINE_SYNC';
  isMockLocation?: boolean;
}

export interface IngestionResult {
  success: boolean;
  tracking: boolean;
  message: string;
  insideGeofence: boolean;
  currentGeofenceName?: string;
  distanceFromOfficeMeters?: number;
  nextRecommendedUpdateSeconds: number;
  anomalyFlags?: string[];
  latestLocationId?: string;
}

export interface TrackingPolicyEvaluation {
  isAllowed: boolean;
  reason?: string;
  mode: string;
  requiresConsentWarning?: boolean;
}

export interface GeofenceMatch {
  geofenceId: string;
  geofenceName: string;
  category: string;
  distanceToCenterMeters: number;
  radiusMeters: number;
}

export interface RealtimeTrackingEvent {
  type: 'employee:location:update' | 'employee:geofence:entered' | 'employee:geofence:exited' | 'employee:status:changed' | 'tracking:alert';
  timestamp: string;
  data: any;
}
