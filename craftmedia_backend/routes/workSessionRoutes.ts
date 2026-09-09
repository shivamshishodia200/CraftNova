import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticateToken } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import * as wsCtrl from '../controllers/workSessionController';
import * as hrWsCtrl from '../controllers/hrWorkSessionController';
import { RECORDINGS_DIR } from '../controllers/workSessionController';

// Multer storage configuration for work session video recording chunks
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const sessionId = req.params.id || 'default_session';
    const sessionDir = path.join(RECORDINGS_DIR, sessionId);
    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
    }
    cb(null, sessionDir);
  },
  filename: (req, file, cb) => {
    const segmentNum = req.body.segmentNumber || 'chunk';
    cb(null, `segment_${String(segmentNum).padStart(4, '0')}.webm`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB max chunk size
});

export const employeeWorkSessionRouter = Router();

// Employee Work Session Endpoints (JWT Authenticated)
employeeWorkSessionRouter.use(authenticateToken);

employeeWorkSessionRouter.get('/policy', wsCtrl.getWorkSessionPolicy);
employeeWorkSessionRouter.post('/policy', wsCtrl.updateWorkSessionPolicy);
employeeWorkSessionRouter.post('/consent', wsCtrl.postWorkSessionConsent);
employeeWorkSessionRouter.post('/start', wsCtrl.startWorkSession);
employeeWorkSessionRouter.get('/current', wsCtrl.getCurrentWorkSession);
employeeWorkSessionRouter.post('/:id/heartbeat', wsCtrl.postWorkSessionHeartbeat);
employeeWorkSessionRouter.post('/:id/activity', wsCtrl.postWorkSessionActivity);
employeeWorkSessionRouter.post('/:id/recording-status', wsCtrl.postWorkSessionRecordingStatus);
employeeWorkSessionRouter.post('/:id/recording-segment', upload.single('videoChunk'), wsCtrl.uploadRecordingSegment);
employeeWorkSessionRouter.post('/:id/end', wsCtrl.endWorkSession);
employeeWorkSessionRouter.get('/:id/summary', wsCtrl.getWorkSessionSummary);

export const hrWorkSessionRouter = Router();

// HR & Admin Work Session Endpoints (JWT Authenticated + RBAC Guarded)
hrWorkSessionRouter.use(authenticateToken);

hrWorkSessionRouter.get('/', hrWsCtrl.getHrWorkSessions);
hrWorkSessionRouter.get('/storage/stats', hrWsCtrl.getStorageMonitoring);
hrWorkSessionRouter.post('/storage/cleanup', requirePermission('settings.manage'), hrWsCtrl.triggerRetentionCleanup);
hrWorkSessionRouter.get('/:id', hrWsCtrl.getHrWorkSessionById);
hrWorkSessionRouter.get('/:id/timeline', hrWsCtrl.getHrWorkSessionTimeline);
hrWorkSessionRouter.get('/:id/recordings', hrWsCtrl.getHrWorkSessionRecordings);
hrWorkSessionRouter.get('/:id/recordings/:segmentId/token', hrWsCtrl.generatePlaybackToken);
hrWorkSessionRouter.get('/:id/recordings/:segmentId/stream', hrWsCtrl.streamRecordingSegment);
hrWorkSessionRouter.get('/:id/recordings/:segmentId/download', hrWsCtrl.downloadRecordingSegment);
hrWorkSessionRouter.delete('/:id/recordings/:segmentId', hrWsCtrl.deleteRecordingSegment);

