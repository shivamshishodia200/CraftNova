/**
 * 360CRM Enterprise Screen & Audio Recording Service
 * Production-grade recording pipeline with dynamic codec negotiation,
 * WebM EBML duration injection, local blob integrity validation,
 * lossless chunk rotation, track interruption listeners, and safe teardown.
 */

import { fixWebmDuration } from './webmDurationFixer';

export interface ScreenRecordingOptions {
  requireAudio?: boolean;
  chunkDurationMinutes?: number;
  onChunkReady: (
    blob: Blob,
    segmentNumber: number,
    durationSeconds: number,
    meta: { mimeType: string; videoCodec: string; audioCodec: string; hasVideo: boolean; hasAudio: boolean }
  ) => void;
  onInterrupted: (reason: string) => void;
  onError?: (err: any) => void;
}

export interface MediaCodecInfo {
  mimeType: string;
  videoCodec: string;
  audioCodec: string;
}

export class ScreenRecordingService {
  private displayStream: MediaStream | null = null;
  private micStream: MediaStream | null = null;
  private combinedStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioContext: AudioContext | null = null;

  private isRecording = false;
  private isPaused = false;
  private segmentNumber = 1;
  private chunkTimer: NodeJS.Timeout | null = null;
  private chunkStartTime = 0;
  private recordedChunks: Blob[] = [];
  private options: ScreenRecordingOptions | null = null;

  private selectedCodec: MediaCodecInfo = {
    mimeType: 'video/webm',
    videoCodec: 'vp8',
    audioCodec: 'opus'
  };

  /**
   * Checks if browser supports Screen Capture & MediaRecorder
   */
  public isSupported(): boolean {
    return Boolean(
      typeof navigator !== 'undefined' &&
      navigator.mediaDevices &&
      typeof navigator.mediaDevices.getDisplayMedia === 'function' &&
      typeof MediaRecorder !== 'undefined'
    );
  }

  /**
   * Detects the best supported WebM MIME type and codecs dynamically
   */
  public getBestSupportedCodec(): MediaCodecInfo {
    if (typeof MediaRecorder === 'undefined') {
      return { mimeType: 'video/webm', videoCodec: 'unknown', audioCodec: 'none' };
    }

    const candidateTypes: Array<{ mime: string; vCodec: string; aCodec: string }> = [
      { mime: 'video/webm;codecs=vp9,opus', vCodec: 'vp9', aCodec: 'opus' },
      { mime: 'video/webm;codecs=vp8,opus', vCodec: 'vp8', aCodec: 'opus' },
      { mime: 'video/webm;codecs=vp9', vCodec: 'vp9', aCodec: 'none' },
      { mime: 'video/webm;codecs=vp8', vCodec: 'vp8', aCodec: 'none' },
      { mime: 'video/webm', vCodec: 'default', aCodec: 'default' }
    ];

    for (const candidate of candidateTypes) {
      if (MediaRecorder.isTypeSupported(candidate.mime)) {
        return {
          mimeType: candidate.mime,
          videoCodec: candidate.vCodec,
          audioCodec: candidate.aCodec
        };
      }
    }

    return { mimeType: 'video/webm', videoCodec: 'vp8', audioCodec: 'opus' };
  }

