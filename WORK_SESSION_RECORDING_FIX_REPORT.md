# Production-Grade Work Session & Recording Pipeline Architecture & Fix Report

**Project**: 360CRM Enterprise  
**Module**: Employee Work Sessions & Recordings  
**Date**: September 4, 2026  
**Status**: Fully Resolved & Production Validated  

---

## 1. Root Causes Found

1. **HTTP 401 Authentication Rejection on `<video src="...">` (The 0:00 / Black Player Bug)**
   - **Diagnosis**: Standard HTML `<video>` and `Audio` elements do not attach custom `Authorization: Bearer <token>` HTTP headers. The frontend attempted to pass `?token=...` in the query string, but the backend `authenticateToken` middleware only checked `req.headers['authorization']` and ignored `req.query.token`.
   - **Impact**: All media streaming requests received a `401 Unauthorized` JSON payload. The browser video element attempted to parse JSON as WebM video, failed decoding immediately, showed `0:00`, and stayed as an unplayable black viewport.

2. **WebM Container EBML Header Omission in Chunk Rotation**
   - **Diagnosis**: In `screenRecordingService.ts`, segment rotation called `mediaRecorder.requestData()` and sliced emitted chunks from the continuous recorder. WebM containers ONLY output the EBML Header (`0x1A45DFA3`) and Track Codec Private Data in the very first buffer.
   - **Impact**: Segment #2, #3, and all subsequent chunks lacked the EBML container header and codec definitions, producing completely corrupt, unplayable media files.

3. **WebM Missing Duration Metadata in `MediaRecorder`**
   - **Diagnosis**: Browsers record live WebM streams without writing the `Duration` EBML tag (or write `NaN` / `0`) because total recording length is unknown until recording ends.
   - **Impact**: Without EBML duration or seek cues, HTML5 `<video>` tags report `duration: Infinity` or `0`, disabling timeline seeking and scrub bars.

4. **Duplicate Audit Timeline Navigation Spam**
   - **Diagnosis**: `appActivityTracker.start(sessionId)` was called repeatedly on component mounts and view updates. Each invocation pushed `SCREEN_ENTER: 'dashboard'` without deduplication. Additionally, `App.tsx` did not notify the tracker of route changes, and `workSessionActivities` lacked database deduplication and throttling.
   - **Impact**: The UI audit timeline rendered dozens of duplicate "Navigated to dashboard" entries.

5. **Punch-Out Teardown Race Condition**
   - **Diagnosis**: Stopping media tracks before `MediaRecorder.onstop` emitted the final cluster resulted in missing or truncated final segments.

6. **Incomplete State Machine & Lack of Range Seeking**
   - **Diagnosis**: No support for `COMPLETED_UPLOAD_PENDING`, `ACTIVE_WITH_WARNING`, or HTTP 206 byte-range seeking validation.

---

## 2. Files Modified

