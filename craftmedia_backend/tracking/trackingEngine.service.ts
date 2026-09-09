/**
 * Central Enterprise Employee Tracking Engine Service
 * 
 * Orchestrates coordinate ingestion, privacy validation, geofencing,
 * stop detection, daily metrics accumulation, and realtime SSE broadcasting.
 */

import { Response } from 'express';
import { db } from '../database/db';
import {
  EmployeeDoc,
  LatestLocationDoc,
  LocationHistoryDoc,
  DailyTrackingSummaryDoc,
  LiveTrackingStatus,
  WorkLocationType
} from '../database/types';
import { RawLocationPacket, IngestionResult, RealtimeTrackingEvent } from './types';
import { GeodesicService } from './geodesic.service';
import { GeofenceService } from './geofence.service';
import { TrackingPolicyService } from './policy.service';
import { StopDetectionService } from './stopDetection.service';

export class TrackingEngineService {
  // Active SSE client subscriptions for realtime map streaming
  private static sseClients: Set<Response> = new Set();

  /**
   * Registers a client response stream for Server-Sent Events (SSE)
   */
  public static addSseClient(res: Response): void {
    this.sseClients.add(res);
    res.on('close', () => {
      this.sseClients.delete(res);
    });
  }

  /**
   * Broadcasts an event to all connected HR/Admin live tracking dashboards
   */
  public static broadcastEvent(event: RealtimeTrackingEvent): void {
    const payload = `data: ${JSON.stringify(event)}\n\n`;
    for (const client of this.sseClients) {
      try {
        client.write(payload);
      } catch {
        this.sseClients.delete(client);
      }
    }
  }

