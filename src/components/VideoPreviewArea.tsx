import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Film,
  Camera,
  SunMedium,
  Download,
  AlertCircle,
  Code2,
  CheckCircle2,
  Sparkles,
  Upload,
  Cpu,
  RefreshCw,
  Server,
  Zap,
  Info,
} from 'lucide-react';
import { AspectRatio, Project, Scene, VideoEngineHealth, VideoEngineJobStatus, VideoResolution } from '../types';
import { localHelperClient } from '../utils/localHelperClient';
import { storyMotionAudioEngine } from '../utils/audioEngine';
import { getResolutionDimensions } from '../data/constants';
import {
  downloadFile,
  exportVeoBatchPrompts,
  generateVeoApiPayload,
  generateWanApiPayload,
} from '../utils/storage';
import { formatDuration, formatTimecode } from '../utils/duration';

interface VideoPreviewAreaProps {
  project: Project;
  currentSceneIndex: number;
  onSelectSceneIndex: (index: number) => void;
  onOpenVeoModal: () => void;
  onSceneVideoReady?: (sceneId: string, videoUrl: string) => void;
  onNavigateToLocalEngine?: () => void;
}

export const VideoPreviewArea: React.FC<VideoPreviewAreaProps> = ({
  project,
  currentSceneIndex,
  onSelectSceneIndex,
  onOpenVeoModal,
  onSceneVideoReady,
  onNavigateToLocalEngine,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [showPayloadModal, setShowPayloadModal] = useState(false);
  const [payloadType, setPayloadType] = useState<'wan' | 'veo'>('wan');
  const [testVideoUrl, setTestVideoUrl] = useState<string | null>(null);

  // Engine state
  const [engineHealth, setEngineHealth] = useState<VideoEngineHealth | null>(null);
  const [isCheckingEngine, setIsCheckingEngine] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStatusText, setGenerationStatusText] = useState('');
  const [engineError, setEngineError] = useState<string | null>(null);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  const [payloadCopied, setPayloadCopied] = useState(false);

  const scenes = project.scenes;
  const activeScene = scenes[currentSceneIndex] || scenes[0] || null;
  const totalDuration = scenes.length > 0
    ? scenes.reduce((acc, s) => acc + (Number(s.duration) || 0), 0)
    : (Number(project.totalDuration) || 60);

  // Active scene video URL
  const activeVideoUrl = activeScene?.videoUrl || testVideoUrl;

  // Fetch engine health
  const checkEngineStatus = async () => {
    setIsCheckingEngine(true);
    try {
      const diag = await localHelperClient.probeHealth();
      if (diag.isOnline && diag.health) {
        setEngineHealth(diag.health);
      } else {
        setEngineHealth({
          configured: false,
          reachable: false,
          engineType: 'wan',
          engineUrlDisplay: diag.url || 'http://127.0.0.1:8000',
          model: 'wan-2.1-t2v-1.4b',
          supportedModels: ['wan-2.1-t2v-1.4b', 'wan-2.1-t2v-14b'],
          supportedResolutions: ['720p', '480p'],
          supportedAspectRatios: ['16:9', '9:16'],
          message: diag.errorMessage || 'Could not contact local Windows Helper. Ensure start.bat is running on your PC.',
          lastChecked: new Date().toISOString(),
          zeroCostGuaranteed: true,
        });
      }
    } catch (e: any) {
      setEngineHealth({
        configured: false,
        reachable: false,
        engineType: 'wan',
        engineUrlDisplay: 'Failed to contact backend',
        model: 'wan-2.1-t2v-1.4b',
        supportedModels: ['wan-2.1-t2v-1.4b', 'wan-2.1-t2v-14b'],
        supportedResolutions: ['720p', '480p'],
        supportedAspectRatios: ['16:9', '9:16'],
        message: 'Could not contact backend video engine service.',
        lastChecked: new Date().toISOString(),
        zeroCostGuaranteed: true,
      });
    } finally {
      setIsCheckingEngine(false);
    }
  };

  useEffect(() => {
    checkEngineStatus();
  }, []);

  // Poll job status if activeJobId exists
  useEffect(() => {
    let interval: any;
    if (activeJobId && isGenerating) {
      interval = setInterval(async () => {
        try {
          const job = await localHelperClient.getJobStatus(activeJobId);
          if (job) {
            setGenerationProgress(job.progress || 0);
            const finishedVideo = job.videoUrl || (job as any).video_url;
            if (job.status === 'completed' && finishedVideo) {
              setIsGenerating(false);
              setActiveJobId(null);
              setGenerationStatusText('Generation completed on local GPU!');
              if (onSceneVideoReady && activeScene) {
                onSceneVideoReady(activeScene.id, finishedVideo);
              }
            } else if (job.status === 'failed') {
              setIsGenerating(false);
              setActiveJobId(null);
              setEngineError(job.error || 'Wan generation job failed on inference server.');
            }
          }
        } catch (e: any) {
          console.error('Job polling error:', e);
        }
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [activeJobId, isGenerating, activeScene, onSceneVideoReady]);

  // Storyboard playback simulation
  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTime((prev) => {
          const next = prev + 0.1;
          if (next >= totalDuration) {
            setIsPlaying(false);
            return 0;
          }
          let accumulated = 0;
          for (let i = 0; i < scenes.length; i++) {
            accumulated += scenes[i].duration;
            if (next <= accumulated) {
              if (i !== currentSceneIndex) {
                onSelectSceneIndex(i);
              }
              break;
            }
          }
          return next;
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying, totalDuration, scenes, currentSceneIndex, onSelectSceneIndex]);

  const handlePlayToggle = () => {
    if (currentTime >= totalDuration) {
      setCurrentTime(0);
    }
    const nextPlaying = !isPlaying;
    setIsPlaying(nextPlaying);
    if (nextPlaying) {
      const mood = activeScene?.sceneMusicMood || project.audioSettings?.globalMusicMood || 'adventure';
      if (mood !== 'none') {
        storyMotionAudioEngine.playMusicLoop(mood, activeScene?.dialogueLines || [], 0.35);
      }
    } else {
      storyMotionAudioEngine.stopAll();
    }
  };

  const handleReset = () => {
    setIsPlaying(false);
    storyMotionAudioEngine.stopAll();
    setCurrentTime(0);
    onSelectSceneIndex(0);
  };

  // Submit active scene to Wan Video Engine
  const handleGenerateWithWan = async () => {
    if (!activeScene) return;

    setEngineError(null);
    setIsGenerating(true);
    setGenerationProgress(5);
    setGenerationStatusText('Submitting prompt to Wan video engine...');

    try {
      const targetRes = project.videoResolution || '720p';
      const dims = getResolutionDimensions(targetRes, project.aspectRatio);
      const payload = {
        sceneId: activeScene.id,
        sceneNumber: activeScene.sceneNumber,
        prompt: activeScene.visualPrompt,
        aspectRatio: project.aspectRatio,
        aspect_ratio: project.aspectRatio,
        duration: activeScene.duration,
        duration_seconds: activeScene.duration,
        target_resolution: targetRes,
        resolution: `${dims.width}x${dims.height}`,
        characterConsistencyTags: project.characters.map((c) => c.name),
        cameraMovement: activeScene.cameraMovement,
        lighting: activeScene.lighting,
      };

      const data = await localHelperClient.submitJob(payload);

      if (!data || (!data.success && !data.jobId && !data.job_id)) {
        setIsGenerating(false);
        setGenerationProgress(0);
        setEngineError(
          data?.message || data?.error || 'Wan Video Engine is not connected or inference server is unreachable.'
        );
        return;
      }

      const jobId = data.jobId || data.job_id;
      if (jobId) {
        setActiveJobId(jobId);
        setGenerationProgress(15);
        setGenerationStatusText(`Job queued (${jobId.slice(0, 8)}...). Initializing Wan diffusion latents...`);
      }
    } catch (err: any) {
      setIsGenerating(false);
      setGenerationProgress(0);
      setEngineError(`Network error communicating with video engine: ${err.message}`);
    }
  };

  // Video download handler
  const handleDownloadVideo = () => {
    if (activeVideoUrl) {
      const a = document.createElement('a');
      a.href = activeVideoUrl;
      a.download = `${project.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-scene-${activeScene?.sceneNumber || 1}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  // Handle optional test video upload
  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setTestVideoUrl(url);
      if (onSceneVideoReady && activeScene) {
        onSceneVideoReady(activeScene.id, url);
      }
    }
  };

  // Style lighting atmospheric overlay class
  const getLightingOverlayClass = (lighting: string = '') => {
    const lower = lighting.toLowerCase();
    if (lower.includes('golden')) return 'bg-gradient-to-tr from-amber-950/40 via-yellow-900/10 to-transparent';
    if (lower.includes('cyberpunk') || lower.includes('neon')) return 'bg-gradient-to-tr from-purple-950/50 via-cyan-950/30 to-blue-900/20';
    if (lower.includes('noir') || lower.includes('chiaroscuro')) return 'bg-gradient-to-t from-black/80 via-zinc-950/40 to-transparent';
    if (lower.includes('bioluminescence')) return 'bg-gradient-to-tr from-emerald-950/40 via-teal-950/20 to-transparent';
    return 'bg-gradient-to-t from-black/60 via-transparent to-black/30';
  };

  return (
    <div className="bg-zinc-950/80 border border-zinc-800/90 rounded-2xl p-4 sm:p-6 shadow-xl backdrop-blur-sm space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400">
            <Film className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide uppercase font-display flex items-center gap-2 flex-wrap">
              <span>Cinematic Viewport & Video Engine</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
                {project.aspectRatio === '16:9' ? '16:9 Landscape' : '9:16 Portrait'}
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-900/60 text-purple-300 border border-purple-500/40 font-mono">
                {formatDuration(totalDuration)} ({totalDuration}s)
              </span>
            </h3>
            <p className="text-xs text-zinc-400">
              Open-Source Wan 2.1 Video Engine integration & realtime shot simulator
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setPayloadType('wan');
              setShowPayloadModal(true);
            }}
            className="flex items-center gap-1.5 text-xs text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 px-2.5 py-1.5 rounded-xl transition-colors"
            title="Inspect Wan inference request payload"
          >
            <Code2 className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">Engine Payload</span>
          </button>

          <button
            onClick={handleGenerateWithWan}
            disabled={isGenerating}
            className={`flex items-center gap-1.5 text-xs font-semibold text-white px-3.5 py-1.5 rounded-xl transition-all shadow-md active:scale-95 ${
              isGenerating
                ? 'bg-zinc-800 cursor-not-allowed border border-zinc-700'
                : 'bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 shadow-purple-600/30'
            }`}
          >
            {isGenerating ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-purple-300 border-t-transparent rounded-full animate-spin" />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5 text-purple-200" />
                <span>Render Scene with Wan</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Engine Status Notification Strip */}
      <div className="p-3 bg-zinc-900/80 border border-zinc-800 rounded-xl flex items-center justify-between gap-2.5 text-xs flex-wrap">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-2.5 h-2.5 rounded-full ${
              engineHealth?.reachable
                ? 'bg-emerald-400 animate-pulse'
                : engineHealth?.configured
                ? 'bg-amber-400'
                : 'bg-zinc-600'
            }`}
          />
          <div>
            <span className="font-semibold text-white">Engine: </span>
            <span className="text-purple-300 font-mono">
              Wan 2.1 ({engineHealth?.model || 'wan-2.1-t2v-1.4b'})
            </span>
            <span className="text-zinc-500 mx-1.5">|</span>
            <span className="text-zinc-400">
              {engineHealth?.reachable
                ? 'Inference Server Online'
                : engineHealth?.configured
                ? 'Server Unreachable (Offline)'
                : 'Wan engine not configured (Optional during development)'}
            </span>
          </div>
        </div>

        <button
          onClick={checkEngineStatus}
          disabled={isCheckingEngine}
          className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-200 bg-zinc-800 px-2.5 py-1 rounded-lg"
          title="Refresh video engine status"
        >
          <RefreshCw className={`w-3 h-3 ${isCheckingEngine ? 'animate-spin' : ''}`} />
          <span>Check Status</span>
        </button>
      </div>

      {/* Generation Progress Bar (if generating) */}
      {isGenerating && (
        <div className="p-3.5 bg-purple-950/30 border border-purple-500/40 rounded-xl space-y-2 animate-in fade-in">
          <div className="flex items-center justify-between text-xs">
            <span className="text-purple-300 font-semibold flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-purple-400 animate-pulse" />
              <span>{generationStatusText || 'Wan 2.1 Neural Video Synthesis...'}</span>
            </span>
            <span className="text-purple-300 font-mono font-bold">{generationProgress}%</span>
          </div>
          <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden border border-purple-900/50">
            <div
              className="h-full bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-500 transition-all duration-300"
              style={{ width: `${generationProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Engine Status / Notice Strip */}
      {engineError && (
        <div
          className={`p-3.5 rounded-xl flex items-start gap-2.5 text-xs animate-in fade-in ${
            engineError.toLowerCase().includes('not configured')
              ? 'bg-zinc-900/90 border border-purple-500/30 text-zinc-200'
              : 'bg-red-950/40 border border-red-500/40 text-red-300'
          }`}
        >
          <Info
            className={`w-4 h-4 shrink-0 mt-0.5 ${
              engineError.toLowerCase().includes('not configured')
                ? 'text-purple-400'
                : 'text-red-400'
            }`}
          />
          <div className="space-y-1.5 flex-1">
            <p className="font-semibold text-white">
              {engineError.toLowerCase().includes('not configured')
                ? 'Wan Engine Status: Standalone Mode'
                : 'Video Engine Notice'}
            </p>
            <p className="text-zinc-300 text-[11px] leading-relaxed">{engineError}</p>
            <div className="flex items-center gap-2 pt-1 flex-wrap">
              {onNavigateToLocalEngine && (
                <button
                  type="button"
                  onClick={onNavigateToLocalEngine}
                  className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium text-[11px] flex items-center gap-1 shadow-sm transition-colors"
                >
                  <Cpu className="w-3 h-3" />
                  <span>Setup Local Helper</span>
                </button>
              )}
              <button
                onClick={() => {
                  setPayloadType('wan');
                  setShowPayloadModal(true);
                }}
                className="text-[11px] text-purple-300 hover:text-purple-200 underline font-medium"
              >
                Inspect Wan Payload Schema
              </button>
              <span className="text-zinc-600">•</span>
              <button
                onClick={onOpenVeoModal}
                className="text-[11px] text-zinc-400 hover:text-white"
              >
                Engine Architecture & Setup
              </button>
              <span className="text-zinc-600">•</span>
              <button
                onClick={() => setEngineError(null)}
                className="text-[11px] text-zinc-400 hover:text-zinc-200"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Viewport Container */}
      <div className="flex flex-col items-center justify-center bg-black/90 border border-zinc-800/80 rounded-2xl p-3 sm:p-5 relative overflow-hidden">
        {/* Aspect Ratio Bounded Frame */}
        <div
          className={`relative w-full rounded-xl overflow-hidden border border-zinc-700/80 shadow-2xl transition-all duration-300 ${
            project.aspectRatio === '16:9'
              ? 'aspect-video max-w-3xl'
              : 'aspect-[9/16] max-w-[280px] sm:max-w-[320px]'
          }`}
          style={{ backgroundColor: '#050508' }}
        >
          {/* If an actual video is available (e.g. from Wan engine or test import) */}
          {activeVideoUrl ? (
            <video
              src={activeVideoUrl}
              controls
              autoPlay
              loop
              className="w-full h-full object-cover"
            />
          ) : (
            /* Cinematic Storyboard Framing Simulator */
            <div className="w-full h-full relative flex flex-col justify-between p-4 select-none">
              {/* Atmospheric lighting gradient overlay */}
              <div
                className={`absolute inset-0 pointer-events-none transition-colors duration-700 ${getLightingOverlayClass(
                  activeScene?.lighting
                )}`}
              />

              {/* Grid / Rule of Thirds overlay lines */}
              <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-20">
                <div className="border-r border-b border-white/20" />
                <div className="border-r border-b border-white/20" />
                <div className="border-b border-white/20" />
                <div className="border-r border-b border-white/20" />
                <div className="border-r border-b border-white/20" />
                <div className="border-b border-white/20" />
                <div className="border-r border-b border-white/20" />
                <div className="border-r border-b border-white/20" />
                <div />
              </div>

              {/* Top Viewport Metadata Bar */}
              <div className="relative z-10 flex items-center justify-between text-[11px] text-zinc-300 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="font-mono font-bold uppercase tracking-wider text-white">
                    {project.style} · {project.aspectRatio} · {project.videoResolution || '720p'} ({getResolutionDimensions(project.videoResolution || '720p', project.aspectRatio).display})
                  </span>
                </div>
                <div className="flex items-center gap-2 font-mono">
                  <span>
                    SHOT {activeScene ? activeScene.sceneNumber : 1}/{scenes.length || 1}
                  </span>
                  <span className="text-zinc-500">|</span>
                  <span className="text-purple-300">
                    {formatTimecode(currentTime)} / {formatTimecode(totalDuration)}
                  </span>
                </div>
              </div>

              {/* Center Camera Movement Trajectory Graphic */}
              <div className="relative z-10 my-auto text-center space-y-2 p-2">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/70 backdrop-blur-md border border-white/15 text-xs text-white shadow-lg">
                  <Camera className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
                  <span className="font-semibold">
                    {activeScene?.cameraMovement || 'Cinematic Pan'}
                  </span>
                </div>

                <div className="max-w-md mx-auto">
                  <p className="text-[11px] text-zinc-200 bg-black/70 backdrop-blur-md p-2 rounded-lg border border-white/10 line-clamp-3">
                    {activeScene?.actionSummary || activeScene?.visualPrompt || 'Configure scene directions in the editor'}
                  </p>
                </div>
              </div>

              {/* Bottom Dialogue / Subtitle Bar */}
              <div className="relative z-10 space-y-1">
                {activeScene?.dialogue && (
                  <div className="text-center">
                    <span className="inline-block px-3 py-1 rounded bg-black/80 backdrop-blur-md border border-amber-500/30 text-amber-200 text-xs font-serif italic">
                      "{activeScene.dialogue}"
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between text-[10px] text-zinc-400 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded border border-white/10">
                  <div className="flex items-center gap-1.5">
                    <SunMedium className="w-3 h-3 text-amber-400" />
                    <span>{activeScene?.lighting || 'Natural Lighting'}</span>
                  </div>
                  <div>
                    {activeScene?.characterIds?.length ? (
                      <span>Cast: {activeScene.characterIds.join(', ')}</span>
                    ) : (
                      <span>Cast: Default Lead</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Viewport Playback & Scrubber Controls */}
        <div className="w-full max-w-3xl mt-4 space-y-2.5">
          {/* Progress bar */}
          <div className="relative w-full h-2 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800 cursor-pointer">
            <div
              className="h-full bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-500 transition-all duration-100"
              style={{
                width: `${totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0}%`,
              }}
            />
          </div>

          {/* Transport Buttons & Scene Selector */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePlayToggle}
                className="w-9 h-9 rounded-xl bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center transition-all shadow-md shadow-purple-600/30"
                title={isPlaying ? 'Pause Storyboard' : 'Play Storyboard'}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              </button>

              <button
                type="button"
                onClick={handleReset}
                className="w-8 h-8 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center border border-zinc-800"
                title="Restart from Scene 1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              <span className="font-mono text-xs text-zinc-300 ml-1">
                {formatTimecode(currentTime)} / {formatTimecode(totalDuration)}
              </span>
            </div>

            {/* Scene chips with clip readiness indicator */}
            <div className="flex items-center gap-1 overflow-x-auto max-w-full py-1">
              {scenes.map((s, idx) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    onSelectSceneIndex(idx);
                    let start = 0;
                    for (let i = 0; i < idx; i++) {
                      start += scenes[i].duration;
                    }
                    setCurrentTime(start);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all shrink-0 border flex items-center gap-1.5 ${
                    currentSceneIndex === idx
                      ? 'bg-blue-600 text-white border-blue-500 shadow-sm shadow-blue-600/30'
                      : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                  }`}
                >
                  {s.videoUrl && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" title="Clip ready" />
                  )}
                  <span>Shot {s.sceneNumber}</span>
                  <span className="text-[10px] opacity-75 font-mono">({s.duration}s)</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Production Assets & Video Downloads */}
      <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="space-y-1 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-1.5 font-semibold text-white">
            <Download className="w-3.5 h-3.5 text-purple-400" />
            <span>Video Engine Outputs & Test Controls</span>
          </div>
          <p className="text-zinc-400 text-[11px]">
            {activeVideoUrl
              ? 'Generated video file ready for download. Click below to export MP4.'
              : 'Export formatted Wan/Veo batch prompts or load a test MP4 to verify the video pipeline.'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-center">
          {activeVideoUrl ? (
            <button
              onClick={handleDownloadVideo}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg shadow-md shadow-emerald-600/30 flex items-center gap-1.5 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download MP4</span>
            </button>
          ) : (
            <label className="cursor-pointer px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-lg flex items-center gap-1.5 transition-colors border border-zinc-700/60">
              <Upload className="w-3.5 h-3.5 text-blue-400" />
              <span>Test with Local MP4</span>
              <input
                type="file"
                accept="video/mp4,video/webm"
                onChange={handleVideoUpload}
                className="hidden"
              />
            </label>
          )}

          <button
            onClick={() => exportVeoBatchPrompts(project)}
            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-lg flex items-center gap-1.5 transition-colors border border-zinc-700/60"
            title="Download text prompts formatted for video generation models"
          >
            <span>Batch Prompts (.txt)</span>
          </button>
        </div>
      </div>

      {/* Engine Payload Inspector Modal */}
      {showPayloadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-2xl p-5 sm:p-6 shadow-2xl relative space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-blue-400" />
                <h3 className="font-display font-bold text-sm text-white">
                  Video Engine Request Payload
                </h3>
              </div>
              <button
                onClick={() => setShowPayloadModal(false)}
                className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 text-xs"
              >
                ✕
              </button>
            </div>

            {/* Format toggle */}
            <div className="flex items-center gap-1 text-xs border-b border-zinc-800 pb-2">
              <button
                onClick={() => setPayloadType('wan')}
                className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                  payloadType === 'wan'
                    ? 'bg-purple-600 text-white'
                    : 'text-zinc-400 hover:text-white bg-zinc-900'
                }`}
              >
                Wan 2.1 Engine (Open Source)
              </button>
              <button
                onClick={() => setPayloadType('veo')}
                className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                  payloadType === 'veo'
                    ? 'bg-purple-600 text-white'
                    : 'text-zinc-400 hover:text-white bg-zinc-900'
                }`}
              >
                Google Veo Format
              </button>
            </div>

            <p className="text-xs text-zinc-400">
              {payloadType === 'wan'
                ? 'Exact JSON payload dispatched to the Wan inference server endpoint (/v1/video/generations) with character consistency anchors and 16fps frame budget.'
                : 'Google Veo format for veo-3.1-lite-generate-preview preview.'}
            </p>

            <pre className="p-3 bg-zinc-900 rounded-xl text-[11px] font-mono text-zinc-200 overflow-x-auto border border-zinc-800 max-h-64">
              {JSON.stringify(
                payloadType === 'wan'
                  ? generateWanApiPayload(project, activeScene)
                  : generateVeoApiPayload(project, activeScene),
                null,
                2
              )}
            </pre>

            <div className="flex items-center justify-between gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  const data =
                    payloadType === 'wan'
                      ? generateWanApiPayload(project, activeScene)
                      : generateVeoApiPayload(project, activeScene);
                  navigator.clipboard.writeText(JSON.stringify(data, null, 2));
                  setPayloadCopied(true);
                  setTimeout(() => setPayloadCopied(false), 2000);
                }}
                className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium flex items-center gap-1.5"
              >
                {payloadCopied ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied!</span>
                  </>
                ) : (
                  <span>Copy Payload JSON</span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setShowPayloadModal(false)}
                className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