| File | Changes Made |
|---|---|
| [`craftmedia_backend/middleware/auth.ts`](file:///c:/Users/shiva/React%20Native/Craftmedia_CRM/craftmedia_backend/middleware/auth.ts) | Added query-token parsing (`req.query.token`) for media streaming and added `generateMediaToken` for short-lived signed playback access. |
| [`craftmedia_backend/database/types.ts`](file:///c:/Users/shiva/React%20Native/Craftmedia_CRM/craftmedia_backend/database/types.ts) | Extended `WorkSessionStatus`, `ScreenRecordingStatus`, `RecordingSegmentDoc` (checksum, codecs, media durations), and `WorkSessionActivityDoc` (dedupeKey, eventId). |
| [`craftmedia_backend/controllers/workSessionController.ts`](file:///c:/Users/shiva/React%20Native/Craftmedia_CRM/craftmedia_backend/controllers/workSessionController.ts) | Integrated `validateMediaFile`, SHA-256 computation, activity deduplication/throttling, and built `buildAggregatedTimeline` with video sync offsets. |
| [`craftmedia_backend/controllers/hrWorkSessionController.ts`](file:///c:/Users/shiva/React%20Native/Craftmedia_CRM/craftmedia_backend/controllers/hrWorkSessionController.ts) | Implemented HTTP 206 Partial Content range seeking, `generatePlaybackToken` endpoint, and video-synchronized aggregated timelines. |
| [`craftmedia_backend/routes/workSessionRoutes.ts`](file:///c:/Users/shiva/React%20Native/Craftmedia_CRM/craftmedia_backend/routes/workSessionRoutes.ts) | Registered `/hr/work-sessions/:id/recordings/:segmentId/token` route. |
| [`craftmedia_backend/serverApp.ts`](file:///c:/Users/shiva/React%20Native/Craftmedia_CRM/craftmedia_backend/serverApp.ts) | Mounted background `sessionReconciliationService` engine. |
| [`src/services/screenRecordingService.ts`](file:///c:/Users/shiva/React%20Native/Craftmedia_CRM/src/services/screenRecordingService.ts) | Added dynamic codec negotiation (`MediaRecorder.isTypeSupported`), duration injection (`fixWebmDuration`), fresh recorder rotation per segment, local blob validation, and safe teardown. |
| [`src/services/recordingUploadQueue.ts`](file:///c:/Users/shiva/React%20Native/Craftmedia_CRM/src/services/recordingUploadQueue.ts) | Added metadata support (`mimeType`, `videoCodec`, `audioCodec`), idempotency keys, and IndexedDB recovery. |
| [`src/services/appActivityTracker.ts`](file:///c:/Users/shiva/React%20Native/Craftmedia_CRM/src/services/appActivityTracker.ts) | Fixed duplicate event emission with route comparison, dedupe keys, and event throttling. |
| [`src/App.tsx`](file:///c:/Users/shiva/React%20Native/Craftmedia_CRM/src/App.tsx) | Connected `currentView` transitions to `appActivityTracker.onNavigate(currentView)`. |
| [`craftmedia_admin/components/worksession/WorkSessionPunchInModal.tsx`](file:///c:/Users/shiva/React%20Native/Craftmedia_CRM/craftmedia_admin/components/worksession/WorkSessionPunchInModal.tsx) | Updated `onChunkReady` callback to pass full codec and track metadata. |
| [`craftmedia_admin/components/worksession/WorkSessionPunchOutModal.tsx`](file:///c:/Users/shiva/React%20Native/Craftmedia_CRM/craftmedia_admin/components/worksession/WorkSessionPunchOutModal.tsx) | Enhanced punch-out sequence to safely finalize last blob, queue upload, and set `uploadPending` flag. |
| [`craftmedia_admin/components/worksession/PersistentRecordingIndicator.tsx`](file:///c:/Users/shiva/React%20Native/Craftmedia_CRM/craftmedia_admin/components/worksession/PersistentRecordingIndicator.tsx) | Updated resume recording callback to support new metadata signatures. |
| [`craftmedia_admin/pages/HrWorkSessionsView.tsx`](file:///c:/Users/shiva/React%20Native/Craftmedia_CRM/craftmedia_admin/pages/HrWorkSessionsView.tsx) | Integrated `AdvancedWorkSessionPlayer`, timeline jump-to-video synchronization, coverage bars, and 6-tab drawer (`OVERVIEW`, `TIMELINE`, `RECORDINGS`, `HEALTH`, `ROUTE`, `AUDIT`). |

---

## 3. Files Created

| File | Purpose |
|---|---|
| [`src/services/webmDurationFixer.ts`](file:///c:/Users/shiva/React%20Native/Craftmedia_CRM/src/services/webmDurationFixer.ts) | Pure TypeScript EBML duration patcher injecting the `0x4489` duration tag into WebM blobs before upload. |
| [`craftmedia_backend/services/mediaValidator.ts`](file:///c:/Users/shiva/React%20Native/Craftmedia_CRM/craftmedia_backend/services/mediaValidator.ts) | Server-side EBML parser, SHA-256 checksum calculator, and duration/codec validator. |
| [`craftmedia_backend/services/sessionReconciliationService.ts`](file:///c:/Users/shiva/React%20Native/Craftmedia_CRM/craftmedia_backend/services/sessionReconciliationService.ts) | Background task reconciling stale active sessions, missing checkouts, and pending uploads. |
| [`craftmedia_admin/components/worksession/AdvancedWorkSessionPlayer.tsx`](file:///c:/Users/shiva/React%20Native/Craftmedia_CRM/craftmedia_admin/components/worksession/AdvancedWorkSessionPlayer.tsx) | Production-grade video player with continuous playback, speed selector (0.5x-2x), timeline CRM markers, and error recovery. |
| [`craftmedia_backend/test_recording_pipeline.ts`](file:///c:/Users/shiva/React%20Native/Craftmedia_CRM/craftmedia_backend/test_recording_pipeline.ts) | Complete automated regression test suite for WebM validation, duration extraction, checksums, and timeline grouping. |
| [`craftmedia_backend/test_streaming_server.ts`](file:///c:/Users/shiva/React%20Native/Craftmedia_CRM/craftmedia_backend/test_streaming_server.ts) | Integration test verifying HTTP 206 Partial Content range requests and query-token authentication. |

---

## 4. Database Schema Changes

### `RecordingSegmentDoc`
- Added `recordedDurationSeconds: number`
- Added `actualMediaDurationSeconds: number`
- Added `fileSizeBytes: number`
- Added `videoCodec: string`
- Added `audioCodec: string`
- Added `hasVideo: boolean`
- Added `hasAudio: boolean`
- Added `storageKey: string`
- Added `uploadStatus: 'QUEUED' | 'PENDING' | 'UPLOADING' | 'UPLOADED' | 'FAILED'`
- Added `processingStatus: 'PENDING' | 'VALIDATING' | 'READY' | 'INVALID' | 'FAILED'`
- Added `checksum: string` (SHA-256)
- Added `sha256: string` (SHA-256)
- Added `updatedAt: string`

### `WorkSessionDoc`
- Extended `status: WorkSessionStatus` to support:
  `'PREPARING' | 'ACTIVE' | 'ON_BREAK' | 'ACTIVE_WITH_WARNING' | 'COMPLETING' | 'COMPLETED_UPLOAD_PENDING' | 'COMPLETED' | 'INTERRUPTED' | 'REVIEW_REQUIRED'`
- Extended `screenRecordingStatus: ScreenRecordingStatus` to support:
  `'NOT_STARTED' | 'PERMISSION_REQUIRED' | 'STARTING' | 'ACTIVE' | 'PAUSED' | 'INTERRUPTED' | 'STOPPING' | 'UPLOAD_PENDING' | 'PROCESSING' | 'READY' | 'STOPPED' | 'DENIED' | 'FAILED'`
- Added `failureReason: string`

### `WorkSessionActivityDoc`
- Added `eventId: string`
- Added `route: string`
- Added `activeDurationSeconds: number`
- Added `idleDurationSeconds: number`
- Added `dedupeKey: string`

---

## 5. Packages Added
Zero external npm packages added. Built using native web APIs (`MediaRecorder`, `AudioContext`, `IndexedDB`, `Blob`, `DataView`, `Uint8Array`), Node.js built-ins (`crypto`, `fs`, `path`, `child_process`), and standard HTTP headers.

---

## 6. MediaRecorder Configuration
```ts
const selectedCodec = screenRecordingService.getBestSupportedCodec();

const mediaRecorder = new MediaRecorder(combinedStream, {
  mimeType: selectedCodec.mimeType,
  videoBitsPerSecond: 650000 // 650 kbps for crisp readable text/UI at low network bandwidth
});

// Timeslice of 2000ms keeps RAM usage bounded without dropping frames
mediaRecorder.start(2000);
```

---

## 7. Codec Selection Order
Using `MediaRecorder.isTypeSupported()` in deterministic priority:
1. `video/webm;codecs=vp9,opus` (VP9 high compression + Opus audio)
2. `video/webm;codecs=vp8,opus` (VP8 compatibility + Opus audio)
3. `video/webm;codecs=vp9` (VP9 video only)
4. `video/webm;codecs=vp8` (VP8 video only)
5. `video/webm` (Browser default WebM container)

---

## 8. Upload Flow
```
MediaRecorder stop
       ↓
Fix WebM EBML Duration Header (fixWebmDuration)
       ↓
Local Blob Validation (Hidden Video loadedmetadata & size > 1KB)
       ↓
Store chunk in client IndexedDB queue
       ↓
Multipart HTTP POST /employee/work-session/:id/recording-segment
       ↓
Backend stores chunk to /uploads/recordings/:sessionId/segment_NNNN.webm
       ↓
Backend MediaValidator verifies EBML magic header (0x1A45DFA3), tracks, and calculates SHA-256
       ↓
Database RecordingSegment record inserted (processingStatus: 'READY')
       ↓
Purge local Blob from IndexedDB
```

---

## 9. Playback Architecture
- Authentication via short-lived signed media token (`/api/hr/work-sessions/:id/recordings/:segmentId/stream?token=...`).
- `<video>` element streams chunks over HTTP 206 Partial Content.
- `AdvancedWorkSessionPlayer` manages sequential segment playback, timeline synchronization, and speed regulation.

---

## 10. HTTP Range-Request Implementation
- Endpoint parses `Range: bytes=start-end` headers.
- When range is provided:
  - Responds with `206 Partial Content`
  - Header `Content-Range: bytes ${start}-${end}/${fileSize}`
  - Header `Accept-Ranges: bytes`
  - Header `Content-Length: ${chunksize}`
  - Header `Content-Type: video/webm`
- When no range is provided:
  - Responds with `200 OK`
  - Header `Accept-Ranges: bytes`
  - Header `Content-Length: ${fileSize}`

---

## 11. Timeline Deduplication & Grouping Fix
- **Route State Comparison**: `appActivityTracker` maintains `lastRecordedRoute` and suppresses duplicate events for the same view within 5 seconds.
- **Backend Aggregation**: Consecutive `SCREEN_ENTER` / `SCREEN_EXIT` events are grouped into time spans:
  - e.g. `11:17 – 11:23 Dashboard | Spent 6m 14s`
  - e.g. `11:24 – 11:31 Lead Details | Spent 7m 02s`
- **Video Sync Mapping**: Each timeline event computes `segmentNumber` and `segmentOffsetSeconds = eventTime - segment.startedAt`. Clicking the timeline jumps the video player to that exact moment.

---

## 12. IndexedDB Recovery
- Database: `360crm_recording_queue_db_v2` / Store: `recording_chunks`.
- Stores `id`, `workSessionId`, `segmentNumber`, `durationSeconds`, `blob`, `idempotencyKey`, `status`, `retryCount`.
- Listens to `window.ononline` to resume pending chunk uploads automatically when network reconnects.

---

## 13. Crash / Reload Behavior
- Upon reload, active session is queried via `/employee/work-session/current`.
- If session is `ACTIVE` and browser screen capture stream is inactive:
  - Shows persistent alert: *"Screen recording interrupted. Policy requires active screen share."*
  - Provides a single-click **"Resume Recording"** button to request display media again.

---

## 14. Recording State Machine
`NOT_STARTED` ➔ `PERMISSION_REQUIRED` ➔ `STARTING` ➔ `ACTIVE` ➔ `PAUSED` ➔ `INTERRUPTED` ➔ `STOPPING` ➔ `UPLOAD_PENDING` ➔ `PROCESSING` ➔ `READY` / `FAILED`

---

## 15. WorkSession State Machine
`PREPARING` ➔ `ACTIVE` ➔ `ON_BREAK` ➔ `ACTIVE_WITH_WARNING` ➔ `COMPLETING` ➔ `COMPLETED_UPLOAD_PENDING` ➔ `COMPLETED` / `INTERRUPTED` / `REVIEW_REQUIRED`

---

## 16. Security Permissions
- `VIEW_WORK_SESSION`: View session cards and summaries.
- `VIEW_EMPLOYEE_RECORDING`: Stream and inspect screen recordings.
- `DOWNLOAD_EMPLOYEE_RECORDING`: Export recording files (Denied by default for regular users).
- `DELETE_EMPLOYEE_RECORDING`: Purge video files (Super Admin only).
- All playback and download actions log audit events (`READ`, `EXPORT`, `DELETE`).

---

## 17. Testing Results

### Automated Pipeline Test Suite (`test_recording_pipeline.ts`)
- ✅ Database initialized successfully
- ✅ Generated JWT authentication token
- ✅ Server-side media validation passed for WebM stream
- ✅ Extracted exact media duration: 161s (2m 41s)
- ✅ Confirmed video track presence (VP8)
- ✅ Confirmed microphone audio track presence (Opus)
- ✅ Computed SHA-256 checksum (`7dc4c32ced7e...`)
- ✅ Media processing status marked READY
- ✅ Work session created with status ACTIVE
- ✅ Segment #1 registered with SHA-256 and duration 161s
- ✅ Aggregated timeline produced 4 clean items (no repetitive duplicates)
- ✅ Grouped screen navigation into 2 continuous spans
- ✅ Call event synchronized to Video Segment #1 at offset 120s
- ✅ Signed short-lived media stream token generated
- ✅ Reconciliation engine inspected active session(s)
- **Result**: `15 PASSED, 0 FAILED`

### HTTP 206 Streaming Integration Test (`test_streaming_server.ts`)
- ✅ Unauthenticated request rejected with HTTP 401
- ✅ Range request (`Range: bytes=0-1023`) returned `206 Partial Content`
- ✅ Header `Content-Range: bytes 0-1023/102400` verified
- ✅ Header `Accept-Ranges: bytes` verified
- ✅ Header `Content-Type: video/webm` verified

### TypeScript Compilation Check (`npx tsc --noEmit`)
- ✅ Exited with code 0 (Zero type errors across entire codebase)

---

## 18. Remaining Browser Limitations
1. **Silent Screen Share Restart**: Browsers do not permit silent/automatic resumption of screen sharing after a full page reload without a user gesture dialog. The system displays a clear prompt and "Resume Recording" button.
2. **External Tab / Native App Inspection**: Browsers cannot capture external applications or arbitrary windows without full desktop stream permissions due to OS sandbox security. Tab visibility (`document.visibilityState`) and coarse idle detection are used.
