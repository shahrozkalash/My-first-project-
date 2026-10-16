import { VideoEngineHealth, VideoEngineJobStatus } from '../types';

const STORAGE_KEY_URL = 'storymotion_helper_url';
const STORAGE_KEY_TOKEN = 'storymotion_pairing_token';
const DEFAULT_HELPER_URL = 'http://127.0.0.1:8000';

export interface LocalHelperDiagnostic {
  isOnline: boolean;
  isDirectConnected: boolean;
  url: string;
  tokenConfigured: boolean;
  errorType?: 'OFFLINE' | 'PNA_RESTRICTION' | 'UNAUTHORIZED' | 'UNKNOWN';
  errorMessage?: string;
  health?: VideoEngineHealth;
}

export class LocalHelperClient {
  private helperUrl: string;
  private pairingToken: string;

  constructor() {
    this.helperUrl = (typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEY_URL)) || DEFAULT_HELPER_URL;
    this.pairingToken = (typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEY_TOKEN)) || '';
  }

  public getHelperUrl(): string {
    return this.helperUrl;
  }

  public setHelperUrl(url: string): void {
    const clean = url.trim().replace(/\/+$/, '') || DEFAULT_HELPER_URL;
    this.helperUrl = clean;
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_URL, clean);
    }
  }

  public getPairingToken(): string {
    return this.pairingToken;
  }

  public setPairingToken(token: string): void {
    const clean = token.trim();
    this.pairingToken = clean;
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_TOKEN, clean);
    }
  }

  public clearPairing(): void {
    this.pairingToken = '';
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY_TOKEN);
    }
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };
    if (this.pairingToken) {
      headers['X-StoryMotion-Token'] = this.pairingToken;
    }
    return headers;
  }

  /**
   * Probes the local helper directly from the user's browser,
   * falling back to the server proxy if direct fetch is blocked.
   */
  public async probeHealth(): Promise<LocalHelperDiagnostic> {
    const targetUrl = this.helperUrl;

    // 1. Try Direct Loopback fetch from browser
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const res = await fetch(`${targetUrl}/api/system/check`, {
        method: 'GET',
        headers: this.getHeaders(),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const data: VideoEngineHealth = await res.json();
        return {
          isOnline: true,
          isDirectConnected: true,
          url: targetUrl,
          tokenConfigured: Boolean(this.pairingToken),
          health: data,
        };
      } else if (res.status === 401) {
        return {
          isOnline: true,
          isDirectConnected: true,
          url: targetUrl,
          tokenConfigured: false,
          errorType: 'UNAUTHORIZED',
          errorMessage: 'Helper requires valid pairing token from your terminal.',
        };
      }
    } catch (directErr: any) {
      // Direct fetch failed (could be offline or mixed content restriction)
    }

    // 2. Try Fallback via Website backend proxy
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch('/api/helper/status', {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const data: VideoEngineHealth = await res.json();
        if (data.reachable) {
          return {
            isOnline: true,
            isDirectConnected: false,
            url: targetUrl,
            tokenConfigured: Boolean(this.pairingToken),
            health: data,
          };
        }
      }
    } catch (proxyErr) {
      // Both direct and proxy failed
    }

    return {
      isOnline: false,
      isDirectConnected: false,
      url: targetUrl,
      tokenConfigured: Boolean(this.pairingToken),
      errorType: 'OFFLINE',
      errorMessage: `Could not connect to helper at ${targetUrl}. Ensure "start.bat" is running on your Windows laptop.`,
    };
  }

  /**
   * Helper request dispatcher that tries direct browser-to-helper communication
   * and falls back to server proxy if needed.
   */
  private async request(path: string, options: RequestInit = {}): Promise<any> {
    const isDirect = true;
    const directUrl = `${this.helperUrl}${path}`;
    const proxyUrl = `/api/helper${path.replace(/^\/api/, '')}`;

    try {
      const res = await fetch(directUrl, {
        ...options,
        headers: {
          ...this.getHeaders(),
          ...(options.headers as any),
        },
      });
      if (res.ok) {
        return await res.json();
      }
      if (res.status === 401) {
        throw new Error('UNAUTHORIZED_PAIRING_TOKEN');
      }
    } catch (err: any) {
      if (err.message === 'UNAUTHORIZED_PAIRING_TOKEN') {
        throw err;
      }
      // If direct request fails, attempt through server proxy
      try {
        const proxyRes = await fetch(proxyUrl, {
          ...options,
          headers: {
            ...this.getHeaders(),
            ...(options.headers as any),
          },
        });
        if (proxyRes.ok) {
          return await proxyRes.json();
        }
      } catch (e) {
        // Fall through
      }
      throw new Error(`Failed to communicate with Local Helper at ${this.helperUrl}`);
    }
  }

  public async downloadModel(modelId: string): Promise<any> {
    return this.request('/api/models/download', {
      method: 'POST',
      body: JSON.stringify({ model_id: modelId }),
    });
  }

  public async cancelDownload(): Promise<any> {
    return this.request('/api/models/cancel-download', {
      method: 'POST',
    });
  }

  public async startEngine(modelId: string): Promise<any> {
    return this.request('/api/engine/start', {
      method: 'POST',
      body: JSON.stringify({ model_id: modelId }),
    });
  }

  public async stopEngine(): Promise<any> {
    return this.request('/api/engine/stop', {
      method: 'POST',
    });
  }

  public async submitTestJob(): Promise<any> {
    return this.request('/api/video/test', {
      method: 'POST',
    });
  }

  public async getLogs(limit: number = 100): Promise<any> {
    return this.request(`/api/logs?limit=${limit}`, {
      method: 'GET',
    });
  }

  public async submitJob(payload: any): Promise<any> {
    return this.request('/api/video/generate', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async getJobStatus(jobId: string): Promise<VideoEngineJobStatus> {
    return this.request(`/api/video/jobs/${encodeURIComponent(jobId)}`, {
      method: 'GET',
    });
  }

  public async cancelJob(jobId: string): Promise<any> {
    return this.request(`/api/video/jobs/${encodeURIComponent(jobId)}/cancel`, {
      method: 'POST',
    });
  }

  // Audio & Lip-Sync Helper APIs
  public async generateDialogueAudio(
    text: string,
    voice: string = 'narrator',
    speed: number = 1.0,
    pitch: number = 1.0,
    emotion: string = 'neutral'
  ): Promise<any> {
    return this.request('/api/audio/tts/generate', {
      method: 'POST',
      body: JSON.stringify({ text, voice, speed, pitch, emotion }),
    });
  }

  public async processLipSync(payload: {
    videoFilename: string;
    audioFilename: string;
    characterId?: string;
    characterName?: string;
    model?: string;
  }): Promise<any> {
    return this.request('/api/audio/lipsync/process', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async assembleFinalMp4(payload: {
    videoFilename: string;
    dialogueFilename?: string;
    sfxFilename?: string;
    bgmFilename?: string;
    voiceVolume?: number;
    sfxVolume?: number;
    bgmVolume?: number;
    enableDucking?: boolean;
  }): Promise<any> {
    return this.request('/api/audio/mix/assemble', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }
}

export const localHelperClient = new LocalHelperClient();