  /**
   * Main coordinate ingestion pipeline
   */
  public static async ingestLocationPacket(
    employee: EmployeeDoc,
    packet: RawLocationPacket,
    reqMeta: { ip?: string; userAgent?: string } = {}
  ): Promise<IngestionResult> {
    const policy = TrackingPolicyService.getActivePolicy();
    const nowIso = new Date().toISOString();
    const recordedAt = packet.recordedAt || nowIso;

    // 1. Basic Coordinate Sanity Validation
    if (
      typeof packet.latitude !== 'number' ||
      typeof packet.longitude !== 'number' ||
      packet.latitude < -90 ||
      packet.latitude > 90 ||
      packet.longitude < -180 ||
      packet.longitude > 180
    ) {
      return {
        success: false,
        tracking: false,
        message: 'Invalid GPS coordinate bounds.',
        insideGeofence: false,
        nextRecommendedUpdateSeconds: policy.updateFrequencySeconds || 60
      };
    }

    // 2. Evaluate Privacy & Tracking Policy
    const policyEval = TrackingPolicyService.evaluateEligibility(employee, recordedAt);
    if (!policyEval.isAllowed) {
      return {
        success: true,
        tracking: false,
        message: policyEval.reason || 'Tracking inactive per privacy policy.',
        insideGeofence: false,
        nextRecommendedUpdateSeconds: 300
      };
    }

    const anomalyFlags: string[] = [];

    // 3. Accuracy Threshold Validation
    const minAccuracy = policy.minAcceptableAccuracyMeters || 100;
    if (packet.accuracy > minAccuracy) {
      anomalyFlags.push('POOR_ACCURACY');
    }

    if (packet.isMockLocation) {
      anomalyFlags.push('MOCK_LOCATION_DETECTED');
    }

    // 4. Retrieve Existing Latest Location & History
    const latestDocId = `loc_latest_${employee._id}`;
    const previousLatest = db.latestLocations?.findById(latestDocId);
    const recentHistory = db.locationHistory?.find(h => h.employeeId === employee._id) || [];

    // 5. Detect GPS Jump / Velocity Anomaly
    let speedKmh = packet.speed ? packet.speed * (packet.speed < 100 ? 3.6 : 1) : 0;
    let distanceDeltaMeters = 0;

    if (previousLatest) {
      const jumpCheck = GeodesicService.detectGpsJump(
        {
          latitude: previousLatest.latitude,
          longitude: previousLatest.longitude,
          recordedAt: previousLatest.lastRecordedAt,
          accuracy: previousLatest.accuracy
        },
        {
          latitude: packet.latitude,
          longitude: packet.longitude,
          recordedAt,
          accuracy: packet.accuracy
        },
        policy.maxAllowableSpeedKmh || 140
      );

      distanceDeltaMeters = jumpCheck.distanceMeters;

      if (jumpCheck.isJump) {
        anomalyFlags.push('RAPID_JUMP');
        console.warn(`[Tracking Engine] ⚠️ Jump detected for ${employee.name}: ${jumpCheck.reason}`);
      }

      if (!packet.speed && jumpCheck.speedKmh > 0) {
        speedKmh = jumpCheck.speedKmh;
      }
    }

    // 6. Geofence Containment & Transitions
    const containingGeofences = GeofenceService.findContainingGeofences(
      packet.latitude,
      packet.longitude
    );
    const geofenceEval = GeofenceService.evaluateTransitions(
      employee._id,
      employee.name,
      previousLatest?.currentGeofenceId,
      containingGeofences,
      {
        latitude: packet.latitude,
        longitude: packet.longitude,
        accuracy: packet.accuracy,
        timestamp: recordedAt
      }
    );

    const distanceFromOfficeMeters = GeofenceService.calculateDistanceToPrimaryOffice(
      packet.latitude,
      packet.longitude
    );

    // 7. Stop & Movement Detection
    const stopAnalysis = StopDetectionService.analyzeStop(
      {
        latitude: packet.latitude,
        longitude: packet.longitude,
        recordedAt,
        speedKmh
      },
      recentHistory,
      policy,
      previousLatest ? {
        isStop: previousLatest.trackingStatus === 'STOPPED',
        stoppedSince: previousLatest.stoppedSince,
        currentStopDurationMinutes: previousLatest.currentStopDurationMinutes
      } : undefined
    );

    // Determine Work Location Type
    let workLocationType: WorkLocationType = 'OFFICE';
    if (geofenceEval.isInsideGeofence) {
      const matchedCat = containingGeofences[0]?.category;
      if (matchedCat === 'CLIENT_SITE' || matchedCat === 'PROJECT_SITE') {
        workLocationType = 'CLIENT_SITE';
      } else if (matchedCat === 'WAREHOUSE') {
        workLocationType = 'OFFICE';
      } else {
        workLocationType = 'OFFICE';
      }
    } else {
      workLocationType = employee.isFieldEmployee ? 'FIELD' : 'TRANSIT';
    }

    // Determine Tracking Status
    let trackingStatus: LiveTrackingStatus = 'ONLINE';
    if (stopAnalysis.isStop) {
      trackingStatus = 'STOPPED';
    } else if (speedKmh > 5.0) {
      trackingStatus = 'TRAVELLING';
    } else {
      trackingStatus = 'ONLINE';
    }

    // Distance Accumulation (filter impossible jumps from distance today)
    const validDistanceKm = anomalyFlags.includes('RAPID_JUMP')
      ? 0
      : distanceDeltaMeters / 1000;
    const distanceTodayKm = Math.round(((previousLatest?.distanceTodayKm || 0) + validDistanceKm) * 10) / 10;

    // 8. Update or Insert Latest Location Doc
    const latestPayload: LatestLocationDoc = {
      _id: latestDocId,
      employeeId: employee._id,
      employeeName: employee.name,
      employeeCode: employee.employeeId,
      department: employee.department,
      designation: employee.designation,
      phone: employee.phone,
      latitude: packet.latitude,
      longitude: packet.longitude,
      accuracy: packet.accuracy,
      speed: packet.speed,
      speedKmh: Math.round(speedKmh * 10) / 10,
      heading: packet.heading,
      altitude: packet.altitude,
      batteryLevel: packet.batteryLevel,
      isCharging: packet.isCharging,
      trackingStatus,
      workLocationType,
      currentGeofenceId: geofenceEval.currentGeofenceId,
      currentGeofenceName: geofenceEval.currentGeofenceName,
      isInsideGeofence: geofenceEval.isInsideGeofence,
      distanceFromOfficeMeters,
      lastRecordedAt: recordedAt,
      lastReceivedAt: nowIso,
      distanceTodayKm,
      currentStopDurationMinutes: stopAnalysis.stopDurationMinutes,
      stoppedSince: stopAnalysis.stoppedSince,
      deviceId: packet.deviceId,
      platform: packet.platform || reqMeta.userAgent,
      anomalyFlags: anomalyFlags.length > 0 ? anomalyFlags : undefined,
      isMockLocation: packet.isMockLocation,
      updatedAt: nowIso
    };

    if (previousLatest) {
      db.latestLocations?.updateById(latestDocId, latestPayload);
    } else {
      db.latestLocations?.insertOne(latestPayload);
    }

    // 9. Store Route History Breadcrumb if enabled
    if (policy.storeRouteHistory) {
      db.locationHistory?.insertOne({
        employeeId: employee._id,
        employeeName: employee.name,
        latitude: packet.latitude,
        longitude: packet.longitude,
        accuracy: packet.accuracy,
        speed: packet.speed,
        speedKmh: Math.round(speedKmh * 10) / 10,
        heading: packet.heading,
        batteryLevel: packet.batteryLevel,
        recordedAt,
        receivedAt: nowIso,
        source: packet.source || 'GPS',
        geofenceId: geofenceEval.currentGeofenceId,
        geofenceName: geofenceEval.currentGeofenceName,
        isInsideGeofence: geofenceEval.isInsideGeofence,
        distanceFromOfficeMeters,
        isStop: stopAnalysis.isStop,
        stopDurationMinutes: stopAnalysis.stopDurationMinutes,
        deviceId: packet.deviceId,
        anomalyFlag: anomalyFlags.join(', ') || undefined
      });
    }

    // 10. Update Daily Summary Metrics
    this.updateDailySummary(employee, recordedAt, distanceTodayKm, geofenceEval.isInsideGeofence);

    // 11. Broadcast Realtime Event
    this.broadcastEvent({
      type: 'employee:location:update',
      timestamp: nowIso,
      data: latestPayload
    });

    for (const geve of geofenceEval.eventsGenerated) {
      this.broadcastEvent({
        type: geve.eventType === 'ENTER' ? 'employee:geofence:entered' : 'employee:geofence:exited',
        timestamp: nowIso,
        data: geve
      });
    }

    const nextInterval = stopAnalysis.isStop
      ? policy.stationaryFrequencySeconds || 300
      : policy.updateFrequencySeconds || 60;

    return {
      success: true,
      tracking: true,
      message: `Location processed (${trackingStatus}, ${workLocationType})`,
      insideGeofence: geofenceEval.isInsideGeofence,
      currentGeofenceName: geofenceEval.currentGeofenceName,
      distanceFromOfficeMeters,
      nextRecommendedUpdateSeconds: nextInterval,
      anomalyFlags: anomalyFlags.length > 0 ? anomalyFlags : undefined,
      latestLocationId: latestDocId
    };
  }

