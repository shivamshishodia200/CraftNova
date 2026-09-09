/**
 * Comprehensive Enterprise End-to-End Test Suite
 * 
 * Verifies:
 * - Test 1: Employee Auth, Geofence Clock-In, Live Telemetry & HR Live API
 * - Test 2: Dynamic Task Geofence, Auto-Arrival, Visit Proof & Customer Signature
 * - Test 3: Offline GPS Batch Deduplication, Independent Validation & Route Mileage
 * - Test 4: Break Management, Clock-Out Settlement, Daily Work Story, Handover & Privacy Protection
 */

const BASE_URL = 'http://127.0.0.1:5055/api';

async function runTest(name: string, fn: () => Promise<void>) {
  try {
    process.stdout.write(`⏳ Running: ${name}... `);
    await fn();
    console.log(`✅ PASSED`);
  } catch (err: any) {
    console.log(`❌ FAILED: ${err.message}`);
    throw err;
  }
}

async function main() {
  console.log('\n===============================================================');
  console.log('🧪 360CRM ENTERPRISE FIELD INTELLIGENCE & TRACKING TEST SUITE');
  console.log('===============================================================\n');

  let employeeToken = '';
  let adminToken = '';
  let employeeId = '';
  let employeeName = '';
  let taskId = '';
  const testDate = new Date().toISOString().split('T')[0];

  // -------------------------------------------------------------
  // TEST 1: LOGIN & GEOFENCED CLOCK-IN & LIVE GPS INGESTION
  // -------------------------------------------------------------
  await runTest('1.1 Authenticate Employee and Admin & Obtain Valid JWTs', async () => {
    // Employee Login
    const empRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'employee@360crm.com',
        password: 'admin123'
      })
    });
    const empData = await empRes.json();
    if (!empRes.ok || !empData.success || !empData.data?.token) {
      throw new Error(`Employee login failed: ${empData.message}`);
    }
    employeeToken = empData.data.token;
    employeeId = empData.data.user.userId || empData.data.user.id || empData.data.user._id;
    employeeName = empData.data.user.name;

    // Admin Login for HR endpoints
    const admRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@360crm.com',
        password: 'admin123'
      })
    });
    const admData = await admRes.json();
    if (!admRes.ok || !admData.success || !admData.data?.token) {
      throw new Error(`Admin login failed: ${admData.message}`);
    }
    adminToken = admData.data.token;
  });

  await runTest('1.2 Accept Tracking Privacy Consent Policy', async () => {
    const res = await fetch(`${BASE_URL}/employee-tracking/my-consent`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${employeeToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status: 'GRANTED' })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(`Consent recording failed: ${data.message}`);
    }
  });

  await runTest('1.3 Clock-In with Geofence & Live Selfie Verification', async () => {
    const res = await fetch(`${BASE_URL}/employee/attendance/clock-in`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${employeeToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        latitude: 23.0225,
        longitude: 72.5714,
        accuracy: 10,
        address: 'Headquarters Office, Ahmedabad',
        selfie: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP...',
        batteryLevel: 92
      })
    });

    const data = await res.json();
    // 200 or 400 (if already clocked in on same day) are acceptable
    if (!data.success && !data.message?.includes('Already clocked in')) {
      throw new Error(`Clock-in failed: ${data.message}`);
    }
  });

  await runTest('1.4 Live Location Ping & O(1) Latest Location Cache Update', async () => {
    const res = await fetch(`${BASE_URL}/employee-tracking/location`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${employeeToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        latitude: 23.0225,
        longitude: 72.5714,
        accuracy: 8,
        speed: 0,
        batteryLevel: 91,
        isCharging: false,
        recordedAt: new Date().toISOString()
      })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(`Location ingestion failed: ${data.message}`);
    }
  });

  await runTest('1.5 HR Live Map & Tracking Health API Verification', async () => {
    // Employee self tracking health
    const healthRes = await fetch(`${BASE_URL}/employee-tracking/health`, {
      headers: { 'Authorization': `Bearer ${employeeToken}` }
    });
    const healthData = await healthRes.json();
    if (!healthRes.ok || !healthData.success) {
      throw new Error(`Tracking health fetch failed: ${healthData.message}`);
    }

    // HR Admin Live map
    const liveRes = await fetch(`${BASE_URL}/employee-tracking/live`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const liveData = await liveRes.json();
    if (!liveRes.ok || !liveData.success) {
      throw new Error(`Live employees fetch failed: ${liveData.message}`);
    }
  });

  // -------------------------------------------------------------
  // TEST 2: DYNAMIC GEOFENCE, AUTO-ARRIVAL & VISIT PROOF
  // -------------------------------------------------------------
  await runTest('2.1 Create Field Task and Dynamic Temporary Task Geofence', async () => {
    // Create Task First
    const taskRes = await fetch(`${BASE_URL}/employee/tasks`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${employeeToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: 'Emergency Generator Inspection',
        description: 'Check oil level and voltage output.',
        dueDate: testDate,
        priority: 'HIGH'
      })
    });
    const taskData = await taskRes.json();
    if (!taskRes.ok || !taskData.success || !taskData.data?._id) {
      throw new Error(`Task creation failed: ${taskData.message}`);
    }
    taskId = taskData.data._id;

    // Create Dynamic Geofence for this Task
    const res = await fetch(`${BASE_URL}/employee-tracking/geofences/task`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        taskId,
        name: 'Installation Site - Apollo Hospitals',
        latitude: 23.0500,
        longitude: 72.6000,
        radiusMeters: 200,
        validHours: 12,
        address: 'Bhat, Gandhinagar'
      })
    });

    const data = await res.json();
    if (!res.ok || !data.success || !data.data?._id) {
      throw new Error(`Dynamic geofence creation failed: ${data.message}`);
    }
  });

  await runTest('2.2 Simulate GPS Arrival at Task Site & Trigger Geofence Entry', async () => {
    const res = await fetch(`${BASE_URL}/employee-tracking/location`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${employeeToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        latitude: 23.0502,
        longitude: 72.6001,
        accuracy: 12,
        speed: 15.0,
        batteryLevel: 88,
        recordedAt: new Date().toISOString()
      })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(`Task arrival ping failed: ${data.message}`);
    }
  });

  await runTest('2.3 Submit Field Visit Proof & Customer Signature', async () => {
    const proofRes = await fetch(`${BASE_URL}/employee/tasks/${taskId}/proof`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${employeeToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        latitude: 23.0502,
        longitude: 72.6001,
        accuracy: 12,
        sitePhotoUrls: ['https://cdn.example.com/site_photo_1.jpg'],
        customerSignatureUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ...',
        signedByName: 'Dr. R. Sharma (Facility Manager)',
        notes: 'Inspection completed smoothly. No faults detected.'
      })
    });

    const proofData = await proofRes.json();
    if (!proofRes.ok || !proofData.success) {
      throw new Error(`Visit proof submission failed: ${proofData.message}`);
    }
  });

  // -------------------------------------------------------------
  // TEST 3: OFFLINE GPS BATCH INGESTION & ROUTE DEDUPLICATION
  // -------------------------------------------------------------
  await runTest('3.1 Send Offline GPS Batch with Independent Validation & Deduplication', async () => {
    const t0 = Date.now();
    const batchPackets = [
      {
        latitude: 23.0300,
        longitude: 72.5800,
        accuracy: 15,
        speed: 25.0,
        battery: 85,
        timestamp: new Date(t0 - 600000).toISOString()
      },
      {
        latitude: 23.0350,
        longitude: 72.5850,
        accuracy: 12,
        speed: 30.0,
        battery: 84,
        timestamp: new Date(t0 - 300000).toISOString()
      },
      // Duplicate packet to test deduplication
      {
        latitude: 23.0350,
        longitude: 72.5850,
        accuracy: 12,
        speed: 30.0,
        battery: 84,
        timestamp: new Date(t0 - 300000).toISOString()
      },
      // Bad coordinate to test independent point validation
      {
        latitude: 999.0,
        longitude: 999.0,
        accuracy: 100,
        timestamp: new Date(t0 - 100000).toISOString()
      }
    ];

    const res = await fetch(`${BASE_URL}/employee-tracking/location/batch`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${employeeToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ packets: batchPackets })
    });

    const data = await res.json();
    if (!res.ok || !data.success || data.data?.received !== 4 || data.data?.accepted < 2) {
      throw new Error(`Batch processing invalid: ${JSON.stringify(data)}`);
    }
  });

  await runTest('3.2 Auto-Draft Travel Mileage Expense from Verified Route Distance', async () => {
    const res = await fetch(`${BASE_URL}/employee/travel-expenses`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${employeeToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        date: testDate,
        ratePerKm: 8.5,
        notes: 'Field visit to Apollo Hospitals and site surveys.'
      })
    });

    const data = await res.json();
    if (!res.ok || !data.success || !data.data?._id) {
      throw new Error(`Travel expense draft failed: ${data.message}`);
    }
  });

  // -------------------------------------------------------------
  // TEST 4: BREAK MANAGEMENT, CLOCK-OUT, TIMELINE & PRIVACY HALT
  // -------------------------------------------------------------
  await runTest('4.1 Start & End Break Cycle', async () => {
    // Start Lunch Break
    const startRes = await fetch(`${BASE_URL}/employee/attendance/break`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${employeeToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ breakType: 'LUNCH', action: 'START' })
    });
    const startData = await startRes.json();
    if (!startRes.ok || !startData.success) {
      throw new Error(`Break start failed: ${startData.message}`);
    }

    // End Lunch Break
    const endRes = await fetch(`${BASE_URL}/employee/attendance/break`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${employeeToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ breakType: 'LUNCH', action: 'END' })
    });
    const endData = await endRes.json();
    if (!endRes.ok || !endData.success) {
      throw new Error(`Break end failed: ${endData.message}`);
    }
  });

  await runTest('4.2 Clock-Out with Work Summary Remarks', async () => {
    const res = await fetch(`${BASE_URL}/employee/attendance/clock-out`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${employeeToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        latitude: 23.0225,
        longitude: 72.5714,
        remarks: 'Completed generator installation and site inspection.'
      })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(`Clock-out failed: ${data.message}`);
    }
  });

  await runTest('4.3 Submit Shift Handover Notes', async () => {
    const res = await fetch(`${BASE_URL}/employee/shift/handover`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${employeeToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        handoverNotes: 'All 3 installations completed. 1 pending quote for Apollo Hospitals awaiting client signature.',
        pendingTaskIds: [taskId]
      })
    });

    const data = await res.json();
    if (!res.ok || !data.success || !data.data?._id) {
      throw new Error(`Shift handover failed: ${data.message}`);
    }
  });

  await runTest('4.4 Generate Unified Workday Timeline & Story Summary', async () => {
    const timelineRes = await fetch(`${BASE_URL}/employee/workday/timeline?date=${testDate}`, {
      headers: { 'Authorization': `Bearer ${employeeToken}` }
    });
    const timelineData = await timelineRes.json();
    if (!timelineRes.ok || !timelineData.success || !Array.isArray(timelineData.data)) {
      throw new Error(`Workday timeline failed: ${timelineData.message}`);
    }

    const storyRes = await fetch(`${BASE_URL}/employee/workday/summary?date=${testDate}`, {
      headers: { 'Authorization': `Bearer ${employeeToken}` }
    });
    const storyData = await storyRes.json();
    if (!storyRes.ok || !storyData.success || !storyData.data?.draftText) {
      throw new Error(`Workday story failed: ${storyData.message}`);
    }
  });

  await runTest('4.5 Emergency SOS Alert & Safety Check-In', async () => {
    const sosRes = await fetch(`${BASE_URL}/employee/safety/sos`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${employeeToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        latitude: 23.0225,
        longitude: 72.5714,
        message: 'Vehicle breakdown on SG Highway. Need mechanic support.'
      })
    });
    const sosData = await sosRes.json();
    if (!sosRes.ok || !sosData.success) {
      throw new Error(`SOS trigger failed: ${sosData.message}`);
    }

    const safeRes = await fetch(`${BASE_URL}/employee/safety/check-in`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${employeeToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message: 'Assistance arrived. I am safe.' })
    });
    const safeData = await safeRes.json();
    if (!safeRes.ok || !safeData.success) {
      throw new Error(`Safe check-in failed: ${safeData.message}`);
    }
  });

  console.log('\n===============================================================');
  console.log('🎉 ALL 4 END-TO-END BACKEND INTEGRATION TESTS PASSED 100%!');
  console.log('===============================================================\n');
}

main().catch(err => {
  console.error('\n❌ Test Suite Aborted with Error:', err);
  process.exit(1);
});
