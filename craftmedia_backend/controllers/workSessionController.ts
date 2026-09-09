import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { db } from '../database/db';
import { AuthenticatedRequest } from '../middleware/auth';
import { recordAuditLog } from '../middleware/audit';
import {
  WorkSessionDoc,
  WorkSessionPolicyDoc,
  WorkSessionConsentDoc,
  RecordingSegmentDoc,
  WorkSessionActivityDoc,
  WorkSessionDailySummary
} from '../database/types';
import { calculateHaversineDistanceMeters } from './peopleControllers';
import { DEFAULT_ORG_ID } from '../database/migration';

// Upload Directory for Work Session Video Chunks
export const RECORDINGS_DIR = path.resolve(__dirname, '../uploads/recordings');
if (!fs.existsSync(RECORDINGS_DIR)) {
  try {
    fs.mkdirSync(RECORDINGS_DIR, { recursive: true });
  } catch (err: any) {
    console.error('[WorkSession Storage] Failed to create recordings directory:', err.message);
  }
}

// Helper to resolve employee context
function getEmpContext(req: AuthenticatedRequest) {
  const userId = req.user?.userId || '';
  const userName = req.user?.name || '';
  const userEmail = req.user?.email || '';

  const emp = db.employees.findOne(
    e => e.userId === userId ||
      e.email.toLowerCase() === userEmail.toLowerCase() ||
      e.name.toLowerCase() === userName.toLowerCase()
  );
  const employeeId = emp?._id || emp?.employeeId || userId;
  const employeeName = emp?.name || userName;

  return { userId, userName, userEmail, employeeId, employeeName, employeeDoc: emp };
}

import { validateMediaFile } from '../services/mediaValidator';

// Helper: Format seconds to HH:MM:SS or Xh Ym
export function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hrs > 0) {
    return `${hrs}h ${mins}m`;
  }
  if (mins > 0) {
    return `${mins}m ${secs}s`;
  }
  return `${secs}s`;
}

/**
 * Builds a clean, deduplicated, grouped timeline with video sync metadata
 */
