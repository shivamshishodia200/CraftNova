/**
 * Enterprise Geofencing & Site Containment Engine
 * 
 * Manages spatial circular geofences, site containment matching,
 * dynamic temporary task geofences, task auto-arrival, and dwell calculations.
 */

import { db } from '../database/db';
import { GeofenceDoc, GeofenceEventDoc, EmployeeDoc } from '../database/types';
import { GeodesicService } from './geodesic.service';
import { GeofenceMatch } from './types';

export class GeofenceService {
  /**
   * Reusable standardized Geofence evaluation method
   */
  public static checkGeofence(
    latitude: number,
    longitude: number,
    employee?: EmployeeDoc,
    context?: any
  ): {
    inside: boolean;
    matchedGeofence?: GeofenceDoc;
    distanceMeters: number;
    allowedRadiusMeters: number;
    allMatches: GeofenceMatch[];
  } {
    const allMatches = this.findContainingGeofences(latitude, longitude, employee);
    const primaryMatch = allMatches[0];

    if (primaryMatch) {
      const geoDoc = db.geofences?.findById(primaryMatch.geofenceId);
      return {
        inside: true,
        matchedGeofence: geoDoc || undefined,
        distanceMeters: primaryMatch.distanceToCenterMeters,
        allowedRadiusMeters: primaryMatch.radiusMeters,
        allMatches
      };
    }

    // If outside, find closest enabled geofence
    const allGeofences = (db.geofences?.getAll() || []).filter(g => g.enabled && !g.isExpired);
    let minDistance = Infinity;
    let closestGeofence: GeofenceDoc | undefined;

    for (const geo of allGeofences) {
      const dist = GeodesicService.calculateDistanceMeters(latitude, longitude, geo.latitude, geo.longitude);
      if (dist < minDistance) {
        minDistance = dist;
        closestGeofence = geo;
      }
    }

    return {
      inside: false,
      matchedGeofence: closestGeofence,
      distanceMeters: minDistance === Infinity ? 0 : Math.round(minDistance),
      allowedRadiusMeters: closestGeofence?.radiusMeters || 100,
      allMatches: []
    };
  }

  /**
   * Evaluates coordinate against all enabled geofences and returns matching sites
   */
  public static findContainingGeofences(
    latitude: number,
    longitude: number,
    employee?: EmployeeDoc
  ): GeofenceMatch[] {
    const nowIso = new Date().toISOString();
    const allGeofences = db.geofences?.getAll() || [];
    const matches: GeofenceMatch[] = [];

    for (const geo of allGeofences) {
      if (!geo.enabled || geo.isExpired) continue;

      // Check temporary validity window
      if (geo.validUntil && new Date(geo.validUntil).getTime() < Date.now()) {
        db.geofences.updateById(geo._id, { isExpired: true, enabled: false });
        continue;
      }
      if (geo.validFrom && new Date(geo.validFrom).getTime() > Date.now()) {
        continue;
      }

      // Check employee assignment filter if restricted
      if (employee && geo.assignedEmployees && geo.assignedEmployees.length > 0) {
        const isAssigned = geo.assignedEmployees.includes(employee._id) ||
                           geo.assignedEmployees.includes(employee.employeeId) ||
                           (employee.userId && geo.assignedEmployees.includes(employee.userId));
        if (!isAssigned) continue;
      }

      const distMeters = GeodesicService.calculateDistanceMeters(
        latitude,
        longitude,
        geo.latitude,
        geo.longitude
      );

      if (distMeters <= geo.radiusMeters) {
        matches.push({
          geofenceId: geo._id,
          geofenceName: geo.name,
          category: geo.category,
          distanceToCenterMeters: distMeters,
          radiusMeters: geo.radiusMeters
        });
      }
    }

    // Sort by smallest radius first (most specific zone)
    return matches.sort((a, b) => a.distanceToCenterMeters - b.distanceToCenterMeters);
  }

  /**
   * Creates a dynamic temporary geofence for field task or client installation
   */
  public static createDynamicTaskGeofence(params: {
    taskId?: string;
    customerId?: string;
    employeeId: string;
    name: string;
    latitude: number;
    longitude: number;
    radiusMeters?: number;
    validHours?: number;
    address?: string;
  }): GeofenceDoc {
    const validFrom = new Date().toISOString();
    const validUntil = new Date(Date.now() + (params.validHours || 24) * 3600000).toISOString();

    return db.geofences.insertOne({
      name: params.name,
      code: `GEO_TASK_${params.taskId || Date.now()}`,
      category: 'TASK',
      latitude: params.latitude,
      longitude: params.longitude,
      radiusMeters: params.radiusMeters || 150,
      address: params.address,
      assignedEmployees: [params.employeeId],
      taskId: params.taskId,
      customerId: params.customerId,
      employeeId: params.employeeId,
      validFrom,
      validUntil,
      isExpired: false,
      alertOnEntry: true,
      alertOnExit: true,
      enabled: true,
      createdAt: validFrom,
      updatedAt: validFrom
    });
  }

