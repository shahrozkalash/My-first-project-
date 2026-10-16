import React, { useState } from 'react';
import {
  Sparkles,
  Wand2,
  Sliders,
  Ratio,
  Clock,
  Layers,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Lightbulb,
  Check,
  Swords,
  Monitor,
} from 'lucide-react';
import { VISUAL_STYLES, PROMPT_INSPIRATIONS, VIDEO_RESOLUTIONS } from '../data/constants';
import { AspectRatio, VisualStyle, Character, VideoResolution } from '../types';
import { formatDuration, DURATION_PRESETS } from '../utils/duration';

interface StoryPromptInputProps {
  prompt: string;
  setPrompt: (p: string) => void;
  style: VisualStyle;
  setStyle: (s: VisualStyle) => void;
  aspectRatio: AspectRatio;
  setAspectRatio: (ar: AspectRatio) => void;
  videoResolution?: VideoResolution;
  setVideoResolution?: (res: VideoResolution) => void;
  totalDuration: number;
  setTotalDuration: (d: number) => void;
  numScenes: number;
  setNumScenes: (n: number) => void;
  characters: Character[];
  isGenerating: boolean;
  onGenerateStory: () => Promise<void>;
  generationStepMessage?: string;
  onSelectInspiration: (insp: string) => void;
  onOpenFightPlanner?: () => void;
}

