# 360CRM Enterprise — Web Employee Module Implementation

## Executive Summary
The **360CRM Web Employee Module** has been upgraded into a production-ready, enterprise-grade **Work Session + Attendance + Geofencing + Live Tracking + Screen & Audio Recording** system.

This implementation strictly builds upon existing 360CRM authentication (JWT), employees, attendance, geofencing, tracking, tasks, leads, calls, quotations, and HR modules without duplicate tables or conflicting services.

---

## 1. Architecture & Core Principles

### A. Non-Covert Enterprise Privacy Architecture
- **Zero Covert Recording**: All recording actions require clear, transparent disclosure to the employee.
- **Privacy Disclosures**: Before punch-in, employees review and accept the transparent corporate privacy consent detailing what is captured, when recording begins/stops, retention periods (default 15 days), and authorized HR access.
- **Shift-Bound Telemetry**: Screen recording and GPS tracking activate strictly upon Punch-In and terminate immediately upon Punch-Out. No off-hours background tracking or recording is ever conducted.
- **Data Safeguards**: The app activity telemetry tracks only CRM route transitions, tab visibility, and coarse idle detection. It **never** logs keystrokes, password fields, credit cards, or external non-work browser activities.

### B. Segmented Video Pipeline
- **Avoids Monolithic Files**: Instead of a single 8-hour recording, recordings are split into 10–20 minute segments (`segment_0001.webm`, `segment_0002.webm`).
- **Resilient IndexedDB Queue**: Chunks are enqueued into an offline browser IndexedDB store (`360crm_recording_queue_db`). If the employee experiences a spotty connection, chunks remain cached locally and upload automatically with exponential retry backoff once network connectivity returns.
- **Auto-Purge**: Uploaded video blobs are purged from browser IndexedDB storage immediately upon confirmed upload to avoid browser storage bloat.

---

## 2. Reused Architecture & Zero Duplication

| Module | Existing Asset Reused | Integration Point |
|---|---|---|
| **Authentication** | `craftmedia_backend/middleware/auth.ts` | Uses existing JWT Bearer token authentication |
| **RBAC** | `craftmedia_backend/middleware/rbac.ts` & `permissionsList.ts` | Guarded with `VIEW_EMPLOYEE_RECORDING`, `DOWNLOAD_EMPLOYEE_RECORDING`, `DELETE_EMPLOYEE_RECORDING` |
| **Employee DB** | `craftmedia_backend/database/db.ts` (`employees`) | Links sessions to existing `EmployeeDoc` |
| **Attendance DB** | `craftmedia_backend/database/db.ts` (`attendance`) | Work sessions update and synchronize with existing attendance records (`checkIn`, `checkOut`, `workHours`, `status`, `breaks`) |
| **Geofencing & GPS** | `peopleControllers.ts` & `trackingEngine.service.ts` | Haversine geofence verification against authorized corporate locations |
| **Telemetry History**| `craftmedia_backend/database/db.ts` (`locationHistory`) | Co-located with live coordinate history |

---

## 3. Backend Endpoints Summary

### A. Employee Work Session Endpoints (`/api/employee/work-session`)
- `GET /policy`: Returns active company work session policy, allowed office geofences, and accuracy limits.
- `POST /policy`: HR/Admin updates work session and recording settings.
- `POST /consent`: Records timestamped employee privacy consent (version, IP, user-agent, permissions).
- `POST /start`: 10-step verified clock-in. Validates selfie, GPS accuracy, office geofence, multi-tab exclusivity, and screen recording authorization. Creates `WorkSessionDoc` with status `ACTIVE`.
- `GET /current`: Returns today's active or latest session for logged in employee.
- `POST /:id/heartbeat`: 60-second health pulse tracking tab visibility, recording state, and network status.
- `POST /:id/activity`: Ingests route navigation, tab focus changes, and coarse user idle events.
- `POST /:id/recording-status`: Tracks pause/interruption/resumption events and updates interruption counters.
- `POST /:id/recording-segment`: Receives multipart video chunks (`videoChunk`), saves to `uploads/recordings/:sessionId/`, and inserts `RecordingSegmentDoc`.
- `POST /:id/end`: Orderly punch-out. Finalizes shift, calculates daily work summary (net work hours, CRM active hours, calls logged, travel km), stops tracking, and updates attendance status.
- `GET /:id/summary`: Returns shift summary.
- `GET /timeline`: Chronological unified workday audit trail.

### B. HR Oversight & Video Vault Endpoints (`/api/hr/work-sessions`)
- `GET /`: Filterable list of work sessions with recording coverage %, tracking coverage %, and shift metrics.
- `GET /:id`: Full single session inspection.
- `GET /:id/timeline`: Chronological shift timeline.
- `GET /:id/recordings`: List of recorded segments for the session.
- `GET /:id/recordings/:segmentId/stream`: HTTP 206 Partial Content video streaming for smooth seeking. Guarded by `VIEW_EMPLOYEE_RECORDING`.
- `GET /:id/recordings/:segmentId/download`: Video download. Guarded by `DOWNLOAD_EMPLOYEE_RECORDING`.
- `DELETE /:id/recordings/:segmentId`: File and record deletion. Guarded by `DELETE_EMPLOYEE_RECORDING`.
- `GET /storage/stats`: Total video recordings, disk storage used (MB/GB), average chunk size, and oldest recording.
- `POST /storage/cleanup`: Automatic purge of recordings older than configured retention days (unless flagged under corporate legal hold).

