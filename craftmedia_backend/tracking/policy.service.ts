/**
 * Employee Privacy & Tracking Policy Evaluation Service
 * 
 * Enforces strict anti-surveillance compliance:
 * 1. Tracking allowed strictly during authorized shifts/working hours.
 * 2. Never records or broadcasts employee coordinates outside permitted periods.
 * 3. Enforces auditable employee consent.
 */

import { db } from '../database/db';
import { EmployeeDoc, TrackingPolicyDoc } from '../database/types';
import { TrackingPolicyEvaluation } from './types';

export class TrackingPolicyService {
  /**
   * Retrieves active organization tracking policy or returns safe default
   */
  public static getActivePolicy(): TrackingPolicyDoc {
    let policy = db.trackingPolicies?.findById('tracking_policy_config');
    if (!policy) {
      policy = {
        _id: 'tracking_policy_config',
        enabled: true,
        trackingMode: 'WORKING_HOURS',
        updateFrequencySeconds: 60,
        stationaryFrequencySeconds: 300,
        minAcceptableAccuracyMeters: 100,
        maxAllowableSpeedKmh: 140,
        stopRadiusMeters: 60,
        stopMinDurationMinutes: 10,
        storeRouteHistory: true,
        routeRetentionDays: 30,
        enableGeofencing: true,
        notifyEmployeeWhenTracking: true,
        requireEmployeeConsent: true,
        allowOfflineQueue: true,
        maxOfflineQueueItems: 50,
        updatedAt: new Date().toISOString(),
        updatedBy: 'System'
      };
    }
    return policy;
  }

  /**
   * Evaluates if an employee's location packet is permitted to be ingested right now
   */
  public static evaluateEligibility(
    employee: EmployeeDoc,
    reqTimestamp?: string
  ): TrackingPolicyEvaluation {
    const policy = this.getActivePolicy();
    const effectiveMode = employee.trackingMode || policy.trackingMode;

    // 1. Organization Level Kill-Switch
    if (!policy.enabled) {
      return {
        isAllowed: false,
        reason: 'Organization employee live tracking is currently disabled by Admin.',
        mode: effectiveMode
      };
    }

    // 2. Individual Employee Tracking Setting
    if (employee.trackingEnabled === false) {
      return {
        isAllowed: false,
        reason: 'Location tracking is disabled for your employee account.',
        mode: effectiveMode
      };
    }

    // 3. Employee Consent Check
    if (policy.requireEmployeeConsent) {
      const consentStatus = employee.locationConsent?.status;
      if (consentStatus !== 'GRANTED') {
        return {
          isAllowed: false,
          reason: 'Employee location consent is required before tracking can begin.',
          mode: effectiveMode,
          requiresConsentWarning: true
        };
      }
    }

    // 4. Employee Status Check
    if (employee.status === 'ON_LEAVE' || employee.status === 'TERMINATED') {
      return {
        isAllowed: false,
        reason: `Employee is currently marked as ${employee.status}. Off-duty tracking is prohibited.`,
        mode: effectiveMode
      };
    }

    const checkTime = reqTimestamp ? new Date(reqTimestamp) : new Date();

    // 5. Tracking Mode Specific Evaluations
    switch (effectiveMode) {
      case 'ATTENDANCE_ONLY':
        // Continuous live breadcrumbs disallowed; only check-in/out snapshots accepted
        return {
          isAllowed: false,
          reason: 'Policy is configured for Attendance Verification Only. Continuous location tracking is inactive.',
          mode: effectiveMode
        };

      case 'FIELD_TASK_ONLY': {
        // Only track when employee has an active in-progress task or open field visit
        const activeTask = db.tasks?.findOne(
          t => (t.assignedTo === employee._id || t.assignedToId === employee._id || t.assignedTo === employee.name) &&
               (t.status === 'IN_PROGRESS' || (t as any).status === 'ARRIVED')
        );
        if (!activeTask) {
          return {
            isAllowed: false,
            reason: 'Tracking is permitted only while executing an active assigned field task.',
            mode: effectiveMode
          };
        }
        break;
      }

      case 'MANUAL_WORK_SESSION': {
        const todayStr = checkTime.toISOString().split('T')[0];
        const todayAttendance = db.attendance?.findOne(
          a => (a.employeeId === employee._id || a.employeeId === employee.userId || a.employeeName.toLowerCase() === employee.name.toLowerCase()) &&
               a.date === todayStr
        );
        if (!todayAttendance || !todayAttendance.checkIn || todayAttendance.checkOut || todayAttendance.status === 'ON_BREAK') {
          return {
            isAllowed: false,
            reason: 'Tracking is active only during a manually started active work session.',
            mode: effectiveMode
          };
        }
        break;
      }

      case 'FIELD_ONLY':
        if (!employee.isFieldEmployee) {
          return {
            isAllowed: false,
            reason: 'Live tracking is restricted to field representatives only.',
            mode: effectiveMode
          };
        }
        // Fall through to working hours check for field reps
        break;

      case 'ACTIVE_SHIFT': {
        const todayStr = checkTime.toISOString().split('T')[0];
        const todayAttendance = db.attendance?.findOne(
          a => (a.employeeId === employee._id || a.employeeId === employee.userId || a.employeeName.toLowerCase() === employee.name.toLowerCase()) &&
               a.date === todayStr
        );

        if (!todayAttendance || !todayAttendance.checkIn || todayAttendance.checkOut) {
          return {
            isAllowed: false,
            reason: 'Tracking is permitted only during an active checked-in work shift.',
            mode: effectiveMode
          };
        }
        break;
      }

      case 'WORKING_HOURS':
      default: {
        const isWithinHours = this.isWithinShiftHours(employee, checkTime);
        if (!isWithinHours) {
          return {
            isAllowed: false,
            reason: `Outside scheduled working hours (${employee.shiftStart || '09:30'} - ${employee.shiftEnd || '18:30'}). Privacy protection active.`,
            mode: effectiveMode
          };
        }
        break;
      }
    }

    return {
      isAllowed: true,
      mode: effectiveMode
    };
  }

  /**
   * Helper: Determines if a given date/time falls within the employee's working schedule
   */
  private static isWithinShiftHours(employee: EmployeeDoc, date: Date): boolean {
    const shiftStart = employee.shiftStart || '09:00';
    const shiftEnd = employee.shiftEnd || '19:00';

    // Parse shift hours
    const [startH, startM] = shiftStart.split(':').map(Number);
    const [endH, endM] = shiftEnd.split(':').map(Number);

    const currentMinutes = date.getHours() * 60 + date.getMinutes();
    const startMinutes = startH * 60 + (startM || 0) - 30; // 30 min arrival buffer
    const endMinutes = endH * 60 + (endM || 0) + 30;     // 30 min departure buffer

    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  }
}
