import http from 'http';

export interface VideoEngineConfig {
  engineType: 'wan';
  engineUrl: string;
  model: string;
  apiKey?: string;
  timeoutMs: number;
}

export interface VideoGenerationJobRequest {
  sceneId: string;
  sceneNumber: number;
  prompt: string;
  negativePrompt?: string;
  aspectRatio: '16:9' | '9:16';
  duration: number; // in seconds
  resolution?: '480p' | '720p' | '1080p';
  seed?: number;
  fps?: number;
  guidanceScale?: number;
  characterConsistencyTags?: string[];
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
  engineUrlDisplay: string;
  model: string;
  supportedModels: string[];
  supportedResolutions: string[];
  supportedAspectRatios: string[];
  message: string;
  lastChecked: string;
}

/**
 * In-memory job registry for caching generation status
 */
const jobStore = new Map<string, VideoEngineJobStatus>();

/**
 * Modular Wan Video Engine Service
 * Connects to any configurable Wan inference server (FastAPI, ComfyUI, Diffusers microservice)
 */
export class WanVideoEngine {
  private config: VideoEngineConfig;

  constructor(customConfig?: Partial<VideoEngineConfig>) {
    const rawUrl = process.env.WAN_ENGINE_URL?.trim() || '';
    const rawModel = process.env.WAN_MODEL?.trim() || 'wan-2.1-t2v-1.4b';
    const apiKey = process.env.WAN_ENGINE_API_KEY?.trim() || '';

    this.config = {
      engineType: 'wan',
      engineUrl: rawUrl,
      model: rawModel,
      apiKey: apiKey,
      timeoutMs: 10000,
      ...customConfig,
    };
  }

  public getConfig(): VideoEngineConfig {
    return { ...this.config };
  }

  /**
   * Health check and reachability probe for the Wan inference server
   */
  public async checkHealth(): Promise<VideoEngineHealth> {
    const isConfigured = Boolean(this.config.engineUrl && this.config.engineUrl.startsWith('http'));
    const urlDisplay = isConfigured
      ? this.sanitizeUrl(this.config.engineUrl)
      : 'Not configured (Set WAN_ENGINE_URL in .env)';

    const supportedModels = [
      'wan-2.1-t2v-1.4b',
      'wan-2.1-t2v-14b',
      'wan-2.1-i2v-14b',
    ];

    const supportedResolutions = ['480p', '720p', '1080p'];
    const supportedAspectRatios = ['16:9', '9:16'];

    if (!isConfigured) {
      return {
        configured: false,
        reachable: false,
        engineType: 'wan',
        engineUrlDisplay: 'Not configured (Optional during development)',
        model: this.config.model || 'wan-2.1-t2v-1.4b',
        supportedModels,
        supportedResolutions,
        supportedAspectRatios,
        message: 'Wan engine not configured. Story-planning, character consistency, and storyboard simulation are active.',
        lastChecked: new Date().toISOString(),
      };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const probeUrl = `${this.config.engineUrl.replace(/\/+$/, '')}/health`;
      const headers: Record<string, string> = {
        'Accept': 'application/json',
      };
      if (this.config.apiKey) {
        headers['Authorization'] = `Bearer ${this.config.apiKey}`;
      }

      const res = await fetch(probeUrl, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        return {
          configured: true,
          reachable: true,
          engineType: 'wan',
          engineUrlDisplay: urlDisplay,
          model: this.config.model,
          supportedModels,
          supportedResolutions,
          supportedAspectRatios,
          message: 'Connected to Wan video inference server.',
          lastChecked: new Date().toISOString(),
        };
      } else {
        return {
          configured: true,
          reachable: false,
          engineType: 'wan',
          engineUrlDisplay: urlDisplay,
          model: this.config.model,
          supportedModels,
          supportedResolutions,
          supportedAspectRatios,
          message: `Inference server returned HTTP ${res.status}. Check server logs.`,
          lastChecked: new Date().toISOString(),
        };
      }
    } catch (err: any) {
      return {
        configured: true,
        reachable: false,
        engineType: 'wan',
        engineUrlDisplay: urlDisplay,
        model: this.config.model,
        supportedModels,
        supportedResolutions,
        supportedAspectRatios,
        message: `Inference server unreachable at ${urlDisplay} (${err?.message || 'Connection refused'}).`,
        lastChecked: new Date().toISOString(),
      };
    }
  }

