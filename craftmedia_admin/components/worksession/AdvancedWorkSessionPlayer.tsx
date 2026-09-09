import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  SkipBack,
  SkipForward,
  RotateCcw,
  RefreshCw,
  AlertTriangle,
  FileVideo,
  CheckCircle2,
  Layers,
  Sparkles,
  PhoneCall,
  MapPin,
  Coffee,
  CheckSquare,
  FileText
} from 'lucide-react';
import { api } from '@/src/services/api';
import { RecordingSegmentDoc } from '@/craftmedia_backend/database/types';

export interface CrmEventMarker {
  id: string;
  time: string;
  timestamp: string;
  type: string;
  title: string;
  description?: string;
  segmentNumber?: number;
  segmentOffsetSeconds?: number;
}

export interface AdvancedWorkSessionPlayerRef {
  jumpToSegmentTime: (segmentNumber: number, offsetSeconds: number) => void;
}

interface AdvancedWorkSessionPlayerProps {
  workSessionId: string;
  segments: RecordingSegmentDoc[];
  crmMarkers?: CrmEventMarker[];
  initialSegmentNumber?: number;
  onSegmentChange?: (segmentNumber: number) => void;
}

export const AdvancedWorkSessionPlayer = forwardRef<AdvancedWorkSessionPlayerRef, AdvancedWorkSessionPlayerProps>(({
  workSessionId,
  segments,
  crmMarkers = [],
  initialSegmentNumber = 1,
  onSegmentChange
}, ref) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Active Segment State
  const sortedSegments = [...segments].sort((a, b) => a.segmentNumber - b.segmentNumber);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(() => {
    const idx = sortedSegments.findIndex(s => s.segmentNumber === initialSegmentNumber);
    return idx >= 0 ? idx : 0;
  });

  const activeSegment = sortedSegments[currentSegmentIndex] || null;

  // Media Playback State
  const [playerState, setPlayerState] = useState<'LOADING' | 'READY' | 'PLAYING' | 'BUFFERING' | 'FAILED'>('LOADING');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bufferedPercent, setBufferedPercent] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [autoPlayNext, setAutoPlayNext] = useState(true);

  // Jump to specific segment & offset
  useImperativeHandle(ref, () => ({
    jumpToSegmentTime: (targetSegNum: number, offsetSec: number) => {
      const segIdx = sortedSegments.findIndex(s => s.segmentNumber === targetSegNum);
      if (segIdx >= 0) {
        if (segIdx !== currentSegmentIndex) {
          setCurrentSegmentIndex(segIdx);
          setTimeout(() => {
            if (videoRef.current) {
              videoRef.current.currentTime = offsetSec;
              videoRef.current.play().catch(() => {});
            }
          }, 400);
        } else if (videoRef.current) {
          videoRef.current.currentTime = offsetSec;
          videoRef.current.play().catch(() => {});
        }
      }
    }
  }));

  // Format seconds to mm:ss or hh:mm:ss
  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const totalSecs = Math.floor(secs);
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    if (hrs > 0) {
      return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return `${String(mins).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Calculate Cumulative Session Position
  const calculateCumulativePosition = () => {
    let priorSecs = 0;
    for (let i = 0; i < currentSegmentIndex; i++) {
      priorSecs += sortedSegments[i]?.actualMediaDurationSeconds || sortedSegments[i]?.durationSeconds || 0;
    }
    const currentTotal = priorSecs + (currentTime || 0);

    let sessionTotal = 0;
    for (const seg of sortedSegments) {
      sessionTotal += seg.actualMediaDurationSeconds || seg.durationSeconds || 0;
    }

    return {
      currentFormatted: formatTime(currentTotal),
      totalFormatted: formatTime(Math.max(sessionTotal, currentTotal))
    };
  };

  // Load Stream URL for Active Segment
  const loadStreamUrl = () => {
    if (!activeSegment) {
      setStreamUrl(null);
      setPlayerState('FAILED');
      setErrorMessage('No recording segment available for this session.');
      return;
    }

    setPlayerState('LOADING');
    setErrorMessage(null);
    const token = api.getToken();
    const url = `/api/hr/work-sessions/${workSessionId}/recordings/${activeSegment.segmentNumber}/stream?token=${token}`;
    setStreamUrl(url);

    if (onSegmentChange) {
      onSegmentChange(activeSegment.segmentNumber);
    }
  };

  useEffect(() => {
    loadStreamUrl();
  }, [currentSegmentIndex, activeSegment?._id]);

  // Video Element Event Handlers
  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    const vid = videoRef.current;
    const declaredDuration = activeSegment?.actualMediaDurationSeconds || activeSegment?.durationSeconds || 0;
    const mediaDuration = vid.duration && !isNaN(vid.duration) && isFinite(vid.duration) && vid.duration > 0
      ? vid.duration
      : declaredDuration;

    setDuration(mediaDuration);
    setPlayerState('READY');
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const vid = videoRef.current;
    setCurrentTime(vid.currentTime);

    // Calculate buffered percentage
    if (vid.buffered.length > 0 && vid.duration > 0) {
      const bufferedEnd = vid.buffered.end(vid.buffered.length - 1);
      setBufferedPercent((bufferedEnd / vid.duration) * 100);
    }
  };

  const handleVideoEnded = () => {
    setIsPlaying(false);
    // Automatic transition to next segment
    if (autoPlayNext && currentSegmentIndex < sortedSegments.length - 1) {
      setCurrentSegmentIndex(prev => prev + 1);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.play().catch(() => {});
        }
      }, 500);
    }
  };

  const handleVideoError = () => {
    if (!videoRef.current) return;
    const err = videoRef.current.error;
    let desc = 'The recording media could not be decoded or loaded.';

    if (err) {
      switch (err.code) {
        case err.MEDIA_ERR_ABORTED:
          desc = 'Playback was aborted by the browser.';
          break;
        case err.MEDIA_ERR_NETWORK:
          desc = 'Network communication error while streaming chunk.';
          break;
        case err.MEDIA_ERR_DECODE:
          desc = 'Media decode error: Container or codec header error.';
          break;
        case err.MEDIA_ERR_SRC_NOT_SUPPORTED:
          desc = 'MIME type or video format is not supported by your browser.';
          break;
      }
    }

    setPlayerState('FAILED');
    setErrorMessage(desc);
  };

  // Play / Pause Toggle
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(err => {
        console.warn('Play error:', err);
      });
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  // Seek Handler
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const target = parseFloat(e.target.value);
    setCurrentTime(target);
    if (videoRef.current) {
      videoRef.current.currentTime = target;
    }
  };

  // Volume Handler
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    setIsMuted(val === 0);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    videoRef.current.muted = nextMute;
  };

  // Speed Handler
  const handleSpeedChange = (speed: number) => {
    setPlaybackRate(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  // Fullscreen Handler
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const cumulativeTime = calculateCumulativePosition();

  // Filter CRM Markers for active segment
  const segmentMarkers = crmMarkers.filter(
    m => m.segmentNumber === activeSegment?.segmentNumber && (m.segmentOffsetSeconds !== undefined)
  );

  return (
    <div
      ref={containerRef}
      className="bg-slate-950 rounded-3xl border border-slate-800 text-white overflow-hidden shadow-2xl flex flex-col space-y-0"
    >
      {/* Top Header Bar */}
      <div className="p-3 sm:px-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
            <FileVideo className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-slate-200">
              Segment #{activeSegment?.segmentNumber || 1} of {sortedSegments.length || 1}
            </span>
            <span className="text-[10px] text-slate-400 ml-2 font-mono">
              ({activeSegment ? (activeSegment.fileSize / (1024 * 1024)).toFixed(1) : 0} MB &bull; {activeSegment?.videoCodec || 'vp8'}/{activeSegment?.audioCodec || 'none'})
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Cumulative Session Time Badge */}
          <div className="hidden sm:flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/60 font-mono text-[11px] text-emerald-400 font-bold">
            <span className="text-slate-400 font-normal">Session:</span>
            <span>{cumulativeTime.currentFormatted}</span>
            <span className="text-slate-500">/</span>
            <span className="text-slate-400">{cumulativeTime.totalFormatted}</span>
          </div>

          {/* Auto Next Toggle */}
          <button
            type="button"
            onClick={() => setAutoPlayNext(prev => !prev)}
            className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer ${
              autoPlayNext ? 'bg-blue-600/30 text-blue-400 border border-blue-500/40' : 'bg-slate-800 text-slate-400'
            }`}
            title="Auto-play next chunk when finished"
          >
            Auto Next: {autoPlayNext ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      {/* Video Viewport */}
      <div className="relative aspect-video w-full bg-black flex items-center justify-center overflow-hidden group">
        {streamUrl && (
          <video
            ref={videoRef}
            src={streamUrl}
            playsInline
            onLoadedMetadata={handleLoadedMetadata}
            onTimeUpdate={handleTimeUpdate}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={handleVideoEnded}
            onError={handleVideoError}
            onWaiting={() => setPlayerState('BUFFERING')}
            onPlaying={() => setPlayerState('PLAYING')}
            className="w-full h-full object-contain cursor-pointer"
            onClick={togglePlay}
          />
        )}

        {/* Loading Spinner Overlay */}
        {playerState === 'LOADING' && (
          <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center space-y-2 text-slate-400 text-xs">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
            <span>Buffering segment media...</span>
          </div>
        )}

        {/* Buffering Indicator */}
        {playerState === 'BUFFERING' && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center pointer-events-none">
            <div className="p-3 bg-slate-900/90 rounded-2xl border border-slate-700 flex items-center gap-2 text-xs">
              <RefreshCw className="w-4 h-4 animate-spin text-blue-400" />
              <span>Buffering...</span>
            </div>
          </div>
        )}

        {/* Error Fallback State */}
        {playerState === 'FAILED' && (
          <div className="absolute inset-0 bg-slate-950 p-6 flex flex-col items-center justify-center text-center space-y-3">
            <AlertTriangle className="w-10 h-10 text-amber-500" />
            <h4 className="text-sm font-bold text-white">Playback Interrupted</h4>
            <p className="text-xs text-slate-400 max-w-sm">{errorMessage || 'Unable to decode segment stream.'}</p>
            <button
              onClick={loadStreamUrl}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Segment</span>
            </button>
          </div>
        )}

        {/* Play / Pause Center Overlay Button */}
        {playerState !== 'FAILED' && playerState !== 'LOADING' && (
          <button
            onClick={togglePlay}
            className="absolute inset-0 m-auto w-14 h-14 rounded-full bg-slate-900/80 border border-slate-700 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110 active:scale-95 cursor-pointer backdrop-blur-xs shadow-xl"
          >
            {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
          </button>
        )}
      </div>

      {/* Control Strip & Timeline */}
      <div className="p-3 sm:px-4 bg-slate-900/95 space-y-2">
        {/* Scrubber Bar with CRM Markers */}
        <div className="relative w-full flex items-center group/track py-1">
          {/* Buffered Background Bar */}
          <div className="absolute left-0 right-0 h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-slate-700 transition-all duration-200"
              style={{ width: `${bufferedPercent}%` }}
            />
          </div>

          {/* CRM Event Markers on Track */}
          {duration > 0 && segmentMarkers.map(m => {
            const percent = ((m.segmentOffsetSeconds || 0) / duration) * 100;
            return (
              <div
                key={m.id}
                style={{ left: `${Math.min(98, Math.max(2, percent))}%` }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (videoRef.current && m.segmentOffsetSeconds !== undefined) {
                    videoRef.current.currentTime = m.segmentOffsetSeconds;
                    videoRef.current.play().catch(() => {});
                  }
                }}
                className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-amber-400 border border-slate-950 z-20 cursor-pointer hover:scale-150 transition-transform group/marker"
                title={`${m.time} - ${m.title}`}
              >
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 hidden group-hover/marker:flex flex-col items-center bg-slate-900 border border-slate-700 px-2 py-1 rounded-lg text-[10px] whitespace-nowrap shadow-xl z-30 pointer-events-none">
                  <span className="font-bold text-amber-400">{m.time}</span>
                  <span className="text-slate-300">{m.title}</span>
                </div>
              </div>
            );
          })}

          {/* Native Seek Input Slider */}
          <input
            type="range"
            min={0}
            max={duration || 1}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            className="relative w-full h-1.5 appearance-none bg-transparent cursor-pointer z-10 accent-blue-500 focus:outline-none"
          />
        </div>

        {/* Action Controls Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          {/* Left Controls: Play, Segment Nav, Timestamps */}
          <div className="flex items-center gap-2">
            <button
              onClick={togglePlay}
              className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors cursor-pointer"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>

            {/* Prev Segment */}
            <button
              onClick={() => setCurrentSegmentIndex(prev => Math.max(0, prev - 1))}
              disabled={currentSegmentIndex === 0}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 transition-colors"
              title="Previous Segment"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            {/* Next Segment */}
            <button
              onClick={() => setCurrentSegmentIndex(prev => Math.min(sortedSegments.length - 1, prev + 1))}
              disabled={currentSegmentIndex >= sortedSegments.length - 1}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 transition-colors"
              title="Next Segment"
            >
              <SkipForward className="w-4 h-4" />
            </button>

            {/* Timestamp Display */}
            <div className="font-mono text-[11px] text-slate-300 ml-1">
              <span className="font-bold text-white">{formatTime(currentTime)}</span>
              <span className="text-slate-500 mx-1">/</span>
              <span className="text-slate-400">{formatTime(duration)}</span>
            </div>
          </div>

          {/* Right Controls: Volume, Speed, Fullscreen */}
          <div className="flex items-center gap-2.5">
            {/* Volume Control */}
            <div className="flex items-center gap-1.5 group/vol">
              <button onClick={toggleMute} className="text-slate-400 hover:text-white">
                {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-16 h-1 appearance-none bg-slate-700 rounded-full accent-blue-500 cursor-pointer"
              />
            </div>

            {/* Playback Speed Dropdown / Buttons */}
            <div className="flex items-center gap-1 bg-slate-800/80 p-0.5 rounded-lg border border-slate-700/60 text-[10px] font-bold">
              {[0.5, 1, 1.25, 1.5, 2].map(speed => (
                <button
                  key={speed}
                  onClick={() => handleSpeedChange(speed)}
                  className={`px-1.5 py-0.5 rounded transition-colors ${
                    playbackRate === speed ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>

            {/* Fullscreen Toggle */}
            <button
              onClick={toggleFullscreen}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});
