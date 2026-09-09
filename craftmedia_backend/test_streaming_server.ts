/**
 * 360CRM Enterprise HTTP 206 Partial Streaming Integration Test
 */

import fs from 'fs';
import path from 'path';
import { createBackendApp } from './serverApp';
import { generateToken } from './middleware/auth';
import { db } from './database/db';
import { RECORDINGS_DIR } from './controllers/workSessionController';

async function testStreamingServer() {
  console.log('Testing HTTP 206 Streaming & Token Auth...');
  const app = await createBackendApp();
  const server = app.listen(5099);

  try {
    const testUser = {
      userId: 'emp_stream_test',
      email: 'test@craftmediahub.com',
      name: 'Stream Tester',
      role: 'ADMIN' as any,
      roleId: 'role_admin',
      permissions: ['VIEW_EMPLOYEE_RECORDING', '*']
    };

    const token = generateToken(testUser);

    // Create session & recording segment
    const sess = db.workSessions.insertOne({
      employeeId: testUser.userId,
      employeeName: testUser.name,
      attendanceId: 'att_stream_01',
      sessionDate: '2026-09-04',
      status: 'COMPLETED',
      startedAt: new Date().toISOString(),
      trackingEnabled: true,
      recordingEnabled: true,
      audioEnabled: true,
      screenRecordingStatus: 'STOPPED',
      microphoneStatus: 'NOT_REQUIRED',
      trackingStatus: 'STOPPED',
      totalWorkSeconds: 300,
      totalBreakSeconds: 0,
      totalActiveAppSeconds: 250,
      totalBackgroundSeconds: 50,
      recordingDurationSeconds: 161,
      recordingSegmentsCount: 1,
      interruptionCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    const sessDir = path.join(RECORDINGS_DIR, sess._id);
    if (!fs.existsSync(sessDir)) fs.mkdirSync(sessDir, { recursive: true });
    const filePath = path.join(sessDir, 'segment_0001.webm');

    // Write 100KB dummy video payload
    const dummyVideo = Buffer.alloc(100 * 1024, 0x1A);
    fs.writeFileSync(filePath, dummyVideo);

    db.recordingSegments.insertOne({
      workSessionId: sess._id,
      employeeId: testUser.userId,
      segmentNumber: 1,
      startedAt: new Date().toISOString(),
      endedAt: new Date().toISOString(),
      durationSeconds: 161,
      fileName: 'segment_0001.webm',
      filePath,
      fileSize: dummyVideo.length,
      mimeType: 'video/webm',
      uploadStatus: 'UPLOADED',
      createdAt: new Date().toISOString()
    });

    // 1. Test Unauthenticated Request -> Expect 401
    const unauthRes = await fetch(`http://127.0.0.1:5099/api/hr/work-sessions/${sess._id}/recordings/1/stream`);
    console.log(`  Unauthenticated request status: ${unauthRes.status} (Expected: 401)`);
    if (unauthRes.status !== 401) throw new Error('Unauthenticated request was not rejected with 401');

    // 2. Test Query Token Request with Range: bytes=0-1023 -> Expect 206
    const rangeRes = await fetch(
      `http://127.0.0.1:5099/api/hr/work-sessions/${sess._id}/recordings/1/stream?token=${token}`,
      {
        headers: {
          Range: 'bytes=0-1023'
        }
      }
    );

    console.log(`  Range request status: ${rangeRes.status} (Expected: 206)`);
    console.log(`  Content-Range header: ${rangeRes.headers.get('content-range')} (Expected: bytes 0-1023/${dummyVideo.length})`);
    console.log(`  Accept-Ranges header: ${rangeRes.headers.get('accept-ranges')} (Expected: bytes)`);
    console.log(`  Content-Type header: ${rangeRes.headers.get('content-type')} (Expected: video/webm)`);

    if (rangeRes.status !== 206) throw new Error(`Expected status 206 but got ${rangeRes.status}`);
    if (rangeRes.headers.get('content-range') !== `bytes 0-1023/${dummyVideo.length}`) {
      throw new Error(`Unexpected Content-Range header: ${rangeRes.headers.get('content-range')}`);
    }

    const chunkData = await rangeRes.arrayBuffer();
    if (chunkData.byteLength !== 1024) throw new Error(`Expected 1024 bytes, got ${chunkData.byteLength}`);

    console.log('✅ HTTP 206 Range Streaming with query token authenticated successfully!');

    // Cleanup
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      if (fs.existsSync(sessDir)) fs.rmdirSync(sessDir);
    } catch {}

  } finally {
    server.close();
  }
}

testStreamingServer().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
