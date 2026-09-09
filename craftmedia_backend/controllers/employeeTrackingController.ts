/**
 * Enterprise Employee Live Tracking & Geofencing Controller
 * 
 * Provides HTTP endpoints for GPS telemetry ingestion, live map state,
 * route polyline history, geofence management, policy controls, and CSV reports.
 */

import { Response } from 'express';
import { db } from '../database/db';
import { AuthenticatedRequest } from '../middleware/auth';
import { recordAuditLog } from '../middleware/audit';
import { TrackingEngineService } from '../tracking/trackingEngine.service';
import { TrackingPolicyService } from '../tracking/policy.service';
import { GeofenceService } from '../tracking/geofence.service';
import { EmployeeDoc } from '../database/types';

/**
 * Helper: Resolves matching EmployeeDoc from authenticated user session
 */
function resolveCurrentEmployee(req: AuthenticatedRequest): EmployeeDoc | null {
  if (!req.user) return null;
  const user = req.user;

  const userId = user.userId;
  // Match by userId or email or name
  let emp = db.employees.findOne(e => e.userId === userId || (e.email && e.email.toLowerCase() === user.email.toLowerCase()));
  if (!emp && user.name) {
    emp = db.employees.findOne(e => e.name.toLowerCase() === user.name.toLowerCase());
  }
  return emp;
}

/**
 * POST /api/employee-tracking/location
 * Ingests single authenticated location coordinate packet
 */
