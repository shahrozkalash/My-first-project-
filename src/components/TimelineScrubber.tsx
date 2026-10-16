import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  SkipBack,
  SkipForward,
  Clock,
  Sparkles,
  Sliders,
  CheckCircle2,
  Video,
  Film,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Layers,
  ChevronRight,
  Info,
  Monitor,
} from 'lucide-react';
import { AspectRatio, Scene, VideoResolution } from '../types';
import { getResolutionDimensions } from '../data/constants';
import {
  formatDuration,
  formatTimecode,
  calculateSceneStartTimes,
  adjustSceneBoundary,
  getTotalScenesDuration,
} from '../utils/duration';

interface TimelineScrubberProps {
  scenes: Scene[];
  totalDuration?: number;
  currentSceneIndex: number;
  videoResolution?: VideoResolution;
  aspectRatio?: AspectRatio;
  onSelectSceneIndex: (index: number) => void;
  onUpdateScenes: (updatedScenes: Scene[]) => void;
  onRedistributeEvenly?: () => void;
  currentTime?: number;
  onTimeChange?: (time: number) => void;
  isPlaying?: boolean;
  onTogglePlay?: () => void;
  className?: string;
}

// Preset visual color palettes for alternating scene blocks
const SCENE_THEMES = [
  {
    bg: 'bg-purple-950/40',
    border: 'border-purple-500/40',
    hoverBorder: 'hover:border-purple-400',
    activeRing: 'ring-purple-400',
    accentText: 'text-purple-300',
    badgeBg: 'bg-purple-500/20',
    headerBg: 'bg-purple-900/30',
  },
  {
    bg: 'bg-blue-950/40',
    border: 'border-blue-500/40',
    hoverBorder: 'hover:border-blue-400',
    activeRing: 'ring-blue-400',
    accentText: 'text-blue-300',
    badgeBg: 'bg-blue-500/20',
    headerBg: 'bg-blue-900/30',
  },
  {
    bg: 'bg-emerald-950/40',
    border: 'border-emerald-500/40',
    hoverBorder: 'hover:border-emerald-400',
    activeRing: 'ring-emerald-400',
    accentText: 'text-emerald-300',
    badgeBg: 'bg-emerald-500/20',
    headerBg: 'bg-emerald-900/30',
  },
  {
    bg: 'bg-amber-950/40',
    border: 'border-amber-500/40',
    hoverBorder: 'hover:border-amber-400',
    activeRing: 'ring-amber-400',
    accentText: 'text-amber-300',
    badgeBg: 'bg-amber-500/20',
    headerBg: 'bg-amber-900/30',
  },
  {
    bg: 'bg-rose-950/40',
    border: 'border-rose-500/40',
    hoverBorder: 'hover:border-rose-400',
    activeRing: 'ring-rose-400',
    accentText: 'text-rose-300',
    badgeBg: 'bg-rose-500/20',
    headerBg: 'bg-rose-900/30',
  },
  {
    bg: 'bg-cyan-950/40',
    border: 'border-cyan-500/40',
    hoverBorder: 'hover:border-cyan-400',
    activeRing: 'ring-cyan-400',
    accentText: 'text-cyan-300',
    badgeBg: 'bg-cyan-500/20',
    headerBg: 'bg-cyan-900/30',
  },
];

