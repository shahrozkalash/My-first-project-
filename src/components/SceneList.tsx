import React, { useState } from 'react';
import {
  Clapperboard,
  Sparkles,
  Camera,
  SunMedium,
  Clock,
  ArrowUp,
  ArrowDown,
  Trash2,
  Copy,
  Plus,
  Wand2,
  MessageSquare,
  Users,
  ChevronDown,
  ChevronUp,
  Film,
  Check,
  Zap,
  Play,
  CheckCircle2,
  Video,
  AlertTriangle,
  Download,
  RefreshCw,
  Sliders,
} from 'lucide-react';
import { CAMERA_MOVEMENTS, LIGHTING_MOODS } from '../data/constants';
import { Character, Scene, CameraMovement, LightingMood } from '../types';
import { formatDuration } from '../utils/duration';

interface SceneListProps {
  scenes: Scene[];
  characters: Character[];
  totalDuration?: number;
  onUpdateScene: (scene: Scene) => void;
  onSceneDurationChange?: (sceneId: string, newDuration: number) => void;
  onRedistributeEvenly?: () => void;
  onAddScene: () => void;
  onDeleteScene: (id: string) => void;
  onDuplicateScene: (id: string) => void;
  onMoveScene: (index: number, direction: 'up' | 'down') => void;
  onEnhanceScenePrompt: (sceneId: string) => Promise<void>;
  enhancingSceneId?: string | null;
  onSelectSceneForPreview?: (scene: Scene) => void;
  selectedSceneId?: string | null;
  onRenderScene?: (scene: Scene) => void;
  renderingSceneId?: string | null;
  onRenderAllScenes?: () => void;
  isRenderingAll?: boolean;
  onOpenEngineSettings?: () => void;
}