  /**
   * Ingests a batch of offline-stored location packets
   */
  public static async ingestBatchPackets(
    employee: EmployeeDoc,
    packets: RawLocationPacket[],
    reqMeta: { ip?: string; userAgent?: string } = {}
  ): Promise<{ ingestedCount: number; errors: string[] }> {
    const sorted = [...packets].sort(
      (a, b) => new Date(a.recordedAt || 0).getTime() - new Date(b.recordedAt || 0).getTime()
    );

    let ingestedCount = 0;
    const errors: string[] = [];

    for (const p of sorted) {
      try {
        const res = await this.ingestLocationPacket(employee, p, reqMeta);
        if (res.success) ingestedCount++;
      } catch (err: any) {
        errors.push(err.message);
      }
    }

    return { ingestedCount, errors };
  }

  /**
   * Accumulates and rolls up daily tracking summary metrics
   */
  private static updateDailySummary(
    employee: EmployeeDoc,
    recordedAt: string,
    totalDistanceKm: number,
    isInsideOfficeGeofence: boolean
  ): void {
    const dateStr = recordedAt.split('T')[0];
    const summaryId = `sum_${employee._id}_${dateStr}`;
    const existing = db.dailyTrackingSummaries?.findById(summaryId);

    const nowIso = new Date().toISOString();
    const geofenceVisits = db.geofenceEvents?.countDocuments(
      e => e.employeeId === employee._id && e.timestamp.startsWith(dateStr) && e.eventType === 'ENTER'
    ) || 0;

    const stopsCount = db.locationHistory?.countDocuments(
      h => h.employeeId === employee._id && h.recordedAt.startsWith(dateStr) && h.isStop === true
    ) || 0;

    if (existing) {
      db.dailyTrackingSummaries?.updateById(summaryId, {
        totalDistanceKm,
        geofenceVisitsCount: geofenceVisits,
        stopsCount,
        lastLocationTime: new Date(recordedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        updatedAt: nowIso
      });
    } else {
      db.dailyTrackingSummaries?.insertOne({
        _id: summaryId,
        employeeId: employee._id,
        employeeName: employee.name,
        department: employee.department,
        date: dateStr,
        checkInTime: new Date(recordedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        totalWorkingMinutes: 0,
        totalTrackedMinutes: 1,
        totalFieldMinutes: isInsideOfficeGeofence ? 0 : 1,
        totalOfficeMinutes: isInsideOfficeGeofence ? 1 : 0,
        totalStopMinutes: 0,
        totalDistanceKm,
        geofenceVisitsCount: geofenceVisits,
        stopsCount,
        firstLocationTime: new Date(recordedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        lastLocationTime: new Date(recordedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        updatedAt: nowIso
      });
    }
  }

  /**
   * Purges detailed location history older than retention policy threshold
   */
  public static purgeExpiredHistory(retentionDays: number = 30): number {
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 3600 * 1000).toISOString();
    const allHistory = db.locationHistory?.getAll() || [];
    let purgedCount = 0;

    for (const item of allHistory) {
      if (item.recordedAt < cutoffDate) {
        db.locationHistory?.deleteById(item._id);
        purgedCount++;
      }
    }

    return purgedCount;
  }
}
