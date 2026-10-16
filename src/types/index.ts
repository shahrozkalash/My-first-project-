export type AspectRatio = '16:9' | '9:16';

export type VideoResolution = '480p' | '720p' | '1080p';

export interface VideoResolutionOption {
  id: VideoResolution;
  label: string;
  tagline: string;
  landscapeDimensions: { width: number; height: number; display: string };
  portraitDimensions: { width: number; height: number; display: string };
  resourceLevel: 'lower' | 'balanced' | 'highest';
  resourceDescription: string;
  vramGuidance: string;
  nativeWanSupport: boolean;
  upscalingMethod?: string;
}

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

export type SupportedLanguage = 'en' | 'ur' | 'hi';

export interface LanguageCapabilityStatus {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  direction: 'ltr' | 'rtl';
  scriptName: string;
  storyTextStatus: 'full' | 'partial' | 'unsupported';
  storyTextNotes: string;
  ttsStatus: 'ready' | 'conditional' | 'unsupported';
  ttsNotes: string;
  pronunciationStatus: 'full' | 'partial' | 'unsupported';
  pronunciationNotes: string;
  lipSyncStatus: 'tested' | 'experimental' | 'unsupported';
  lipSyncNotes: string;
  installedVoiceNames: string[];
  isVoiceInstalled: boolean;
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
  voiceId?: string;
  voiceGender?: 'male' | 'female' | 'neutral';
  voicePitch?: number; // 0.6 - 1.4, default 1.0
  voiceSpeed?: number; // 0.7 - 1.4, default 1.0
  voiceEmotion?: string;
  preferredLanguage?: SupportedLanguage | string;
  pronunciationNotes?: string;
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

export interface DialogueLine {
  id: string;
  speakerId: string; // 'narrator' or character.id / character.name
  speakerName: string;
  text: string;
  emotion?: 'neutral' | 'dramatic' | 'whisper' | 'urgent' | 'joyful' | 'somber' | 'fearful';
  startTime: number; // in seconds from scene start
  duration: number; // in seconds
  audioUrl?: string; // audio blob/data URL or local file path
  status?: 'pending' | 'ready' | 'generating' | 'error';
  voiceId?: string;
  speed?: number;
  pitch?: number;
  language?: SupportedLanguage | string;
  pronunciationGuide?: string; // Phonetic transliteration / Aerab hint / Schwa guide
  subtitleTranslation?: string; // Optional English or secondary subtitle translation
}

export type SoundEffectCategory = 'foley' | 'ambience' | 'impact' | 'nature' | 'movement' | 'scifi_magic';

export interface SoundEffectEvent {
  id: string;
  name: string;
  category: SoundEffectCategory;
  startTime: number; // in seconds from scene start
  duration: number;
  volume: number; // 0 to 1
  soundType: string; // e.g. 'footsteps', 'rain_thunder', 'wind', 'door', 'impact_whoosh', 'scifi_energy', 'magical_chime'
  audioUrl?: string;
  description: string;
}

export type MusicMood = 'suspense' | 'sadness' | 'happiness' | 'adventure' | 'fantasy' | 'calm' | 'none';

export interface MusicTrackConfig {
  mood: MusicMood;
  title: string;
  volume: number; // 0 to 1, default 0.35
  duckingFactor: number; // e.g. 0.25 (lower to 25% during dialogue)
  enabled: boolean;
  audioUrl?: string;
  customUploaded?: boolean;
}

export interface LipSyncStatus {
  status: 'idle' | 'queued' | 'processing' | 'completed' | 'unsupported' | 'failed';
  model: 'wav2lip' | 'sadtalker' | 'liveportrait' | 'browser_assisted';
  targetCharacterId?: string;
  targetCharacterName?: string;
  outputVideoUrl?: string;
  error?: string;
  honestNotes?: string;
  hardwareRequirement?: string;
  testedStatus?: 'tested_working' | 'ready_for_weights' | 'unsupported_gpu';
}

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

  // Audio & Lip-Sync extensions
  dialogueLines?: DialogueLine[];
  soundEffects?: SoundEffectEvent[];
  sceneMusicMood?: MusicMood;
  lipSync?: LipSyncStatus;
  mixedVideoUrl?: string;
  mixedAudioUrl?: string;
}

export interface SubtitleSettings {
  enabled: boolean;
  language: SupportedLanguage | 'same_as_audio';
  fontSize: 'sm' | 'base' | 'lg' | 'xl';
  showSpeakerName: boolean;
  rtlMode?: boolean;
}

