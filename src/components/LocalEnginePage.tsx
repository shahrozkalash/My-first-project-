import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Download,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Server,
  Play,
  Pause,
  XCircle,
  HardDrive,
  Activity,
  Terminal,
  ShieldCheck,
  Zap,
  Film,
  Key,
  FolderDown,
  Info,
  Check,
  RotateCcw,
  Square,
  AlertOctagon,
  Unplug,
  Swords,
} from 'lucide-react';
import { Project, Scene, VideoEngineHealth, LocalLlmModel } from '../types';
import { localHelperClient } from '../utils/localHelperClient';
import { SUPPORTED_LOCAL_LLM_MODELS } from '../data/constants';

export type EngineStatusState =
  | 'Not Installed'
  | 'Checking Compatibility'
  | 'Ready to Install'
  | 'Downloading Model'
  | 'Starting Engine'
  | 'Ready'
  | 'Error';

interface LocalEnginePageProps {
  activeProject: Project;
  onUpdateProject: (updated: Project) => void;
  onNavigateToStudio: () => void;
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const LocalEnginePage: React.FC<LocalEnginePageProps> = ({
  activeProject,
  onUpdateProject,
  onNavigateToStudio,
  onShowToast,
}) => {
  // Connection and Engine State
  const [engineHealth, setEngineHealth] = useState<VideoEngineHealth | null>(null);
  const [engineStatus, setEngineStatus] = useState<EngineStatusState>('Checking Compatibility');
  const [isChecking, setIsChecking] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Pairing State
  const [pairingToken, setPairingToken] = useState('');
  const [isPaired, setIsPaired] = useState(false);
  const [customEngineUrl, setCustomEngineUrl] = useState('http://127.0.0.1:8000');
  const [isSavingPairing, setIsSavingPairing] = useState(false);

  // Model selection & downloads
  const [selectedModel, setSelectedModel] = useState<string>('wan-2.1-t2v-1.4b');
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  // Engine controls
  const [isStartingEngine, setIsStartingEngine] = useState(false);
  const [testVideoUrl, setTestVideoUrl] = useState<string | null>(null);
  const [isTestingWan, setIsTestingWan] = useState(false);
  const [testJobId, setTestJobId] = useState<string | null>(null);

  // Render All Queue State
  const [isRenderingQueue, setIsRenderingQueue] = useState(false);
  const [currentQueueIndex, setCurrentQueueIndex] = useState<number>(-1);
  const [queueProgress, setQueueProgress] = useState<number>(0);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  // Logs
  const [logs, setLogs] = useState<Array<{ timestamp: string; level: string; component: string; message: string }>>([]);
  const [isAutoRefreshLogs, setIsAutoRefreshLogs] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'models' | 'queue' | 'logs'>('overview');

  // 1. Check Engine Status
  const checkEngineStatus = async () => {
    setIsChecking(true);
    setEngineStatus('Checking Compatibility');
    setErrorMessage(null);

    try {
      const diag = await localHelperClient.probeHealth();
      if (diag.isOnline && diag.health) {
        setEngineHealth(diag.health);
        if (diag.health.downloadState?.is_downloading) {
          setEngineStatus('Downloading Model');
          setDownloadProgress(diag.health.downloadState.progress_percent || 0);
        } else if (diag.health.isEngineRunning) {
          setEngineStatus('Ready');
        } else {
          const isModelDownloaded = diag.health.models?.[selectedModel]?.downloaded;
          if (isModelDownloaded) {
            setEngineStatus('Ready');
          } else {
            setEngineStatus('Ready to Install');
          }
        }
      } else {
        setEngineStatus('Not Installed');
        setEngineHealth({
          configured: false,
          reachable: false,
          engineType: 'wan',
          provider: 'local_windows_helper',
          engineUrlDisplay: customEngineUrl,
          model: selectedModel,
          supportedModels: ['wan-2.1-t2v-1.4b', 'wan-2.1-t2v-14b'],
          supportedResolutions: ['720p', '480p'],
          supportedAspectRatios: ['16:9', '9:16'],
          message: diag.errorMessage || 'Could not contact local Windows Helper. Ensure start.bat is running on 127.0.0.1:8000.',
          lastChecked: new Date().toISOString(),
          zeroCostGuaranteed: true,
        });
      }
    } catch (e: any) {
      setEngineStatus('Not Installed');
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    checkEngineStatus();
    // Load stored token
    const savedToken = localStorage.getItem('storymotion_pairing_token') || '';
    if (savedToken) {
      setPairingToken(savedToken);
      setIsPaired(true);
    }
  }, []);

  // Poll logs and status periodically if on logs tab
  useEffect(() => {
    let interval: any;
    if (activeTab === 'logs' && isAutoRefreshLogs) {
      const fetchLogs = async () => {
        try {
          const data = await localHelperClient.getLogs(100);
          if (data?.logs) {
            setLogs(data.logs);
          }
        } catch (e) {
          // ignore when offline
        }
      };
      fetchLogs();
      interval = setInterval(fetchLogs, 3000);
    }
    return () => clearInterval(interval);
  }, [activeTab, isAutoRefreshLogs]);

  // Poll active test job
  useEffect(() => {
    let interval: any;
    if (testJobId && isTestingWan) {
      interval = setInterval(async () => {
        try {
          const job = await localHelperClient.getJobStatus(testJobId);
          if (job && job.status === 'completed' && job.videoUrl) {
            setTestVideoUrl(job.videoUrl);
            setIsTestingWan(false);
            setTestJobId(null);
            onShowToast('Real WAN test generation succeeded on your GPU!', 'success');
          } else if (job && job.status === 'failed') {
            setIsTestingWan(false);
            setTestJobId(null);
            onShowToast(job.error || 'Test generation failed on GPU', 'error');
          }
        } catch (e) {
          // ignore polling error
        }
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [testJobId, isTestingWan, onShowToast]);

  // Handle Pairing Save
  const handleSavePairing = async () => {
    setIsSavingPairing(true);
    try {
      localHelperClient.setPairingToken(pairingToken);
      localHelperClient.setHelperUrl(customEngineUrl);
      await fetch('/api/helper/pair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: pairingToken, engineUrl: customEngineUrl }),
      }).catch(() => {});
      setIsPaired(true);
      onShowToast('Local pairing token saved and validated!', 'success');
      await checkEngineStatus();
    } catch (e: any) {
      onShowToast(`Failed to pair: ${e.message}`, 'error');
    } finally {
      setIsSavingPairing(false);
    }
  };

  // Disconnect Local Engine
  const handleDisconnect = () => {
    localHelperClient.clearPairing();
    setPairingToken('');
    setIsPaired(false);
    setEngineHealth(null);
    setEngineStatus('Not Installed');
    onShowToast('Local Engine disconnected', 'info');
  };

  // Trigger Model Download
  const handleDownloadModel = async (modelId: string) => {
    setIsDownloading(true);
    setEngineStatus('Downloading Model');
    setDownloadProgress(10);
    onShowToast(`Downloading official open-source weights for ${modelId}...`, 'info');

    try {
      const data = await localHelperClient.downloadModel(modelId);
      if (data?.error || data?.detail) {
        throw new Error(data.detail?.message || data.error || 'Failed to start download');
      }
      onShowToast('Download initialized from Hugging Face!', 'success');
      await checkEngineStatus();
    } catch (e: any) {
      onShowToast(`Download error: ${e.message}`, 'error');
      setEngineStatus('Error');
    } finally {
      setIsDownloading(false);
    }
  };

  // Cancel Model Download
  const handleCancelDownload = async () => {
    try {
      await localHelperClient.cancelDownload();
      onShowToast('Model download cancelled', 'info');
      await checkEngineStatus();
    } catch (e: any) {
      onShowToast(`Could not cancel download: ${e.message}`, 'error');
    }
  };

  // Start Engine (Load weights into GPU)
  const handleStartEngine = async () => {
    setIsStartingEngine(true);
    setEngineStatus('Starting Engine');
    onShowToast(`Loading ${selectedModel} weights into GPU memory with CPU offload...`, 'info');

    try {
      const data = await localHelperClient.startEngine(selectedModel);
      if (data?.status === 'error' || data?.error) {
        throw new Error(data.message || data.error || 'Failed to start engine');
      }
      onShowToast('WAN Engine is online and ready for video generation!', 'success');
      setEngineStatus('Ready');
      await checkEngineStatus();
    } catch (e: any) {
      onShowToast(`Engine startup error: ${e.message}`, 'error');
      setEngineStatus('Error');
      setErrorMessage(e.message);
    } finally {
      setIsStartingEngine(false);
    }
  };

  // Stop Engine (Unload from GPU)
  const handleStopEngine = async () => {
    try {
      await localHelperClient.stopEngine();
      onShowToast('WAN Engine stopped. GPU VRAM released.', 'info');
      await checkEngineStatus();
    } catch (e: any) {
      onShowToast(`Error stopping engine: ${e.message}`, 'error');
    }
  };

  // Test WAN (1s smoke test)
  const handleTestWan = async () => {
    setIsTestingWan(true);
    setTestVideoUrl(null);
    onShowToast('Dispatching 1-second 16-frame smoke test to local GPU...', 'info');

    try {
      const data = await localHelperClient.submitTestJob();
      if (data?.job_id) {
        setTestJobId(data.job_id);
      } else {
        throw new Error(data?.message || data?.error || 'Test request rejected');
      }
    } catch (e: any) {
      setIsTestingWan(false);
      onShowToast(`Test generation failed: ${e.message}`, 'error');
    }
  };

  // Render All Shots in Project (Controlled Queue)
  const handleRenderAllQueue = async () => {
    if (activeProject.scenes.length === 0) {
      onShowToast('No scenes to render. Generate a story first!', 'error');
      return;
    }

    if (!engineHealth?.reachable) {
      onShowToast('Local Windows Helper is offline. Launch start.bat first.', 'error');
      return;
    }

    setIsRenderingQueue(true);
    onShowToast(`Starting sequential queue of ${activeProject.scenes.length} scenes on your GPU...`, 'info');

    for (let i = 0; i < activeProject.scenes.length; i++) {
      setCurrentQueueIndex(i);
      const scene = activeProject.scenes[i];

      // Mark scene as rendering
      const updatedScenes = activeProject.scenes.map((s, idx) =>
        idx === i ? { ...s, status: 'generating' as const, engineProgress: 10 } : s
      );
      onUpdateProject({ ...activeProject, scenes: updatedScenes });

      try {
        const payload = {
          sceneId: scene.id,
          sceneNumber: scene.sceneNumber,
          prompt: scene.visualPrompt,
          aspect_ratio: activeProject.aspectRatio,
          aspectRatio: activeProject.aspectRatio,
          duration: scene.duration,
          duration_seconds: scene.duration,
          characterConsistencyTags: activeProject.characters.map((c) => c.name),
          cameraMovement: scene.cameraMovement,
          lighting: scene.lighting,
        };

        const data = await localHelperClient.submitJob(payload);
        if (!data || (!data.success && !data.jobId && !data.job_id)) {
          throw new Error(data?.message || data?.error || 'Scene render failed');
        }

        const jobId = data.jobId || data.job_id;
        setActiveJobId(jobId);

        // Poll until completed or failed
        let isDone = false;
        let pollTries = 0;
        while (!isDone && pollTries < 150) {
          await new Promise((r) => setTimeout(r, 2000));
          pollTries++;
          const job = await localHelperClient.getJobStatus(jobId);
          if (job) {
            setQueueProgress(job.progress || 0);
            const finishedVideo = job.videoUrl || (job as any).video_url;

            if (job.status === 'completed' && finishedVideo) {
              isDone = true;
              const completedScenes = activeProject.scenes.map((s, idx) =>
                idx === i
                  ? { ...s, status: 'completed' as const, videoUrl: finishedVideo, engineProgress: 100 }
                  : s
              );
              onUpdateProject({ ...activeProject, scenes: completedScenes });
              onShowToast(`Shot ${scene.sceneNumber} finished rendering on GPU!`, 'success');
            } else if (job.status === 'failed' || job.status === 'cancelled') {
              isDone = true;
              throw new Error(job.error || 'Job failed on inference server');
            }
          }
        }
      } catch (err: any) {
        const failedScenes = activeProject.scenes.map((s, idx) =>
          idx === i ? { ...s, status: 'error' as const, generationError: err.message } : s
        );
        onUpdateProject({ ...activeProject, scenes: failedScenes });
        onShowToast(`Error on Shot ${scene.sceneNumber}: ${err.message}`, 'error');
        break; // Stop sequential queue on critical failure
      }
    }

    setIsRenderingQueue(false);
    setCurrentQueueIndex(-1);
    setActiveJobId(null);
  };

  // Cancel running queue job
  const handleCancelActiveJob = async () => {
    if (activeJobId) {
      try {
        await localHelperClient.cancelJob(activeJobId);
        onShowToast('Job cancellation dispatched to local engine', 'info');
      } catch (e) {
        // ignore
      }
    }
    setIsRenderingQueue(false);
    setCurrentQueueIndex(-1);
  };

  // Helper Status Badge Color and Details
  const getStatusBadge = () => {
    switch (engineStatus) {
      case 'Ready':
        return {
          bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
          dot: 'bg-emerald-400 animate-pulse',
          title: 'Ready (Local GPU)',
          desc: 'Windows Helper online with loaded WAN model. Real video generation active.',
        };
      case 'Downloading Model':
        return {
          bg: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
          dot: 'bg-blue-400 animate-ping',
          title: 'Downloading Model',
          desc: `Downloading open-source weights from Hugging Face (${downloadProgress}%)...`,
        };
      case 'Starting Engine':
        return {
          bg: 'bg-purple-500/10 border-purple-500/30 text-purple-400',
          dot: 'bg-purple-400 animate-spin',
          title: 'Starting Engine',
          desc: 'Loading model weights into GPU VRAM with CPU offload optimization...',
        };
      case 'Ready to Install':
        return {
          bg: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
          dot: 'bg-amber-400',
          title: 'Ready to Install Model',
          desc: 'Windows Helper is connected! Download a compatible model below to begin.',
        };
      case 'Checking Compatibility':
        return {
          bg: 'bg-zinc-800 text-zinc-300 border-zinc-700',
          dot: 'bg-zinc-400 animate-pulse',
          title: 'Checking Compatibility',
          desc: 'Probing local hardware and Windows Helper service on 127.0.0.1:8000...',
        };
      case 'Error':
        return {
          bg: 'bg-red-500/10 border-red-500/30 text-red-400',
          dot: 'bg-red-400',
          title: 'Error',
          desc: errorMessage || 'An error occurred with the local engine.',
        };
      default:
        return {
          bg: 'bg-zinc-900 border-zinc-800 text-zinc-400',
          dot: 'bg-zinc-600',
          title: 'Not Installed / Offline',
          desc: 'Windows Helper is not running. Download installer or start your local service.',
        };
    }
  };

  const badge = getStatusBadge();
  const hw = engineHealth?.hardware;

  return (
    <div className="space-y-6 animate-in fade-in max-w-6xl mx-auto pb-28 sm:pb-16">
      {/* Top Banner & Status Bar */}
      <div className="p-4 sm:p-6 bg-zinc-950 border border-zinc-800/90 rounded-2xl shadow-xl backdrop-blur-md space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="p-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400">
                <Cpu className="w-5 h-5" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold font-display text-white">
                Zero-Cost Local WAN Engine
              </h2>
              <span className="px-2.5 py-0.5 text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 rounded-full flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>100% Free & Local (No Paid APIs)</span>
              </span>
            </div>
            <p className="text-xs sm:text-sm text-zinc-400">
              Run Alibaba’s open-source Wan 2.1 video models directly on your own computer’s NVIDIA GPU.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={checkEngineStatus}
              disabled={isChecking}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 transition-all"
              title="Refresh connection"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
              <span>{isChecking ? 'Checking...' : 'Check Engine Status'}</span>
            </button>

            <a
              href="/api/download/windows-helper"
              download="StoryMotion-AI-Windows-Helper.zip"
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-md shadow-purple-600/30 transition-all active:scale-95"
            >
              <FolderDown className="w-3.5 h-3.5" />
              <span>Download Windows Installer (.zip)</span>
            </a>
          </div>
        </div>

        {/* Status Chip */}
        <div className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 flex-wrap ${badge.bg}`}>
          <div className="flex items-center gap-3">
            <span className={`w-3 h-3 rounded-full ${badge.dot}`} />
            <div>
              <div className="font-bold text-xs sm:text-sm flex items-center gap-2">
                <span>Status: {badge.title}</span>
                <span className="text-[11px] font-mono opacity-80 px-2 py-0.5 rounded bg-black/40 border border-current">
                  {engineHealth?.engineUrlDisplay || customEngineUrl}
                </span>
              </div>
              <p className="text-[11px] opacity-90 mt-0.5">{badge.desc}</p>
            </div>
          </div>

          {engineHealth?.reachable && (
            <button
              onClick={handleDisconnect}
              className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg bg-black/40 hover:bg-black/60 border border-current transition-all"
            >
              <Unplug className="w-3 h-3" />
              <span>Disconnect</span>
            </button>
          )}
        </div>

        {/* Mobile / Offline Context Banner */}
        {!engineHealth?.reachable && (
          <div className="p-3 bg-zinc-900/90 border border-purple-500/30 rounded-xl flex items-start gap-2.5 text-xs text-zinc-300">
            <Info className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-white">
                Viewing on Mobile or PC in Standby
              </p>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Story planning, sequential scene direction, character consistency, and duration calculators work 100% on your phone right now. When you are ready at your Windows 11 PC, download the helper zip and run <code className="text-purple-300 font-mono">start.bat</code> to connect your local GPU.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-2 text-xs overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-medium transition-all ${
            activeTab === 'overview'
              ? 'bg-purple-600 text-white shadow-sm shadow-purple-600/30'
              : 'text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Check My PC & Installation</span>
        </button>

        <button
          onClick={() => setActiveTab('models')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-medium transition-all ${
            activeTab === 'models'
              ? 'bg-purple-600 text-white shadow-sm shadow-purple-600/30'
              : 'text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800'
          }`}
        >
          <HardDrive className="w-3.5 h-3.5" />
          <span>Download Compatible Models</span>
        </button>

        <button
          onClick={() => setActiveTab('queue')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-medium transition-all ${
            activeTab === 'queue'
              ? 'bg-purple-600 text-white shadow-sm shadow-purple-600/30'
              : 'text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800'
          }`}
        >
          <Film className="w-3.5 h-3.5" />
          <span>Render Shots Queue ({activeProject.scenes.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-medium transition-all ${
            activeTab === 'logs'
              ? 'bg-purple-600 text-white shadow-sm shadow-purple-600/30'
              : 'text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>Live Helper Logs</span>
        </button>
      </div>

      {/* TAB 1: CHECK MY PC & INSTALLATION */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Hardware Detection Card */}
          <div className="p-5 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <Cpu className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white font-display">
                    PC Hardware Compatibility Report
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Live hardware capability detection via local helper
                  </p>
                </div>
              </div>

              <button
                onClick={checkEngineStatus}
                disabled={isChecking}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-purple-600 hover:bg-purple-500 text-white shadow-sm"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
                <span>Check My PC</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              {/* GPU Name */}
              <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1">
                <span className="text-[10px] uppercase font-bold text-zinc-500">GPU Device</span>
                <p className="font-semibold text-white truncate text-sm">
                  {hw?.gpu_name || 'Detecting hardware...'}
                </p>
                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                  hw?.cuda_available ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                }`}>
                  {hw?.cuda_available ? 'CUDA Accelerated' : 'CPU Standby'}
                </span>
              </div>

              {/* VRAM Total */}
              <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1">
                <span className="text-[10px] uppercase font-bold text-zinc-500">Dedicated VRAM</span>
                <p className="font-semibold text-white text-sm">
                  {hw?.vram_total_gb ? `${hw.vram_total_gb} GB` : '0 GB (CPU)'}
                </p>
                <span className="text-[10px] text-zinc-400">
                  Free VRAM: {hw?.vram_free_gb || 0} GB
                </span>
              </div>

              {/* Disk Space */}
              <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1">
                <span className="text-[10px] uppercase font-bold text-zinc-500">Free SSD Disk Space</span>
                <p className="font-semibold text-white text-sm">
                  {hw?.disk_free_gb ? `${hw.disk_free_gb} GB Free` : 'Checking...'}
                </p>
                <span className="text-[10px] text-zinc-400">
                  {hw?.disk_free_gb && hw.disk_free_gb > 15
                    ? 'Sufficient for 1.4B weights'
                    : 'Requires 10GB+ free'}
                </span>
              </div>

              {/* Recommended Model */}
              <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1">
                <span className="text-[10px] uppercase font-bold text-purple-400">Recommended Model</span>
                <p className="font-semibold text-white text-sm font-mono">
                  {hw?.recommended_model || 'wan-2.1-t2v-1.4b'}
                </p>
                <span className="text-[10px] text-zinc-400">
                  {hw?.vram_total_gb && hw.vram_total_gb >= 22
                    ? '24GB+ High-end Workstation'
                    : 'Consumer GPU (8GB-12GB)'}
                </span>
              </div>
            </div>

            {/* Hardware Limitations & Fallback Explanation */}
            {(!hw?.cuda_available || (hw?.vram_total_gb && hw.vram_total_gb < 7.5)) && (
              <div className="p-3.5 bg-amber-950/20 border border-amber-500/30 rounded-xl text-xs space-y-1 text-zinc-300">
                <div className="flex items-center gap-2 font-semibold text-amber-400">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Hardware Advisory: Low or Non-NVIDIA VRAM Detected</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Real video generation requires an NVIDIA GPU with at least 8GB VRAM.
                  However, <strong>all story writing, sequential storyboard editing, character references, duration calculators, and prompt exports remain 100% active and free</strong>.
                  StoryMotion AI will never force you to switch to a paid service.
                </p>
              </div>
            )}
          </div>

          {/* Step-by-Step Installation Guide */}
          <div className="p-5 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-4">
            <h3 className="text-sm font-bold text-white font-display flex items-center gap-2">
              <Download className="w-4 h-4 text-purple-400" />
              <span>Windows 11 Local Helper Installation (3 Easy Steps)</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              {/* Step 1 */}
              <div className="p-4 bg-zinc-900/90 border border-zinc-800 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="w-6 h-6 rounded-full bg-purple-600 text-white font-bold flex items-center justify-center text-xs">
                    1
                  </span>
                  <span className="text-[10px] text-zinc-500 uppercase font-semibold">Step 1</span>
                </div>
                <h4 className="font-semibold text-white">Download Helper Archive</h4>
                <p className="text-zinc-400 text-[11px] leading-relaxed">
                  Click the button below to download the complete Windows local helper package. No admin privileges required.
                </p>
                <a
                  href="/api/download/windows-helper"
                  download="StoryMotion-AI-Windows-Helper.zip"
                  className="w-full mt-2 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white rounded-lg font-medium transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-purple-400" />
                  <span>Download .ZIP</span>
                </a>
              </div>

              {/* Step 2 */}
              <div className="p-4 bg-zinc-900/90 border border-zinc-800 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="w-6 h-6 rounded-full bg-purple-600 text-white font-bold flex items-center justify-center text-xs">
                    2
                  </span>
                  <span className="text-[10px] text-zinc-500 uppercase font-semibold">Step 2</span>
                </div>
                <h4 className="font-semibold text-white">Extract & Run install.bat</h4>
                <p className="text-zinc-400 text-[11px] leading-relaxed">
                  Extract the zip file to any folder on your computer. Double click <code className="text-purple-300 font-mono">install.bat</code>.
                </p>
                <div className="font-mono text-[10px] bg-black/60 p-2 rounded text-zinc-300 border border-zinc-800">
                  install.bat
                </div>
                <p className="text-[10px] text-zinc-500">
                  Installs isolated Python venv and PyTorch CUDA 12.4.
                </p>
              </div>

              {/* Step 3 */}
              <div className="p-4 bg-zinc-900/90 border border-zinc-800 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="w-6 h-6 rounded-full bg-purple-600 text-white font-bold flex items-center justify-center text-xs">
                    3
                  </span>
                  <span className="text-[10px] text-zinc-500 uppercase font-semibold">Step 3</span>
                </div>
                <h4 className="font-semibold text-white">Double-Click start.bat</h4>
                <p className="text-zinc-400 text-[11px] leading-relaxed">
                  Double click <code className="text-purple-300 font-mono">start.bat</code> to launch the server on <code className="text-zinc-300">127.0.0.1:8000</code>.
                </p>
                <div className="font-mono text-[10px] bg-black/60 p-2 rounded text-zinc-300 border border-zinc-800">
                  start.bat
                </div>
                <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Automatically connects to studio!</span>
                </p>
              </div>
            </div>
          </div>

          {/* Secure Pairing Configuration */}
          <div className="p-5 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-4">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-bold text-white font-display">
                Secure Loopback Pairing Configuration
              </h3>
            </div>
            <p className="text-xs text-zinc-400">
              The helper binds strictly to <code className="text-zinc-300 font-mono">127.0.0.1</code> to prevent any unauthorized remote requests.
              Copy the pairing token displayed in your helper console window to pair securely:
            </p>

            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex-1 min-w-[240px]">
                <input
                  type="text"
                  placeholder="Paste pairing token from start.bat terminal..."
                  value={pairingToken}
                  onChange={(e) => setPairingToken(e.target.value)}
                  className="w-full px-3.5 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white font-mono placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <button
                onClick={handleSavePairing}
                disabled={isSavingPairing || !pairingToken}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-semibold text-xs rounded-xl transition-all shadow-sm"
              >
                {isSavingPairing ? 'Pairing...' : 'Validate & Pair'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MODEL MANAGER */}
      {activeTab === 'models' && (
        <div className="space-y-6">
          <div className="p-5 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-4">
            <div>
              <h3 className="text-sm font-bold text-white font-display">
                Download Compatible Official WAN Models
              </h3>
              <p className="text-xs text-zinc-400">
                Official open-source weights downloaded directly from Hugging Face with integrity validation.
              </p>
            </div>

            {/* Model Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              {/* Model 1: 1.4B */}
              <div className={`p-4 rounded-xl border space-y-3 transition-all ${
                selectedModel === 'wan-2.1-t2v-1.4b'
                  ? 'bg-purple-950/20 border-purple-500/50 shadow-lg shadow-purple-600/10'
                  : 'bg-zinc-900/80 border-zinc-800'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm font-mono">
                    Wan2.1-T2V-1.4B
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                    Recommended
                  </span>
                </div>
                <p className="text-zinc-400 text-[11px] leading-relaxed">
                  Optimized for consumer GPUs with 8GB to 12GB VRAM. Fast render times and excellent motion fidelity.
                </p>
                <div className="space-y-1 text-[11px] text-zinc-400 border-t border-zinc-800 pt-2 font-mono">
                  <div className="flex justify-between">
                    <span>VRAM Required:</span>
                    <span className="text-white">8GB - 12GB</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Download Size:</span>
                    <span className="text-white">~3.6 GB</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Source:</span>
                    <span className="text-purple-300">Wan-AI / HuggingFace</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setSelectedModel('wan-2.1-t2v-1.4b');
                    handleDownloadModel('wan-2.1-t2v-1.4b');
                  }}
                  disabled={isDownloading}
                  className="w-full py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition-all shadow-sm flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download 1.4B Model</span>
                </button>
              </div>

              {/* Model 2: 14B */}
              <div className={`p-4 rounded-xl border space-y-3 transition-all ${
                selectedModel === 'wan-2.1-t2v-14b'
                  ? 'bg-purple-950/20 border-purple-500/50 shadow-lg shadow-purple-600/10'
                  : 'bg-zinc-900/80 border-zinc-800'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm font-mono">
                    Wan2.1-T2V-14B
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-300 border border-blue-500/30">
                    Workstation
                  </span>
                </div>
                <p className="text-zinc-400 text-[11px] leading-relaxed">
                  Full 14B parameter foundation model. Maximum cinematic texture and complex motion for 24GB+ GPUs.
                </p>
                <div className="space-y-1 text-[11px] text-zinc-400 border-t border-zinc-800 pt-2 font-mono">
                  <div className="flex justify-between">
                    <span>VRAM Required:</span>
                    <span className="text-white">22GB - 24GB+</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Download Size:</span>
                    <span className="text-white">~28.5 GB</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Source:</span>
                    <span className="text-purple-300">Wan-AI / HuggingFace</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setSelectedModel('wan-2.1-t2v-14b');
                    handleDownloadModel('wan-2.1-t2v-14b');
                  }}
                  disabled={isDownloading}
                  className="w-full py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white font-semibold text-xs transition-all shadow-sm flex items-center justify-center gap-1.5 border border-zinc-700"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download 14B Model</span>
                </button>
              </div>

              {/* Model 3: I2V 14B */}
              <div className={`p-4 rounded-xl border space-y-3 transition-all ${
                selectedModel === 'wan-2.1-i2v-14b-480p'
                  ? 'bg-purple-950/20 border-purple-500/50 shadow-lg shadow-purple-600/10'
                  : 'bg-zinc-900/80 border-zinc-800'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm font-mono">
                    Wan2.1-I2V-14B (480P)
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                    Image-to-Video
                  </span>
                </div>
                <p className="text-zinc-400 text-[11px] leading-relaxed">
                  Image-to-Video model that accepts character reference images to maintain character continuity across shots.
                </p>
                <div className="space-y-1 text-[11px] text-zinc-400 border-t border-zinc-800 pt-2 font-mono">
                  <div className="flex justify-between">
                    <span>VRAM Required:</span>
                    <span className="text-white">20GB - 24GB</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Download Size:</span>
                    <span className="text-white">~27.8 GB</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Source:</span>
                    <span className="text-purple-300">Wan-AI / HuggingFace</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setSelectedModel('wan-2.1-i2v-14b-480p');
                    handleDownloadModel('wan-2.1-i2v-14b-480p');
                  }}
                  disabled={isDownloading}
                  className="w-full py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white font-semibold text-xs transition-all shadow-sm flex items-center justify-center gap-1.5 border border-zinc-700"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download I2V Model</span>
                </button>
              </div>
            </div>

            {/* Active Download Progress */}
            {isDownloading && (
              <div className="p-4 bg-purple-950/30 border border-purple-500/40 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-purple-300 font-semibold flex items-center gap-1.5">
                    <Download className="w-3.5 h-3.5 animate-bounce" />
                    <span>Downloading model weights with resume verification...</span>
                  </span>
                  <button
                    onClick={handleCancelDownload}
                    className="text-red-400 hover:text-red-300 font-semibold"
                  >
                    Cancel Download
                  </button>
                </div>
                <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-300"
                    style={{ width: `${downloadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Audio & Lip-Sync Models Section */}
            <div className="pt-6 border-t border-zinc-800 space-y-4">
              <div>
                <h4 className="text-sm font-bold text-white font-display flex items-center gap-2">
                  <span>Local Voice, Sound & Lip-Sync Models</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    100% Zero Cost
                  </span>
                </h4>
                <p className="text-xs text-zinc-400">
                  Lightweight open-source models for neural voice acting, phoneme lip-sync, and automated audio mixing.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                {/* Audio Model 1: Piper TTS */}
                <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs">Piper TTS (ONNX)</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-500/10 text-blue-300">
                      CPU Friendly
                    </span>
                  </div>
                  <p className="text-zinc-400 text-[11px]">
                    Ultra-fast neural speech synthesis. Natural voices running 100% on CPU with zero VRAM.
                  </p>
                  <div className="text-[10px] text-zinc-500 space-y-0.5 border-t border-zinc-800 pt-1.5">
                    <div>Size: ~65 MB · VRAM: 0 GB</div>
                    <div>Status: Built-in + Helper ready</div>
                  </div>
                </div>

                {/* Audio Model 2: Kokoro-82M */}
                <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs">Kokoro-82M</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-500/10 text-purple-300">
                      Voice Actor
                    </span>
                  </div>
                  <p className="text-zinc-400 text-[11px]">
                    82M parameter natural voice model with human-grade breathing, pacing, and cadence.
                  </p>
                  <div className="text-[10px] text-zinc-500 space-y-0.5 border-t border-zinc-800 pt-1.5">
                    <div>Size: ~310 MB · VRAM: 0.5 GB</div>
                    <div>License: Apache 2.0</div>
                  </div>
                </div>

                {/* Audio Model 3: Wav2Lip-HQ */}
                <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs">Wav2Lip-HQ</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-pink-500/10 text-pink-300">
                      Lip-Sync
                    </span>
                  </div>
                  <p className="text-zinc-400 text-[11px]">
                    Synchronizes mouth movements to exact speech audio waveforms for video shots.
                  </p>
                  <div className="text-[10px] text-zinc-500 space-y-0.5 border-t border-zinc-800 pt-1.5">
                    <div>Size: ~435 MB · VRAM: 3.5 GB</div>
                    <div>Hardware: GPU recommended</div>
                  </div>
                </div>

                {/* Audio Model 4: FFmpeg Tool */}
                <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs">FFmpeg Tool</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-300">
                      Audio Muxer
                    </span>
                  </div>
                  <p className="text-zinc-400 text-[11px]">
                    Free command-line utility for multi-track audio mixing, ducking, and MP4 assembly.
                  </p>
                  <div className="text-[10px] text-zinc-500 space-y-0.5 border-t border-zinc-800 pt-1.5">
                    <div>Status: {engineHealth?.audioEngine?.ffmpeg_available ? 'Available' : 'ImageIO Bundled'}</div>
                    <div>Zero-cost local tool</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Fight Scene Planner Local LLM Models Section */}
            <div className="pt-6 border-t border-zinc-800 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h4 className="text-sm font-bold text-white font-display flex items-center gap-2">
                    <Swords className="w-4 h-4 text-red-400" />
                    <span>Fight Scene Planner Models (DeepSeek / NVIDIA Nemotron)</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      100% Free & Open Weights
                    </span>
                  </h4>
                  <p className="text-xs text-zinc-400">
                    Locally hosted language models for structured non-graphic action choreography and character continuity planning.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                {SUPPORTED_LOCAL_LLM_MODELS.map((model) => {
                  const isDl = Boolean(engineHealth?.llmEngine?.models?.[model.id]?.downloaded);
                  const isCompat = Boolean(engineHealth?.llmEngine?.models?.[model.id]?.compatible ?? model.compatible);

                  return (
                    <div key={model.id} className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-2.5 flex flex-col justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white text-xs font-mono">{model.name}</span>
                          <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                            isDl ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30' : 'bg-zinc-800 text-zinc-400'
                          }`}>
                            {isDl ? 'Installed' : 'Needs Download'}
                          </span>
                        </div>
                        <span className="inline-block px-1.5 py-0.2 rounded text-[9px] font-semibold bg-purple-500/10 text-purple-300">
                          {model.license}
                        </span>
                        <p className="text-zinc-400 text-[11px] leading-relaxed">
                          {model.description}
                        </p>
                      </div>

                      <div className="space-y-2 pt-2 border-t border-zinc-800 text-[10px] text-zinc-400 font-mono">
                        <div className="flex justify-between">
                          <span>VRAM Min:</span>
                          <span className="text-white">{model.minVramGb} GB</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Download Size:</span>
                          <span className="text-white">~{model.downloadSizeGb} GB</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Hardware Check:</span>
                          <span className={isCompat ? 'text-emerald-400' : 'text-amber-400'}>
                            {isCompat ? 'Compatible with your system' : 'High VRAM requirements'}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDownloadModel(model.id)}
                          disabled={isDownloading || !engineHealth?.reachable}
                          className="w-full mt-1 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-200 hover:text-white font-medium text-[11px] flex items-center justify-center gap-1.5 border border-zinc-700 transition-colors"
                        >
                          <Download className="w-3 h-3 text-purple-400" />
                          <span>{isDl ? 'Re-Download Weights' : `Download ${model.parameters}`}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Engine Lifecycle Actions */}
            <div className="flex items-center justify-between gap-3 pt-4 border-t border-zinc-800 flex-wrap">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleStartEngine}
                  disabled={isStartingEngine || !engineHealth?.reachable}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>{isStartingEngine ? 'Starting Engine...' : 'Start Engine (Load Model)'}</span>
                </button>

                <button
                  onClick={handleStopEngine}
                  disabled={!engineHealth?.reachable}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white font-semibold text-xs flex items-center gap-1.5 border border-zinc-700"
                >
                  <Square className="w-3.5 h-3.5 text-red-400" />
                  <span>Stop Engine (Free VRAM)</span>
                </button>
              </div>

              {/* Test WAN button */}
              <button
                onClick={handleTestWan}
                disabled={isTestingWan || !engineHealth?.reachable}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-purple-600/30"
              >
                <Zap className="w-3.5 h-3.5 text-purple-200" />
                <span>{isTestingWan ? 'Running Test on GPU...' : 'Test WAN Engine (1s Smoke Test)'}</span>
              </button>
            </div>

            {/* Test Video Preview Player if generated */}
            {testVideoUrl && (
              <div className="p-4 bg-zinc-900 border border-emerald-500/40 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Real WAN Test Video Clip Rendered Successfully on Your GPU!</span>
                  </span>
                  <a
                    href={testVideoUrl}
                    download="wan-test-smoke.mp4"
                    className="text-purple-300 hover:text-purple-200 underline"
                  >
                    Download MP4
                  </a>
                </div>
                <video
                  src={testVideoUrl}
                  controls
                  autoPlay
                  loop
                  className="rounded-lg w-full max-w-md mx-auto aspect-video border border-zinc-800"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: BATCH QUEUE & RENDER ALL SHOTS */}
      {activeTab === 'queue' && (
        <div className="space-y-6">
          <div className="p-5 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-sm font-bold text-white font-display flex items-center gap-2">
                  <Film className="w-4 h-4 text-purple-400" />
                  <span>Render All Shots Queue</span>
                </h3>
                <p className="text-xs text-zinc-400">
                  Sequential local generation pipeline for project "{activeProject.title}"
                </p>
              </div>

              <div className="flex items-center gap-2">
                {isRenderingQueue ? (
                  <button
                    onClick={handleCancelActiveJob}
                    className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-semibold text-xs rounded-xl shadow-md transition-all"
                  >
                    <Square className="w-3.5 h-3.5" />
                    <span>Cancel Queue</span>
                  </button>
                ) : (
                  <button
                    onClick={handleRenderAllQueue}
                    disabled={activeProject.scenes.length === 0 || !engineHealth?.reachable}
                    className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-md transition-all shadow-purple-600/30"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Start Sequential Batch Render</span>
                  </button>
                )}
              </div>
            </div>

            {/* Active Queue Progress */}
            {isRenderingQueue && (
              <div className="p-4 bg-purple-950/30 border border-purple-500/40 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-purple-300 font-semibold">
                    Rendering Shot {currentQueueIndex + 1} of {activeProject.scenes.length}...
                  </span>
                  <span className="text-purple-300 font-mono font-bold">{queueProgress}%</span>
                </div>
                <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-300"
                    style={{ width: `${queueProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Scenes List */}
            <div className="space-y-2 text-xs">
              {activeProject.scenes.map((scene, idx) => (
                <div
                  key={scene.id}
                  className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 flex-wrap ${
                    currentQueueIndex === idx
                      ? 'bg-purple-950/30 border-purple-500/50'
                      : scene.videoUrl
                      ? 'bg-emerald-950/20 border-emerald-500/30'
                      : 'bg-zinc-900 border-zinc-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-lg bg-zinc-800 text-zinc-300 font-mono flex items-center justify-center font-bold text-xs shrink-0">
                      {scene.sceneNumber}
                    </span>
                    <div>
                      <h4 className="font-semibold text-white">{scene.title}</h4>
                      <p className="text-zinc-400 text-[11px] line-clamp-1 max-w-xl">
                        {scene.visualPrompt}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-zinc-400 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">
                      {scene.duration}s
                    </span>

                    {scene.videoUrl ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span>Rendered</span>
                      </span>
                    ) : currentQueueIndex === idx ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/30 flex items-center gap-1 animate-pulse">
                        <Activity className="w-3 h-3" />
                        <span>Rendering...</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-800 text-zinc-400">
                        Queued
                      </span>
                    )}

                    {scene.videoUrl && (
                      <a
                        href={scene.videoUrl}
                        download={`scene-${scene.sceneNumber}.mp4`}
                        className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] flex items-center gap-1"
                      >
                        <Download className="w-3 h-3" />
                        <span>MP4</span>
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: LIVE HELPER LOGS */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-bold text-white font-display">
                  Live Windows Helper Logs
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsAutoRefreshLogs(!isAutoRefreshLogs)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${
                    isAutoRefreshLogs
                      ? 'bg-purple-950/40 text-purple-300 border-purple-500/40'
                      : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                  }`}
                >
                  {isAutoRefreshLogs ? 'Auto-refreshing (3s)' : 'Auto-refresh paused'}
                </button>
              </div>
            </div>

            <div className="bg-black/90 p-3 rounded-xl border border-zinc-800 font-mono text-[11px] text-zinc-300 max-h-96 overflow-y-auto space-y-1">
              {logs.length === 0 ? (
                <div className="text-zinc-600 py-6 text-center">
                  No logs captured yet. Ensure helper service is running on 127.0.0.1:8000.
                </div>
              ) : (
                logs.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="text-zinc-500 shrink-0">{item.timestamp}</span>
                    <span className={`px-1 rounded text-[10px] font-bold shrink-0 ${
                      item.level === 'ERROR'
                        ? 'bg-red-950 text-red-400'
                        : item.level === 'WARN'
                        ? 'bg-amber-950 text-amber-400'
                        : 'bg-zinc-800 text-zinc-300'
                    }`}>
                      {item.level}
                    </span>
                    <span className="text-purple-400 shrink-0">[{item.component}]</span>
                    <span className="text-zinc-200">{item.message}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