  /**
   * Automatically expires temporary task geofence upon task completion
   */
  public static expireTaskGeofence(taskId: string): boolean {
    const taskGeos = db.geofences.find(g => g.taskId === taskId && !g.isExpired);
    for (const geo of taskGeos) {
      db.geofences.updateById(geo._id, {
        isExpired: true,
        enabled: false,
        updatedAt: new Date().toISOString()
      });
    }
    return taskGeos.length > 0;
  }

  /**
   * Calculates distance to primary office location in meters
   */
  public static calculateDistanceToPrimaryOffice(latitude: number, longitude: number): number {
    const officeGeofences = db.geofences?.find(g => (g.category === 'OFFICE' || g.category === 'BRANCH') && g.enabled && !g.isExpired) || [];
    if (officeGeofences.length === 0) return 0;

    let minDistance = Infinity;
    for (const office of officeGeofences) {
      const dist = GeodesicService.calculateDistanceMeters(
        latitude,
        longitude,
        office.latitude,
        office.longitude
      );
      if (dist < minDistance) {
        minDistance = dist;
      }
    }

    return minDistance === Infinity ? 0 : Math.round(minDistance);
  }

  /**
   * Detects Geofence transitions (ENTER, EXIT) and handles Geo-Task Auto-Arrival
   */
  public static evaluateTransitions(
    employeeId: string,
    employeeName: string,
    prevGeofenceId: string | undefined,
    currentMatches: GeofenceMatch[],
    coords: { latitude: number; longitude: number; accuracy: number; timestamp?: string }
  ): {
    currentGeofenceId?: string;
    currentGeofenceName?: string;
    isInsideGeofence: boolean;
    eventsGenerated: GeofenceEventDoc[];
  } {
    const events: GeofenceEventDoc[] = [];
    const primaryMatch = currentMatches[0];
    const newGeofenceId = primaryMatch ? primaryMatch.geofenceId : undefined;
    const now = coords.timestamp || new Date().toISOString();

    // 1. Check if employee exited previous geofence
    if (prevGeofenceId && prevGeofenceId !== newGeofenceId) {
      const prevGeo = db.geofences?.findById(prevGeofenceId);
      if (prevGeo) {
        // Find latest enter event to compute dwell duration
        const lastEnter = db.geofenceEvents?.find(
          e => e.employeeId === employeeId && e.geofenceId === prevGeofenceId && e.eventType === 'ENTER'
        ).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

        let durationMinutes: number | undefined;
        if (lastEnter) {
          durationMinutes = Math.max(
            1,
            Math.round((new Date(now).getTime() - new Date(lastEnter.timestamp).getTime()) / 60000)
          );
        }

        const exitEvent = db.geofenceEvents?.insertOne({
          employeeId,
          employeeName,
          geofenceId: prevGeofenceId,
          geofenceName: prevGeo.name,
          eventType: 'EXIT',
          timestamp: now,
          durationMinutes,
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy,
          taskId: prevGeo.taskId,
          customerId: prevGeo.customerId
        });
        if (exitEvent) events.push(exitEvent);
      }
    }

    // 2. Check if employee entered a new geofence
    if (newGeofenceId && newGeofenceId !== prevGeofenceId) {
      const currentGeo = db.geofences?.findById(newGeofenceId);
      const enterEvent = db.geofenceEvents?.insertOne({
        employeeId,
        employeeName,
        geofenceId: newGeofenceId,
        geofenceName: primaryMatch.geofenceName,
        eventType: 'ENTER',
        timestamp: now,
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy,
        taskId: currentGeo?.taskId,
        customerId: currentGeo?.customerId
      });
      if (enterEvent) events.push(enterEvent);

      // Geo-Task Automation: If geofence is linked to a Task, trigger ARRIVED status
      if (currentGeo?.taskId) {
        const task = db.tasks.findById(currentGeo.taskId);
        if (task && (task.status === 'PENDING' || task.status === 'IN_PROGRESS')) {
          db.tasks.updateById(task._id, {
            status: 'IN_PROGRESS',
            notes: (task.notes ? task.notes + ' | ' : '') + `Arrived at site on ${new Date(now).toLocaleTimeString()}`
          });
        }
      }
    }

    return {
      currentGeofenceId: primaryMatch?.geofenceId,
      currentGeofenceName: primaryMatch?.geofenceName,
      isInsideGeofence: Boolean(primaryMatch),
      eventsGenerated: events
    };
  }
}