export const StoryPromptInput: React.FC<StoryPromptInputProps> = ({
  prompt,
  setPrompt,
  style,
  setStyle,
  aspectRatio,
  setAspectRatio,
  videoResolution = '720p',
  setVideoResolution,
  totalDuration,
  setTotalDuration,
  numScenes,
  setNumScenes,
  characters,
  isGenerating,
  onGenerateStory,
  generationStepMessage,
  onSelectInspiration,
  onOpenFightPlanner,
}) => {
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showInspirations, setShowInspirations] = useState(false);
  const [showCustomDurationInput, setShowCustomDurationInput] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) {
      setValidationError('Please enter a story idea or video prompt before generating.');
      return;
    }
    if (prompt.trim().length < 5) {
      setValidationError('Please provide at least a few words describing your story idea.');
      return;
    }
    setValidationError(null);
    onGenerateStory();
  };

  return (
    <div className="bg-zinc-950/80 border border-zinc-800/90 rounded-2xl p-4 sm:p-6 shadow-xl relative overflow-hidden backdrop-blur-sm">
      {/* Glow highlight */}
      <div className="absolute -top-24 -left-24 w-72 h-72 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <form onSubmit={handleSubmit} className="relative z-10 space-y-5">
        {/* Header & Quick Action */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide uppercase font-display">
                Story Idea & Video Director
              </h2>
              <p className="text-xs text-zinc-400">
                Turn your concept into a multi-scene cinematic storyboard
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {onOpenFightPlanner && (
              <button
                type="button"
                onClick={onOpenFightPlanner}
                className="flex items-center gap-1.5 text-xs text-red-300 hover:text-red-200 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 px-2.5 py-1 rounded-lg transition-colors font-medium shadow-sm shadow-red-500/10"
                title="Plan structured action choreography using free local LLM"
              >
                <Swords className="w-3.5 h-3.5 text-red-400" />
                <span>Fight Scene Planner</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowInspirations(!showInspirations)}
              className="flex items-center gap-1.5 text-xs text-purple-300 hover:text-purple-200 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 px-2.5 py-1 rounded-lg transition-colors"
            >
              <Lightbulb className="w-3.5 h-3.5 text-purple-400" />
              <span>Inspire Me</span>
            </button>
          </div>
        </div>

        {/* Inspirations dropdown */}
        {showInspirations && (
          <div className="p-3 bg-zinc-900/95 border border-purple-500/30 rounded-xl space-y-2 text-xs animate-in fade-in slide-in-from-top-2">
            <p className="text-zinc-400 font-medium">Click any cinema prompt to try it:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {PROMPT_INSPIRATIONS.map((insp, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    onSelectInspiration(insp);
                    setShowInspirations(false);
                    setValidationError(null);
                  }}
                  className="text-left p-2 rounded-lg bg-zinc-950/80 hover:bg-purple-950/40 border border-zinc-800 hover:border-purple-500/40 text-zinc-300 hover:text-white transition-all text-[11px] line-clamp-2"
                >
                  "{insp}"
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 1. Main Prompt Input Textbox */}
        <div className="space-y-1.5">
          <div className="relative">
            <textarea
              value={prompt}
              onChange={(e) => {
                setPrompt(e.target.value);
                if (validationError) setValidationError(null);
              }}
              placeholder="Describe your story idea or video scenario... (e.g. A cybernetic explorer discovering a forgotten crystalline sanctuary deep inside an icy subterranean cavern)"
              rows={3}
              disabled={isGenerating}
              className={`w-full bg-zinc-900/90 text-zinc-100 placeholder-zinc-500 border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all resize-none ${
                validationError
                  ? 'border-red-500/70 focus:border-red-500'
                  : 'border-zinc-800 focus:border-purple-500/60'
              }`}
            />
            {prompt.length > 0 && (
              <span className="absolute bottom-2.5 right-3 text-[10px] text-zinc-500">
                {prompt.length} chars
              </span>
            )}
          </div>

          {/* Validation error */}
          {validationError && (
            <div className="flex items-center gap-1.5 text-xs text-red-400 bg-red-950/30 border border-red-500/30 px-3 py-1.5 rounded-lg">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}
        </div>

        {/* 4. Visual Style Selector Cards */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
            <span>Visual Render Style</span>
            <span className="text-[11px] text-zinc-400 font-normal">
              Applied consistently to all scenes
            </span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {VISUAL_STYLES.map((styleOpt) => {
              const isSelected = style === styleOpt.id;
              return (
                <button
                  key={styleOpt.id}
                  type="button"
                  onClick={() => setStyle(styleOpt.id)}
                  disabled={isGenerating}
                  className={`relative p-3 rounded-xl border text-left transition-all overflow-hidden flex flex-col justify-between min-h-[92px] ${
                    isSelected
                      ? 'border-purple-500 bg-purple-950/20 shadow-lg shadow-purple-600/20 ring-1 ring-purple-500'
                      : 'border-zinc-800/80 bg-zinc-900/60 hover:border-zinc-700 hover:bg-zinc-900'
                  }`}
                >
                  {/* Subtle top color bar */}
                  <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${styleOpt.color}`} />
                  
                  <div className="flex items-start justify-between gap-1">
                    <span className="text-xs font-bold text-white tracking-tight">
                      {styleOpt.label}
                    </span>
                    {isSelected && (
                      <div className="w-4 h-4 rounded-full bg-purple-500 flex items-center justify-center shrink-0">
                        <Check className="w-2.5 h-2.5 text-white stroke-[3]" />
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-zinc-400 line-clamp-2 mt-1">
                    {styleOpt.tagline}
                  </p>
                  <span className="text-[9px] uppercase tracking-wider font-semibold text-purple-300/80 mt-1">
                    {styleOpt.badge}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Video Output Quality Selector */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-zinc-300 flex-wrap gap-1">
            <div className="flex items-center gap-1.5">
              <Monitor className="w-3.5 h-3.5 text-blue-400" />
              <span>Video Output Quality & Resolution</span>
              <span className="text-[10px] text-zinc-400 font-mono">
                ({aspectRatio === '9:16' ? 'Vertical 9:16' : 'Landscape 16:9'})
              </span>
            </div>
            <span className="text-[11px] text-zinc-400 font-normal">
              Applied to every scene render, video job & final MP4 export
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {VIDEO_RESOLUTIONS.map((resOpt) => {
              const isSelected = (videoResolution || '720p') === resOpt.id;
              const dims = aspectRatio === '9:16' ? resOpt.portraitDimensions : resOpt.landscapeDimensions;

              return (
                <button
                  key={resOpt.id}
                  type="button"
                  onClick={() => setVideoResolution?.(resOpt.id)}
                  disabled={isGenerating}
                  className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                    isSelected
                      ? resOpt.id === '1080p'
                        ? 'border-purple-500 bg-purple-950/30 ring-1 ring-purple-400 shadow-lg shadow-purple-600/20'
                        : resOpt.id === '720p'
                        ? 'border-blue-500 bg-blue-950/30 ring-1 ring-blue-400 shadow-lg shadow-blue-600/20'
                        : 'border-emerald-500 bg-emerald-950/30 ring-1 ring-emerald-400 shadow-lg shadow-emerald-600/20'
                      : 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-700 hover:bg-zinc-900'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white tracking-tight">
                          {resOpt.label}
                        </span>
                        {resOpt.id === '720p' && (
                          <span className="px-1.5 py-0.2 text-[9px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded">
                            Default
                          </span>
                        )}
                        {resOpt.id === '480p' && (
                          <span className="px-1.5 py-0.2 text-[9px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded">
                            Fast
                          </span>
                        )}
                        {resOpt.id === '1080p' && (
                          <span className="px-1.5 py-0.2 text-[9px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded">
                            Full HD
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-mono text-zinc-200 font-bold block mt-0.5">
                        {dims.display}
                      </span>
                    </div>

                    {isSelected && (
                      <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center shrink-0">
                        <Check className="w-2.5 h-2.5 text-white stroke-[3]" />
                      </div>
                    )}
                  </div>

                  <p className="text-[10px] text-zinc-400 mt-1.5 leading-snug">
                    {resOpt.tagline} · {resOpt.resourceDescription}
                  </p>

                  <div className="mt-2 pt-1.5 border-t border-zinc-800/80 flex items-center justify-between text-[9px] font-mono text-zinc-400">
                    <span>{resOpt.nativeWanSupport ? '✓ Native Diffusion' : '★ Local Lanczos Upscale'}</span>
                    <span className="text-zinc-500 font-medium">
                      {resOpt.resourceLevel === 'lower' ? 'Low VRAM (~4GB)' : resOpt.resourceLevel === 'balanced' ? '8-12GB VRAM' : '12GB+ VRAM'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3 & 5. Video Settings: Aspect Ratio, Duration, Scene Count */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          {/* Aspect Ratio Toggle */}
          <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-xl p-3 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300">
              <Ratio className="w-3.5 h-3.5 text-blue-400" />
              <span>Aspect Ratio</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => setAspectRatio('16:9')}
                disabled={isGenerating}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-medium border transition-all ${
                  aspectRatio === '16:9'
                    ? 'bg-blue-600 text-white border-blue-500 shadow-sm shadow-blue-600/30'
                    : 'bg-zinc-950/80 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                }`}
              >
                <span className="w-3.5 h-2 border border-current rounded-xs inline-block" />
                <span>16:9 Film</span>
              </button>
              <button
                type="button"
                onClick={() => setAspectRatio('9:16')}
                disabled={isGenerating}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-medium border transition-all ${
                  aspectRatio === '9:16'
                    ? 'bg-purple-600 text-white border-purple-500 shadow-sm shadow-purple-600/30'
                    : 'bg-zinc-950/80 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                }`}
              >
                <span className="w-2 h-3.5 border border-current rounded-xs inline-block" />
                <span>9:16 Reels</span>
              </button>
            </div>
          </div>

          {/* Total Movie Duration (Default 60s, 10m, 30m) */}
          <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-zinc-300">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-purple-400" />
                <span>Total Movie Duration</span>
              </div>
              <span className="text-purple-400 font-bold bg-purple-500/10 border border-purple-500/30 px-2 py-0.5 rounded text-[11px]">
                {formatDuration(totalDuration)} ({totalDuration}s)
              </span>
            </div>

            {/* Presets Grid */}
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
              {DURATION_PRESETS.map((preset) => {
                const isSelected = totalDuration === preset.seconds;
                return (
                  <button
                    key={preset.seconds}
                    type="button"
                    onClick={() => {
                      setTotalDuration(preset.seconds);
                      setShowCustomDurationInput(false);
                    }}
                    disabled={isGenerating}
                    className={`py-2 px-1 text-[11px] font-medium rounded-lg border text-center transition-all relative ${
                      isSelected
                        ? 'bg-purple-600 text-white border-purple-500 shadow-sm shadow-purple-600/30 font-bold ring-1 ring-purple-400'
                        : 'bg-zinc-950/80 text-zinc-400 border-zinc-800 hover:text-zinc-200 hover:border-zinc-700'
                    }`}
                  >
                    <div>{preset.label}</div>
                    {preset.tag && (
                      <span className={`text-[8px] uppercase tracking-wider block font-semibold ${
                        isSelected ? 'text-purple-200' : 'text-zinc-500'
                      }`}>
                        {preset.tag}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Custom Duration Toggle & Input */}
            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-zinc-800/60">
              <button
                type="button"
                onClick={() => setShowCustomDurationInput(!showCustomDurationInput)}
                className="text-purple-400 hover:text-purple-300 flex items-center gap-1 font-medium transition-colors"
              >
                <span>{showCustomDurationInput ? 'Hide Custom Duration' : 'Custom Duration (seconds / min)'}</span>
              </button>

              <span className="text-zinc-400">
                Pacing: <strong className="text-purple-300">~{Math.max(1, Math.round(totalDuration / numScenes))}s / scene</strong>
              </span>
            </div>

            {showCustomDurationInput && (
              <div className="flex items-center gap-2 p-2 bg-zinc-950/90 border border-purple-500/30 rounded-lg animate-in fade-in">
                <span className="text-[11px] text-zinc-400">Set exact total seconds:</span>
                <input
                  type="number"
                  min={5}
                  max={7200}
                  value={totalDuration}
                  onChange={(e) => setTotalDuration(Math.max(5, Math.min(7200, Number(e.target.value) || 60)))}
                  className="w-24 bg-zinc-900 border border-zinc-700 text-white px-2 py-1 rounded text-xs text-center font-mono focus:outline-none focus:border-purple-500"
                />
                <span className="text-[11px] text-zinc-400">sec ({formatDuration(totalDuration)})</span>
              </div>
            )}
          </div>

          {/* Number of Scenes & Pacing */}
          <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-zinc-300">
              <div className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                <span>Scenes & Pacing</span>
              </div>
              <span className="text-indigo-400 font-bold">{numScenes} scenes</span>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-7 gap-1">
              {[2, 4, 6, 8, 12, 16, 24].map((count) => {
                const isSelected = numScenes === count;
                const avgShot = Math.round(totalDuration / count);
                const isFiveSec = avgShot === 5;

                return (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setNumScenes(count)}
                    disabled={isGenerating}
                    className={`py-1.5 text-xs font-medium rounded-lg border text-center transition-all relative ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm shadow-indigo-600/30 ring-1 ring-indigo-400'
                        : 'bg-zinc-950/80 text-zinc-400 border-zinc-800 hover:text-zinc-200 hover:border-zinc-700'
                    }`}
                  >
                    <span>{count}</span>
                    {isFiveSec && (
                      <span className="block text-[8px] text-amber-300 font-bold">5s/shot</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Quick 5-second scene shortcut if available */}
            <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1 border-t border-zinc-800/60 flex-wrap gap-1">
              <div className="flex items-center gap-1.5">
                <span>{formatDuration(totalDuration)} ÷ {numScenes} =</span>
                <strong className="text-indigo-300">
                  ~{(totalDuration / numScenes).toFixed(totalDuration % numScenes === 0 ? 0 : 1)}s per scene
                </strong>
              </div>

              {totalDuration === 60 && numScenes !== 12 && (
                <button
                  type="button"
                  onClick={() => setNumScenes(12)}
                  className="text-[10px] text-amber-400 hover:text-amber-300 underline font-semibold"
                >
                  ⚡ Set 12 shots (5s each)
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Character consistency hint */}
        {characters.length > 0 && (
          <div className="flex items-center justify-between px-3 py-2 bg-purple-950/20 border border-purple-500/20 rounded-xl text-xs text-purple-300">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>
                <strong>{characters.length} character{characters.length > 1 ? 's' : ''} locked:</strong>{' '}
                {characters.map((c) => c.name).join(', ')} will be consistently directed across scenes.
              </span>
            </div>
          </div>
        )}

        {/* 2. Generation Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <button
            type="submit"
            disabled={isGenerating}
            className={`sm:col-span-2 py-3.5 px-6 rounded-xl font-display font-semibold text-sm text-white flex items-center justify-center gap-2.5 transition-all shadow-xl active:scale-[0.99] ${
              isGenerating
                ? 'bg-zinc-800 text-zinc-400 cursor-not-allowed border border-zinc-700'
                : 'bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 shadow-purple-600/30 hover:shadow-purple-500/50 border border-purple-400/30'
            }`}
          >
            {isGenerating ? (
              <>
                <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                <span>{generationStepMessage || 'Generating Storyboard & Scenes...'}</span>
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4 text-purple-200" />
                <span>Generate Story & Sequential Scenes</span>
              </>
            )}
          </button>

          {onOpenFightPlanner && (
            <button
              type="button"
              onClick={onOpenFightPlanner}
              disabled={isGenerating}
              className="py-3.5 px-4 rounded-xl font-display font-semibold text-sm text-red-200 bg-red-950/40 hover:bg-red-900/50 border border-red-500/40 hover:border-red-400/60 shadow-lg shadow-red-950/40 flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
              title="Plan a cinematic fight scene with character continuity using free local LLM"
            >
              <Swords className="w-4 h-4 text-red-400" />
              <span>Plan Fight Scene</span>
            </button>
          )}
        </div>
      </form>
    </div>
  );
};
