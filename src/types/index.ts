export type AspectRatio = '16:9' | '9:16';

export type VisualStyle =
  | 'cinematic'
  | 'realistic-3d'
  | 'anime'
  | 'cartoon'
  | 'children-animation';

export interface StyleOption {
  id: VisualStyle;
  label: string;
  tagline: string;
  badge: string;
  description: string;
  color: string;
  glowColor: string;
  promptKeyword: string;
}

export interface Character {
  id: string;
  name: string;
  role: string;
  visualDescription: string;
  attire: string;
  keyProps: string;
  voiceTone?: string;
  avatarBg?: string;
}

export type CameraMovement =
  | 'Cinematic Pan Right'
  | 'Cinematic Pan Left'
  | 'Slow Zoom In'
  | 'Slow Zoom Out'
  | 'Dolly Forward'
  | 'Drone Aerial Sweep'
  | 'Smooth 360 Orbit'
  | 'Dynamic Handheld Follow'
  | 'Low-Angle Tilt-Up'
  | 'Static Master Framing';

export type LightingMood =
  | 'Golden Hour Sunburst'
  | 'Cyberpunk Neon Glow'
  | 'Moody Film Noir'
  | 'High-Key Cinematic Daylight'
  | 'Overcast Mist & Rain'
  | 'Ethereal Bioluminescence'
  | 'Warm Fireplace Hearth'
  | 'Dramatic Chiaroscuro';

export interface Scene {
  id: string;
  sceneNumber: number;
  title: string;
  visualPrompt: string;
  actionSummary: string;
  dialogue?: string;
  cameraMovement: CameraMovement | string;
  lighting: LightingMood | string;
  duration: number; // in seconds
  characterIds: string[]; // names or ids of characters present
  status: 'draft' | 'ready' | 'queued' | 'generating' | 'completed' | 'error';
  videoUrl?: string;
  generationError?: string;
  operationName?: string;
  engineJobId?: string;
  engineProgress?: number;
}

export interface Project {
  id: string;
  title: string;
  prompt: string;
  logline?: string;
  genre?: string;
  style: VisualStyle;
  aspectRatio: AspectRatio;
  totalDuration: number; // Total movie duration in seconds (defaults to 60)
  sceneDuration: number; // Average duration per scene
  numScenes: number;
  characters: Character[];
  scenes: Scene[];
  createdAt: string;
  updatedAt: string;
  isFavorite?: boolean;
}

export interface GenerationStep {
  label: string;
  status: 'pending' | 'processing' | 'done';
}

export interface VideoEngineHealth {
  configured: boolean;
  reachable: boolean;
  engineType: 'wan';
  provider?: string;
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
  zeroCostGuaranteed?: boolean;
}

export interface VideoEngineJobStatus {
  jobId: string;
  sceneId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  etaSeconds?: number;
  videoUrl?: string;
  error?: string;
  details?: {
    model: string;
    engineType: string;
    aspectRatio?: string;
    resolution?: string;
    createdAt?: string;
  };
}