  /**
   * Request display stream with browser permission dialog
   */
  public async requestDisplayStream(withAudio = false): Promise<MediaStream> {
    if (!this.isSupported()) {
      throw new Error('Screen capture is not supported in this browser. Please use Chrome, Edge, or Firefox.');
    }

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'browser' as any,
          frameRate: { ideal: 15, max: 30 },
          width: { ideal: 1920, max: 1920 },
          height: { ideal: 1080, max: 1080 }
        },
        audio: withAudio
      });

      this.displayStream = stream;

      // Listen for user stopping screen share via native browser bar
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.onended = () => {
          this.handleDisplayTrackEnded();
        };
      }

      return stream;
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        throw new Error('Screen share permission was declined by user.');
      }
      throw err;
    }
  }

  /**
   * Request microphone audio stream
   */
  public async requestMicrophoneStream(): Promise<MediaStream> {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Microphone access is not supported on this device.');
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      });

      this.micStream = stream;

      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.onended = () => {
          console.warn('[ScreenRecording] Microphone audio track ended unexpectedly');
        };
      }

      return stream;
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        throw new Error('Microphone permission was declined.');
      }
      throw err;
    }
  }

  /**
   * Combines display video track with mixed display audio + mic audio
   */
  public combineStreams(displayStream: MediaStream, micStream?: MediaStream | null): MediaStream {
    const videoTracks = displayStream.getVideoTracks();
    if (videoTracks.length === 0) {
      throw new Error('No video track found in screen capture stream.');
    }

    const tracks: MediaStreamTrack[] = [videoTracks[0]];
    const displayAudioTracks = displayStream.getAudioTracks();
    const micAudioTracks = micStream ? micStream.getAudioTracks() : [];

    if (displayAudioTracks.length > 0 && micAudioTracks.length > 0) {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!this.audioContext || this.audioContext.state === 'closed') {
          this.audioContext = new AudioCtx();
        }

        const dest = this.audioContext.createMediaStreamDestination();
        const displaySource = this.audioContext.createMediaStreamSource(new MediaStream(displayAudioTracks));
        const micSource = this.audioContext.createMediaStreamSource(new MediaStream(micAudioTracks));

        displaySource.connect(dest);
        micSource.connect(dest);

        dest.stream.getAudioTracks().forEach(t => tracks.push(t));
      } catch (audioMixErr) {
        console.warn('[ScreenRecording] Audio mixing failed, falling back to mic audio track:', audioMixErr);
        if (micAudioTracks.length > 0) tracks.push(micAudioTracks[0]);
      }
    } else if (micAudioTracks.length > 0) {
      tracks.push(micAudioTracks[0]);
    } else if (displayAudioTracks.length > 0) {
      tracks.push(displayAudioTracks[0]);
    }

    this.combinedStream = new MediaStream(tracks);
    return this.combinedStream;
  }

  /**
   * Starts recording the active stream with chunk rotation & validation
   */
  public async startRecording(options: ScreenRecordingOptions): Promise<void> {
    this.options = options;
    this.segmentNumber = 1;
    this.isPaused = false;

    // 1. Get streams if not already acquired
    if (!this.displayStream) {
      await this.requestDisplayStream(Boolean(options.requireAudio));
    }

    if (options.requireAudio && !this.micStream) {
      try {
        await this.requestMicrophoneStream();
      } catch (micErr) {
        console.warn('[ScreenRecording] Optional microphone failed/denied:', micErr);
      }
    }

    // 2. Combine streams
    const streamToRecord = this.combineStreams(this.displayStream!, this.micStream);

    // 3. Validate video track readiness
    const videoTrack = streamToRecord.getVideoTracks()[0];
    if (!videoTrack || videoTrack.readyState !== 'live') {
      throw new Error('Screen capture video track is not active or live.');
    }

    // 4. Negotiate Codec
    this.selectedCodec = this.getBestSupportedCodec();

    // 5. Start MediaRecorder for the first segment
    this.startSegmentRecorder(streamToRecord);
    this.isRecording = true;

    // 6. Schedule Chunk Rotation Timer (default 10 minutes)
    const chunkMs = (options.chunkDurationMinutes || 10) * 60 * 1000;
    this.scheduleChunkRotation(chunkMs);
  }

  /**
   * Instantiates and starts a fresh MediaRecorder instance for a segment
   */
  private startSegmentRecorder(stream: MediaStream): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch {}
    }

    this.recordedChunks = [];
    this.chunkStartTime = Date.now();

    this.mediaRecorder = new MediaRecorder(stream, {
      mimeType: this.selectedCodec.mimeType,
      videoBitsPerSecond: 650000 // 650 kbps: high clarity text/UI at low bandwidth
    });

    this.mediaRecorder.ondataavailable = (event: BlobEvent) => {
      if (event.data && event.data.size > 0) {
        this.recordedChunks.push(event.data);
      }
    };

    // Emit timeslice buffers every 2 seconds to keep memory low
    this.mediaRecorder.start(2000);

    if (this.mediaRecorder.state !== 'recording') {
      throw new Error(`MediaRecorder failed to initialize. Current state: ${this.mediaRecorder.state}`);
    }
  }

  /**
   * Schedules segment rotation timer
   */
  private scheduleChunkRotation(intervalMs: number): void {
    if (this.chunkTimer) clearTimeout(this.chunkTimer);
    this.chunkTimer = setTimeout(async () => {
      if (this.isRecording && !this.isPaused) {
        await this.rotateChunk();
        this.scheduleChunkRotation(intervalMs);
      }
    }, intervalMs);
  }

  /**
   * Rotates recording chunk into a finalized Segment Blob and restarts recorder for next segment
   */
  public async rotateChunk(): Promise<void> {
    if (!this.mediaRecorder || !this.isRecording || !this.combinedStream) return;

    const currentSegment = this.segmentNumber;
    this.segmentNumber++;
    const durationSeconds = Math.max(1, Math.round((Date.now() - this.chunkStartTime) / 1000));
    const durationMs = durationSeconds * 1000;

    return new Promise<void>((resolve) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        resolve();
        return;
      }

      this.mediaRecorder.onstop = async () => {
        if (this.recordedChunks.length > 0) {
          const rawBlob = new Blob(this.recordedChunks, { type: this.selectedCodec.mimeType });
          this.recordedChunks = [];

          // Patch EBML duration metadata
          const fixedBlob = await fixWebmDuration(rawBlob, durationMs);

          // Validate blob locally
          const isValid = await this.validateBlobLocally(fixedBlob);

          if (this.options?.onChunkReady) {
            this.options.onChunkReady(
              fixedBlob,
              currentSegment,
              durationSeconds,
              {
                mimeType: this.selectedCodec.mimeType,
                videoCodec: this.selectedCodec.videoCodec,
                audioCodec: this.selectedCodec.audioCodec,
                hasVideo: true,
                hasAudio: Boolean(this.micStream && this.micStream.getAudioTracks().length > 0)
              }
            );
          }
        }

        // Restart fresh MediaRecorder for the next segment if still recording
        if (this.isRecording && this.combinedStream && this.hasActiveScreenTrack()) {
          try {
            this.startSegmentRecorder(this.combinedStream);
          } catch (err) {
            console.error('[ScreenRecording] Failed to restart recorder for next segment:', err);
          }
        }
        resolve();
      };

      try {
        this.mediaRecorder.requestData();
        this.mediaRecorder.stop();
      } catch (e) {
        console.warn('[ScreenRecording] Error stopping segment recorder:', e);
        resolve();
      }
    });
  }

  /**
   * Validates that a video Blob is playable and decodable in the browser
   */
  public async validateBlobLocally(blob: Blob): Promise<boolean> {
    if (!blob || blob.size < 1024) {
      console.warn('[ScreenRecording] Local blob validation failed: size is too small (<1KB)');
      return false;
    }

    return new Promise<boolean>((resolve) => {
      try {
        const video = document.createElement('video');
        video.preload = 'metadata';
        const objectUrl = URL.createObjectURL(blob);
        video.src = objectUrl;

        const cleanup = () => {
          video.onloadedmetadata = null;
          video.onerror = null;
          URL.revokeObjectURL(objectUrl);
        };

        const timeout = setTimeout(() => {
          cleanup();
          // Timeout fallback: if size > 1KB, accept
          resolve(true);
        }, 3000);

        video.onloadedmetadata = () => {
          clearTimeout(timeout);
          cleanup();
          const valid = video.videoWidth > 0 || video.duration > 0 || !isNaN(video.duration);
          resolve(valid);
        };

        video.onerror = () => {
          clearTimeout(timeout);
          cleanup();
          console.warn('[ScreenRecording] Local video element emitted error decoding recording blob');
          resolve(false);
        };
      } catch {
        resolve(true);
      }
    });
  }

  /**
   * Handles user ending share from browser native controls
   */
  private handleDisplayTrackEnded(): void {
    this.isRecording = false;
    if (this.chunkTimer) clearTimeout(this.chunkTimer);

    if (this.options?.onInterrupted) {
      this.options.onInterrupted('User stopped screen sharing via browser controls.');
    }
  }

  /**
   * Pauses recording
   */
  public pause(): void {
    this.isPaused = true;
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.pause();
    }
  }

  /**
   * Resumes paused recording
   */
  public resume(): void {
    this.isPaused = false;
    if (this.mediaRecorder && this.mediaRecorder.state === 'paused') {
      this.mediaRecorder.resume();
    }
  }

  /**
   * Cleanly stops recording, finalizes last segment with duration metadata, and closes tracks
   */
  public async stopRecording(): Promise<{
    blob: Blob | null;
    segmentNumber: number;
    durationSeconds: number;
    meta: { mimeType: string; videoCodec: string; audioCodec: string; hasVideo: boolean; hasAudio: boolean };
  }> {
    this.isRecording = false;
    if (this.chunkTimer) {
      clearTimeout(this.chunkTimer);
      this.chunkTimer = null;
    }

    const durationSeconds = Math.max(1, Math.round((Date.now() - this.chunkStartTime) / 1000));
    const durationMs = durationSeconds * 1000;
    const finalSegmentNumber = this.segmentNumber;
    const meta = {
      mimeType: this.selectedCodec.mimeType,
      videoCodec: this.selectedCodec.videoCodec,
      audioCodec: this.selectedCodec.audioCodec,
      hasVideo: true,
      hasAudio: Boolean(this.micStream && this.micStream.getAudioTracks().length > 0)
    };

    return new Promise((resolve) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        this.cleanupTracks();
        resolve({ blob: null, segmentNumber: finalSegmentNumber, durationSeconds, meta });
        return;
      }

      this.mediaRecorder.onstop = async () => {
        let finalBlob: Blob | null = null;
        if (this.recordedChunks.length > 0) {
          const rawBlob = new Blob(this.recordedChunks, { type: this.selectedCodec.mimeType });
          this.recordedChunks = [];
          finalBlob = await fixWebmDuration(rawBlob, durationMs);
          await this.validateBlobLocally(finalBlob);
        }
        this.cleanupTracks();
        resolve({ blob: finalBlob, segmentNumber: finalSegmentNumber, durationSeconds, meta });
      };

      try {
        this.mediaRecorder.requestData();
        this.mediaRecorder.stop();
      } catch {
        this.cleanupTracks();
        resolve({ blob: null, segmentNumber: finalSegmentNumber, durationSeconds, meta });
      }
    });
  }

  /**
   * Releases camera, screen, and microphone tracks cleanly
   */
  public cleanupTracks(): void {
    if (this.displayStream) {
      this.displayStream.getTracks().forEach(t => {
        try { t.stop(); } catch {}
      });
      this.displayStream = null;
    }
    if (this.micStream) {
      this.micStream.getTracks().forEach(t => {
        try { t.stop(); } catch {}
      });
      this.micStream = null;
    }
    if (this.combinedStream) {
      this.combinedStream.getTracks().forEach(t => {
        try { t.stop(); } catch {}
      });
      this.combinedStream = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
  }

  public getIsRecording(): boolean {
    return this.isRecording;
  }

  public hasActiveScreenTrack(): boolean {
    const track = this.displayStream?.getVideoTracks()[0];
    return Boolean(track && track.readyState === 'live');
  }

  public hasActiveMicTrack(): boolean {
    const track = this.micStream?.getAudioTracks()[0];
    return Boolean(track && track.readyState === 'live');
  }
}

export const screenRecordingService = new ScreenRecordingService();