export interface AudioSettings {
  masterVolume: number;
  voiceVolume: number;
  sfxVolume: number;
  musicVolume: number;
  globalMusicMood: MusicMood;
  autoDucking: boolean;
  duckingPercent: number; // e.g. 75 means attenuate by 75%
  language: SupportedLanguage | string;
  ttsEngine: 'browser_speech' | 'local_piper' | 'local_kokoro';
  subtitleSettings?: SubtitleSettings;
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
  videoResolution?: VideoResolution;
  audioSettings?: AudioSettings;
  musicTrack?: MusicTrackConfig;
  language?: SupportedLanguage | string;
}

export interface GenerationStep {
  label: string;
  status: 'pending' | 'processing' | 'done';
}

export interface AudioModelMeta {
  name: string;
  category: 'tts' | 'lipsync' | 'mixing' | 'asset';
  downloaded: boolean;
  min_vram_gb: number;
  download_size_mb: number;
  cpu_supported: boolean;
  tested_status: 'tested_working' | 'ready_for_download' | 'experimental' | 'untested';
  description: string;
  license: string;
}

export interface VideoEngineHealth {
  configured: boolean;
  reachable: boolean;
  engineType: 'wan';
  provider?: string;
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
    cpu_count?: number;
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
  audioEngine?: {
    ffmpeg_available: boolean;
    piper_available: boolean;
    kokoro_available: boolean;
    wav2lip_available: boolean;
    sadtalker_available: boolean;
    active_task?: string | null;
    vram_stage_policy: 'separate_stages_recommended' | 'sufficient_vram';
    models: Record<string, AudioModelMeta>;
  };
  llmEngine?: {
    activeModel?: string | null;
    isLoaded: boolean;
    models: Record<string, LocalLlmModel>;
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
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
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

export type FightChoreographyStyle =
  | 'martial-arts'
  | 'sword-blade-duel'
  | 'superhero-kinetic'
  | 'tactical-cqc'
  | 'cybernetic-melee'
  | 'swashbuckling-acrobatic';

export type FightPacing =
  | 'rapid-kinetic'
  | 'deliberate-tactical'
  | 'escalating-climax';

export interface FightShot {
  shotNumber: number;
  title: string;
  duration: number; // 2 to 6 seconds per shot
  characterPositions: string; // e.g., "Alex crouching mid-left; Kane lunging forward right"
  movementChoreography: string; // Non-graphic cause-and-effect readable kinetic movement
  expressions: string; // e.g., "Determined focus, eyes locked on parry"
  cameraMovement: CameraMovement | string;
  lighting: LightingMood | string;
  environmentInteraction: string; // e.g., "Sparks spray off reinforced steel girder"
  transition: string; // e.g., "Match cut on parry impact"
  dialogue?: string; // Battle line or tactical grunt
  soundEffects: SoundEffectEvent[];
  visualPrompt: string; // Rich prompt repeating character identity, clothing, environment & continuity anchors
  characterIds: string[];
}

export interface FightScenePlan {
  id: string;
  title: string;
  storyContext: string;
  combatStyle: FightChoreographyStyle;
  pacing: FightPacing;
  environment: string;
  previousSceneEnding: string;
  targetTotalDuration: number;
  visualStyle: VisualStyle;
  aspectRatio: AspectRatio;
  characters: Character[];
  shots: FightShot[];
  modelUsed: string;
  createdAt: string;
  approved: boolean;
}

export interface FightScenePlanRequest {
  storyContext: string;
  combatStyle: FightChoreographyStyle;
  pacing?: FightPacing;
  environment: string;
  previousSceneEnding?: string;
  targetDuration: number;
  numShots?: number;
  visualStyle: VisualStyle;
  aspectRatio?: AspectRatio;
  characters: Character[];
  modelId?: string;
  preferredProvider?: 'local_helper' | 'heuristic_engine';
}

export interface LocalLlmModel {
  id: string;
  name: string;
  family: 'deepseek' | 'nvidia-nemotron' | 'qwen';
  parameters: string;
  license: string;
  licenseDetails: string;
  downloadSizeGb: number;
  minVramGb: number;
  minRamGb: number;
  cpuSupported: boolean;
  repoId: string;
  description: string;
  hardwareTier: 'consumer' | 'enthusiast' | 'cpu_only';
  downloaded: boolean;
  compatible: boolean;
  recommendedFor: string;
}