---

## 4. Frontend Services

1. **`src/services/screenRecordingService.ts`**:
   - Manages browser `navigator.mediaDevices.getDisplayMedia` and `getUserMedia`.
   - Combines display video track with mixed system audio and microphone stream.
   - Rotates recording into 10–20 minute segments.
   - Detects browser native "Stop sharing" events and triggers interruption handling.
   - Provides clean `stopRecording()` to flush the final chunk before stopping media tracks.

2. **`src/services/recordingUploadQueue.ts`**:
   - IndexedDB-backed resilient upload queue.
   - Non-blocking background uploads via `multipart/form-data`.
   - Auto-retries with exponential backoff on network failures.
   - Auto-deletes uploaded blobs to prevent browser storage memory leaks.

3. **`src/services/appActivityTracker.ts`**:
   - Monitors CRM screen navigation (`SCREEN_ENTER` / `SCREEN_EXIT`).
   - Tracks tab visibility (`document.visibilitychange`).
   - Detects coarse idle state (5 minutes without user mouse/scroll/keyboard interaction).
   - Transmits periodic 60s health heartbeats.

4. **`src/services/employeeTrackingService.ts`**:
   - Watches live GPS with `{ enableHighAccuracy: true }`.
   - Queues coordinates locally in IndexedDB when offline.
   - Syncs queued batch coordinates to server upon reconnect.

---

## 5. Employee Portal UI Components

1. **`WorkSessionConsentModal.tsx`**:
   - Transparent disclosure modal showing camera, GPS, screen recording, and microphone permissions.
   - Full embedded corporate privacy policy modal.
   - Explicit "Allow & Continue" confirmation.

2. **`WorkSessionPunchInModal.tsx`**:
   - Live camera view with selfie capture, flip camera, and retake controls.
   - Real-time GPS accuracy lock indicator (e.g. ±12m).
   - Display stream authorization trigger.
   - Server-side geofence and attendance verification with error alerts.

3. **`PersistentRecordingIndicator.tsx`**:
   - Floating unobtrusive status pill:
     `● Work Session Recording | Screen: Active | Duration: 02:18:42 | GPS: ±8m | 0 queued`
   - Real-time interruption banner with one-click **[Resume Recording]** action.
   - Clickable telemetry inspector showing network state, GPS accuracy, and queued uploads.

4. **`WorkSessionPunchOutModal.tsx`**:
   - Strictly enforces the punch-out sequence:
     1. MediaRecorder request data & finalize Blob
     2. Queue final segment upload
     3. Stop live GPS watcher
     4. Stop CRM app activity telemetry
     5. Release all media tracks
     6. Post clock-out to backend
   - Displays complete Daily Work Summary (shift range, net work hours, CRM active hours, break minutes, calls made, travel km, tasks finished).

5. **Multi-Tab & Crash Protection**:
   - Uses `BroadcastChannel('360crm_work_session_channel')` to synchronize session state across open browser tabs.
   - On page reload, automatically detects active session, restarts telemetry, and offers seamless recording resumption.

---

## 6. HR Work Session & Recording Dashboard

- **Location**: `craftmedia_admin/pages/HrWorkSessionsView.tsx`
- **Sidebar Integration**: Added to **People & HR** group in `AdminSidebar.tsx` as **"Work Sessions & Recordings"**.
- **Features**:
  - Filter by date, employee name/ID, and status (Active, On Break, Completed).
  - High-level KPIs: Total sessions today, storage used, average recording coverage %, active GPS count.
  - Inspection drawer: Summary cards, full chronological audit timeline, and recording segments list.
  - In-browser HTML5 video player with HTTP 206 seekable playback.
  - RBAC-protected actions: View, Download, and Delete.
  - Storage monitoring modal with **"Run Retention Cleanup Now"** button.

---

## 7. Verification & Build Integrity

- **Backend TypeScript Compilation**: Clean (`npx tsc --noEmit` exited with 0 errors).
- **Frontend Production Build**: Clean (`npm run build` -> `tsc && vite build` completed in 11.48s with 0 errors).
- **Automated E2E Integration Suite**: `craftmedia_backend/test_work_session_flow.ts` passed all 10 tests:
  1. Database initialization
  2. Policy retrieval & validation
  3. Employee context resolution
  4. Privacy consent recording
  5. Work session creation & punch-in
  6. Heartbeat and route telemetry ingestion
  7. Video recording segment upload simulation
  8. Punch-out finalization and daily work summary calculation
  9. HR oversight and session verification
  10. Storage monitoring & retention verification