export const TimelineScrubber: React.FC<TimelineScrubberProps> = ({
  scenes,
  totalDuration: propTotalDuration,
  currentSceneIndex,
  videoResolution = '720p',
  aspectRatio = '16:9',
  onSelectSceneIndex,
  onUpdateScenes,
  onRedistributeEvenly,
  currentTime: externalTime,
  onTimeChange,
  isPlaying: externalIsPlaying,
  onTogglePlay,
  className = '',
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Internal playback state if not controlled externally
  const [internalTime, setInternalTime] = useState<number>(0);
  const [internalPlaying, setInternalPlaying] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<1 | 1.5 | 2>(1);

  // Active drag state
  const [isDraggingBoundary, setIsDraggingBoundary] = useState<number | null>(null);
  const [dragLiveTime, setDragLiveTime] = useState<number | null>(null);
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState<boolean>(false);
  const [hoveredBoundary, setHoveredBoundary] = useState<number | null>(null);

  const currentTime = externalTime !== undefined ? externalTime : internalTime;
  const isPlaying = externalIsPlaying !== undefined ? externalIsPlaying : internalPlaying;

  const actualTotalDuration = useMemo(() => {
    const sum = getTotalScenesDuration(scenes);
    return sum > 0 ? sum : Number(propTotalDuration) || 60;
  }, [scenes, propTotalDuration]);

  const sceneStartTimes = useMemo(() => {
    return calculateSceneStartTimes(scenes);
  }, [scenes]);

  // Sync internal playback timer
  useEffect(() => {
    if (!isPlaying) return;

    const intervalMs = 60;
    const stepSeconds = intervalMs / 1000;

    const timer = setInterval(() => {
      const nextTime = currentTime + stepSeconds;
      if (nextTime >= actualTotalDuration) {
        if (onTimeChange) onTimeChange(0);
        else setInternalTime(0);
        if (onTogglePlay) onTogglePlay();
        else setInternalPlaying(false);
      } else {
        if (onTimeChange) onTimeChange(nextTime);
        else setInternalTime(nextTime);

        // Check if crossed scene boundary
        let accumulated = 0;
        for (let i = 0; i < scenes.length; i++) {
          const dur = Number(scenes[i].duration) || 1;
          if (nextTime >= accumulated && nextTime < accumulated + dur) {
            if (currentSceneIndex !== i) {
              onSelectSceneIndex(i);
            }
            break;
          }
          accumulated += dur;
        }
      }
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isPlaying, currentTime, actualTotalDuration, scenes, currentSceneIndex, onSelectSceneIndex, onTimeChange, onTogglePlay]);

  // Jump playhead and select scene
  const handleSeek = useCallback(
    (targetSeconds: number) => {
      const clamped = Math.max(0, Math.min(actualTotalDuration, targetSeconds));
      if (onTimeChange) onTimeChange(clamped);
      else setInternalTime(clamped);

      // Find matching scene
      let acc = 0;
      for (let i = 0; i < scenes.length; i++) {
        const dur = Number(scenes[i].duration) || 1;
        if (clamped >= acc && (clamped < acc + dur || i === scenes.length - 1)) {
          onSelectSceneIndex(i);
          break;
        }
        acc += dur;
      }
    },
    [actualTotalDuration, scenes, onSelectSceneIndex, onTimeChange]
  );

  // Play / Pause toggle
  const handlePlayToggle = () => {
    if (onTogglePlay) {
      onTogglePlay();
    } else {
      setInternalPlaying((prev) => !prev);
    }
  };

  // Rewind
  const handleRewind = () => {
    handleSeek(0);
    onSelectSceneIndex(0);
  };

  // Step Previous Scene
  const handlePrevScene = () => {
    const prevIdx = Math.max(0, currentSceneIndex - 1);
    onSelectSceneIndex(prevIdx);
    const prevStart = sceneStartTimes[prevIdx] || 0;
    handleSeek(prevStart);
  };

  // Step Next Scene
  const handleNextScene = () => {
    const nextIdx = Math.min(scenes.length - 1, currentSceneIndex + 1);
    onSelectSceneIndex(nextIdx);
    const nextStart = sceneStartTimes[nextIdx] || 0;
    handleSeek(nextStart);
  };

  // Helper to get time from clientX coordinates relative to track
  const getTimeFromPointer = useCallback(
    (clientX: number): number => {
      if (!trackRef.current) return 0;
      const rect = trackRef.current.getBoundingClientRect();
      const clickX = Math.max(0, Math.min(rect.width, clientX - rect.left));
      const ratio = rect.width > 0 ? clickX / rect.width : 0;
      return ratio * actualTotalDuration;
    },
    [actualTotalDuration]
  );

  // Handle click on timeline track or ruler to scrub playhead
  const handleTrackPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // If clicking on boundary handle, ignore track scrub
    if ((e.target as HTMLElement).closest('[data-drag-handle="true"]')) {
      return;
    }
    const time = getTimeFromPointer(e.clientX);
    handleSeek(time);
    setIsDraggingPlayhead(true);
  };

  // Dragging Boundary between scene[i] and scene[i+1]
  const startDraggingBoundary = (boundaryIndex: number, e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsDraggingBoundary(boundaryIndex);
    const initialBoundaryTime = (sceneStartTimes[boundaryIndex] || 0) + (Number(scenes[boundaryIndex]?.duration) || 1);
    setDragLiveTime(initialBoundaryTime);
  };

  // Global mouse / pointer listener for active drags
  useEffect(() => {
    if (isDraggingBoundary === null && !isDraggingPlayhead) return;

    const handlePointerMove = (e: PointerEvent) => {
      const rawTime = getTimeFromPointer(e.clientX);

      if (isDraggingBoundary !== null) {
        const leftStart = sceneStartTimes[isDraggingBoundary] || 0;
        const rightEnd =
          sceneStartTimes[isDraggingBoundary + 2] !== undefined
            ? sceneStartTimes[isDraggingBoundary + 2]
            : leftStart +
              (Number(scenes[isDraggingBoundary]?.duration) || 1) +
              (Number(scenes[isDraggingBoundary + 1]?.duration) || 1);

        const minT = leftStart + 1;
        const maxT = rightEnd - 1;
        const clampedT = Math.max(minT, Math.min(maxT, Math.round(rawTime)));

        setDragLiveTime(clampedT);

        // Live adjust scenes
        const updated = adjustSceneBoundary(scenes, isDraggingBoundary, clampedT, 1);
        onUpdateScenes(updated);
      } else if (isDraggingPlayhead) {
        handleSeek(rawTime);
      }
    };

    const handlePointerUp = () => {
      setIsDraggingBoundary(null);
      setDragLiveTime(null);
      setIsDraggingPlayhead(false);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [
    isDraggingBoundary,
    isDraggingPlayhead,
    getTimeFromPointer,
    sceneStartTimes,
    scenes,
    onUpdateScenes,
    handleSeek,
  ]);

  // Generate tick marks for the ruler
  const ticks = useMemo(() => {
    const list: { time: number; percent: number; isMajor: boolean; label?: string }[] = [];
    if (actualTotalDuration <= 0) return list;

    // Major tick interval
    let majorInterval = 10;
    let minorInterval = 2;

    if (actualTotalDuration <= 30) {
      majorInterval = 5;
      minorInterval = 1;
    } else if (actualTotalDuration <= 60) {
      majorInterval = 10;
      minorInterval = 2;
    } else if (actualTotalDuration <= 180) {
      majorInterval = 30;
      minorInterval = 10;
    } else if (actualTotalDuration <= 600) {
      majorInterval = 60;
      minorInterval = 15;
    } else {
      majorInterval = 120;
      minorInterval = 30;
    }

    // Generate ticks
    for (let t = 0; t <= actualTotalDuration; t += minorInterval) {
      const isMajor = t % majorInterval === 0 || t === actualTotalDuration;
      list.push({
        time: t,
        percent: (t / actualTotalDuration) * 100,
        isMajor,
        label: isMajor ? formatTimecode(t) : undefined,
      });
    }

    return list;
  }, [actualTotalDuration]);

  if (!scenes || scenes.length === 0) {
    return null;
  }

  const playheadPercent = Math.max(0, Math.min(100, (currentTime / actualTotalDuration) * 100));

  return (
    <div
      ref={containerRef}
      className={`bg-zinc-950/90 border border-zinc-800/90 rounded-2xl p-4 sm:p-5 shadow-2xl backdrop-blur-md space-y-3.5 transition-all select-none ${className}`}
    >
      {/* Top Header: Title, Playhead Readout & Action Controls */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {/* Left: Component Title & Status */}
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30 text-purple-300">
            <Sliders className="w-4 h-4 text-purple-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-bold text-white tracking-wide uppercase font-display flex items-center gap-1.5">
                Timeline Scrubber & Shot Boundaries
              </h3>
              <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/30 rounded font-mono">
                {scenes.length} {scenes.length === 1 ? 'Shot' : 'Shots'}
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 hidden sm:block">
              Drag scene boundary handles to adjust durations dynamically · Total runtime is strictly preserved
            </p>
          </div>
        </div>

        {/* Right: Quick Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          {/* Even Distribution Button */}
          {scenes.length > 1 && onRedistributeEvenly && (
            <button
              type="button"
              onClick={onRedistributeEvenly}
              className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 px-2.5 py-1 rounded-lg transition-all active:scale-95"
              title="Evenly balance runtime across all shots"
            >
              <Sparkles className="w-3 h-3 text-purple-400" />
              <span>Even Split</span>
            </button>
          )}

          {/* Zoom Level Selector */}
          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5 text-[10px]">
            <button
              type="button"
              onClick={() => setZoomLevel(1)}
              className={`px-2 py-0.5 rounded font-medium transition-all ${
                zoomLevel === 1 ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-white'
              }`}
              title="Fit to width (1x)"
            >
              1x
            </button>
            <button
              type="button"
              onClick={() => setZoomLevel(1.5)}
              className={`px-2 py-0.5 rounded font-medium transition-all ${
                zoomLevel === 1.5 ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-white'
              }`}
              title="Zoom in 1.5x"
            >
              1.5x
            </button>
            <button
              type="button"
              onClick={() => setZoomLevel(2)}
              className={`px-2 py-0.5 rounded font-medium transition-all ${
                zoomLevel === 2 ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-white'
              }`}
              title="Zoom in 2x (Horizontal scroll for detailed timing)"
            >
              2x
            </button>
          </div>

          {/* Video Output Quality Badge */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900/90 border border-zinc-800 font-mono text-[11px]"
            title={`Active Video Quality: ${videoResolution} (${getResolutionDimensions(videoResolution, aspectRatio).display})`}
          >
            <Monitor className="w-3 h-3 text-blue-400" />
            <span className="font-bold text-blue-300">
              {videoResolution}
            </span>
            <span className="text-zinc-500 hidden sm:inline font-normal">
              ({getResolutionDimensions(videoResolution, aspectRatio).display})
            </span>
          </div>

          {/* Total Duration Readout */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900/90 border border-zinc-800 font-mono text-[11px]">
            <Clock className="w-3 h-3 text-purple-400" />
            <span className="text-zinc-400">Total:</span>
            <span className="font-bold text-purple-300">
              {formatDuration(actualTotalDuration)} ({actualTotalDuration}s)
            </span>
          </div>
        </div>
      </div>

      {/* Playback & Navigation Toolbar */}
      <div className="flex items-center justify-between gap-2 p-2 bg-zinc-900/70 border border-zinc-800/80 rounded-xl flex-wrap">
        {/* Playback Transport Buttons */}
        <div className="flex items-center gap-1">
          {/* Rewind */}
          <button
            type="button"
            onClick={handleRewind}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            title="Rewind to start (00:00)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Previous Shot */}
          <button
            type="button"
            disabled={currentSceneIndex <= 0}
            onClick={handlePrevScene}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            title="Jump to previous shot"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>

          {/* Play / Pause Toggle */}
          <button
            type="button"
            onClick={handlePlayToggle}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all shadow-md active:scale-95 ${
              isPlaying
                ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/30'
                : 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-600/30'
            }`}
            title={isPlaying ? 'Pause timeline playback' : 'Play timeline across scenes'}
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Scrub Play</span>
              </>
            )}
          </button>

          {/* Next Shot */}
          <button
            type="button"
            disabled={currentSceneIndex >= scenes.length - 1}
            onClick={handleNextScene}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            title="Jump to next shot"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Current Timecode Display & Active Scene Marker */}
        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="text-zinc-400">Playhead:</span>
            <span className="font-bold text-white bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800 text-[11px]">
              {formatTimecode(currentTime)}
            </span>
            <span className="text-zinc-600">/</span>
            <span className="text-zinc-400 text-[11px]">{formatTimecode(actualTotalDuration)}</span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-zinc-400 text-[11px]">
            <span className="text-zinc-600">·</span>
            <span>Active:</span>
            <span className="text-purple-300 font-medium">
              Shot {currentSceneIndex + 1} ({scenes[currentSceneIndex]?.duration || 1}s)
            </span>
          </div>
        </div>
      </div>

      {/* Main Interactive Timeline Container (supports horizontal scroll if zoomLevel > 1) */}
      <div className="overflow-x-auto pb-1 scrollbar-thin">
        <div
          ref={trackRef}
          onPointerDown={handleTrackPointerDown}
          style={{ width: `${zoomLevel * 100}%`, minWidth: '100%' }}
          className="relative cursor-pointer select-none pt-2"
        >
          {/* 1. Time Ruler Bar with Tick Marks & Cut Flags */}
          <div className="relative h-7 bg-zinc-900/90 rounded-t-xl border border-zinc-800/90 border-b-0 overflow-hidden">
            {/* Tick lines */}
            {ticks.map((tick, idx) => (
              <div
                key={`tick-${idx}`}
                className="absolute top-0 bottom-0 pointer-events-none flex flex-col justify-end"
                style={{ left: `${tick.percent}%` }}
              >
                {tick.isMajor ? (
                  <div className="flex flex-col items-center -translate-x-1/2">
                    <span className="text-[9px] font-mono text-zinc-400 leading-none mb-1 select-none font-semibold">
                      {tick.label}
                    </span>
                    <div className="w-[1.5px] h-2.5 bg-zinc-500" />
                  </div>
                ) : (
                  <div className="w-[1px] h-1.5 bg-zinc-700 -translate-x-1/2 mb-0" />
                )}
              </div>
            ))}

            {/* Cut markers (diamonds on the ruler indicating where shots cut) */}
            {sceneStartTimes.map((startTime, sIdx) => {
              if (sIdx === 0) return null;
              const percent = (startTime / actualTotalDuration) * 100;
              return (
                <div
                  key={`cut-${sIdx}`}
                  className="absolute top-1 -translate-x-1/2 flex flex-col items-center pointer-events-none z-10"
                  style={{ left: `${percent}%` }}
                >
                  <div className="w-2 h-2 rotate-45 bg-purple-400 border border-purple-200 shadow-sm shadow-purple-500/50" />
                </div>
              );
            })}
          </div>

          {/* 2. Scene Blocks Track with Dynamic Widths */}
          <div className="relative h-16 sm:h-20 flex bg-zinc-950 rounded-b-xl border border-zinc-800/90 border-t-0 shadow-inner overflow-hidden">
            {scenes.map((scene, idx) => {
              const dur = Math.max(1, Number(scene.duration) || 1);
              const widthPercent = (dur / actualTotalDuration) * 100;
              const isSelected = currentSceneIndex === idx;
              const theme = SCENE_THEMES[idx % SCENE_THEMES.length];
              const startTime = sceneStartTimes[idx] || 0;
              const endTime = startTime + dur;

              return (
                <div
                  key={scene.id || `scene-${idx}`}
                  style={{ width: `${widthPercent}%` }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectSceneIndex(idx);
                    handleSeek(startTime);
                  }}
                  className={`relative group h-full transition-all flex flex-col justify-between p-1.5 sm:p-2 border-r border-zinc-800/60 overflow-hidden cursor-pointer ${
                    theme.bg
                  } ${
                    isSelected
                      ? `ring-2 ${theme.activeRing} z-10 shadow-lg shadow-purple-500/20`
                      : 'hover:brightness-110'
                  }`}
                  title={`Shot ${idx + 1}: ${scene.title || 'Untitled'} (${formatTimecode(startTime)} - ${formatTimecode(endTime)} · ${dur}s)`}
                >
                  {/* Subtle top color strip */}
                  <div className={`absolute top-0 left-0 right-0 h-1 ${theme.headerBg}`} />

                  {/* Header: Shot Number & Duration Pill */}
                  <div className="flex items-center justify-between gap-1 relative z-0">
                    <span
                      className={`text-[10px] sm:text-xs font-bold font-display uppercase tracking-wider flex items-center gap-1 ${
                        isSelected ? 'text-white' : theme.accentText
                      }`}
                    >
                      <span>#{idx + 1}</span>
                      {scene.videoUrl && (
                        <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                      )}
                      {scene.status === 'generating' && (
                        <div className="w-2.5 h-2.5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin shrink-0" />
                      )}
                    </span>

                    <span className="text-[9px] sm:text-[10px] font-mono px-1.5 py-0.2 rounded font-semibold bg-zinc-900/90 text-zinc-300 border border-zinc-700/60 shrink-0">
                      {dur}s
                    </span>
                  </div>

                  {/* Center: Title / Action Summary */}
                  <div className="text-[10px] sm:text-[11px] text-zinc-200 truncate font-medium relative z-0">
                    {scene.title || scene.actionSummary || `Scene ${idx + 1}`}
                  </div>

                  {/* Bottom: Time range */}
                  <div className="flex items-center justify-between text-[9px] font-mono text-zinc-400 relative z-0">
                    <span className="truncate">
                      {formatTimecode(startTime)} - {formatTimecode(endTime)}
                    </span>
                    <span className="hidden sm:inline text-zinc-500 text-[8px] uppercase">
                      {scene.cameraMovement?.split(' ')[0] || ''}
                    </span>
                  </div>

                  {/* Hover Quick Cue Indicator */}
                  {isSelected && (
                    <div className="absolute inset-0 border-2 border-purple-400/80 rounded pointer-events-none" />
                  )}
                </div>
              );
            })}

            {/* 3. Draggable Scene Boundary Handles */}
            {scenes.map((_, bIdx) => {
              if (bIdx >= scenes.length - 1) return null;
              const boundaryTime = (sceneStartTimes[bIdx] || 0) + (Number(scenes[bIdx]?.duration) || 1);
              const boundaryPercent = (boundaryTime / actualTotalDuration) * 100;
              const isCurrentlyDragged = isDraggingBoundary === bIdx;
              const isHovered = hoveredBoundary === bIdx;

              const leftScene = scenes[bIdx];
              const rightScene = scenes[bIdx + 1];

              return (
                <div
                  key={`boundary-${bIdx}`}
                  data-drag-handle="true"
                  style={{ left: `${boundaryPercent}%` }}
                  onPointerDown={(e) => startDraggingBoundary(bIdx, e)}
                  onMouseEnter={() => setHoveredBoundary(bIdx)}
                  onMouseLeave={() => setHoveredBoundary(null)}
                  className="absolute top-0 bottom-0 -translate-x-1/2 w-6 flex items-center justify-center cursor-col-resize z-20 group"
                  title="Drag left or right to adjust shot duration"
                >
                  {/* Vertical visible divider bar */}
                  <div
                    className={`w-1 h-full transition-all ${
                      isCurrentlyDragged
                        ? 'bg-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.8)] scale-x-150'
                        : isHovered
                        ? 'bg-purple-400 shadow-sm'
                        : 'bg-zinc-700/80 group-hover:bg-purple-400/90'
                    }`}
                  />

                  {/* Center grab pill handle */}
                  <div
                    className={`absolute top-1/2 -translate-y-1/2 w-4 h-8 rounded-full border flex flex-col items-center justify-center gap-0.5 shadow-lg transition-transform ${
                      isCurrentlyDragged
                        ? 'bg-purple-500 border-white scale-110 shadow-purple-500/50'
                        : isHovered
                        ? 'bg-purple-600 border-purple-300 scale-105'
                        : 'bg-zinc-800 border-zinc-600 group-hover:bg-purple-600 group-hover:border-purple-300'
                    }`}
                  >
                    <div className="w-1.5 h-0.5 bg-white/80 rounded-full" />
                    <div className="w-1.5 h-0.5 bg-white/80 rounded-full" />
                    <div className="w-1.5 h-0.5 bg-white/80 rounded-full" />
                  </div>

                  {/* Live floating tooltip when dragging or hovering */}
                  {(isCurrentlyDragged || isHovered) && (
                    <div className="absolute -top-12 z-30 pointer-events-none flex flex-col items-center animate-in fade-in zoom-in-95">
                      <div className="bg-zinc-900 border border-purple-500/60 shadow-xl shadow-purple-950/80 text-white px-2.5 py-1 rounded-lg text-[10px] font-mono whitespace-nowrap flex items-center gap-2">
                        <span className="font-bold text-purple-300">
                          Cut at {formatTimecode(dragLiveTime !== null && isCurrentlyDragged ? dragLiveTime : boundaryTime)}
                        </span>
                        <span className="text-zinc-500">|</span>
                        <span>
                          #{bIdx + 1}: <strong className="text-white">{leftScene?.duration || 1}s</strong>
                        </span>
                        <span className="text-zinc-600">⇄</span>
                        <span>
                          #{bIdx + 2}: <strong className="text-white">{rightScene?.duration || 1}s</strong>
                        </span>
                      </div>
                      <div className="w-2 h-2 rotate-45 bg-zinc-900 border-r border-b border-purple-500/60 -mt-1" />
                    </div>
                  )}
                </div>
              );
            })}

            {/* 4. Playhead Scrubber Needle */}
            <div
              style={{ left: `${playheadPercent}%` }}
              className="absolute top-0 bottom-0 -translate-x-1/2 pointer-events-none z-30 flex flex-col items-center"
            >
              {/* Top diamond marker */}
              <div className="w-3.5 h-3.5 -mt-1.5 rotate-45 bg-purple-500 border-2 border-white shadow-md shadow-purple-500/80" />

              {/* Glowing vertical line */}
              <div className="w-[2px] flex-1 bg-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.9)]" />

              {/* Bottom marker */}
              <div className="w-2 h-2 -mb-1 rotate-45 bg-purple-500 border border-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Context Legend & Guidance */}
      <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1 flex-wrap gap-2 border-t border-zinc-900">
        <div className="flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
          <span>
            Click anywhere along the ruler or track to scrub playhead. Drag divider handles to expand or compress individual shots.
          </span>
        </div>

        <div className="flex items-center gap-3 text-[10px] font-mono text-zinc-500">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded bg-purple-500" />
            <span>Playhead</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-3 bg-zinc-600 rounded-sm" />
            <span>Boundary Handle</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rotate-45 bg-purple-400" />
            <span>Shot Cut</span>
          </div>
        </div>
      </div>
    </div>
  );
};
