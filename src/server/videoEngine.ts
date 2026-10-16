import http from 'http';

export interface VideoEngineConfig {
  engineType: 'local_wan';
  engineUrl: string;
  model: string;
  pairingToken?: string;
  timeoutMs: number;
}

export interface VideoGenerationJobRequest {
  sceneId: string;
  sceneNumber: number;
  prompt: string;
  negativePrompt?: string;
  aspectRatio: '16:9' | '9:16';
  duration: number; // in seconds (e.g. 5)
  resolution?: '480p' | '720p' | '1080p';
  seed?: number;
  fps?: number;
  guidanceScale?: number;
  characterConsistencyTags?: string[];
  referenceImageUrl?: string;
  cameraMovement?: string;
  lighting?: string;
  style?: string;
}

export interface VideoEngineJobStatus {
  jobId: string;
  sceneId: string;
  sceneNumber?: number;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number; // 0 to 100
  etaSeconds?: number;
  videoUrl?: string;
  error?: string;
  prompt?: string;
  details?: {
    model: string;
    engineType: string;
    provider: string;
    aspectRatio: string;
    resolution: string;
    createdAt: string;
    completedAt?: string;
  };
}

export interface VideoEngineHealth {
  configured: boolean;
  reachable: boolean;
  engineType: 'wan';
  provider: string;
  engineUrlDisplay: string;
  model: string;
  helperVersion?: string;
  isEngineRunning?: boolean;
  currentLoadedModel?: string | null;
  hardware?: {
    cuda_available?: boolean;
    gpu_name?: string;
    vram_total_gb?: number;
    vram_free_gb?: number;
    disk_free_gb?: number;
    disk_total_gb?: number;
    recommended_model?: string;
    hardware_tier?: string;
  };
  models?: Record<string, {
    name: string;
    downloaded: boolean;
    min_vram_gb: number;
    download_size_gb: number;
    compatible: boolean;
  }>;
  downloadState?: {
    is_downloading: boolean;
    model_id: string | null;
    progress_percent: number;
    downloaded_bytes: number;
    total_bytes: number;
    status: string;
    error?: string;
  };
  audioEngine?: any;
  supportedModels: string[];
  supportedResolutions: string[];
  supportedAspectRatios: string[];
  message: string;
  lastChecked: string;
  zeroCostGuaranteed: boolean;
}

/**
 * In-memory job registry for tracking local generation jobs
 */
const jobStore = new Map<string, VideoEngineJobStatus>();

/**
 * StoryMotion AI - Strict Zero-Cost Local WAN 2.1 Video Engine
 * Connects securely to your local Windows Helper / NVIDIA GPU inference server.
 * Absolutely zero paid APIs, zero subscriptions, zero cloud fees.
 */
export class WanVideoEngine {
  private config: VideoEngineConfig;

  constructor(customConfig?: Partial<VideoEngineConfig>) {
    const rawUrl = process.env.WAN_ENGINE_URL?.trim() || 'http://127.0.0.1:8000';
    const rawModel = process.env.WAN_MODEL?.trim() || 'wan-2.1-t2v-1.4b';
    const rawToken = process.env.WAN_ENGINE_TOKEN?.trim() || '';

    this.config = {
      engineType: 'local_wan',
      engineUrl: rawUrl,
      model: rawModel,
      pairingToken: rawToken,
      timeoutMs: 25000,
      ...customConfig,
    };
  }

  public getConfig(): VideoEngineConfig {
    return { ...this.config };
  }

  public setPairingToken(token: string): void {
    this.config.pairingToken = token.trim();
  }

  public setEngineUrl(url: string): void {
    this.config.engineUrl = url.trim().replace(/\/+$/, '');
  }

  public setModel(model: string): void {
    this.config.model = model.trim();
  }