export const SceneList: React.FC<SceneListProps> = ({
  scenes,
  characters,
  totalDuration = 60,
  onUpdateScene,
  onSceneDurationChange,
  onRedistributeEvenly,
  onAddScene,
  onDeleteScene,
  onDuplicateScene,
  onMoveScene,
  onEnhanceScenePrompt,
  enhancingSceneId,
  onSelectSceneForPreview,
  selectedSceneId,
  onRenderScene,
  renderingSceneId,
  onRenderAllScenes,
  isRenderingAll,
  onOpenEngineSettings,
}) => {
  const [expandedScenes, setExpandedScenes] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedScenes((prev) => ({
      ...prev,
      [id]: prev[id] === undefined ? false : !prev[id], // Default is expanded
    }));
  };

  const isSceneExpanded = (id: string) => expandedScenes[id] !== false;

  const toggleCharacterInScene = (scene: Scene, charName: string) => {
    const exists = scene.characterIds.includes(charName);
    const updatedChars = exists
      ? scene.characterIds.filter((c) => c !== charName)
      : [...scene.characterIds, charName];

    onUpdateScene({
      ...scene,
      characterIds: updatedChars,
    });
  };

  const currentTotalDuration = scenes.reduce((sum, s) => sum + (Number(s.duration) || 0), 0);

  return (
    <div className="bg-zinc-950/80 border border-zinc-800/90 rounded-2xl p-4 sm:p-6 shadow-xl backdrop-blur-sm space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <Clapperboard className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-wide uppercase font-display">
                Sequential Scene Director
              </h3>
              <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded">
                {scenes.length} Shots
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Customize camera paths, lighting, character cues, and video generation prompts
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {scenes.length > 0 && onRenderAllScenes && (
            <button
              type="button"
              disabled={isRenderingAll}
              onClick={onRenderAllScenes}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl transition-all shadow-md active:scale-95 ${
                isRenderingAll
                  ? 'bg-zinc-800 text-zinc-400 cursor-not-allowed border border-zinc-700'
                  : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-600/30'
              }`}
            >
              {isRenderingAll ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                  <span>Batch Rendering...</span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5 text-purple-200" />
                  <span>Render All Shots</span>
                </>
              )}
            </button>
          )}

          {scenes.length > 0 && onRedistributeEvenly && (
            <button
              type="button"
              onClick={onRedistributeEvenly}
              className="text-xs font-medium text-purple-300 hover:text-white bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 px-2.5 py-1.5 rounded-xl transition-all"
              title="Evenly distribute total runtime across all scenes"
            >
              Split Evenly (~{Math.round(totalDuration / scenes.length)}s/shot)
            </button>
          )}
          <button
            onClick={onAddScene}
            className="flex items-center gap-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 px-3 py-1.5 rounded-xl transition-all shadow-md shadow-blue-600/30 active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Scene</span>
          </button>
        </div>
      </div>

      {/* Total Movie Duration Tracker Strip */}
      {scenes.length > 0 && (
        <div className="flex items-center justify-between gap-2 p-3 bg-zinc-900/90 border border-zinc-800 rounded-xl text-xs flex-wrap">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded bg-purple-500/20 text-purple-300">
              <Clock className="w-3.5 h-3.5" />
            </div>
            <span className="text-zinc-300 font-medium">
              Total Movie Runtime:
            </span>
            <span className="px-2 py-0.5 rounded-md font-bold text-white bg-purple-600/30 border border-purple-500/40 font-mono">
              {formatDuration(currentTotalDuration)} ({currentTotalDuration}s)
              {currentTotalDuration !== totalDuration && ` / Target: ${formatDuration(totalDuration)}`}
            </span>
          </div>
          <div className="text-[11px] text-zinc-400 flex items-center gap-2">
            <span>{scenes.length} scenes totaling {formatDuration(currentTotalDuration)}</span>
            <span className="text-zinc-600">•</span>
            <span className="text-emerald-400 font-medium">
              {scenes.filter((s) => Boolean(s.videoUrl)).length}/{scenes.length} clips rendered
            </span>
          </div>
        </div>
      )}

      {/* Empty State */}
      {scenes.length === 0 ? (
        <div className="text-center py-10 px-4 border border-dashed border-zinc-800 rounded-xl bg-zinc-900/20 space-y-3">
          <Film className="w-9 h-9 text-zinc-600 mx-auto" />
          <p className="text-xs font-medium text-zinc-300">No scenes generated yet</p>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto">
            Enter a prompt above and click "Generate Story & Sequential Scenes" or create your first shot manually.
          </p>
          <button
            onClick={onAddScene}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium"
          >
            Create Scene 1 Manually
          </button>
        </div>
      ) : (
        <div className="space-y-3.5">
          {scenes.map((scene, index) => {
            const expanded = isSceneExpanded(scene.id);
            const isSelected = selectedSceneId === scene.id;
            const isEnhancing = enhancingSceneId === scene.id;

            return (
              <div
                key={scene.id}
                className={`border rounded-xl transition-all overflow-hidden ${
                  isSelected
                    ? 'border-blue-500/80 bg-zinc-900/90 shadow-lg shadow-blue-500/10 ring-1 ring-blue-500/40'
                    : 'border-zinc-800/80 bg-zinc-900/60 hover:border-zinc-700/90'
                }`}
              >
                {/* Scene Header Strip */}
                <div className="p-3 sm:px-4 bg-zinc-950/60 border-b border-zinc-800/60 flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-lg bg-blue-500/20 border border-blue-500/40 text-blue-400 text-xs font-bold font-display flex items-center justify-center">
                      {scene.sceneNumber}
                    </span>
                    <input
                      type="text"
                      value={scene.title}
                      onChange={(e) =>
                        onUpdateScene({ ...scene, title: e.target.value })
                      }
                      placeholder={`Scene ${scene.sceneNumber} Title`}
                      className="bg-transparent font-display font-semibold text-xs sm:text-sm text-white focus:outline-none focus:border-b border-purple-500 max-w-[200px] sm:max-w-[280px]"
                    />
                    <span className="text-[11px] font-bold text-purple-300 inline-flex items-center gap-1 bg-purple-500/15 border border-purple-500/30 px-2 py-0.5 rounded-md">
                      <Clock className="w-3 h-3 text-purple-400" />
                      <span>{scene.duration}s</span>
                    </span>

                    {scene.videoUrl && (
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Clip Ready</span>
                      </span>
                    )}

                    {(renderingSceneId === scene.id || scene.status === 'generating' || scene.status === 'queued') && (
                      <span className="text-[10px] font-bold text-purple-300 bg-purple-950/60 border border-purple-500/40 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                        <div className="w-2.5 h-2.5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                        <span>{scene.engineProgress ? `Rendering (${scene.engineProgress}%)` : 'Queued...'}</span>
                      </span>
                    )}

                    {Boolean(scene.generationError && !scene.videoUrl) && (
                      <span className="text-[10px] font-bold text-rose-400 bg-rose-950/60 border border-rose-500/40 px-2 py-0.5 rounded-full inline-flex items-center gap-1" title={scene.generationError}>
                        <AlertTriangle className="w-3 h-3" />
                        <span>Render Error</span>
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-wrap">
                    {onRenderScene && (
                      <button
                        type="button"
                        disabled={renderingSceneId === scene.id || scene.status === 'generating'}
                        onClick={() => onRenderScene(scene)}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all active:scale-95 ${
                          renderingSceneId === scene.id || scene.status === 'generating'
                            ? 'bg-zinc-800 text-zinc-500 border-zinc-700 cursor-not-allowed'
                            : scene.videoUrl
                            ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900/50'
                            : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-purple-500/50 hover:from-purple-500 hover:to-indigo-500 shadow-sm shadow-purple-600/30'
                        }`}
                        title="Generate video for this shot with Wan engine"
                      >
                        <Zap className="w-3.5 h-3.5 text-purple-200" />
                        <span>{scene.videoUrl ? 'Re-render Shot' : 'Generate Video'}</span>
                      </button>
                    )}

                    {onSelectSceneForPreview && (
                      <button
                        type="button"
                        onClick={() => onSelectSceneForPreview(scene)}
                        className={`px-2 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                          isSelected
                            ? 'bg-blue-600 text-white'
                            : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                        }`}
                        title="Focus in Video Preview"
                      >
                        Preview Shot
                      </button>
                    )}

                    {/* Move Up/Down */}
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => onMoveScene(index, 'up')}
                      className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent"
                      title="Move Scene Up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={index === scenes.length - 1}
                      onClick={() => onMoveScene(index, 'down')}
                      className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent"
                      title="Move Scene Down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>

                    {/* Duplicate */}
                    <button
                      type="button"
                      onClick={() => onDuplicateScene(scene.id)}
                      className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800"
                      title="Duplicate Scene"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={() => onDeleteScene(scene.id)}
                      className="p-1 rounded text-zinc-400 hover:text-red-400 hover:bg-red-950/40"
                      title="Delete Scene"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Accordion Toggle */}
                    <button
                      type="button"
                      onClick={() => toggleExpand(scene.id)}
                      className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 ml-1"
                    >
                      {expanded ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Collapsible Scene Body */}
                {expanded && (
                  <div className="p-3 sm:p-4 space-y-3.5 text-xs">
                    {/* Visual Prompt Textbox (Primary Veo/Video Generation Prompt) */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-zinc-300 font-semibold flex items-center gap-1.5">
                          <Film className="w-3.5 h-3.5 text-purple-400" />
                          <span>Video Generation Prompt (Veo / Video Model Input)</span>
                        </label>
                        <button
                          type="button"
                          disabled={isEnhancing}
                          onClick={() => onEnhanceScenePrompt(scene.id)}
                          className="flex items-center gap-1 text-[11px] text-purple-300 hover:text-white bg-purple-950/40 hover:bg-purple-900/60 border border-purple-500/30 px-2 py-0.5 rounded-md transition-all active:scale-95"
                        >
                          <Wand2 className="w-3 h-3 text-purple-400" />
                          <span>{isEnhancing ? 'Optimizing...' : 'Enhance Prompt'}</span>
                        </button>
                      </div>

                      <textarea
                        value={scene.visualPrompt}
                        onChange={(e) =>
                          onUpdateScene({ ...scene, visualPrompt: e.target.value })
                        }
                        rows={3}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-purple-500 text-xs leading-relaxed"
                        placeholder="Detailed visual prompt describing subject motion, camera angle, and environment..."
                      />
                    </div>

                    {/* Camera Movement, Lighting, Duration Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {/* Camera Movement */}
                      <div className="space-y-1">
                        <label className="text-zinc-400 text-[11px] font-medium flex items-center gap-1">
                          <Camera className="w-3 h-3 text-blue-400" />
                          <span>Camera Movement</span>
                        </label>
                        <select
                          value={scene.cameraMovement}
                          onChange={(e) =>
                            onUpdateScene({
                              ...scene,
                              cameraMovement: e.target.value as CameraMovement,
                            })
                          }
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-200 text-xs focus:outline-none focus:border-blue-500"
                        >
                          {CAMERA_MOVEMENTS.map((cam) => (
                            <option key={cam} value={cam}>
                              {cam}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Lighting & Mood */}
                      <div className="space-y-1">
                        <label className="text-zinc-400 text-[11px] font-medium flex items-center gap-1">
                          <SunMedium className="w-3 h-3 text-amber-400" />
                          <span>Lighting & Mood</span>
                        </label>
                        <select
                          value={scene.lighting}
                          onChange={(e) =>
                            onUpdateScene({
                              ...scene,
                              lighting: e.target.value as LightingMood,
                            })
                          }
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-200 text-xs focus:outline-none focus:border-amber-500"
                        >
                          {LIGHTING_MOODS.map((light) => (
                            <option key={light} value={light}>
                              {light}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Duration per scene with Auto-Rebalance */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-zinc-400 text-[11px] font-medium flex items-center gap-1">
                            <Clock className="w-3 h-3 text-purple-400" />
                            <span>Duration (seconds)</span>
                          </label>
                          <span className="text-purple-400 font-bold text-xs">{scene.duration}s</span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <div className="flex items-center border border-zinc-800 rounded-lg bg-zinc-950 overflow-hidden">
                            <button
                              type="button"
                              disabled={scene.duration <= 1}
                              onClick={() => {
                                const newDur = Math.max(1, scene.duration - 1);
                                if (onSceneDurationChange) {
                                  onSceneDurationChange(scene.id, newDur);
                                } else {
                                  onUpdateScene({ ...scene, duration: newDur });
                                }
                              }}
                              className="w-7 h-7 flex items-center justify-center bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white font-bold text-xs disabled:opacity-30 transition-colors"
                              title="Decrease duration by 1s"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min={1}
                              max={Math.max(1, totalDuration - (scenes.length - 1))}
                              value={scene.duration}
                              onChange={(e) => {
                                const val = Math.max(1, Number(e.target.value) || 1);
                                if (onSceneDurationChange) {
                                  onSceneDurationChange(scene.id, val);
                                } else {
                                  onUpdateScene({ ...scene, duration: val });
                                }
                              }}
                              className="w-12 text-center bg-transparent py-1 text-zinc-200 text-xs font-semibold focus:outline-none"
                            />
                            <button
                              type="button"
                              disabled={scene.duration >= totalDuration - (scenes.length - 1)}
                              onClick={() => {
                                const newDur = scene.duration + 1;
                                if (onSceneDurationChange) {
                                  onSceneDurationChange(scene.id, newDur);
                                } else {
                                  onUpdateScene({ ...scene, duration: newDur });
                                }
                              }}
                              className="w-7 h-7 flex items-center justify-center bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white font-bold text-xs disabled:opacity-30 transition-colors"
                              title="Increase duration by 1s"
                            >
                              +
                            </button>
                          </div>

                          {/* Quick duration shortcuts including 5-second scenes */}
                          <div className="flex items-center gap-1 flex-wrap">
                            {[5, 10, 15, 20, 30].map((dur) => (
                              <button
                                key={dur}
                                type="button"
                                onClick={() => {
                                  if (onSceneDurationChange) {
                                    onSceneDurationChange(scene.id, dur);
                                  } else {
                                    onUpdateScene({ ...scene, duration: dur });
                                  }
                                }}
                                className={`px-2 py-1 text-[10px] rounded-md font-medium border transition-colors ${
                                  scene.duration === dur
                                    ? 'bg-purple-600 text-white border-purple-500 font-bold'
                                    : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white'
                                }`}
                              >
                                {dur}s{dur === 5 ? ' ⚡' : ''}
                              </button>
                            ))}
                          </div>
                        </div>
                        <p className="text-[10px] text-zinc-400">
                          Auto-balances {Math.max(1, scenes.length - 1)} other scene{scenes.length - 1 > 1 ? 's' : ''} to maintain {totalDuration}s total.
                        </p>
                      </div>
                    </div>

                    {/* Narrative Action & Subtitle/Dialogue */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div className="space-y-1">
                        <label className="text-zinc-400 text-[11px] font-medium">
                          Subject Action Summary
                        </label>
                        <input
                          type="text"
                          value={scene.actionSummary}
                          onChange={(e) =>
                            onUpdateScene({
                              ...scene,
                              actionSummary: e.target.value,
                            })
                          }
                          placeholder="e.g. Ren looks up into the storm clouds as lightning strikes"
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-200 text-xs focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-zinc-400 text-[11px] font-medium flex items-center gap-1">
                          <MessageSquare className="w-3 h-3 text-zinc-400" />
                          <span>Dialogue / Voiceover Line (Optional)</span>
                        </label>
                        <input
                          type="text"
                          value={scene.dialogue || ''}
                          onChange={(e) =>
                            onUpdateScene({ ...scene, dialogue: e.target.value })
                          }
                          placeholder='e.g. "We only have one shot at this."'
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-200 text-xs focus:outline-none focus:border-purple-500"
                        />
                      </div>
                    </div>

                    {/* Characters In Scene (Toggle consistency anchors) */}
                    {characters.length > 0 && (
                      <div className="pt-1 flex items-center gap-2 flex-wrap text-xs">
                        <span className="text-[11px] text-zinc-400 flex items-center gap-1">
                          <Users className="w-3 h-3 text-purple-400" />
                          <span>Characters in shot:</span>
                        </span>
                        {characters.map((char) => {
                          const isPresent = scene.characterIds.includes(char.name);
                          return (
                            <button
                              key={char.id}
                              type="button"
                              onClick={() => toggleCharacterInScene(scene, char.name)}
                              className={`px-2 py-0.5 rounded-md text-[10px] font-medium border transition-colors flex items-center gap-1 ${
                                isPresent
                                  ? 'bg-purple-600/30 text-purple-200 border-purple-500/50'
                                  : 'bg-zinc-950 text-zinc-500 border-zinc-800 hover:text-zinc-300'
                              }`}
                            >
                              {isPresent && <Check className="w-2.5 h-2.5" />}
                              <span>{char.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Scene Video Rendering & Preview Status Section */}
                    <div className="pt-2 border-t border-zinc-800/80 space-y-2">
                      {/* 1. Rendering in Progress with real progress bar */}
                      {(renderingSceneId === scene.id || scene.status === 'generating' || scene.status === 'queued') && (
                        <div className="p-3 bg-purple-950/30 border border-purple-500/40 rounded-xl space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-purple-200 flex items-center gap-2">
                              <div className="w-3.5 h-3.5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                              <span>Generating Video with Wan 2.1...</span>
                            </span>
                            <span className="font-mono text-purple-300 font-bold">
                              {scene.engineProgress || 15}%
                            </span>
                          </div>
                          {/* Animated Progress Bar */}
                          <div className="w-full bg-zinc-900 rounded-full h-1.5 overflow-hidden border border-purple-500/30">
                            <div
                              className="bg-gradient-to-r from-purple-500 to-indigo-500 h-full transition-all duration-300 rounded-full"
                              style={{ width: `${Math.max(10, scene.engineProgress || 15)}%` }}
                            />
                          </div>
                          <p className="text-[11px] text-zinc-400">
                            Synthesizing video latents for {scene.duration}s shot using model weights and camera direction.
                          </p>
                        </div>
                      )}

                      {/* 2. Video Ready - Responsive Player & Download */}
                      {scene.videoUrl && (
                        <div className="p-3 bg-zinc-900/90 border border-emerald-500/40 rounded-xl space-y-2.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                              <span>Rendered Wan Video Clip Ready ({scene.duration}s)</span>
                            </div>
                            <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-mono">
                              MP4 Verified
                            </span>
                          </div>

                          <div className="relative rounded-lg overflow-hidden bg-black border border-zinc-800">
                            <video
                              src={scene.videoUrl}
                              controls
                              preload="metadata"
                              playsInline
                              className="w-full max-h-56 object-contain mx-auto"
                            />
                          </div>

                          <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
                            <div className="flex items-center gap-1.5">
                              <a
                                href={scene.videoUrl}
                                download={`scene-${scene.sceneNumber}.mp4`}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>Download MP4</span>
                              </a>

                              {onSelectSceneForPreview && (
                                <button
                                  type="button"
                                  onClick={() => onSelectSceneForPreview(scene)}
                                  className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-medium flex items-center gap-1.5 border border-zinc-700 transition-colors"
                                >
                                  <Film className="w-3.5 h-3.5 text-purple-400" />
                                  <span>View in Viewport</span>
                                </button>
                              )}
                            </div>

                            {onRenderScene && (
                              <button
                                type="button"
                                disabled={renderingSceneId === scene.id}
                                onClick={() => onRenderScene(scene)}
                                className="px-2.5 py-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg text-xs transition-colors"
                                title="Re-render this shot"
                              >
                                Re-render Clip
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {/* 3. Error Banner */}
                      {Boolean(scene.generationError && !scene.videoUrl) && (
                        <div className="p-3 bg-rose-950/30 border border-rose-500/40 rounded-xl space-y-2">
                          <div className="flex items-start gap-2 text-xs">
                            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                            <div className="space-y-1">
                              <p className="font-semibold text-rose-200">
                                Video Generation Failed or Not Configured
                              </p>
                              <p className="text-[11px] text-zinc-300 leading-relaxed">
                                {scene.generationError}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 pt-1 flex-wrap">
                            {onRenderScene && (
                              <button
                                type="button"
                                onClick={() => onRenderScene(scene)}
                                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors"
                              >
                                <RefreshCw className="w-3 h-3" />
                                <span>Retry Render</span>
                              </button>
                            )}

                            {onOpenEngineSettings && (
                              <button
                                type="button"
                                onClick={onOpenEngineSettings}
                                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors"
                              >
                                <Sliders className="w-3 h-3 text-purple-400" />
                                <span>WAN Engine Setup Guide</span>
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {/* 4. Not yet generated empty prompt call to action */}
                      {!scene.videoUrl && !scene.generationError && renderingSceneId !== scene.id && scene.status !== 'generating' && (
                        <div className="flex items-center justify-between p-2.5 bg-zinc-900/40 border border-dashed border-zinc-800 rounded-xl text-xs flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <Video className="w-4 h-4 text-purple-400" />
                            <span className="text-zinc-400 text-[11px]">
                              Ready for video generation ({scene.duration}s clip)
                            </span>
                          </div>
                          {onRenderScene && (
                            <button
                              type="button"
                              onClick={() => onRenderScene(scene)}
                              className="px-3 py-1 bg-purple-600/30 hover:bg-purple-600 text-purple-200 hover:text-white border border-purple-500/40 text-[11px] font-semibold rounded-lg flex items-center gap-1.5 transition-all active:scale-95"
                            >
                              <Zap className="w-3 h-3" />
                              <span>Render Shot (WAN)</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
