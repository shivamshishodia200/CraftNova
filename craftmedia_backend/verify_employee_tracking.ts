/**
 * Automated Verification Test Suite for Enterprise Employee Live Tracking & Geofencing System
 */

import { db } from './database/db';
import { GeodesicService } from './tracking/geodesic.service';
import { GeofenceService } from './tracking/geofence.service';
import { TrackingPolicyService } from './tracking/policy.service';
import { TrackingEngineService } from './tracking/trackingEngine.service';
import { StopDetectionService } from './tracking/stopDetection.service';

async function runTestSuite() {
  console.log('===============================================================');
  console.log('🚀 STARTING 360CRM EMPLOYEE LIVE TRACKING VERIFICATION SUITE');
  console.log('===============================================================\n');

  // 1. Initialize Database
  await db.init();
  console.log('✅ 1. Database Initialized successfully.');

  // Verify collections exist and have seed items
  const geofences = db.geofences.getAll();
  const latestLocs = db.latestLocations.getAll();
  const history = db.locationHistory.getAll();
  const policies = db.trackingPolicies.getAll();

  console.log(`   - Geofences in DB: ${geofences.length}`);
  console.log(`   - Latest Locations in DB: ${latestLocs.length}`);
  console.log(`   - Location History items in DB: ${history.length}`);
  console.log(`   - Tracking Policies in DB: ${policies.length}`);

  if (geofences.length === 0 || latestLocs.length === 0) {
    throw new Error('❌ Geofences or LatestLocations seed data is missing!');
  }
  console.log('✅ 2. Database schemas and seed data verified.\n');

  // 2. Test Geodesic Math & Navigation Calculations
  console.log('🧪 3. Testing Geodesic Calculations...');
  // Noida HQ (28.6139, 77.2090) to Delhi Depot (28.5355, 77.3910)
  const dist = GeodesicService.calculateDistanceMeters(28.6139, 77.2090, 28.5355, 77.3910);
  console.log(`   - Distance Noida HQ to Delhi Depot: ${(dist / 1000).toFixed(2)} km (expected ~19-20 km)`);
  if (dist < 15000 || dist > 25000) {
    throw new Error(`❌ Haversine calculation unexpected: ${dist} meters`);
  }

  // Jump Detection Test
  const prevPt = { latitude: 28.6139, longitude: 77.2090, recordedAt: '2026-08-29T10:00:00Z', accuracy: 10 };
  const jumpPt = { latitude: 19.0760, longitude: 72.8777, recordedAt: '2026-08-29T10:01:00Z', accuracy: 10 }; // Teleported to Mumbai in 1 min
  const jumpResult = GeodesicService.detectGpsJump(prevPt, jumpPt, 140);
  console.log(`   - Jump Detection test (Delhi to Mumbai in 60s): isJump = ${jumpResult.isJump}, speed = ${jumpResult.speedKmh} km/h`);
  if (!jumpResult.isJump) {
    throw new Error('❌ Jump detection failed to catch impossible teleportation!');
  }
  console.log('✅ 3. Geodesic & GPS Jump filter verified.\n');

  // 3. Test Geofence Containment & Transitions
  console.log('🧪 4. Testing Geofence Containment...');
  // Test point directly inside Noida HQ (Plot B-14 Sector 63)
  const insideNoida = GeofenceService.findContainingGeofences(28.61391, 77.20901);
  console.log(`   - Point (28.61391, 77.20901) matching geofences: ${insideNoida.map(g => g.geofenceName).join(', ')}`);
  if (insideNoida.length === 0 || insideNoida[0].geofenceName !== 'Noida Corporate Office') {
    throw new Error('❌ Geofence containment failed to detect Noida Corporate Office!');
  }

  // Test point outside all geofences (Connaught Place)
  const outside = GeofenceService.findContainingGeofences(28.6315, 77.2167);
  console.log(`   - Connaught Place matching geofences: ${outside.length} (expected 0)`);
  if (outside.length !== 0) {
    throw new Error('❌ Point outside should not match any geofences!');
  }
  console.log('✅ 4. Geofence spatial containment verified.\n');

  // 4. Test Employee Privacy & Policy Gate
  console.log('🧪 5. Testing Employee Privacy Policy Engine...');
  const arjunEmp = db.employees.findById('emp_arjun')!;
  
  // Test during allowed working hours (11:00 AM)
  const workHoursCheck = TrackingPolicyService.evaluateEligibility(arjunEmp, '2026-08-29T11:00:00Z');
  console.log(`   - Arjun during 11:00 AM work hours: isAllowed = ${workHoursCheck.isAllowed}`);
  if (!workHoursCheck.isAllowed) {
    throw new Error(`❌ Valid work-time tracking was rejected: ${workHoursCheck.reason}`);
  }

  // Test during midnight (02:00 AM) - Anti-surveillance check
  const offHoursCheck = TrackingPolicyService.evaluateEligibility(arjunEmp, '2026-08-29T02:00:00Z');
  console.log(`   - Arjun during 02:00 AM off-hours: isAllowed = ${offHoursCheck.isAllowed} (Reason: ${offHoursCheck.reason})`);
  if (offHoursCheck.isAllowed) {
    throw new Error('❌ Off-hours tracking MUST be rejected by privacy engine!');
  }
  console.log('✅ 5. Privacy & Anti-surveillance policy verified.\n');

  // 5. Test Live Telemetry Ingestion Pipeline
  console.log('🧪 6. Testing Live Packet Ingestion Pipeline...');
  const newPacket = {
    latitude: 28.6145,
    longitude: 77.2095,
    accuracy: 12,
    speed: 4.5, // 16.2 km/h
    heading: 90,
    batteryLevel: 88,
    isCharging: false,
    recordedAt: '2026-08-29T11:30:00Z',
    source: 'WEB_BROWSER' as const
  };

  const ingestRes = await TrackingEngineService.ingestLocationPacket(arjunEmp, newPacket);
  console.log('   - Ingestion result:', JSON.stringify(ingestRes, null, 2));
  if (!ingestRes.success || !ingestRes.tracking) {
    throw new Error(`❌ Ingestion failed: ${ingestRes.message}`);
  }

  // Verify DB record
  const latestSaved = db.latestLocations.findById(`loc_latest_${arjunEmp._id}`)!;
  console.log(`   - Saved Latest Location: Lat=${latestSaved.latitude}, Lng=${latestSaved.longitude}, Status=${latestSaved.trackingStatus}, Battery=${latestSaved.batteryLevel}%`);
  if (latestSaved.latitude !== newPacket.latitude || latestSaved.batteryLevel !== 88) {
    throw new Error('❌ Saved latest location does not match ingested packet!');
  }
  console.log('✅ 6. Telemetry Ingestion & DB synchronization verified.\n');

  // 6. Test Batch Offline Packets Ingestion
  console.log('🧪 7. Testing Offline Queue Batch Ingestion...');
  const batchPackets = [
    { latitude: 28.6146, longitude: 77.2096, accuracy: 15, recordedAt: '2026-08-29T11:35:00Z' },
    { latitude: 28.6148, longitude: 77.2098, accuracy: 14, recordedAt: '2026-08-29T11:36:00Z' }
  ];

  const batchRes = await TrackingEngineService.ingestBatchPackets(arjunEmp, batchPackets);
  console.log(`   - Batch processed: ${batchRes.ingestedCount} packets, errors: ${batchRes.errors.length}`);
  if (batchRes.ingestedCount !== 2) {
    throw new Error('❌ Batch ingestion failed to process all offline packets!');
  }
  console.log('✅ 7. Offline Queue Batch Ingestion verified.\n');

  console.log('===============================================================');
  console.log('🎉 ALL 7/7 ENTERPRISE EMPLOYEE TRACKING SUITE TESTS PASSED (100%)');
  console.log('===============================================================');
}

runTestSuite().catch(err => {
  console.error('\n❌ TEST SUITE FAILED:', err);
  process.exit(1);
});
