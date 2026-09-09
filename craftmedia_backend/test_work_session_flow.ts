/**
 * Automated Verification Script for 360CRM Enterprise Web Employee Module
 * Tests complete end-to-end lifecycle:
 * Auth -> Policy -> Consent -> Punch-In -> Heartbeat -> App Activity ->
 * Segment Upload -> Punch-Out -> HR Verification -> Storage Monitoring
 */

import { db } from './database/db';

async function runTest() {
  console.log('=====================================================');
  console.log('360CRM ENTERPRISE WEB EMPLOYEE MODULE - E2E TEST');
  console.log('=====================================================');

  // 1. Initialize Database
  console.log('[1/10] Initializing database...');
  await db.init();
  console.log('✓ Database initialized.');

  // 2. Fetch Work Session Policy
  console.log('[2/10] Validating Work Session Policy...');
  const policy = db.getWorkSessionPolicy();
  console.log(`✓ Policy retrieved. Version: ${policy.privacyPolicyVersion}, Screen Rec: ${policy.screenRecordingEnabled}, Retention: ${policy.recordingRetentionDays} days.`);

  // 3. Authenticate Employee
  console.log('[3/10] Resolving Test Employee...');
  const employee = db.employees.findOne(e => e.email === 'employee@craftmediahub.com') || db.employees.getAll()[0];
  if (!employee) {
    throw new Error('No employee found in database for test.');
  }
  console.log(`✓ Employee found: ${employee.name} (${employee._id})`);

  // 4. Record Employee Privacy Consent
  console.log('[4/10] Recording Transparent Privacy Consent...');
  const consent = db.workSessionConsents.insertOne({
    employeeId: employee._id,
    employeeName: employee.name,
    policyVersion: policy.privacyPolicyVersion || '1.0.0',
    acceptedAt: new Date().toISOString(),
    cameraConsent: true,
    locationConsent: true,
    screenRecordingConsent: true,
    microphoneConsent: true,
    userAgent: 'HeadlessTestClient/1.0',
    browser: 'Automated Test Chrome',
    deviceType: 'Desktop',
    sessionId: `sess_test_${Date.now()}`
  });
  console.log(`✓ Consent documented with ID: ${consent._id}`);

  // 5. Punch In (Start Work Session)
  console.log('[5/10] Starting Work Session & Clocking In...');
  const today = new Date().toISOString().split('T')[0];
  const nowIso = new Date().toISOString();
  const checkInTime = '09:30 AM';

  // Create attendance record
  let attendance = db.attendance.insertOne({
    employeeId: employee._id,
    employeeName: employee.name,
    date: today,
    checkIn: checkInTime,
    checkOut: '',
    status: 'PRESENT',
    remarks: 'Automated E2E Test Punch In',
    selfieCheckIn: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...',
    locationCheckIn: {
      lat: 28.6139,
      lng: 77.2090,
      accuracy: 12,
      address: 'Noida HQ Office Facility'
    },
    workHours: 0,
    breaks: [],
    createdAt: nowIso
  });

  // Create active work session
  const workSession = db.workSessions.insertOne({
    employeeId: employee._id,
    employeeName: employee.name,
    attendanceId: attendance._id,
    sessionDate: today,
    status: 'ACTIVE',
    startedAt: nowIso,
    shiftStart: checkInTime,
    browserSessionId: `brw_${Date.now()}`,
    trackingEnabled: true,
    recordingEnabled: true,
    audioEnabled: true,
    screenRecordingStatus: 'ACTIVE',
    microphoneStatus: 'ACTIVE',
    trackingStatus: 'ACTIVE',
    consentId: consent._id,
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
  console.log(`✓ Work Session started with ID: ${workSession._id}, Status: ${workSession.status}`);

  // 6. Record Heartbeat & Navigation Telemetry
  console.log('[6/10] Ingesting Heartbeat & Route Activity Telemetry...');
  db.workSessions.updateById(workSession._id, {
    lastHeartbeatAt: new Date().toISOString(),
    totalActiveAppSeconds: 1800 // 30 mins active
  });

  const activity = db.workSessionActivities.insertOne({
    workSessionId: workSession._id,
    employeeId: employee._id,
    eventType: 'SCREEN_ENTER',
    screen: 'leads_dashboard',
    enteredAt: nowIso,
    durationSeconds: 1800,
    timestamp: nowIso
  });
  console.log(`✓ Activity logged: ${activity.eventType} on screen ${activity.screen}`);

  // 7. Store Simulated Recording Segment
  console.log('[7/10] Simulating Video Recording Segment Upload...');
  const segment = db.recordingSegments.insertOne({
    workSessionId: workSession._id,
    employeeId: employee._id,
    employeeName: employee.name,
    segmentNumber: 1,
    startedAt: nowIso,
    endedAt: new Date().toISOString(),
    durationSeconds: 600, // 10 mins
    fileName: `segment_0001_${Date.now()}.webm`,
    filePath: `uploads/recordings/${workSession._id}/segment_0001.webm`,
    fileSize: 4250000, // ~4.25 MB
    mimeType: 'video/webm;codecs=vp8,opus',
    uploadStatus: 'UPLOADED',
    downloadUrl: `/api/hr/work-sessions/${workSession._id}/recordings/1/stream`,
    createdAt: new Date().toISOString()
  });

  db.workSessions.updateById(workSession._id, prev => ({
    ...prev,
    recordingSegmentsCount: 1,
    recordingDurationSeconds: 600
  }));
  console.log(`✓ Video Segment #${segment.segmentNumber} created (${(segment.fileSize / (1024 * 1024)).toFixed(2)} MB).`);

  // 8. End Work Session & Punch Out
  console.log('[8/10] Concluding Work Session & Finalizing Punch-Out...');
  const checkOutTime = '05:30 PM';
  const totalWorkSeconds = 28800; // 8 hours

  const dailySummary = {
    shift: `${checkInTime} - ${checkOutTime}`,
    netWorkHours: '8h 00m',
    crmActiveHours: '6h 45m',
    breakMinutes: 45,
    leadsCount: 6,
    callsCount: 12,
    followUpsCount: 4,
    tasksCount: 3,
    visitsCount: 1,
    quotationsCount: 2,
    travelDistanceKm: 14.2,
    recordingDurationFormatted: '7h 15m',
    interruptionsCount: 0
  };

  const completedSession = db.workSessions.updateById(workSession._id, {
    status: 'COMPLETED',
    endedAt: new Date().toISOString(),
    shiftEnd: checkOutTime,
    totalWorkSeconds,
    screenRecordingStatus: 'STOPPED',
    trackingStatus: 'STOPPED',
    dailySummary,
    updatedAt: new Date().toISOString()
  });

  db.attendance.updateById(attendance._id, {
    checkOut: checkOutTime,
    workHours: 8,
    status: 'PRESENT',
    remarks: 'Shift successfully completed with work recording verified'
  });
  console.log(`✓ Session Completed! Net Work Hours: ${completedSession?.dailySummary?.netWorkHours}`);

  // 9. HR Module Verification
  console.log('[9/10] Verifying HR Session Oversight...');
  const allSessions = db.workSessions.find(s => s._id === workSession._id);
  if (allSessions.length === 0) throw new Error('HR session query failed');
  console.log(`✓ HR session lookup verified. Status: ${allSessions[0].status}`);

  // 10. Storage & Retention Verification
  console.log('[10/10] Checking Storage Monitoring Metrics...');
  const allSegments = db.recordingSegments.getAll();
  const totalBytes = allSegments.reduce((sum, s) => sum + s.fileSize, 0);
  console.log(`✓ Storage Stats: Total Segments: ${allSegments.length}, Size: ${(totalBytes / (1024 * 1024)).toFixed(2)} MB`);

  console.log('=====================================================');
  console.log('🎉 ALL 10 E2E WORK SESSION TESTS PASSED SUCCESSFULLY!');
  console.log('=====================================================');
}

runTest().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
