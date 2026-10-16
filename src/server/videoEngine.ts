import http from 'http';

export interface VideoEngineConfig {
  engineType: 'local_wan';
  engineUrl: string;
  model: string;
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
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number; // 0 to 100
  etaSeconds?: number;
  videoUrl?: string;
  error?: string;
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
  hardware?: {
    gpu_name?: string;
    vram_total_gb?: number;
    vram_free_gb?: number;
    recommended_model?: string;
  };
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
 * Connects exclusively to your local computer / NVIDIA GPU inference server.
 * Absolutely zero paid APIs, zero subscriptions, zero cloud fees.
 */
export class WanVideoEngine {
  private config: VideoEngineConfig;

  constructor(customConfig?: Partial<VideoEngineConfig>) {
    // Default to standard local port 8000 where scripts/local_wan_server.py runs
    const rawUrl = process.env.WAN_ENGINE_URL?.trim() || 'http://127.0.0.1:8000';
    const rawModel = process.env.WAN_MODEL?.trim() || 'wan-2.1-t2v-1.4b';

    this.config = {
      engineType: 'local_wan',
      engineUrl: rawUrl,
      model: rawModel,
      timeoutMs: 15000,
      ...customConfig,
    };
  }

  public getConfig(): VideoEngineConfig {
    return { ...this.config };
  }

  /**
   * Health check and reachability probe for the local Wan inference engine
   */
  public async checkHealth(): Promise<VideoEngineHealth> {
    const supportedModels = [
      'wan-2.1-t2v-1.4b (Recommended for 8GB-12GB VRAM consumer GPUs - Zero cost)',
      'wan-2.1-t2v-14b (For 24GB+ VRAM high-end GPUs - Zero cost)',
      'wan-2.1-i2v-14b (Image-to-Video with reference frames - Zero cost)',
    ];

    const supportedResolutions = ['720p (1280x720 / 720x1280)', '480p (832x480 / 480x832)'];
    const supportedAspectRatios = ['16:9', '9:16'];
    const urlDisplay = this.config.engineUrl || 'http://127.0.0.1:8000';

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const probeUrl = `${this.config.engineUrl.replace(/\/+$/, '')}/health`;
      const res = await fetch(probeUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        const gpuInfo = data.hardware || {};

        return {
          configured: true,
          reachable: true,
          engineType: 'wan',
          provider: 'local_hardware',
          engineUrlDisplay: urlDisplay,
          model: this.config.model,
          hardware: gpuInfo,
          supportedModels,
          supportedResolutions,
          supportedAspectRatios,
          message: gpuInfo.gpu_name
            ? `Connected to local GPU: ${gpuInfo.gpu_name} (${gpuInfo.vram_total_gb || 0}GB VRAM). Zero-cost local engine active.`
            : `Connected to local WAN server at ${urlDisplay}. Ready for free local rendering.`,
          lastChecked: new Date().toISOString(),
          zeroCostGuaranteed: true,
        };
      } else {
        return {
          configured: true,
          reachable: false,
          engineType: 'wan',
          provider: 'local_hardware',
          engineUrlDisplay: urlDisplay,
          model: this.config.model,
          supportedModels,
          supportedResolutions,
          supportedAspectRatios,
          message: `Local server at ${urlDisplay} returned HTTP ${res.status}. Check your local_wan_server.py terminal.`,
          lastChecked: new Date().toISOString(),
          zeroCostGuaranteed: true,
        };
      }
    } catch (err: any) {
      return {
        configured: true,
        reachable: false,
        engineType: 'wan',
        provider: 'local_hardware',
        engineUrlDisplay: urlDisplay,
        model: this.config.model,
        supportedModels,
        supportedResolutions,
        supportedAspectRatios,
        message: `Local WAN engine is offline at ${urlDisplay}. Run "scripts\\run_local_wan.bat" on your Windows 11 PC to start your free local video generator.`,
        lastChecked: new Date().toISOString(),
        zeroCostGuaranteed: true,
      };
    }
  }

  /**
   * Submits a video generation job to the local WAN server
   */
  public async submitJob(req: VideoGenerationJobRequest): Promise<{
    success: boolean;
    jobId?: string;
    status?: VideoEngineJobStatus;
    error?: string;
    message: string;
    payloadSnippet?: any;
  }> {
    // Build synthesized prompt respecting character continuity and camera guidance
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

    // Wan 2.1 native duration is 5 seconds (81 frames at 16fps)
    const nativeDuration = Math.max(1, Math.min(10, req.duration || 5));
    const numFrames = Math.min(81, Math.max(16, Math.round(nativeDuration * 16)));

    const negativePrompt =
      req.negativePrompt ||
      'distorted face, blurry, low resolution, flickering, morphing limbs, extra fingers, jittery motion, artifacts, watermark';

    const resolutionString = req.aspectRatio === '9:16' ? '720x1280' : '1280x720';

    const wanPayload = {
      model: this.config.model,
      prompt: enrichedPrompt,
      negative_prompt: negativePrompt,
      aspect_ratio: req.aspectRatio,
      resolution: resolutionString,
      duration_seconds: nativeDuration,
      num_frames: numFrames,
      fps: 16,
      guidance_scale: req.guidanceScale || 6.0,
      seed: req.seed || Math.floor(Math.random() * 10000000),
      reference_image_url: req.referenceImageUrl,
      metadata: {
        sceneId: req.sceneId,
        sceneNumber: req.sceneNumber,
        characterConsistencyTags: req.characterConsistencyTags || [],
        client: 'StoryMotion-AI-Local',
      },
    };

    try {
      const endpoint = `${this.config.engineUrl.replace(/\/+$/, '')}/v1/video/generations`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs);

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(wanPayload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const errorText = await res.text().catch(() => '');
        return {
          success: false,
          error: `LOCAL_WAN_HTTP_${res.status}`,
          message: `Local WAN server rejected request (${res.status}): ${errorText || res.statusText}`,
          payloadSnippet: wanPayload,
        };
      }

      const data = await res.json();
      const jobId = data.job_id || data.id || `wan_local_${Date.now()}`;

      const jobStatus: VideoEngineJobStatus = {
        jobId,
        sceneId: req.sceneId,
        status: data.status || 'queued',
        progress: data.progress || 5,
        videoUrl: data.video_url,
        details: {
          model: this.config.model,
          engineType: 'local_wan',
          provider: 'local_hardware',
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
        message: `Shot ${req.sceneNumber} submitted to local GPU queue (Zero cost).`,
        payloadSnippet: wanPayload,
      };
    } catch (err: any) {
      return {
        success: false,
        error: 'LOCAL_ENGINE_OFFLINE',
        message: `Local WAN inference server is offline at ${this.config.engineUrl}. Launch "scripts\\run_local_wan.bat" on your Windows 11 machine to run video generation locally for free.`,
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
      const endpoint = `${this.config.engineUrl.replace(/\/+$/, '')}/v1/video/jobs/${encodeURIComponent(jobId)}`;
      const res = await fetch(endpoint, {
        headers: { 'Accept': 'application/json' },
      });

      if (res.ok) {
        const data = await res.json();
        const updated: VideoEngineJobStatus = {
          jobId,
          sceneId: data.scene_id || cached?.sceneId || '',
          status: data.status || cached?.status || 'processing',
          progress: typeof data.progress === 'number' ? data.progress : cached?.progress || 10,
          etaSeconds: data.eta_seconds,
          videoUrl: data.video_url || cached?.videoUrl,
          error: data.error,
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
      error: 'Job not found on local WAN server.',
    };
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