export async function postLocation(req: AuthenticatedRequest, res: Response) {
  try {
    const employee = resolveCurrentEmployee(req);
    if (!employee) {
      return res.status(403).json({
        success: false,
        message: 'No associated employee profile found for your authenticated account.'
      });
    }

    const {
      latitude,
      longitude,
      accuracy = 15,
      speed,
      heading,
      altitude,
      batteryLevel,
      isCharging,
      recordedAt,
      deviceId,
      platform,
      source = 'WEB_BROWSER',
      isMockLocation = false
    } = req.body;

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return res.status(400).json({
        success: false,
        message: 'Valid latitude and longitude numerical coordinates are required.'
      });
    }

    const result = await TrackingEngineService.ingestLocationPacket(
      employee,
      {
        latitude,
        longitude,
        accuracy: Number(accuracy),
        speed: speed !== undefined ? Number(speed) : undefined,
        heading: heading !== undefined ? Number(heading) : undefined,
        altitude: altitude !== undefined ? Number(altitude) : undefined,
        batteryLevel: batteryLevel !== undefined ? Number(batteryLevel) : undefined,
        isCharging: Boolean(isCharging),
        recordedAt: recordedAt || new Date().toISOString(),
        deviceId,
        platform,
        source,
        isMockLocation: Boolean(isMockLocation)
      },
      {
        ip: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1',
        userAgent: req.headers['user-agent']
      }
    );

    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * POST /api/employee-tracking/location/batch
 * Ingests queued offline location packets with per-point validation and duplicate filtering
 */
export async function postBatchLocations(req: AuthenticatedRequest, res: Response) {
  try {
    const employee = resolveCurrentEmployee(req);
    if (!employee) {
      return res.status(403).json({ success: false, message: 'Employee profile not found.' });
    }

    const items = req.body.packets || req.body.locations || [];
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Packets or locations array is required.' });
    }

    // Limit batch size to max 100 to prevent payload bombing
    const safePackets = items.slice(0, 100);
    let accepted = 0;
    let duplicate = 0;
    let rejected = 0;

    const seenTimestamps = new Set<string>();

    for (const p of safePackets) {
      const lat = typeof p.latitude === 'number' ? p.latitude : parseFloat(String(p.latitude));
      const lng = typeof p.longitude === 'number' ? p.longitude : parseFloat(String(p.longitude));

      if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        rejected++;
        continue;
      }

      const timeKey = `${p.recordedAt || p.timestamp}_${lat.toFixed(5)}_${lng.toFixed(5)}`;
      if (seenTimestamps.has(timeKey)) {
        duplicate++;
        continue;
      }
      seenTimestamps.add(timeKey);

      try {
        const result = await TrackingEngineService.ingestLocationPacket(
          employee,
          {
            latitude: lat,
            longitude: lng,
            accuracy: p.accuracy !== undefined ? Number(p.accuracy) : 15,
            speed: p.speed !== undefined ? Number(p.speed) : undefined,
            heading: p.heading !== undefined ? Number(p.heading) : undefined,
            altitude: p.altitude !== undefined ? Number(p.altitude) : undefined,
            batteryLevel: p.batteryLevel !== undefined ? Number(p.batteryLevel) : (p.battery !== undefined ? Number(p.battery) : undefined),
            isCharging: Boolean(p.isCharging),
            recordedAt: p.recordedAt || p.timestamp || new Date().toISOString(),
            deviceId: p.deviceId,
            platform: p.platform,
            source: 'OFFLINE_SYNC',
            isMockLocation: Boolean(p.isMockLocation)
          },
          {
            ip: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1',
            userAgent: req.headers['user-agent']
          }
        );

        if (result.success) {
          accepted++;
        } else {
          rejected++;
        }
      } catch {
        rejected++;
      }
    }

    return res.json({
      success: true,
      message: `Batch processed: ${accepted} accepted, ${duplicate} duplicate, ${rejected} rejected.`,
      data: {
        received: items.length,
        accepted,
        duplicate,
        rejected
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * GET /api/employee-tracking/health
 * Calculates employee tracking health metrics
 */
export async function getTrackingHealth(req: AuthenticatedRequest, res: Response) {
  try {
    const employee = resolveCurrentEmployee(req);
    if (!employee) {
      return res.status(403).json({ success: false, message: 'Employee profile not found.' });
    }

    const latest = db.latestLocations.findById(`loc_latest_${employee._id}`);
    const now = Date.now();
    let healthState: 'HEALTHY' | 'GPS_DISABLED' | 'PERMISSION_DENIED' | 'STALE' | 'OFFLINE' | 'LOW_BATTERY' | 'POOR_ACCURACY' = 'OFFLINE';

    if (employee.locationConsent?.status === 'DENIED') {
      healthState = 'PERMISSION_DENIED';
    } else if (latest) {
      const ageMs = now - new Date(latest.lastRecordedAt).getTime();
      if (latest.batteryLevel !== undefined && latest.batteryLevel <= 15) {
        healthState = 'LOW_BATTERY';
      } else if (latest.accuracy > 100) {
        healthState = 'POOR_ACCURACY';
      } else if (ageMs > 15 * 60 * 1000) {
        healthState = 'STALE';
      } else {
        healthState = 'HEALTHY';
      }
    }

    return res.json({
      success: true,
      data: {
        employeeId: employee._id,
        employeeName: employee.name,
        healthState,
        latestLocation: latest || null,
        battery: latest?.batteryLevel || null,
        accuracy: latest?.accuracy || null,
        lastSeen: latest?.lastRecordedAt || null
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * GET /api/employee-tracking/team/health
 * HR/Manager overview of team tracking health
 */
export async function getTeamTrackingHealth(req: AuthenticatedRequest, res: Response) {
  try {
    const allEmployees = db.employees.getAll();
    const latestLocations = db.latestLocations.getAll();
    const locMap = new Map<string, any>();
    latestLocations.forEach(l => locMap.set(l.employeeId, l));

    const now = Date.now();
    const teamHealth = allEmployees.map(emp => {
      const loc = locMap.get(emp._id);
      let healthState: string = 'OFFLINE';

      if (emp.locationConsent?.status === 'DENIED') {
        healthState = 'PERMISSION_DENIED';
      } else if (loc) {
        const ageMs = now - new Date(loc.lastRecordedAt).getTime();
        if (loc.batteryLevel !== undefined && loc.batteryLevel <= 15) {
          healthState = 'LOW_BATTERY';
        } else if (loc.accuracy > 100) {
          healthState = 'POOR_ACCURACY';
        } else if (ageMs > 15 * 60 * 1000) {
          healthState = 'STALE';
        } else {
          healthState = 'HEALTHY';
        }
      }

      return {
        employeeId: emp._id,
        employeeName: emp.name,
        department: emp.department,
        healthState,
        battery: loc?.batteryLevel || null,
        lastSeen: loc?.lastRecordedAt || null
      };
    });

    const summary = {
      total: teamHealth.length,
      healthy: teamHealth.filter(t => t.healthState === 'HEALTHY').length,
      lowBattery: teamHealth.filter(t => t.healthState === 'LOW_BATTERY').length,
      stale: teamHealth.filter(t => t.healthState === 'STALE').length,
      offline: teamHealth.filter(t => t.healthState === 'OFFLINE').length,
      permissionDenied: teamHealth.filter(t => t.healthState === 'PERMISSION_DENIED').length
    };

    return res.json({ success: true, data: { summary, team: teamHealth } });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * POST /api/employee-tracking/geofences/task
 * Creates dynamic task geofence (Module 5)
 */
export async function createTaskGeofenceEndpoint(req: AuthenticatedRequest, res: Response) {
  try {
    const { taskId, customerId, employeeId, name, latitude, longitude, radiusMeters, validHours, address } = req.body;

    if (!name || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ success: false, message: 'name, latitude, and longitude are required.' });
    }

    const geo = GeofenceService.createDynamicTaskGeofence({
      taskId,
      customerId,
      employeeId: employeeId || (req.user as any)?.employeeId || req.user?.userId,
      name,
      latitude: Number(latitude),
      longitude: Number(longitude),
      radiusMeters: radiusMeters ? Number(radiusMeters) : 150,
      validHours: validHours ? Number(validHours) : 24,
      address
    });

    return res.status(201).json({ success: true, message: 'Dynamic task geofence created', data: geo });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * GET /api/employee-tracking/my-status
 * Returns current user's tracking policy, shift status, and consent state
 */
export async function getMyTrackingStatus(req: AuthenticatedRequest, res: Response) {
  try {
    const employee = resolveCurrentEmployee(req);
    const policy = TrackingPolicyService.getActivePolicy();

    if (!employee) {
      return res.json({
        success: true,
        data: {
          hasProfile: false,
          policyEnabled: policy.enabled,
          trackingMode: policy.trackingMode,
          isTrackingActive: false,
          reason: 'Non-employee administrative account'
        }
      });
    }

    const evalResult = TrackingPolicyService.evaluateEligibility(employee);
    const latest = db.latestLocations.findById(`loc_latest_${employee._id}`);

    return res.json({
      success: true,
      data: {
        hasProfile: true,
        employeeId: employee._id,
        employeeName: employee.name,
        trackingEnabled: employee.trackingEnabled !== false,
        trackingMode: employee.trackingMode || policy.trackingMode,
        consentStatus: employee.locationConsent?.status || 'PENDING',
        isTrackingActive: evalResult.isAllowed,
        reason: evalResult.reason,
        shiftStart: employee.shiftStart || '09:30',
        shiftEnd: employee.shiftEnd || '18:30',
        updateFrequencySeconds: policy.updateFrequencySeconds || 60,
        latestLocation: latest || null
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * POST /api/employee-tracking/my-consent
 * Records employee consent decision (GRANTED / DENIED)
 */
export async function postMyConsent(req: AuthenticatedRequest, res: Response) {
  try {
    const employee = resolveCurrentEmployee(req);
    if (!employee) {
      return res.status(403).json({ success: false, message: 'Employee profile not found.' });
    }

    const { status } = req.body;
    if (!['GRANTED', 'DENIED'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Consent status must be GRANTED or DENIED' });
    }

    const consentData = {
      status: status as 'GRANTED' | 'DENIED',
      grantedAt: new Date().toISOString(),
      ipAddress: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1',
      policyVersion: 'v1.0'
    };

    db.employees.updateById(employee._id, {
      locationConsent: consentData,
      updatedAt: new Date().toISOString()
    });

    recordAuditLog(req, 'UPDATE', 'employees', `Location Consent ${status}`, employee._id, null, consentData);

    return res.json({
      success: true,
      message: `Location tracking consent ${status.toLowerCase()} successfully.`,
      data: consentData
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * GET /api/employee-tracking/live
 * Returns latest locations for all employees with statistics summary
 */
export async function getLiveEmployees(req: AuthenticatedRequest, res: Response) {
  try {
    const allEmployees = db.employees.getAll();
    const latestLocations = db.latestLocations.getAll();

    // Map by employee ID for instant lookup
    const locMap = new Map<string, any>();
    latestLocations.forEach(l => locMap.set(l.employeeId, l));

    const now = Date.now();
    const freshnessThresholdMs = 5 * 60 * 1000; // 5 minutes

    const list = allEmployees.map(emp => {
      const loc = locMap.get(emp._id);
      let status = loc?.trackingStatus || 'OFFLINE';

      // Check if location is stale
      if (loc && (now - new Date(loc.lastRecordedAt).getTime() > freshnessThresholdMs)) {
        status = 'STALE';
      }

      if (emp.status === 'ON_LEAVE') {
        status = 'ON_LEAVE';
      }

      return {
        employeeId: emp._id,
        employeeCode: emp.employeeId,
        name: emp.name,
        email: emp.email,
        phone: emp.phone,
        department: emp.department,
        designation: emp.designation,
        status: emp.status,
        isFieldEmployee: Boolean(emp.isFieldEmployee),
        trackingEnabled: emp.trackingEnabled !== false,
        consentStatus: emp.locationConsent?.status || 'PENDING',
        location: loc ? {
          ...loc,
          trackingStatus: status
        } : null
      };
    });

    // Compute KPI statistics
    const stats = {
      totalEmployees: allEmployees.length,
      trackingActive: list.filter(e => e.location && ['ONLINE', 'TRAVELLING', 'STOPPED'].includes(e.location.trackingStatus)).length,
      atOffice: list.filter(e => e.location?.isInsideGeofence && e.location?.workLocationType === 'OFFICE').length,
      inField: list.filter(e => e.location && !e.location.isInsideGeofence && ['TRAVELLING', 'STOPPED', 'ONLINE'].includes(e.location.trackingStatus)).length,
      stopped: list.filter(e => e.location?.trackingStatus === 'STOPPED').length,
      offline: list.filter(e => !e.location || e.location.trackingStatus === 'OFFLINE' || e.location.trackingStatus === 'STALE').length,
      onLeave: list.filter(e => e.status === 'ON_LEAVE').length,
      outsideGeofence: list.filter(e => e.location && !e.location.isInsideGeofence).length
    };

    return res.json({
      success: true,
      data: {
        stats,
        employees: list
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * GET /api/employee-tracking/stream
 * Server-Sent Events (SSE) stream for live realtime map marker updates
 */
export async function streamLiveTracking(req: AuthenticatedRequest, res: Response) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Send initial handshake
  res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`);

  TrackingEngineService.addSseClient(res);
}

/**
 * GET /api/employee-tracking/employee/:id
 * Returns single employee 360 location state
 */
export async function getEmployeeTrackingDetail(req: AuthenticatedRequest, res: Response) {
  try {
    const employeeId = req.params.id;
    const emp = db.employees.findById(employeeId);
    if (!emp) return res.status(404).json({ success: false, message: 'Employee not found' });

    const latest = db.latestLocations.findById(`loc_latest_${employeeId}`);
    const todayStr = new Date().toISOString().split('T')[0];
    const dailySummary = db.dailyTrackingSummaries.findById(`sum_${employeeId}_${todayStr}`);

    return res.json({
      success: true,
      data: {
        employee: emp,
        latestLocation: latest || null,
        dailySummary: dailySummary || null
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * GET /api/employee-tracking/employee/:id/route
 * Returns route coordinates and detected stops for a given date
 */
export async function getEmployeeRouteHistory(req: AuthenticatedRequest, res: Response) {
  try {
    const employeeId = req.params.id;
    const date = (req.query.date as string) || new Date().toISOString().split('T')[0];

    const history = db.locationHistory.find(
      h => h.employeeId === employeeId && h.recordedAt.startsWith(date)
    ).sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime());

    const stops = history.filter(h => h.isStop);

    return res.json({
      success: true,
      data: {
        date,
        totalPoints: history.length,
        points: history,
        stops
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * GET /api/employee-tracking/employee/:id/timeline
 * Returns chronological timeline events (check-ins, moves, stops, geofence entries)
 */
export async function getEmployeeTimeline(req: AuthenticatedRequest, res: Response) {
  try {
    const employeeId = req.params.id;
    const date = (req.query.date as string) || new Date().toISOString().split('T')[0];

    const timelineEvents: any[] = [];

    // 1. Attendance Check-In / Check-Out
    const att = db.attendance.findOne(a => a.employeeId === employeeId && a.date === date);
    if (att) {
      if (att.checkIn) {
        timelineEvents.push({
          type: 'ATTENDANCE_CHECKIN',
          title: 'Shift Check-In',
          description: `Checked in for work shift (${att.status})`,
          timestamp: `${date}T${att.checkIn}`,
          status: 'SUCCESS'
        });
      }
      if (att.checkOut) {
        timelineEvents.push({
          type: 'ATTENDANCE_CHECKOUT',
          title: 'Shift Check-Out',
          description: `Checked out for the day`,
          timestamp: `${date}T${att.checkOut}`,
          status: 'SUCCESS'
        });
      }
    }

    // 2. Geofence Events
    const geofenceEvents = db.geofenceEvents.find(
      e => e.employeeId === employeeId && e.timestamp.startsWith(date)
    );
    for (const geve of geofenceEvents) {
      timelineEvents.push({
        type: geve.eventType === 'ENTER' ? 'GEOFENCE_ENTER' : 'GEOFENCE_EXIT',
        title: `${geve.eventType === 'ENTER' ? 'Entered' : 'Exited'} ${geve.geofenceName}`,
        description: geve.durationMinutes ? `Duration inside: ${geve.durationMinutes} min` : `Location: (${geve.latitude.toFixed(4)}, ${geve.longitude.toFixed(4)})`,
        timestamp: geve.timestamp,
        status: 'INFO',
        geofenceId: geve.geofenceId
      });
    }

    // 3. Significant Stops
    const stops = db.locationHistory.find(
      h => h.employeeId === employeeId && h.recordedAt.startsWith(date) && h.isStop === true
    );
    for (const stop of stops) {
      timelineEvents.push({
        type: 'STATIONARY_STOP',
        title: `Stop Detected (${stop.stopDurationMinutes || 10} min)`,
        description: stop.address || `Stationary at (${stop.latitude.toFixed(4)}, ${stop.longitude.toFixed(4)})`,
        timestamp: stop.recordedAt,
        status: 'WARNING'
      });
    }

    timelineEvents.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    return res.json({
      success: true,
      data: timelineEvents
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * GET /api/employee-tracking/employee/:id/daily-summary
 * Returns daily summaries for employee
 */
export async function getEmployeeDailySummary(req: AuthenticatedRequest, res: Response) {
  try {
    const employeeId = req.params.id;
    const summaries = db.dailyTrackingSummaries.find(s => s.employeeId === employeeId);
    summaries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return res.json({
      success: true,
      data: summaries
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * GET /api/employee-tracking/geofences
 * Returns all configured geofences
 */
export async function getGeofences(req: AuthenticatedRequest, res: Response) {
  try {
    const geofences = db.geofences.getAll();
    return res.json({ success: true, data: geofences });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * POST /api/employee-tracking/geofences
 * Creates a new geofence site
 */
export async function createGeofence(req: AuthenticatedRequest, res: Response) {
  try {
    const {
      name,
      code,
      category = 'OFFICE',
      latitude,
      longitude,
      radiusMeters = 200,
      address,
      city,
      state,
      assignedDepartments,
      alertOnEntry = true,
      alertOnExit = true,
      enabled = true
    } = req.body;

    if (!name || typeof latitude !== 'number' || typeof longitude !== 'number') {
      return res.status(400).json({
        success: false,
        message: 'Name, latitude, and longitude are required.'
      });
    }

    const _id = `geo_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const newGeofence = db.geofences.insertOne({
      _id,
      name,
      code: code || `GEO-${Date.now().toString().slice(-4)}`,
      category,
      latitude: Number(latitude),
      longitude: Number(longitude),
      radiusMeters: Number(radiusMeters),
      address: address || '',
      city: city || '',
      state: state || '',
      assignedDepartments: assignedDepartments || [],
      alertOnEntry: Boolean(alertOnEntry),
      alertOnExit: Boolean(alertOnExit),
      enabled: Boolean(enabled),
      createdBy: req.user?.name || 'Admin',
      createdAt: now,
      updatedAt: now
    });

    recordAuditLog(req, 'CREATE', 'geofences', 'Geofence', _id, null, newGeofence);

    return res.status(201).json({
      success: true,
      message: `Geofence '${name}' created successfully.`,
      data: newGeofence
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * PUT /api/employee-tracking/geofences/:id
 * Updates geofence parameters
 */
export async function updateGeofence(req: AuthenticatedRequest, res: Response) {
  try {
    const id = req.params.id;
    const existing = db.geofences.findById(id);
    if (!existing) return res.status(404).json({ success: false, message: 'Geofence not found' });

    const updates = {
      ...req.body,
      updatedAt: new Date().toISOString()
    };

    const updated = db.geofences.updateById(id, updates);
    recordAuditLog(req, 'UPDATE', 'geofences', 'Geofence', id, existing, updates);

    return res.json({
      success: true,
      message: 'Geofence updated successfully.',
      data: updated
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * DELETE /api/employee-tracking/geofences/:id
 * Removes a geofence site
 */
export async function deleteGeofence(req: AuthenticatedRequest, res: Response) {
  try {
    const id = req.params.id;
    const existing = db.geofences.findById(id);
    if (!existing) return res.status(404).json({ success: false, message: 'Geofence not found' });

    db.geofences.deleteById(id);
    recordAuditLog(req, 'DELETE', 'geofences', 'Geofence', id, existing, null);

    return res.json({ success: true, message: `Geofence '${existing.name}' deleted.` });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * GET /api/employee-tracking/settings
 * Retrieves organization tracking policy
 */
export async function getTrackingSettings(req: AuthenticatedRequest, res: Response) {
  try {
    const policy = TrackingPolicyService.getActivePolicy();
    return res.json({ success: true, data: policy });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * PUT /api/employee-tracking/settings
 * Updates organization tracking policy
 */
export async function updateTrackingSettings(req: AuthenticatedRequest, res: Response) {
  try {
    const existing = TrackingPolicyService.getActivePolicy();
    const updates = {
      ...req.body,
      updatedAt: new Date().toISOString(),
      updatedBy: req.user?.name || 'Admin'
    };

    const updated = db.trackingPolicies.updateById('tracking_policy_config', updates);
    recordAuditLog(req, 'UPDATE', 'tracking_policies', 'Tracking Policy', 'tracking_policy_config', existing, updates);

    return res.json({
      success: true,
      message: 'Tracking policy settings updated.',
      data: updated
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * GET /api/employee-tracking/export
 * Exports tracking distance and activity summary report to CSV
 */
export async function exportTrackingReport(req: AuthenticatedRequest, res: Response) {
  try {
    const summaries = db.dailyTrackingSummaries.getAll();
    return res.json({
      success: true,
      data: summaries
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