export function buildAggregatedTimeline(
  timelineItems: any[],
  workActivities: any[],
  segments: RecordingSegmentDoc[] = []
) {
  const sortedSegments = [...segments].sort((a, b) => a.segmentNumber - b.segmentNumber);

  // Helper to map timestamp to matching video segment and offset
  const getSegmentSync = (timestamp: string) => {
    const eventMs = new Date(timestamp).getTime();
    for (const seg of sortedSegments) {
      const segStart = new Date(seg.startedAt).getTime();
      const segEnd = new Date(seg.endedAt).getTime();
      if (eventMs >= segStart && eventMs <= segEnd + 2000) {
        const offsetSec = Math.max(0, Math.floor((eventMs - segStart) / 1000));
        return {
          segmentNumber: seg.segmentNumber,
          segmentOffsetSeconds: offsetSec
        };
      }
    }
    return undefined;
  };

  const formattedTimeline: any[] = [];

  // 1. Process discrete CRM activity timeline events (Punch In, Punch Out, Calls, Visits, etc.)
  for (const item of timelineItems) {
    const sync = getSegmentSync(item.timestamp);
    formattedTimeline.push({
      id: item._id,
      time: new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timestamp: item.timestamp,
      type: item.type,
      title: item.title,
      description: item.description,
      segmentNumber: sync?.segmentNumber,
      segmentOffsetSeconds: sync?.segmentOffsetSeconds
    });
  }

  // 2. Aggregate screen navigation activities into non-duplicate meaningful spans
  const sortedActivities = [...workActivities].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  let currentSpan: any = null;

  for (const act of sortedActivities) {
    const screenName = act.screen || act.route || 'Dashboard';
    const screenTitle = screenName.replace(/^emp_/, '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

    if (act.eventType === 'SCREEN_ENTER' || act.eventType === 'SCREEN_EXIT') {
      if (currentSpan && currentSpan.screen === screenName) {
        // Extend existing span
        currentSpan.durationSeconds = (currentSpan.durationSeconds || 0) + (act.durationSeconds || 0);
        currentSpan.endTime = new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        currentSpan.endTimestamp = act.timestamp;
      } else {
        if (currentSpan) {
          // Push finalized span
          const sync = getSegmentSync(currentSpan.startTimestamp);
          formattedTimeline.push({
            id: currentSpan.id,
            time: currentSpan.startTime,
            timeSpan: currentSpan.endTime && currentSpan.endTime !== currentSpan.startTime ? `${currentSpan.startTime} – ${currentSpan.endTime}` : currentSpan.startTime,
            timestamp: currentSpan.startTimestamp,
            type: 'NAVIGATION',
            title: currentSpan.title,
            description: currentSpan.durationSeconds > 0 ? `Spent ${formatDuration(currentSpan.durationSeconds)}` : undefined,
            durationSeconds: currentSpan.durationSeconds,
            segmentNumber: sync?.segmentNumber,
            segmentOffsetSeconds: sync?.segmentOffsetSeconds
          });
        }

        // Start new span
        const startTimeStr = new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        currentSpan = {
          id: act._id,
          screen: screenName,
          title: `Screen: ${screenTitle}`,
          startTime: startTimeStr,
          endTime: startTimeStr,
          startTimestamp: act.timestamp,
          endTimestamp: act.timestamp,
          durationSeconds: act.durationSeconds || 0
        };
      }
    } else if (act.eventType === 'TAB_ACTIVE' || act.eventType === 'TAB_BACKGROUND') {
      const sync = getSegmentSync(act.timestamp);
      formattedTimeline.push({
        id: act._id,
        time: new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestamp: act.timestamp,
        type: act.eventType,
        title: act.eventType === 'TAB_ACTIVE' ? 'App Focused (Tab Active)' : 'Tab Switched to Background',
        description: act.durationSeconds ? `Duration: ${formatDuration(act.durationSeconds)}` : undefined,
        segmentNumber: sync?.segmentNumber,
        segmentOffsetSeconds: sync?.segmentOffsetSeconds
      });
    }
  }

  // Final span
  if (currentSpan) {
    const sync = getSegmentSync(currentSpan.startTimestamp);
    formattedTimeline.push({
      id: currentSpan.id,
      time: currentSpan.startTime,
      timeSpan: currentSpan.endTime && currentSpan.endTime !== currentSpan.startTime ? `${currentSpan.startTime} – ${currentSpan.endTime}` : currentSpan.startTime,
      timestamp: currentSpan.startTimestamp,
      type: 'NAVIGATION',
      title: currentSpan.title,
      description: currentSpan.durationSeconds > 0 ? `Spent ${formatDuration(currentSpan.durationSeconds)}` : undefined,
      durationSeconds: currentSpan.durationSeconds,
      segmentNumber: sync?.segmentNumber,
      segmentOffsetSeconds: sync?.segmentOffsetSeconds
    });
  }

  return formattedTimeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}


// ----------------------------------------------------
// 1. GET WORK SESSION POLICY & GEOFENCES
// ----------------------------------------------------
export async function getWorkSessionPolicy(req: AuthenticatedRequest, res: Response) {
  try {
    const policy = db.getWorkSessionPolicy();
    const securityConfig = db.getAttendanceSecurityConfig();

    return res.json({
      success: true,
      data: {
        policy,
        allowedLocations: securityConfig.allowedLocations || [],
        maxGpsAccuracyMeters: policy.maxGpsAccuracyMeters || securityConfig.maxGpsAccuracyMeters || 100
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ----------------------------------------------------
// 2. UPDATE WORK SESSION POLICY (HR / ADMIN)
// ----------------------------------------------------
export async function updateWorkSessionPolicy(req: AuthenticatedRequest, res: Response) {
  try {
    const policy = db.getWorkSessionPolicy();
    const updates = {
      ...req.body,
      updatedAt: new Date().toISOString()
    };

    const updated = db.workSessionPolicies.updateById(policy._id, updates) ||
      db.workSessionPolicies.insertOne({ ...policy, ...updates });

    recordAuditLog(req, 'UPDATE', 'work_session_policy', 'Updated Work Session Policy Configuration', policy._id, policy, updates);

    return res.json({
      success: true,
      message: 'Work session policy updated successfully',
      data: updated
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ----------------------------------------------------
// 3. POST WORK SESSION CONSENT
// ----------------------------------------------------
export async function postWorkSessionConsent(req: AuthenticatedRequest, res: Response) {
  try {
    const { employeeId, employeeName } = getEmpContext(req);
    const {
      policyVersion,
      cameraConsent,
      locationConsent,
      screenRecordingConsent,
      microphoneConsent,
      browser,
      deviceType,
      sessionId
    } = req.body;

    const consent = db.workSessionConsents.insertOne({
      employeeId,
      employeeName,
      policyVersion: policyVersion || '1.0.0',
      acceptedAt: new Date().toISOString(),
      cameraConsent: Boolean(cameraConsent),
      locationConsent: Boolean(locationConsent),
      screenRecordingConsent: Boolean(screenRecordingConsent),
      microphoneConsent: Boolean(microphoneConsent),
      userAgent: req.headers['user-agent'] || 'Browser Web Client',
      browser: browser || 'Unknown Browser',
      deviceType: deviceType || 'Desktop/Web',
      sessionId: sessionId || `sess_${Date.now()}`,
      ipAddress: req.ip
    });

    recordAuditLog(req, 'CREATE', 'work_session_consents', 'Employee Accepted Work Session Policy & Privacy Consent', consent._id, undefined, {
      employeeId,
      policyVersion
    });

    return res.json({
      success: true,
      message: 'Consent recorded successfully',
      data: consent
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ----------------------------------------------------
// 4. START WORK SESSION & PUNCH IN
// ----------------------------------------------------
export async function startWorkSession(req: AuthenticatedRequest, res: Response) {
  try {
    const { employeeId, employeeName, userId } = getEmpContext(req);
    const {
      selfie,
      location,
      consentId,
      browserSessionId,
      screenRecordingActive,
      microphoneActive,
      remarks
    } = req.body;

    const today = new Date().toISOString().split('T')[0];
    const nowIso = new Date().toISOString();
    const checkInTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    // 1. Check for conflicting ACTIVE session (Multiple Tab / Multiple Device Protection)
    const existingActiveSession = db.workSessions.findOne(
      s => s.employeeId === employeeId && s.status === 'ACTIVE'
    );
    if (existingActiveSession) {
      // If browserSessionId matches, allow recovery
      if (browserSessionId && existingActiveSession.browserSessionId === browserSessionId) {
        return res.json({
          success: true,
          message: 'Active work session already running in this browser tab.',
          data: existingActiveSession
        });
      }
      return res.status(409).json({
        success: false,
        message: 'An active work session is already open on another tab or device. Please complete or close that session first.',
        data: existingActiveSession
      });
    }

    const policy = db.getWorkSessionPolicy();
    const securityConfig = db.getAttendanceSecurityConfig();

    // 2. Validate GPS accuracy
    let verifiedLoc: any = undefined;
    if (policy.requireGeofencePunchIn || securityConfig.requireLocation) {
      if (!location || typeof location.lat !== 'number' || typeof location.lng !== 'number') {
        return res.status(400).json({
          success: false,
          message: 'High-accuracy GPS location is required to punch in.'
        });
      }

      const accuracy = Number(location.accuracy) || 0;
      const maxAccuracy = policy.maxGpsAccuracyMeters || 100;
      if (accuracy > maxAccuracy * 2) {
        return res.status(400).json({
          success: false,
          message: `GPS accuracy is too weak (±${Math.round(accuracy)}m). Maximum allowed tolerance is ±${maxAccuracy}m. Please ensure GPS/Location services are enabled.`
        });
      }

      // 3. Geofence Verification against active authorized locations
      const activeLocations = (securityConfig.allowedLocations || []).filter(l => l.enabled);
      if (activeLocations.length > 0) {
        let nearestDistance = Infinity;
        let nearestOffice: any = null;
        let matchedOffice: any = null;

        for (const office of activeLocations) {
          const dist = calculateHaversineDistanceMeters(location.lat, location.lng, office.lat, office.lng);
          if (dist < nearestDistance) {
            nearestDistance = dist;
            nearestOffice = office;
          }
          if (dist <= (office.radiusMeters || 100)) {
            matchedOffice = office;
            break;
          }
        }

        if (!matchedOffice) {
          if (policy.requireGeofencePunchIn && policy.allowRemotePunchIn === false) {
            return res.status(403).json({
              success: false,
              message: `Punch-in rejected: You are outside the authorized geofence. (Nearest: ${nearestOffice?.name || 'Office'} — approx ${Math.round(nearestDistance)}m away, allowed radius: ${nearestOffice?.radiusMeters || 100}m)`
            });
          }

          verifiedLoc = {
            lat: location.lat,
            lng: location.lng,
            accuracy,
            address: location.address || 'Remote / Field Client Location',
            matchedLocationName: nearestOffice ? `Field Work (${nearestOffice.name} Region)` : 'Remote Work / Field Operations',
            verifiedDistance: nearestDistance
          };
        } else {
          verifiedLoc = {
            lat: location.lat,
            lng: location.lng,
            accuracy,
            address: location.address || matchedOffice?.address || matchedOffice?.name || 'Office Geofence Area',
            matchedLocationName: matchedOffice?.name || 'Authorized Geofence Zone',
            officeLocationId: matchedOffice?.id,
            verifiedDistance: calculateHaversineDistanceMeters(location.lat, location.lng, matchedOffice.lat, matchedOffice.lng)
          };
        }
      } else {
        verifiedLoc = {
          lat: location.lat,
          lng: location.lng,
          accuracy,
          address: location.address || 'Geo-stamped work session'
        };
      }
    }

    // 4. Validate Live Camera Selfie
    if (policy.requireSelfiePunchIn || securityConfig.requireSelfie) {
      if (!selfie || typeof selfie !== 'string' || !selfie.startsWith('data:image/')) {
        return res.status(400).json({
          success: false,
          message: 'A live selfie photograph is required for attendance verification.'
        });
      }
    }

    // 5. Screen Recording Policy Check
    let screenStatus: any = 'NOT_REQUIRED';
    if (policy.requireScreenRecording || policy.screenRecordingEnabled) {
      if (screenRecordingActive) {
        screenStatus = 'ACTIVE';
      } else {
        if (!policy.allowPunchInWithoutRecording) {
          return res.status(403).json({
            success: false,
            message: 'Screen recording permission is required by company policy to start your work session.'
          });
        } else {
          screenStatus = 'DENIED';
        }
      }
    }

    // 6. Microphone Policy Check
    let micStatus: any = 'NOT_REQUIRED';
    if (policy.requireMicrophoneRecording || policy.microphoneRecordingEnabled) {
      micStatus = microphoneActive ? 'ACTIVE' : 'DENIED';
    }

    // 7. Create or synchronize Attendance record
    let attRecord = db.attendance.findOne(
      a => (a.employeeId === employeeId || a.employeeId === userId) && a.date === today
    );

    const clockInVerification = {
      selfieRequired: policy.requireSelfiePunchIn,
      selfieVerified: Boolean(selfie),
      selfieUrl: selfie || '',
      locationRequired: policy.requireGeofencePunchIn,
      locationVerified: Boolean(verifiedLoc),
      latitude: verifiedLoc?.lat,
      longitude: verifiedLoc?.lng,
      accuracy: verifiedLoc?.accuracy,
      officeLocationId: verifiedLoc?.officeLocationId,
      officeLocationName: verifiedLoc?.matchedLocationName,
      distanceFromOffice: verifiedLoc?.verifiedDistance,
      verifiedAt: nowIso
    };

    if (attRecord) {
      attRecord = db.attendance.updateById(attRecord._id, {
        checkIn: checkInTime,
        checkOut: '',
        status: 'PRESENT',
        remarks: remarks || attRecord.remarks,
        selfieCheckIn: selfie || attRecord.selfieCheckIn,
        locationCheckIn: verifiedLoc || attRecord.locationCheckIn,
        clockInVerification,
        breaks: [],
        workHours: 0,
        updatedAt: nowIso
      })!;
    } else {
      attRecord = db.attendance.insertOne({
        employeeId,
        employeeName,
        date: today,
        checkIn: checkInTime,
        checkOut: '',
        status: 'PRESENT',
        remarks: remarks || 'Work Session Clock-In',
        selfieCheckIn: selfie || '',
        locationCheckIn: verifiedLoc,
        clockInVerification,
        breaks: [],
        workHours: 0,
        organizationId: req.user?.organizationId || DEFAULT_ORG_ID,
        createdAt: nowIso
      });
    }

    // 8. Create WorkSession
    const workSession = db.workSessions.insertOne({
      employeeId,
      employeeName,
      attendanceId: attRecord._id,
      sessionDate: today,
      status: 'ACTIVE',
      startedAt: nowIso,
      shiftStart: checkInTime,
      browserSessionId: browserSessionId || `brw_${Date.now()}`,
      organizationId: req.user?.organizationId || DEFAULT_ORG_ID,
      trackingEnabled: true,
      recordingEnabled: policy.screenRecordingEnabled,
      audioEnabled: policy.microphoneRecordingEnabled,
      screenRecordingStatus: screenStatus,
      microphoneStatus: micStatus,
      trackingStatus: 'ACTIVE',
      consentId: consentId || undefined,
      totalWorkSeconds: 0,
      totalBreakSeconds: 0,
      totalActiveAppSeconds: 0,
      totalBackgroundSeconds: 0,
      recordingDurationSeconds: 0,
      recordingSegmentsCount: 0,
      interruptionCount: 0,
      lastHeartbeatAt: nowIso,
      createdAt: nowIso,
      updatedAt: nowIso
    });

    // Record system timeline activity
    db.activityTimeline.insertOne({
      type: 'PUNCH_IN',
      title: 'Work Session Started',
      description: `Shift clocked in at ${checkInTime} [${verifiedLoc?.matchedLocationName || 'Office'}]. Recording: ${screenStatus}, Tracking: ACTIVE.`,
      employeeId,
      employeeName,
      organizationId: req.user?.organizationId || DEFAULT_ORG_ID,
      timestamp: nowIso
    });

    // Audit logs
    recordAuditLog(req, 'CREATE', 'work_sessions', 'Work Session Started & Punch In Verified', workSession._id, undefined, {
      employeeId,
      checkInTime,
      screenStatus,
      micStatus
    });

    return res.status(201).json({
      success: true,
      message: `PUNCH IN SUCCESS! Work session active at ${checkInTime}.`,
      data: {
        workSession,
        attendance: attRecord
      }
    });
  } catch (err: any) {
    console.error('Error starting work session:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ----------------------------------------------------
// 5. GET CURRENT WORK SESSION
// ----------------------------------------------------
export async function getCurrentWorkSession(req: AuthenticatedRequest, res: Response) {
  try {
    const { employeeId } = getEmpContext(req);
    const today = new Date().toISOString().split('T')[0];

    // Look for active session first, then today's most recent
    let session = db.workSessions.findOne(
      s => s.employeeId === employeeId && s.status === 'ACTIVE'
    );

    if (!session) {
      session = db.workSessions.find(
        s => s.employeeId === employeeId && s.sessionDate === today
      ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] || null;
    }

    const policy = db.getWorkSessionPolicy();

    return res.json({
      success: true,
      data: {
        session,
        policy
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ----------------------------------------------------
// 6. POST HEARTBEAT (60s Health Pulse)
// ----------------------------------------------------
export async function postWorkSessionHeartbeat(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const { tabVisibility, recordingStatus, trackingStatus, networkStatus } = req.body;

    const session = db.workSessions.findById(id);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Work session not found' });
    }

    const nowIso = new Date().toISOString();
    const updates: Partial<WorkSessionDoc> = {
      lastHeartbeatAt: nowIso,
      updatedAt: nowIso
    };

    if (recordingStatus) updates.screenRecordingStatus = recordingStatus;
    if (trackingStatus) updates.trackingStatus = trackingStatus;

    db.workSessions.updateById(id, updates);

    return res.json({
      success: true,
      status: session.status,
      timestamp: nowIso
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ----------------------------------------------------
// 7. POST APP ACTIVITY (Navigation & Tab Visibility)
// ----------------------------------------------------
export async function postWorkSessionActivity(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const { employeeId } = getEmpContext(req);
    const { eventType, screen, route, entityType, entityId, enteredAt, exitedAt, durationSeconds, eventId, dedupeKey } = req.body;

    const session = db.workSessions.findById(id);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Work session not found' });
    }

    const now = Date.now();
    const nowIso = new Date().toISOString();

    // 1. Deduplication check via dedupeKey
    if (dedupeKey) {
      const existing = db.workSessionActivities.findOne(a => a.workSessionId === id && (a as any).dedupeKey === dedupeKey);
      if (existing) {
        return res.json({ success: true, message: 'Duplicate activity event ignored', data: existing });
      }
    }

    // 2. Throttling for rapid identical SCREEN_ENTER events (< 5 seconds)
    if (eventType === 'SCREEN_ENTER') {
      const recentActivities = db.workSessionActivities.find(a => a.workSessionId === id);
      const lastActivity = recentActivities[recentActivities.length - 1];

      if (
        lastActivity &&
        lastActivity.eventType === 'SCREEN_ENTER' &&
        lastActivity.screen === (screen || 'dashboard')
      ) {
        const timeDiffMs = now - new Date(lastActivity.timestamp).getTime();
        if (timeDiffMs < 5000) {
          return res.json({ success: true, message: 'Throttled rapid duplicate enter event', data: lastActivity });
        }
      }
    }

    const activity = db.workSessionActivities.insertOne({
      workSessionId: id,
      employeeId,
      eventId: eventId || `act_${now}`,
      eventType: eventType || 'SCREEN_ENTER',
      screen: screen || 'dashboard',
      route: route || screen || 'dashboard',
      entityType,
      entityId,
      enteredAt: enteredAt || nowIso,
      exitedAt: exitedAt || undefined,
      durationSeconds: Number(durationSeconds) || 0,
      activeDurationSeconds: eventType === 'TAB_ACTIVE' || eventType === 'SCREEN_EXIT' ? Number(durationSeconds) || 0 : undefined,
      idleDurationSeconds: eventType === 'USER_IDLE' ? Number(durationSeconds) || 0 : undefined,
      dedupeKey,
      timestamp: nowIso
    });

    // Update cumulative seconds on session
    if (durationSeconds && durationSeconds > 0) {
      const dur = Number(durationSeconds);
      if (eventType === 'TAB_ACTIVE' || eventType === 'SCREEN_EXIT') {
        db.workSessions.updateById(id, prev => ({
          ...prev,
          totalActiveAppSeconds: (prev.totalActiveAppSeconds || 0) + dur,
          updatedAt: new Date().toISOString()
        }));
      } else if (eventType === 'TAB_BACKGROUND') {
        db.workSessions.updateById(id, prev => ({
          ...prev,
          totalBackgroundSeconds: (prev.totalBackgroundSeconds || 0) + dur,
          updatedAt: new Date().toISOString()
        }));
      }
    }

    return res.json({ success: true, data: activity });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ----------------------------------------------------
// 8. POST RECORDING STATUS (Interruption / Resume)
// ----------------------------------------------------
export async function postWorkSessionRecordingStatus(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;

    const session = db.workSessions.findById(id);
    if (!session) return res.status(404).json({ success: false, message: 'Work session not found' });

    const nowIso = new Date().toISOString();
    const isInterrupted = status === 'INTERRUPTED' || status === 'STOPPED' || status === 'FAILED';

    const updated = db.workSessions.updateById(id, prev => ({
      ...prev,
      screenRecordingStatus: status,
      interruptionCount: isInterrupted ? (prev.interruptionCount || 0) + 1 : prev.interruptionCount,
      failureReason: reason || prev.failureReason,
      updatedAt: nowIso
    }));

    recordAuditLog(
      req,
      isInterrupted ? 'WARNING' : 'INFO',
      'work_sessions',
      `Work session screen recording status changed to ${status}${reason ? ` (${reason})` : ''}`,
      id
    );

    // Timeline event
    db.activityTimeline.insertOne({
      type: isInterrupted ? 'RECORDING_INTERRUPTED' : 'RECORDING_RESUMED',
      title: isInterrupted ? 'Screen Recording Interrupted' : 'Screen Recording Resumed',
      description: reason || `Status changed to ${status}`,
      employeeId: session.employeeId,
      employeeName: session.employeeName,
      timestamp: nowIso
    });

    return res.json({ success: true, data: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ----------------------------------------------------
// 9. UPLOAD RECORDING SEGMENT (Multipart + Media Validation)
// ----------------------------------------------------
export async function uploadRecordingSegment(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params; // workSessionId
    const { employeeId, employeeName } = getEmpContext(req);
    const session = db.workSessions.findById(id);

    if (!session) {
      return res.status(404).json({ success: false, message: 'Work session not found' });
    }

    if (session.employeeId !== employeeId && req.user?.role !== 'SUPER_ADMIN' && req.user?.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Forbidden: You do not own this work session' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No video chunk file received' });
    }

    const segmentNumber = Number(req.body.segmentNumber) || (session.recordingSegmentsCount + 1);
    const durationSeconds = Number(req.body.durationSeconds) || 0;
    const startedAt = req.body.startedAt || new Date(Date.now() - durationSeconds * 1000).toISOString();
    const endedAt = req.body.endedAt || new Date().toISOString();
    const clientMime = req.body.mimeType || req.file.mimetype || 'video/webm';

    // Validate media file bytes, EBML header, calculate SHA-256
    const validation = await validateMediaFile(req.file.path, durationSeconds, clientMime);

    // Prevent duplicate upload of the same segmentNumber
    const existingSeg = db.recordingSegments.findOne(s => s.workSessionId === id && s.segmentNumber === segmentNumber);
    if (existingSeg) {
      // Overwrite/update existing segment record
      const updatedSeg = db.recordingSegments.updateById(existingSeg._id, {
        startedAt,
        endedAt,
        recordedDurationSeconds: durationSeconds,
        actualMediaDurationSeconds: validation.actualMediaDurationSeconds,
        durationSeconds: validation.actualMediaDurationSeconds || durationSeconds,
        fileName: req.file.filename,
        filePath: req.file.path,
        fileSize: validation.fileSizeBytes || req.file.size,
        fileSizeBytes: validation.fileSizeBytes || req.file.size,
        mimeType: validation.mimeType,
        videoCodec: req.body.videoCodec || validation.videoCodec,
        audioCodec: req.body.audioCodec || validation.audioCodec,
        hasVideo: validation.hasVideo,
        hasAudio: validation.hasAudio,
        uploadStatus: 'UPLOADED',
        processingStatus: validation.processingStatus,
        checksum: validation.sha256,
        sha256: validation.sha256,
        updatedAt: new Date().toISOString()
      });

      return res.status(200).json({
        success: true,
        message: `Recording segment #${segmentNumber} re-uploaded & validated`,
        data: updatedSeg
      });
    }

    const segment = db.recordingSegments.insertOne({
      workSessionId: id,
      organizationId: session.organizationId || req.user?.organizationId || DEFAULT_ORG_ID,
      employeeId,
      employeeName,
      segmentNumber,
      startedAt,
      endedAt,
      recordedDurationSeconds: durationSeconds,
      actualMediaDurationSeconds: validation.actualMediaDurationSeconds,
      durationSeconds: validation.actualMediaDurationSeconds || durationSeconds,
      fileName: req.file.filename,
      filePath: req.file.path,
      fileSize: validation.fileSizeBytes || req.file.size,
      fileSizeBytes: validation.fileSizeBytes || req.file.size,
      mimeType: validation.mimeType,
      videoCodec: req.body.videoCodec || validation.videoCodec,
      audioCodec: req.body.audioCodec || validation.audioCodec,
      hasVideo: validation.hasVideo,
      hasAudio: validation.hasAudio,
      storageKey: `sessions/${id}/${req.file.filename}`,
      uploadStatus: 'UPLOADED',
      processingStatus: validation.processingStatus,
      downloadUrl: `/api/hr/work-sessions/${id}/recordings/${segmentNumber}/stream`,
      checksum: validation.sha256,
      sha256: validation.sha256,
      createdAt: new Date().toISOString()
    });

    // Update workSession counters
    const newCount = (session.recordingSegmentsCount || 0) + 1;
    const newDuration = (session.recordingDurationSeconds || 0) + (validation.actualMediaDurationSeconds || durationSeconds);

    db.workSessions.updateById(id, prev => ({
      ...prev,
      recordingSegmentsCount: newCount,
      recordingDurationSeconds: newDuration,
      status: prev.status === 'COMPLETED_UPLOAD_PENDING' ? 'COMPLETED' : prev.status,
      updatedAt: new Date().toISOString()
    }));

    return res.status(201).json({
      success: true,
      message: `Recording segment #${segmentNumber} uploaded & verified (${validation.processingStatus})`,
      data: segment
    });
  } catch (err: any) {
    console.error('Error uploading recording segment:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ----------------------------------------------------
// 10. END WORK SESSION & PUNCH OUT
// ----------------------------------------------------
export async function endWorkSession(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const { employeeId, employeeName, userId } = getEmpContext(req);
    const { remarks, selfie, location, uploadPending } = req.body;

    const session = db.workSessions.findById(id);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Work session not found' });
    }

    const nowIso = new Date().toISOString();
    const checkOutTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    // 1. Calculate Shift & Work Duration
    const startTime = new Date(session.startedAt).getTime();
    const endTime = new Date(nowIso).getTime();
    const totalElapsedSeconds = Math.max(0, Math.floor((endTime - startTime) / 1000));
    const totalBreakSeconds = session.totalBreakSeconds || 0;
    const netWorkSeconds = Math.max(0, totalElapsedSeconds - totalBreakSeconds);
    const workHours = Number((netWorkSeconds / 3600).toFixed(2));

    // 2. Aggregate Real CRM Activity for Today's Daily Work Summary
    const today = session.sessionDate;
    const leads = db.leads.find(l => l.assignedTo === employeeId || l.assignedTo === userId || l.assignedTo === employeeName);
    const calls = db.callLogs.find(c => (c.employeeId === employeeId || c.employeeId === userId) && c.timestamp.startsWith(today));
    const followUps = db.followUps.find(f => (f.assignedTo === employeeId || f.assignedTo === userId) && f.status === 'COMPLETED');
    const tasks = db.tasks.find(t => (t.assignedTo === employeeId || t.assignedToId === employeeId) && t.status === 'COMPLETED');
    const visits = db.fieldVisitProofs.find(p => p.employeeId === employeeId && p.timestamp.startsWith(today));
    const quotations = db.quotations.find(q => ((q as any).createdBy === employeeName || q.createdAt.startsWith(today)));

    // Calculate approximate travel distance from location history
    const locHistory = db.locationHistory.find(
      l => l.employeeId === employeeId && l.recordedAt.startsWith(today)
    );
    let travelDistanceKm = 0;
    if (locHistory.length > 1) {
      for (let i = 1; i < locHistory.length; i++) {
        travelDistanceKm += calculateHaversineDistanceMeters(
          locHistory[i - 1].latitude,
          locHistory[i - 1].longitude,
          locHistory[i].latitude,
          locHistory[i].longitude
        ) / 1000;
      }
    }
    travelDistanceKm = Number(travelDistanceKm.toFixed(1));

    const dailySummary: WorkSessionDailySummary = {
      shift: `${session.shiftStart || '09:30 AM'} - ${checkOutTime}`,
      netWorkHours: formatDuration(netWorkSeconds),
      crmActiveHours: formatDuration(session.totalActiveAppSeconds || (netWorkSeconds * 0.8)),
      breakMinutes: Math.floor(totalBreakSeconds / 60),
      leadsCount: leads.length,
      callsCount: calls.length,
      followUpsCount: followUps.length,
      tasksCount: tasks.length,
      visitsCount: visits.length,
      quotationsCount: quotations.length,
      travelDistanceKm,
      recordingDurationFormatted: formatDuration(session.recordingDurationSeconds || 0),
      interruptionsCount: session.interruptionCount || 0
    };

    // Determine final status based on uploadPending flag
    const finalStatus = uploadPending ? 'COMPLETED_UPLOAD_PENDING' : 'COMPLETED';

    // 3. Finalize WorkSession
    const completedSession = db.workSessions.updateById(id, {
      status: finalStatus,
      endedAt: nowIso,
      shiftEnd: checkOutTime,
      totalWorkSeconds: netWorkSeconds,
      screenRecordingStatus: 'STOPPED',
      microphoneStatus: 'NOT_REQUIRED',
      trackingStatus: 'STOPPED',
      dailySummary,
      updatedAt: nowIso
    });

    // 4. Finalize Attendance
    if (session.attendanceId) {
      db.attendance.updateById(session.attendanceId, {
        checkOut: checkOutTime,
        status: workHours >= 8 ? 'PRESENT' : (workHours >= 4 ? 'HALF_DAY' : 'PRESENT'),
        workHours,
        remarks: remarks || 'Work session completed',
        selfieCheckOut: selfie || '',
        locationCheckOut: location || undefined,
        updatedAt: nowIso
      });
    }

    // 5. Timeline & Audit Log
    db.activityTimeline.insertOne({
      type: 'PUNCH_OUT',
      title: 'Work Session Finalized & Punched Out',
      description: `Shift concluded at ${checkOutTime}. Total Net Work: ${dailySummary.netWorkHours}.`,
      employeeId,
      employeeName,
      timestamp: nowIso
    });

    recordAuditLog(req, 'UPDATE', 'work_sessions', 'Work Session Finalized and Clocked Out', id, undefined, {
      netWorkHours: dailySummary.netWorkHours,
      checkOutTime,
      finalStatus
    });

    return res.json({
      success: true,
      message: `Shift ended successfully! Total work time: ${dailySummary.netWorkHours}`,
      data: {
        session: completedSession,
        summary: dailySummary
      }
    });
  } catch (err: any) {
    console.error('Error ending work session:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ----------------------------------------------------
// 11. GET WORK SESSION SUMMARY
// ----------------------------------------------------
export async function getWorkSessionSummary(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const session = db.workSessions.findById(id);
    if (!session) return res.status(404).json({ success: false, message: 'Work session not found' });

    return res.json({
      success: true,
      data: session.dailySummary || null
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ----------------------------------------------------
// 12. GET WORKDAY TIMELINE
// ----------------------------------------------------
export async function getWorkdayTimeline(req: AuthenticatedRequest, res: Response) {
  try {
    const { employeeId } = getEmpContext(req);
    const date = (req.query.date as string) || new Date().toISOString().split('T')[0];

    const timelineItems = db.activityTimeline.find(
      t => (t.employeeId === employeeId) && t.timestamp.startsWith(date)
    );

    const workActivities = db.workSessionActivities.find(
      a => a.employeeId === employeeId && a.timestamp.startsWith(date)
    );

    const segments = db.recordingSegments.find(
      s => s.employeeId === employeeId && s.startedAt.startsWith(date)
    );

    const merged = buildAggregatedTimeline(timelineItems, workActivities, segments);

    return res.json({
      success: true,
      data: merged
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

