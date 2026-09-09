/**
 * 360CRM Enterprise Session Reconciliation & Health Engine
 * Periodically audits active work sessions, flags stale heartbeats,
 * synchronizes attendance/work-session state consistency, and reconciles
 * completed sessions with pending uploads.
 */

import { db } from '../database/db';

export class SessionReconciliationService {
  private timer: NodeJS.Timeout | null = null;
  private intervalMs = 60000; // 1 minute interval

  public start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => this.reconcileWorkSessions(), this.intervalMs);
    console.log('[SessionReconciliation] Service started (interval: 60s)');
  }

  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * Reconciles all active sessions and attendance records
   */
  public reconcileWorkSessions(): { checked: number; reconciled: number; anomalies: string[] } {
    const activeSessions = db.workSessions.find(s => s.status === 'ACTIVE' || s.status === 'ACTIVE_WITH_WARNING' || s.status === 'COMPLETED_UPLOAD_PENDING');
    let reconciled = 0;
    const anomalies: string[] = [];
    const now = Date.now();

    for (const session of activeSessions) {
      // 1. Check for stale heartbeat (> 5 minutes without pulse)
      if (session.lastHeartbeatAt && session.status === 'ACTIVE') {
        const lastHb = new Date(session.lastHeartbeatAt).getTime();
        const diffMinutes = (now - lastHb) / (1000 * 60);

        if (diffMinutes > 5) {
          db.workSessions.updateById(session._id, {
            status: 'ACTIVE_WITH_WARNING',
            trackingStatus: 'STALE',
            updatedAt: new Date().toISOString()
          });
          anomalies.push(`Session ${session._id} (${session.employeeName}) marked ACTIVE_WITH_WARNING: Stale heartbeat (${Math.round(diffMinutes)}m ago)`);
          reconciled++;
        }
      }

      // 2. Check COMPLETED_UPLOAD_PENDING sessions: if all segments are uploaded/validated, mark COMPLETED
      if (session.status === 'COMPLETED_UPLOAD_PENDING') {
        const segments = db.recordingSegments.find(s => s.workSessionId === session._id);
        const hasUnfinishedUploads = segments.some(s => s.uploadStatus === 'PENDING' || s.uploadStatus === 'UPLOADING');
        if (!hasUnfinishedUploads) {
          db.workSessions.updateById(session._id, {
            status: 'COMPLETED',
            updatedAt: new Date().toISOString()
          });
          anomalies.push(`Session ${session._id} (${session.employeeName}) transitioned from COMPLETED_UPLOAD_PENDING to COMPLETED`);
          reconciled++;
        }
      }

      // 3. Check for Attendance Checkout mismatch
      if (session.attendanceId) {
        const att = db.attendance.findById(session.attendanceId);
        if (att && att.checkOut && session.status === 'ACTIVE') {
          // Attendance is checked out, but session is still active
          db.workSessions.updateById(session._id, {
            status: 'COMPLETED',
            endedAt: new Date().toISOString(),
            shiftEnd: att.checkOut,
            updatedAt: new Date().toISOString()
          });
          anomalies.push(`Reconciled session ${session._id}: Attendance was checked out (${att.checkOut})`);
          reconciled++;
        }
      }
    }

    return {
      checked: activeSessions.length,
      reconciled,
      anomalies
    };
  }
}

export const sessionReconciliationService = new SessionReconciliationService();
