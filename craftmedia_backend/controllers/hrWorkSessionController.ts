import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { db } from '../database/db';
import { AuthenticatedRequest, generateMediaToken } from '../middleware/auth';
import { recordAuditLog } from '../middleware/audit';
import { filterByWorkspace } from '../middleware/workspace';
import { RECORDINGS_DIR, buildAggregatedTimeline } from './workSessionController';

// ----------------------------------------------------
// 1. GET ALL HR WORK SESSIONS
// ----------------------------------------------------
export async function getHrWorkSessions(req: AuthenticatedRequest, res: Response) {
  try {
    const { date, employeeId, status, search } = req.query;

    let sessions = filterByWorkspace(db.workSessions.getAll(), req).sort(
      (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    );

    if (date && typeof date === 'string') {
      sessions = sessions.filter(s => s.sessionDate === date);
    }

    if (employeeId && typeof employeeId === 'string') {
      sessions = sessions.filter(s => s.employeeId === employeeId);
    }

    if (status && typeof status === 'string' && status !== 'ALL') {
      sessions = sessions.filter(s => s.status === status);
    }

    if (search && typeof search === 'string') {
      const q = search.toLowerCase();
      sessions = sessions.filter(
        s => s.employeeName.toLowerCase().includes(q) || s.employeeId.toLowerCase().includes(q)
      );
    }

    // Enrich sessions with coverage metrics and attendance data
    const enriched = sessions.map(s => {
      const att = db.attendance.findById(s.attendanceId);
      const segments = db.recordingSegments.find(seg => seg.workSessionId === s._id);

      // Coverage calculations
      const totalShiftSeconds = s.endedAt
        ? Math.max(1, Math.floor((new Date(s.endedAt).getTime() - new Date(s.startedAt).getTime()) / 1000))
        : Math.max(1, Math.floor((Date.now() - new Date(s.startedAt).getTime()) / 1000));

      const recordingCoveragePercent = Math.min(
        100,
        Math.round(((s.recordingDurationSeconds || 0) / totalShiftSeconds) * 100)
      );

      const trackingCoveragePercent = s.trackingStatus === 'ACTIVE' ? 98 : (s.trackingStatus === 'OFFLINE' ? 65 : 85);
      const appActivityCoveragePercent = Math.min(
        100,
        Math.round(((s.totalActiveAppSeconds || 0) / totalShiftSeconds) * 100)
      );

      return {
        ...s,
        attendanceStatus: att?.status || 'PRESENT',
        checkInTime: att?.checkIn || s.shiftStart,
        checkOutTime: att?.checkOut || s.shiftEnd,
        segmentsCount: segments.length,
        recordingCoveragePercent,
        trackingCoveragePercent,
        appActivityCoveragePercent,
        healthRating: recordingCoveragePercent >= 90 && trackingCoveragePercent >= 90 ? 'HEALTHY' : 'REVIEW_REQUIRED'
      };
    });

    return res.json({
      success: true,
      data: enriched
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ----------------------------------------------------
// 2. GET SINGLE WORK SESSION BY ID
// ----------------------------------------------------
export async function getHrWorkSessionById(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const session = db.workSessions.findById(id);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Work session not found' });
    }

    // Tenant Isolation
    if (req.user?.role !== 'SUPER_ADMIN') {
      const userOrgId = req.user?.organizationId || 'org_craftmedia';
      if (session.organizationId && session.organizationId !== userOrgId) {
        return res.status(404).json({ success: false, message: 'Work session not found' });
      }
    }

    const employee = db.employees.findById(session.employeeId) ||
      db.employees.findOne(e => e.userId === session.employeeId || e.name === session.employeeName);
    const attendance = db.attendance.findById(session.attendanceId);
    const segments = db.recordingSegments.find(s => s.workSessionId === id).sort((a, b) => a.segmentNumber - b.segmentNumber);

    return res.json({
      success: true,
      data: {
        session,
        employee,
        attendance,
        segments
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ----------------------------------------------------
// 3. GET SESSION TIMELINE WITH VIDEO SYNC
// ----------------------------------------------------
export async function getHrWorkSessionTimeline(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const session = db.workSessions.findById(id);
    if (!session) return res.status(404).json({ success: false, message: 'Work session not found' });

    // Tenant Isolation
    if (req.user?.role !== 'SUPER_ADMIN') {
      const userOrgId = req.user?.organizationId || 'org_craftmedia';
      if (session.organizationId && session.organizationId !== userOrgId) {
        return res.status(404).json({ success: false, message: 'Work session not found' });
      }
    }

    const timelineItems = db.activityTimeline.find(
      t => (t.employeeId === session.employeeId) && t.timestamp.startsWith(session.sessionDate)
    );

    const workActivities = db.workSessionActivities.find(
      a => a.workSessionId === id
    );

    const segments = db.recordingSegments.find(
      s => s.workSessionId === id
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

// ----------------------------------------------------
// 4. GET RECORDING SEGMENTS FOR SESSION
// ----------------------------------------------------
export async function getHrWorkSessionRecordings(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const segments = db.recordingSegments.find(s => s.workSessionId === id).sort((a, b) => a.segmentNumber - b.segmentNumber);

    return res.json({
      success: true,
      data: segments
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ----------------------------------------------------
// 5. GENERATE SIGNED MEDIA PLAYBACK TOKEN
// ----------------------------------------------------
export async function generatePlaybackToken(req: AuthenticatedRequest, res: Response) {
  try {
    const { id, segmentId } = req.params;

    const userRole = String(req.user?.role || '').toUpperCase();
    const userPerms = req.user?.permissions || [];
    const hasPerm = userRole === 'SUPER_ADMIN' || userRole === 'ADMIN' || userPerms.includes('VIEW_EMPLOYEE_RECORDING') || userPerms.includes('*');

    if (!hasPerm) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You do not possess 'VIEW_EMPLOYEE_RECORDING' permission."
      });
    }

    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const token = generateMediaToken(req.user, id, segmentId);
    const streamUrl = `/api/hr/work-sessions/${id}/recordings/${segmentId}/stream?token=${token}`;

    return res.json({
      success: true,
      data: {
        token,
        streamUrl,
        expiresInSeconds: 7200
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ----------------------------------------------------
// 6. STREAM RECORDING SEGMENT (HTTP 206 Range Seeking)
// ----------------------------------------------------
export async function streamRecordingSegment(req: AuthenticatedRequest, res: Response) {
  try {
    const { id, segmentId } = req.params;

    // RBAC check: role must have permission VIEW_EMPLOYEE_RECORDING
    const userRole = String(req.user?.role || '').toUpperCase();
    const userPerms = req.user?.permissions || [];
    const hasPerm = userRole === 'SUPER_ADMIN' || userRole === 'ADMIN' || userPerms.includes('VIEW_EMPLOYEE_RECORDING') || userPerms.includes('*');

    if (!hasPerm) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You do not possess 'VIEW_EMPLOYEE_RECORDING' permission to view employee recordings."
      });
    }

    const session = db.workSessions.findById(id);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Work session not found' });
    }
    if (req.user?.role !== 'SUPER_ADMIN') {
      const userOrgId = req.user?.organizationId || 'org_craftmedia';
      if (session.organizationId && session.organizationId !== userOrgId) {
        return res.status(404).json({ success: false, message: 'Work session not found' });
      }
    }

    // Find segment by id or segmentNumber
    const segment = db.recordingSegments.findOne(
      s => (s._id === segmentId || String(s.segmentNumber) === segmentId) && s.workSessionId === id
    );

    if (!segment || !fs.existsSync(segment.filePath)) {
      return res.status(404).json({ success: false, message: 'Video segment file not found on disk' });
    }

    const filePath = segment.filePath;
    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    // Audit view event
    recordAuditLog(req, 'READ', 'recording_segments', `Viewed screen recording segment #${segment.segmentNumber}`, segment._id, undefined, {
      employeeId: segment.employeeId,
      workSessionId: id
    });

    const mimeType = segment.mimeType || 'video/webm';

    if (range) {
      // Parse Range header e.g. "bytes=32324-" or "bytes=0-1000"
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10) || 0;
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      // Ensure valid byte range bounds
      if (start >= fileSize || end >= fileSize || start > end) {
        res.writeHead(416, {
          'Content-Range': `bytes */${fileSize}`,
          'Content-Type': mimeType
        });
        return res.end();
      }

      const chunksize = end - start + 1;
      const fileStream = fs.createReadStream(filePath, { start, end });

      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': mimeType,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Disposition': 'inline'
      };

      res.writeHead(206, head);
      fileStream.pipe(res);
    } else {
      const head = {
        'Content-Length': fileSize,
        'Content-Type': mimeType,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Disposition': 'inline'
      };

      res.writeHead(200, head);
      fs.createReadStream(filePath).pipe(res);
    }
  } catch (err: any) {
    console.error('Error streaming recording segment:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}


// ----------------------------------------------------
// 6. DOWNLOAD RECORDING SEGMENT
// ----------------------------------------------------
export async function downloadRecordingSegment(req: AuthenticatedRequest, res: Response) {
  try {
    const { id, segmentId } = req.params;

    const userRole = String(req.user?.role || '').toUpperCase();
    const userPerms = req.user?.permissions || [];
    const hasPerm = userRole === 'SUPER_ADMIN' || userRole === 'ADMIN' || userPerms.includes('DOWNLOAD_EMPLOYEE_RECORDING') || userPerms.includes('*');

    if (!hasPerm) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You do not possess 'DOWNLOAD_EMPLOYEE_RECORDING' permission to export employee recordings."
      });
    }

    const segment = db.recordingSegments.findOne(
      s => (s._id === segmentId || String(s.segmentNumber) === segmentId) && s.workSessionId === id
    );

    if (!segment || !fs.existsSync(segment.filePath)) {
      return res.status(404).json({ success: false, message: 'Video segment file not found' });
    }

    recordAuditLog(req, 'EXPORT', 'recording_segments', `Downloaded screen recording segment #${segment.segmentNumber}`, segment._id, undefined, {
      employeeId: segment.employeeId,
      workSessionId: id
    });

    return res.download(segment.filePath, `work_session_${id}_segment_${segment.segmentNumber}.webm`);
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ----------------------------------------------------
// 7. DELETE RECORDING SEGMENT
// ----------------------------------------------------
export async function deleteRecordingSegment(req: AuthenticatedRequest, res: Response) {
  try {
    const { id, segmentId } = req.params;

    const userRole = String(req.user?.role || '').toUpperCase();
    const userPerms = req.user?.permissions || [];
    const hasPerm = userRole === 'SUPER_ADMIN' || userPerms.includes('DELETE_EMPLOYEE_RECORDING') || userPerms.includes('*');

    if (!hasPerm) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Access restricted. You lack 'DELETE_EMPLOYEE_RECORDING' privileges."
      });
    }

    const segment = db.recordingSegments.findOne(
      s => (s._id === segmentId || String(s.segmentNumber) === segmentId) && s.workSessionId === id
    );

    if (!segment) {
      return res.status(404).json({ success: false, message: 'Segment not found' });
    }

    if (fs.existsSync(segment.filePath)) {
      try {
        fs.unlinkSync(segment.filePath);
      } catch (err) {
        console.warn('Could not delete segment file from disk:', err);
      }
    }

    db.recordingSegments.deleteById(segment._id);

    recordAuditLog(req, 'DELETE', 'recording_segments', `Deleted screen recording segment #${segment.segmentNumber}`, segment._id);

    return res.json({ success: true, message: 'Segment deleted successfully' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ----------------------------------------------------
// 8. GET STORAGE MONITORING & RETENTION STATS
// ----------------------------------------------------
export async function getStorageMonitoring(req: AuthenticatedRequest, res: Response) {
  try {
    const allSegments = db.recordingSegments.getAll();
    const policy = db.getWorkSessionPolicy();

    let totalSizeBytes = 0;
    let oldestDate: string | null = null;

    allSegments.forEach(seg => {
      totalSizeBytes += Number(seg.fileSize) || 0;
      if (!oldestDate || new Date(seg.createdAt).getTime() < new Date(oldestDate).getTime()) {
        oldestDate = seg.createdAt;
      }
    });

    const totalStorageMB = (totalSizeBytes / (1024 * 1024)).toFixed(2);
    const totalStorageGB = (totalSizeBytes / (1024 * 1024 * 1024)).toFixed(3);
    const avgSegmentMB = allSegments.length > 0 ? (Number(totalStorageMB) / allSegments.length).toFixed(2) : '0';

    return res.json({
      success: true,
      data: {
        totalRecordings: allSegments.length,
        totalSizeBytes,
        totalStorageMB: `${totalStorageMB} MB`,
        totalStorageGB: `${totalStorageGB} GB`,
        avgSegmentMB: `${avgSegmentMB} MB`,
        oldestRecording: oldestDate,
        retentionDaysConfigured: policy.recordingRetentionDays || 15,
        legalHold: Boolean(policy.legalHold),
        pendingUploadsCount: 0,
        failedUploadsCount: allSegments.filter(s => s.uploadStatus === 'FAILED').length
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ----------------------------------------------------
// 9. TRIGGER RETENTION CLEANUP
// ----------------------------------------------------
export async function triggerRetentionCleanup(req: AuthenticatedRequest, res: Response) {
  try {
    const policy = db.getWorkSessionPolicy();
    if (policy.legalHold) {
      return res.status(400).json({
        success: false,
        message: 'Retention cleanup blocked: Legal Hold is active on corporate recordings.'
      });
    }

    const retentionDays = policy.recordingRetentionDays || 15;
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

    const allSegments = db.recordingSegments.getAll();
    let deletedCount = 0;
    let deletedBytes = 0;

    for (const seg of allSegments) {
      if (new Date(seg.createdAt).getTime() < cutoffDate.getTime()) {
        if (fs.existsSync(seg.filePath)) {
          try {
            fs.unlinkSync(seg.filePath);
          } catch {}
        }
        deletedBytes += seg.fileSize || 0;
        db.recordingSegments.deleteById(seg._id);
        deletedCount++;
      }
    }

    recordAuditLog(req, 'DELETE', 'recording_retention', `Retention cleanup purged ${deletedCount} recording segments older than ${retentionDays} days`, undefined, undefined, {
      deletedCount,
      freedMB: (deletedBytes / (1024 * 1024)).toFixed(2)
    });

    return res.json({
      success: true,
      message: `Retention cleanup completed. Purged ${deletedCount} segments (${(deletedBytes / (1024 * 1024)).toFixed(2)} MB freed).`,
      data: {
        deletedCount,
        freedMB: (deletedBytes / (1024 * 1024)).toFixed(2)
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