  private getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };
    if (this.config.pairingToken) {
      headers['X-StoryMotion-Token'] = this.config.pairingToken;
    }
    return headers;
  }

  /**
   * Health check and hardware probe for the local Windows Wan Helper
   */
  public async checkHealth(): Promise<VideoEngineHealth> {
    const supportedModels = [
      'wan-2.1-t2v-1.4b (Recommended for 8GB-12GB VRAM consumer GPUs - Zero cost)',
      'wan-2.1-t2v-14b (For 24GB+ VRAM high-end GPUs - Zero cost)',
      'wan-2.1-i2v-14b-480p (Image-to-Video with character keyframes - Zero cost)',
    ];

    const supportedResolutions = ['720p (1280x720 / 720x1280)', '480p (832x480 / 480x832)'];
    const supportedAspectRatios = ['16:9', '9:16'];
    const urlDisplay = this.config.engineUrl || 'http://127.0.0.1:8000';

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      // Try rich system check endpoint first, falling back to /health
      let probeUrl = `${this.config.engineUrl.replace(/\/+$/, '')}/api/system/check`;
      let res = await fetch(probeUrl, {
        method: 'GET',
        headers: this.getAuthHeaders(),
        signal: controller.signal,
      }).catch(() => null);

      if (!res || !res.ok) {
        probeUrl = `${this.config.engineUrl.replace(/\/+$/, '')}/health`;
        res = await fetch(probeUrl, {
          method: 'GET',
          headers: this.getAuthHeaders(),
          signal: controller.signal,
        });
      }

      clearTimeout(timeoutId);

      if (res && res.ok) {
        const data = await res.json().catch(() => ({}));
        const gpuInfo = data.hardware || {};

        return {
          configured: true,
          reachable: true,
          engineType: 'wan',
          provider: 'local_windows_helper',
          engineUrlDisplay: urlDisplay,
          model: data.current_loaded_model || this.config.model,
          helperVersion: data.helper_version || '2.0.0',
          isEngineRunning: Boolean(data.is_engine_running),
          currentLoadedModel: data.current_loaded_model,
          hardware: gpuInfo,
          models: data.models,
          downloadState: data.download_state,
          audioEngine: data.audioEngine,
          supportedModels,
          supportedResolutions,
          supportedAspectRatios,
          message: gpuInfo.gpu_name
            ? `Connected to local GPU: ${gpuInfo.gpu_name} (${gpuInfo.vram_total_gb || 0}GB VRAM, ${gpuInfo.disk_free_gb || 0}GB Free Disk). Zero-cost local engine active.`
            : `Connected to Windows Helper at ${urlDisplay}. Ready for free local rendering.`,
          lastChecked: new Date().toISOString(),
          zeroCostGuaranteed: true,
        };
      } else {
        return {
          configured: true,
          reachable: false,
          engineType: 'wan',
          provider: 'local_windows_helper',
          engineUrlDisplay: urlDisplay,
          model: this.config.model,
          supportedModels,
          supportedResolutions,
          supportedAspectRatios,
          message: `Local server at ${urlDisplay} returned HTTP ${res?.status || 500}. Ensure the Windows Helper is running.`,
          lastChecked: new Date().toISOString(),
          zeroCostGuaranteed: true,
        };
      }
    } catch (err: any) {
      return {
        configured: true,
        reachable: false,
        engineType: 'wan',
        provider: 'local_windows_helper',
        engineUrlDisplay: urlDisplay,
        model: this.config.model,
        supportedModels,
        supportedResolutions,
        supportedAspectRatios,
        message: `Local Windows Helper is offline at ${urlDisplay}. Launch "windows-helper\\start.bat" or "scripts\\run_local_wan.bat" on your Windows 11 PC.`,
        lastChecked: new Date().toISOString(),
        zeroCostGuaranteed: true,
      };
    }
  }

  /**
   * Triggers official model weights download in Windows Helper
   */
  public async downloadModel(modelId: string): Promise<any> {
    const endpoint = `${this.config.engineUrl.replace(/\/+$/, '')}/api/models/download`;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ model_id: modelId }),
    });
    return res.json();
  }

  /**
   * Cancels active model download
   */
  public async cancelDownload(): Promise<any> {
    const endpoint = `${this.config.engineUrl.replace(/\/+$/, '')}/api/models/cancel-download`;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });
    return res.json();
  }

  /**
   * Starts local WAN engine with specified model
   */
  public async startEngine(modelId: string): Promise<any> {
    const endpoint = `${this.config.engineUrl.replace(/\/+$/, '')}/api/engine/start`;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ model_id: modelId }),
    });
    return res.json();
  }

  /**
   * Stops local WAN engine and releases GPU VRAM
   */
  public async stopEngine(): Promise<any> {
    const endpoint = `${this.config.engineUrl.replace(/\/+$/, '')}/api/engine/stop`;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });
    return res.json();
  }

  /**
   * Submits a fast 1-second 16-frame smoke test to verify CUDA generation
   */
  public async submitTestJob(): Promise<any> {
    const endpoint = `${this.config.engineUrl.replace(/\/+$/, '')}/api/video/test`;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });
    return res.json();
  }

  /**
   * Fetches real-time helper logs
   */
  public async getLogs(limit: number = 100): Promise<any> {
    const endpoint = `${this.config.engineUrl.replace(/\/+$/, '')}/api/logs?limit=${limit}`;
    const res = await fetch(endpoint, {
      headers: this.getAuthHeaders(),
    });
    return res.json();
  }

  /**
   * Submits a scene video generation job to local Windows Helper
   */
  public async submitJob(req: VideoGenerationJobRequest): Promise<{
    success: boolean;
    jobId?: string;
    status?: VideoEngineJobStatus;
    error?: string;
    message: string;
    payloadSnippet?: any;
  }> {
    let enrichedPrompt = req.prompt.trim();

    if (req.characterConsistencyTags && req.characterConsistencyTags.length > 0) {
      const tagStr = req.characterConsistencyTags.join(', ');
      if (!enrichedPrompt.toLowerCase().includes(tagStr.toLowerCase())) {
        enrichedPrompt = `${enrichedPrompt}. Character Continuity: ${tagStr}.`;
      }
    }

    if (req.cameraMovement && !enrichedPrompt.toLowerCase().includes(req.cameraMovement.toLowerCase())) {
      enrichedPrompt = `${enrichedPrompt} Camera: ${req.cameraMovement}.`;
    }
    if (req.lighting && !enrichedPrompt.toLowerCase().includes(req.lighting.toLowerCase())) {
      enrichedPrompt = `${enrichedPrompt} Lighting: ${req.lighting}.`;
    }

    const nativeDuration = Math.max(1, Math.min(10, req.duration || 5));
    const numFrames = Math.min(81, Math.max(16, Math.round(nativeDuration * 16)));
    const resolutionString = req.aspectRatio === '9:16' ? '720x1280' : '1280x720';

    const wanPayload = {
      sceneId: req.sceneId,
      sceneNumber: req.sceneNumber,
      prompt: enrichedPrompt,
      negativePrompt:
        req.negativePrompt ||
        'distorted face, blurry, low resolution, flickering, morphing limbs, extra fingers, jittery motion, artifacts, watermark',
      aspect_ratio: req.aspectRatio,
      resolution: resolutionString,
      duration_seconds: nativeDuration,
      num_frames: numFrames,
      fps: 16,
      guidance_scale: req.guidanceScale || 6.0,
      seed: req.seed || Math.floor(Math.random() * 10000000),
      referenceImageUrl: req.referenceImageUrl,
      characterConsistencyTags: req.characterConsistencyTags || [],
      cameraMovement: req.cameraMovement,
      lighting: req.lighting,
    };

    try {
      const endpoint = `${this.config.engineUrl.replace(/\/+$/, '')}/api/video/generate`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs);

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(wanPayload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const errorText = await res.text().catch(() => '');
        return {
          success: false,
          error: `LOCAL_WAN_HTTP_${res.status}`,
          message: `Local Windows Helper rejected request (${res.status}): ${errorText || res.statusText}`,
          payloadSnippet: wanPayload,
        };
      }

      const data = await res.json();
      const jobId = data.job_id || data.jobId || data.id || `wan_${Date.now()}`;

      const jobStatus: VideoEngineJobStatus = {
        jobId,
        sceneId: req.sceneId,
        sceneNumber: req.sceneNumber,
        status: data.status || 'queued',
        progress: data.progress || 5,
        videoUrl: data.video_url,
        prompt: enrichedPrompt,
        details: {
          model: this.config.model,
          engineType: 'local_wan',
          provider: 'local_windows_helper',
          aspectRatio: req.aspectRatio,
          resolution: req.resolution || '720p',
          createdAt: new Date().toISOString(),
        },
      };

      jobStore.set(jobId, jobStatus);

      return {
        success: true,
        jobId,
        status: jobStatus,
        message: `Shot ${req.sceneNumber} submitted to local NVIDIA GPU queue (Zero cost).`,
        payloadSnippet: wanPayload,
      };
    } catch (err: any) {
      return {
        success: false,
        error: 'LOCAL_ENGINE_OFFLINE',
        message: `Local Windows Helper is offline at ${this.config.engineUrl}. Launch "windows-helper\\start.bat" on your Windows 11 machine.`,
        payloadSnippet: wanPayload,
      };
    }
  }

  /**
   * Retrieves status for an existing job from local WAN server
   */
  public async getJobStatus(jobId: string): Promise<VideoEngineJobStatus> {
    const cached = jobStore.get(jobId);

    try {
      const endpoint = `${this.config.engineUrl.replace(/\/+$/, '')}/api/video/jobs/${encodeURIComponent(jobId)}`;
      const res = await fetch(endpoint, {
        headers: this.getAuthHeaders(),
      });

      if (res.ok) {
        const data = await res.json();
        const updated: VideoEngineJobStatus = {
          jobId,
          sceneId: data.sceneId || data.scene_id || cached?.sceneId || '',
          sceneNumber: data.sceneNumber || cached?.sceneNumber,
          status: data.status || cached?.status || 'processing',
          progress: typeof data.progress === 'number' ? data.progress : cached?.progress || 10,
          etaSeconds: data.eta_seconds,
          videoUrl: data.video_url || cached?.videoUrl,
          error: data.error,
          prompt: data.prompt || cached?.prompt,
          details: cached?.details,
        };

        jobStore.set(jobId, updated);
        return updated;
      }
    } catch (e) {
      // Return cached state if fetch fails
    }

    if (cached) return cached;

    return {
      jobId,
      sceneId: '',
      status: 'failed',
      progress: 0,
      error: 'Job not found on local WAN helper.',
    };
  }

  /**
   * Cancels a running or queued job
   */
  public async cancelJob(jobId: string): Promise<any> {
    try {
      const endpoint = `${this.config.engineUrl.replace(/\/+$/, '')}/api/video/jobs/${encodeURIComponent(jobId)}/cancel`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: this.getAuthHeaders(),
      });
      if (res.ok) {
        const job = jobStore.get(jobId);
        if (job) {
          job.status = 'cancelled';
        }
      }
      return res.json();
    } catch (e) {
      return { status: 'error', message: 'Could not contact helper to cancel job.' };
    }
  }

  /**
   * Generates dialogue audio via Windows Helper TTS
   */
  public async generateDialogueAudio(payload: any): Promise<any> {
    const endpoint = `${this.config.engineUrl.replace(/\/+$/, '')}/api/audio/tts/generate`;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    return res.json();
  }

  /**
   * Runs local lip synchronization via Windows Helper
   */
  public async processLipSync(payload: any): Promise<any> {
    const endpoint = `${this.config.engineUrl.replace(/\/+$/, '')}/api/audio/lipsync/process`;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    return res.json();
  }

  /**
   * Assembles final MP4 with multi-track audio mix via Windows Helper FFmpeg
   */
  public async assembleFinalMp4(payload: any): Promise<any> {
    const endpoint = `${this.config.engineUrl.replace(/\/+$/, '')}/api/audio/mix/assemble`;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    return res.json();
  }

  /**
   * List all local jobs
   */
  public listJobs(): VideoEngineJobStatus[] {
    return Array.from(jobStore.values());
  }
}

// Export singleton instance
export const wanVideoEngine = new WanVideoEngine();