  /**
   * Submits a scene prompt to the Wan video generation engine
   */
  public async submitJob(req: VideoGenerationJobRequest): Promise<{
    success: boolean;
    jobId?: string;
    status?: VideoEngineJobStatus;
    error?: string;
    message: string;
    payloadSnippet?: any;
  }> {
    const isConfigured = Boolean(this.config.engineUrl && this.config.engineUrl.startsWith('http'));

    // Wan request payload adhering to Wan2.1 diffusion specifications
    const wanPayload = {
      model: this.config.model,
      prompt: req.prompt,
      negative_prompt: req.negativePrompt || 'blurry, distorted faces, morphing, low quality, stutter, artifacts',
      aspect_ratio: req.aspectRatio,
      resolution: req.resolution || (req.aspectRatio === '9:16' ? '720x1280' : '1280x720'),
      duration_seconds: req.duration,
      num_frames: Math.min(81, Math.max(16, req.duration * 16)), // 16fps standard Wan frame rate
      fps: 16,
      guidance_scale: req.guidanceScale || 6.0,
      seed: req.seed || Math.floor(Math.random() * 1000000),
      metadata: {
        sceneId: req.sceneId,
        sceneNumber: req.sceneNumber,
        characterConsistencyTags: req.characterConsistencyTags || [],
        client: 'StoryMotion-AI',
      },
    };

    if (!isConfigured) {
      return {
        success: false,
        error: 'ENGINE_NOT_CONFIGURED',
        message: 'Wan engine not configured. A self-hosted or cloud Wan inference server URL (WAN_ENGINE_URL) can be connected later when available. Your story, scene prompt, and character consistency are fully prepared.',
        payloadSnippet: wanPayload,
      };
    }

    try {
      const endpoint = `${this.config.engineUrl.replace(/\/+$/, '')}/v1/video/generations`;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (this.config.apiKey) {
        headers['Authorization'] = `Bearer ${this.config.apiKey}`;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(wanPayload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const errorText = await res.text().catch(() => '');
        return {
          success: false,
          error: `ENGINE_HTTP_${res.status}`,
          message: `Wan inference server rejected request (${res.status}): ${errorText || res.statusText}`,
          payloadSnippet: wanPayload,
        };
      }

      const data = await res.json();
      const jobId = data.job_id || data.id || `wan_${Date.now()}`;

      const jobStatus: VideoEngineJobStatus = {
        jobId,
        sceneId: req.sceneId,
        status: data.status || 'queued',
        progress: data.progress || 0,
        videoUrl: data.video_url,
        details: {
          model: this.config.model,
          engineType: 'wan',
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
        message: 'Generation job submitted to Wan inference server.',
        payloadSnippet: wanPayload,
      };
    } catch (err: any) {
      return {
        success: false,
        error: 'CONNECTION_FAILED',
        message: `Failed to connect to Wan inference server at ${this.sanitizeUrl(this.config.engineUrl)}: ${err.message}`,
        payloadSnippet: wanPayload,
      };
    }
  }

  /**
   * Retrieves status for an existing job
   */
  public async getJobStatus(jobId: string): Promise<VideoEngineJobStatus> {
    const cached = jobStore.get(jobId);

    if (!this.config.engineUrl || !this.config.engineUrl.startsWith('http')) {
      if (cached) return cached;
      return {
        jobId,
        sceneId: '',
        status: 'failed',
        progress: 0,
        error: 'Wan engine not configured.',
      };
    }

    try {
      const endpoint = `${this.config.engineUrl.replace(/\/+$/, '')}/v1/video/jobs/${encodeURIComponent(jobId)}`;
      const headers: Record<string, string> = {
        'Accept': 'application/json',
      };
      if (this.config.apiKey) {
        headers['Authorization'] = `Bearer ${this.config.apiKey}`;
      }

      const res = await fetch(endpoint, { method: 'GET', headers });
      if (!res.ok) {
        if (cached) return cached;
        return {
          jobId,
          sceneId: '',
          status: 'failed',
          progress: 0,
          error: `Inference server returned status ${res.status}`,
        };
      }

      const data = await res.json();
      const updated: VideoEngineJobStatus = {
        jobId,
        sceneId: data.scene_id || cached?.sceneId || '',
        status: data.status || 'processing',
        progress: typeof data.progress === 'number' ? data.progress : cached?.progress || 0,
        etaSeconds: data.eta_seconds,
        videoUrl: data.video_url,
        error: data.error,
        details: cached?.details,
      };

      jobStore.set(jobId, updated);
      return updated;
    } catch (err: any) {
      if (cached) return cached;
      return {
        jobId,
        sceneId: '',
        status: 'failed',
        progress: 0,
        error: `Error checking Wan job status: ${err.message}`,
      };
    }
  }

  /**
   * Masks sensitive credentials in URLs
   */
  private sanitizeUrl(rawUrl: string): string {
    try {
      const parsed = new URL(rawUrl);
      return `${parsed.protocol}//${parsed.host}`;
    } catch {
      return rawUrl;
    }
  }
}

// Export singleton instance
export const wanVideoEngine = new WanVideoEngine();
