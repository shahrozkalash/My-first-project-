import React, { useState, useEffect } from 'react';
import {
  Swords,
  Shield,
  Zap,
  Target,
  Cpu,
  Flame,
  X,
  Sparkles,
  Clock,
  Layers,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
  HardDrive,
  Download,
  Play,
  Film,
  Edit3,
  Check,
  RefreshCw,
  Plus,
  Trash2,
  Volume2,
  Eye,
  Info,
  ExternalLink,
} from 'lucide-react';
import {
  Character,
  FightChoreographyStyle,
  FightPacing,
  FightScenePlan,
  FightShot,
  LocalLlmModel,
  Project,
  Scene,
  VisualStyle,
} from '../types';
import {
  FIGHT_CHOREOGRAPHY_STYLES,
  SUPPORTED_LOCAL_LLM_MODELS,
  VISUAL_STYLES,
} from '../data/constants';
import {
  validateFightScenePlan,
  convertFightPlanToScenes,
  generateHeuristicFightScenePlan,
} from '../utils/fightPlannerEngine';

interface FightScenePlannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeProject: Project;
  onUpdateProject: (updated: Project) => void;
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
  onNavigateToLocalEngine?: () => void;
}

export const FightScenePlannerModal: React.FC<FightScenePlannerModalProps> = ({
  isOpen,
  onClose,
  activeProject,
  onUpdateProject,
  onShowToast,
  onNavigateToLocalEngine,
}) => {
  // Wizard / View State
  const [activeStep, setActiveStep] = useState<'configure' | 'review'>('configure');

  // Input Configuration State
  const [storyContext, setStoryContext] = useState(activeProject.prompt || '');
  const [combatStyle, setCombatStyle] = useState<FightChoreographyStyle>('martial-arts');
  const [pacing, setPacing] = useState<FightPacing>('rapid-kinetic');
  const [environment, setEnvironment] = useState(
    'Rain-slicked alleyway surrounded by decaying brick, rusted fire escapes, and flickering neon reflections'
  );
  const [previousSceneEnding, setPreviousSceneEnding] = useState(
    'The characters lock eyes as tension breaks and weapons are drawn'
  );
  const [targetDuration, setTargetDuration] = useState<number>(20);
  const [numShots, setNumShots] = useState<number>(4);
  const [visualStyle, setVisualStyle] = useState<VisualStyle>(activeProject.style || 'cinematic');
  const [selectedModelId, setSelectedModelId] = useState<string>('deepseek-r1-distill-qwen-1.5b');

  // Model & Hardware State
  const [llmModels, setLlmModels] = useState<LocalLlmModel[]>(SUPPORTED_LOCAL_LLM_MODELS);
  const [isHelperOnline, setIsHelperOnline] = useState<boolean>(false);
  const [hardwareInfo, setHardwareInfo] = useState<any>(null);
  const [isLoadingModels, setIsLoadingModels] = useState<boolean>(false);

  // Generation & Plan Review State
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationStep, setGenerationStep] = useState<string>('');
  const [currentPlan, setCurrentPlan] = useState<FightScenePlan | null>(null);
  const [editingShotIdx, setEditingShotIdx] = useState<number | null>(null);
  const [modelSetupError, setModelSetupError] = useState<{
    message: string;
    requiredModel: string;
    license: string;
  } | null>(null);

  // Environment suggestions
  const environmentPresets = [
    'Rain-slicked alleyway surrounded by decaying brick, rusted fire escapes, and flickering neon reflections',
    'High-altitude glass rooftop during a stormy twilight with torrential wind and lightning',
    'Ancient abandoned temple courtyard filled with mossy stone steps, cracked pillars, and falling autumn leaves',
    'Subterranean cybernetic server bunker with humming mainframe racks and sparking high-voltage conduits',
    'Grand vintage ballroom with polished oak floors, towering arched windows, and a swinging crystal chandelier',
  ];

  // Load local model status on modal open
  useEffect(() => {
    if (isOpen) {
      fetchLlmModelStatus();
      if (activeProject.prompt && !storyContext) {
        setStoryContext(activeProject.prompt);
      }
    }
  }, [isOpen]);

  const fetchLlmModelStatus = async () => {
    setIsLoadingModels(true);
    try {
      const res = await fetch('/api/fight-planner/models');
      if (res.ok) {
        const data = await res.json();
        if (data.models) {
          setLlmModels(data.models);
        }
        setIsHelperOnline(Boolean(data.isHelperReachable));
        setHardwareInfo(data.hardware || null);
      }
    } catch (e) {
      // Offline fallback
    } finally {
      setIsLoadingModels(false);
    }
  };

  if (!isOpen) return null;

  const selectedModelMeta = llmModels.find((m) => m.id === selectedModelId) || llmModels[0];

  // Handle Generate Fight Scene Plan
  const handleGeneratePlan = async (forceOfflineFallback = false) => {
    if (!environment.trim()) {
      onShowToast('Please provide an environment description for spatial fight blocking.', 'error');
      return;
    }

    setIsGenerating(true);
    setModelSetupError(null);
    setGenerationStep('Analyzing combatants, weapon momentum & spatial blocking...');

    try {
      const timer1 = setTimeout(() => {
        setGenerationStep('Computing non-graphic cause-and-effect choreography...');
      }, 600);
      const timer2 = setTimeout(() => {
        setGenerationStep('Anchoring character visual and costume continuity across shots...');
      }, 1200);

      const res = await fetch('/api/fight-planner/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storyContext,
          combatStyle,
          pacing,
          environment,
          previousSceneEnding,
          targetDuration,
          numShots,
          visualStyle,
          aspectRatio: activeProject.aspectRatio,
          characters: activeProject.characters,
          modelId: selectedModelId,
          forceOfflineFallback,
        }),
      });

      clearTimeout(timer1);
      clearTimeout(timer2);

      if (res.status === 412) {
        const errorData = await res.json();
        setModelSetupError({
          message: errorData.message || 'Local model weights not installed.',
          requiredModel: errorData.requiredModel || selectedModelId,
          license: errorData.license || selectedModelMeta.license,
        });
        setIsGenerating(false);
        return;
      }

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to generate fight plan');
      }

      const data = await res.json().catch(() => null);
      if (data && data.success && data.plan) {
        setCurrentPlan(data.plan);
        setActiveStep('review');
        onShowToast(
          data.source === 'local_hardware_llm'
            ? `Generated fight choreography using local GPU ${selectedModelMeta.name}!`
            : 'Synthesized connected fight choreography plan!',
          'success'
        );
      } else {
        throw new Error(data?.message || 'Unknown response from planner');
      }
    } catch (err: any) {
      // Resilient fallback for static hosting (GitHub Pages) or offline helper
      try {
        const localPlan = generateHeuristicFightScenePlan({
          storyContext,
          combatStyle,
          pacing,
          environment,
          previousSceneEnding,
          targetDuration,
          numShots,
          visualStyle,
          aspectRatio: activeProject.aspectRatio,
          characters: activeProject.characters,
          modelId: selectedModelId,
        });
        setCurrentPlan(localPlan);
        setActiveStep('review');
        onShowToast('Synthesized connected fight choreography via local engine!', 'success');
      } catch (fallbackErr: any) {
        onShowToast(`Planner error: ${err.message}`, 'error');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // Shot Editor Actions
  const handleUpdateShotField = (shotIdx: number, field: keyof FightShot, value: any) => {
    if (!currentPlan) return;
    const updatedShots = [...currentPlan.shots];
    updatedShots[shotIdx] = {
      ...updatedShots[shotIdx],
      [field]: value,
    };
    setCurrentPlan({
      ...currentPlan,
      shots: updatedShots,
    });
  };

  // Add new shot
  const handleAddShot = () => {
    if (!currentPlan) return;
    const newShotNum = currentPlan.shots.length + 1;
    const newShot: FightShot = {
      shotNumber: newShotNum,
      title: `Shot ${newShotNum} - Counter & Standoff`,
      duration: 4,
      characterPositions: 'Both fighters circle cautiously in center frame',
      movementChoreography: 'Combatants exchange rapid parries before disengaging into defensive postures',
      expressions: 'Intense focus, eyes locked on opponent movements',
      cameraMovement: 'Dynamic Handheld Follow',
      lighting: 'Dramatic Chiaroscuro',
      environmentInteraction: 'Dust settles around combatants boots',
      transition: 'Cut to dramatic wide shot',
      dialogue: '',
      soundEffects: [
        {
          id: `sfx-new-${newShotNum}`,
          name: 'Blade / Glove Parry',
          category: 'impact',
          startTime: 0.5,
          duration: 1.5,
          volume: 0.8,
          soundType: 'impact_whoosh',
          description: 'Sharp kinetic impact and rapid whoosh',
        },
      ],
      visualPrompt: `35mm Panavision anamorphic cinematic still. Scene Fight Shot ${newShotNum}. In ${currentPlan.environment}. Feat. ${activeProject.characters.map((c) => c.name).join(' and ')}. Choreography: Both fighters circle cautiously before executing clean deflections. Aspect ratio ${currentPlan.aspectRatio}.`,
      characterIds: activeProject.characters.map((c) => c.name),
    };

    setCurrentPlan({
      ...currentPlan,
      shots: [...currentPlan.shots, newShot],
      targetTotalDuration: currentPlan.targetTotalDuration + 4,
    });
    setEditingShotIdx(currentPlan.shots.length);
  };

  // Remove shot
  const handleRemoveShot = (idx: number) => {
    if (!currentPlan || currentPlan.shots.length <= 1) {
      onShowToast('A fight scene must have at least one shot.', 'error');
      return;
    }
    const updated = currentPlan.shots
      .filter((_, i) => i !== idx)
      .map((s, newIdx) => ({
        ...s,
        shotNumber: newIdx + 1,
      }));
    setCurrentPlan({
      ...currentPlan,
      shots: updated,
    });
  };

  // Handoff approved shots to StoryMotion project and WAN video engine
  const handleApproveAndHandoff = async () => {
    if (!currentPlan) return;

    // Validate plan
    const validation = validateFightScenePlan(currentPlan);
    if (!validation.valid) {
      onShowToast(`Validation error: ${validation.errors.join(', ')}`, 'error');
      return;
    }

    let newScenes: Scene[] = [];
    try {
      const res = await fetch('/api/fight-planner/handoff-to-wan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: validation.repairedPlan || currentPlan,
          startIndex: activeProject.scenes.length,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        newScenes = data.scenes || [];
      }
    } catch {
      // Backend unavailable (static hosting or offline mode)
    }

    // Direct fallback if server route not available
    if (!newScenes || newScenes.length === 0) {
      newScenes = convertFightPlanToScenes(
        validation.repairedPlan || currentPlan,
        activeProject.scenes.length
      );
    }

    // Append fight scenes to project
    const updatedProject: Project = {
      ...activeProject,
      scenes: [...activeProject.scenes, ...newScenes],
      numScenes: activeProject.scenes.length + newScenes.length,
      totalDuration: activeProject.totalDuration + currentPlan.targetTotalDuration,
    };

    onUpdateProject(updatedProject);
    onShowToast(
      `Added ${newScenes.length} choreographed fight shots to project! Ready for WAN rendering.`,
      'success'
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto animate-in fade-in">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-4xl shadow-2xl relative overflow-hidden flex flex-col max-h-[92vh]">
        {/* Glow ambient accent */}
        <div className="absolute -top-24 -left-24 w-72 h-72 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-800/80 flex items-center justify-between gap-3 relative z-10 bg-zinc-950/80 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-red-600 to-orange-600 text-white shadow-md shadow-red-600/20">
              <Swords className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold font-display text-white">
                  Fight Scene Planner
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-red-500/10 text-red-400 border border-red-500/30 rounded-full">
                  Zero-Cost Local LLM
                </span>
                <span className="hidden sm:inline-flex px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full">
                  100% Private (No Paid APIs)
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Plan non-graphic, highly readable action choreography with strict character continuity for WAN video
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeStep === 'review' && (
              <button
                type="button"
                onClick={() => setActiveStep('configure')}
                className="text-xs text-zinc-400 hover:text-white px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 transition-colors"
              >
                Back to Settings
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* STEP 1: CONFIGURATION */}
          {activeStep === 'configure' && (
            <div className="space-y-6">
              {/* Honest Model Not Installed Banner if triggered */}
              {modelSetupError && (
                <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/40 text-zinc-200 space-y-3 animate-in fade-in">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <h4 className="font-bold text-amber-300 text-sm">
                        Local Model Weights Required ({modelSetupError.requiredModel})
                      </h4>
                      <p className="text-[11px] text-zinc-300 leading-relaxed">
                        {modelSetupError.message}
                      </p>
                      <p className="text-[10px] text-zinc-400">
                        License: <strong className="text-zinc-300">{modelSetupError.license}</strong> (100% free open weights, no fees, no subscriptions).
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1 flex-wrap">
                    {onNavigateToLocalEngine && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onNavigateToLocalEngine();
                        }}
                        className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm transition-all"
                      >
                        <HardDrive className="w-3.5 h-3.5" />
                        <span>Download in Local Engine Tab</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleGeneratePlan(true)}
                      className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium border border-zinc-700 transition-all"
                    >
                      <span>Preview with Local Choreographer Blueprint Engine</span>
                    </button>
                  </div>
                </div>
              )}

              {/* 1. Combat Choreography Style Selection */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
                  <span>Combat & Choreography Style</span>
                  <span className="text-[11px] text-zinc-500 font-normal">
                    Governs kinetic momentum, parry physics & readable action beats
                  </span>
                </label>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {FIGHT_CHOREOGRAPHY_STYLES.map((styleOpt) => {
                    const isSelected = combatStyle === styleOpt.id;
                    return (
                      <button
                        key={styleOpt.id}
                        type="button"
                        onClick={() => {
                          setCombatStyle(styleOpt.id);
                          setPacing(styleOpt.defaultPacing);
                        }}
                        className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col justify-between min-h-[96px] ${
                          isSelected
                            ? 'border-red-500 bg-red-950/20 shadow-lg shadow-red-600/10 ring-1 ring-red-500'
                            : 'border-zinc-800/80 bg-zinc-900/60 hover:border-zinc-700 hover:bg-zinc-900'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <span className="font-bold text-white text-xs">{styleOpt.label}</span>
                          {isSelected && (
                            <div className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center shrink-0">
                              <Check className="w-2.5 h-2.5 text-white stroke-[3]" />
                            </div>
                          )}
                        </div>
                        <p className="text-[10px] text-zinc-400 line-clamp-2 mt-1">
                          {styleOpt.description}
                        </p>
                        <span className="text-[9px] uppercase tracking-wider font-semibold text-red-300/80 mt-1">
                          {styleOpt.badge}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Battlefield Environment & Context */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Environment */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-zinc-300">
                      Battlefield / Environment
                    </label>
                    <span className="text-[10px] text-zinc-500">Repeated in each WAN prompt</span>
                  </div>
                  <textarea
                    value={environment}
                    onChange={(e) => setEnvironment(e.target.value)}
                    rows={3}
                    placeholder="Describe the combat arena (obstacles, wet surfaces, pillars, lighting)..."
                    className="w-full bg-zinc-900/90 text-zinc-100 placeholder-zinc-500 border border-zinc-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-red-500 transition-all resize-none"
                  />

                  {/* Quick Presets */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-1">
                    <span className="text-[10px] text-zinc-500 shrink-0">Presets:</span>
                    {environmentPresets.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setEnvironment(preset)}
                        className="text-[10px] px-2 py-0.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 shrink-0 transition-colors"
                      >
                        {idx === 0
                          ? 'Alleyway'
                          : idx === 1
                          ? 'Rooftop Storm'
                          : idx === 2
                          ? 'Temple Courtyard'
                          : idx === 3
                          ? 'Server Bunker'
                          : 'Grand Ballroom'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Previous Scene Ending & Story Context */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-zinc-300">
                      Previous Scene Ending & Setup
                    </label>
                    <span className="text-[10px] text-zinc-500">Sets the opening positioning</span>
                  </div>
                  <textarea
                    value={previousSceneEnding}
                    onChange={(e) => setPreviousSceneEnding(e.target.value)}
                    rows={3}
                    placeholder="How do the fighters enter this combat scene? (e.g., A door kicks open, standoff breaks...)"
                    className="w-full bg-zinc-900/90 text-zinc-100 placeholder-zinc-500 border border-zinc-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-red-500 transition-all resize-none"
                  />
                  <p className="text-[10px] text-zinc-500">
                    Establishes momentum and direction for Shot 1 opening advance.
                  </p>
                </div>
              </div>

              {/* 3. Combatants Breakdown & Character Continuity Anchors */}
              <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5 text-purple-400" />
                    <span className="font-semibold text-white">
                      Locked Combatants & Wardrobe Continuity ({activeProject.characters.length || 2})
                    </span>
                  </div>
                  <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    Strict identity anchors active
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  {activeProject.characters.length > 0 ? (
                    activeProject.characters.slice(0, 2).map((char, idx) => (
                      <div key={char.id} className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white">
                            {idx === 0 ? 'Fighter A (Lead)' : 'Fighter B (Opponent)'}: {char.name}
                          </span>
                          <span className="text-[10px] text-zinc-500">{char.role || 'Combatant'}</span>
                        </div>
                        <p className="text-zinc-400 text-[10px] line-clamp-1">
                          <strong>Attire:</strong> {char.attire || 'Tactical combat wardrobe'}
                        </p>
                        <p className="text-zinc-400 text-[10px] line-clamp-1">
                          <strong>Weapon / Props:</strong> {char.keyProps || 'Unarmed martial arts'}
                        </p>
                      </div>
                    ))
                  ) : (
                    <>
                      <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 space-y-1">
                        <span className="font-bold text-white">Fighter A: Kaelen Gray</span>
                        <p className="text-zinc-400 text-[10px]">
                          <strong>Attire:</strong> High-collar carbon fiber coat, magnetic tactical belts
                        </p>
                        <p className="text-zinc-400 text-[10px]">
                          <strong>Weapon:</strong> Retractable kinetic staff
                        </p>
                      </div>
                      <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 space-y-1">
                        <span className="font-bold text-white">Fighter B: The Enforcer</span>
                        <p className="text-zinc-400 text-[10px]">
                          <strong>Attire:</strong> Composite armor vest, reinforced greaves
                        </p>
                        <p className="text-zinc-400 text-[10px]">
                          <strong>Weapon:</strong> Twin shock batons with cyan coils
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* 4. Duration, Shot Count & Pacing Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Duration */}
                <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-zinc-300">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-red-400" />
                      <span>Fight Duration</span>
                    </span>
                    <span className="text-red-400 font-bold font-mono">{targetDuration}s</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    {[12, 16, 20, 30].map((sec) => (
                      <button
                        key={sec}
                        type="button"
                        onClick={() => setTargetDuration(sec)}
                        className={`py-1 text-xs rounded-lg border font-medium transition-all ${
                          targetDuration === sec
                            ? 'bg-red-600 text-white border-red-500 shadow-sm'
                            : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white'
                        }`}
                      >
                        {sec}s
                      </button>
                    ))}
                  </div>
                </div>

                {/* Number of Shots */}
                <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-zinc-300">
                    <span className="flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Shot Count</span>
                    </span>
                    <span className="text-indigo-400 font-bold font-mono">{numShots} shots</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    {[3, 4, 5, 6].map((count) => (
                      <button
                        key={count}
                        type="button"
                        onClick={() => setNumShots(count)}
                        className={`py-1 text-xs rounded-lg border font-medium transition-all ${
                          numShots === count
                            ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                            : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white'
                        }`}
                      >
                        {count}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Choreography Pacing */}
                <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-zinc-300">
                    <span className="flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5 text-amber-400" />
                      <span>Action Pacing</span>
                    </span>
                    <span className="text-amber-400 font-bold capitalize">
                      {pacing.replace(/-/g, ' ')}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setPacing('rapid-kinetic')}
                      className={`py-1 px-1.5 rounded-lg border text-center transition-all ${
                        pacing === 'rapid-kinetic'
                          ? 'bg-amber-600 text-white border-amber-500 font-bold'
                          : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white'
                      }`}
                    >
                      Rapid Kinetic
                    </button>
                    <button
                      type="button"
                      onClick={() => setPacing('deliberate-tactical')}
                      className={`py-1 px-1.5 rounded-lg border text-center transition-all ${
                        pacing === 'deliberate-tactical'
                          ? 'bg-amber-600 text-white border-amber-500 font-bold'
                          : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white'
                      }`}
                    >
                      Tactical Parry
                    </button>
                  </div>
                </div>
              </div>

              {/* 5. Configurable Local LLM Model Selector with License & Specs */}
              <div className="p-4 bg-zinc-900/80 border border-zinc-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-purple-400" />
                    <span className="font-bold text-white text-xs">
                      Local Language Model Selector (DeepSeek / NVIDIA Nemotron)
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-400 font-mono">
                    Zero-Cost Local Inference
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                  {llmModels.map((model) => {
                    const isSelected = selectedModelId === model.id;
                    return (
                      <button
                        key={model.id}
                        type="button"
                        onClick={() => setSelectedModelId(model.id)}
                        className={`p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                          isSelected
                            ? 'bg-purple-950/30 border-purple-500 shadow-md ring-1 ring-purple-500'
                            : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-white text-xs">{model.name}</span>
                            {isSelected && (
                              <div className="w-3.5 h-3.5 rounded-full bg-purple-500 flex items-center justify-center shrink-0">
                                <Check className="w-2.5 h-2.5 text-white stroke-[3]" />
                              </div>
                            )}
                          </div>
                          <span className="inline-block px-1.5 py-0.2 rounded text-[9px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                            {model.license}
                          </span>
                          <p className="text-[10px] text-zinc-400 line-clamp-2 mt-1">
                            {model.description}
                          </p>
                        </div>

                        <div className="mt-2 pt-2 border-t border-zinc-800/80 text-[10px] text-zinc-500 space-y-0.5 font-mono">
                          <div className="flex justify-between">
                            <span>VRAM Min:</span>
                            <span className="text-zinc-300">{model.minVramGb} GB</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Disk Size:</span>
                            <span className="text-zinc-300">{model.downloadSizeGb} GB</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Local Status:</span>
                            <span className={model.downloaded ? 'text-emerald-400 font-bold' : 'text-zinc-400'}>
                              {model.downloaded ? 'Installed on PC' : 'Needs Download'}
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 6. Primary Action Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => handleGeneratePlan(false)}
                  disabled={isGenerating}
                  className="w-full py-3.5 px-6 rounded-xl font-display font-semibold text-sm text-white flex items-center justify-center gap-2.5 transition-all shadow-xl bg-gradient-to-r from-red-600 via-orange-600 to-amber-600 hover:from-red-500 hover:to-amber-500 shadow-red-600/25 active:scale-[0.99] disabled:opacity-60"
                >
                  {isGenerating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>{generationStep || 'Synthesizing Fight Choreography Plan...'}</span>
                    </>
                  ) : (
                    <>
                      <Swords className="w-4 h-4 text-red-200" />
                      <span>Synthesize Fight Choreography Plan ({targetDuration}s, {numShots} shots)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: REVIEW & EDIT STRUCTURED SHOT PLAN */}
          {activeStep === 'review' && currentPlan && (
            <div className="space-y-5 animate-in fade-in">
              {/* Plan Overview Card */}
              <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm font-display">
                      {currentPlan.title}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-red-500/10 text-red-300 border border-red-500/30">
                      {currentPlan.combatStyle.replace(/-/g, ' ').toUpperCase()}
                    </span>
                  </div>
                  <p className="text-zinc-400 text-xs mt-0.5">
                    {currentPlan.shots.length} connected shots · Total {currentPlan.targetTotalDuration} seconds · Environment: {currentPlan.environment.slice(0, 75)}...
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAddShot}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium text-xs border border-zinc-700 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5 text-purple-400" />
                    <span>Add Shot</span>
                  </button>
                </div>
              </div>

              {/* Shot Cards List */}
              <div className="space-y-3">
                {currentPlan.shots.map((shot, idx) => {
                  const isEditing = editingShotIdx === idx;
                  return (
                    <div
                      key={idx}
                      className={`p-4 rounded-xl border transition-all space-y-3 ${
                        isEditing
                          ? 'bg-zinc-900 border-red-500/60 ring-1 ring-red-500/30 shadow-lg'
                          : 'bg-zinc-900/70 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      {/* Shot Header */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2.5">
                          <span className="w-6 h-6 rounded-lg bg-red-600/20 text-red-300 border border-red-500/30 font-bold flex items-center justify-center text-xs">
                            {shot.shotNumber}
                          </span>
                          <span className="font-bold text-white text-xs">{shot.title}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-black/40 border border-zinc-800 text-zinc-400">
                            {shot.duration}s
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setEditingShotIdx(isEditing ? null : idx)}
                            className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors"
                          >
                            <Edit3 className="w-3 h-3 text-purple-400" />
                            <span>{isEditing ? 'Done Editing' : 'Edit Shot'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveShot(idx)}
                            className="p-1 rounded text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition-colors"
                            title="Remove shot"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Read Mode */}
                      {!isEditing ? (
                        <div className="space-y-2 text-xs">
                          {/* Movement Choreography */}
                          <div className="p-2.5 rounded-lg bg-zinc-950/80 border border-zinc-800/80 space-y-1">
                            <span className="text-[10px] uppercase font-bold text-red-400">
                              Choreography (Readable Action & Cause-Effect):
                            </span>
                            <p className="text-zinc-200 leading-relaxed text-[11px]">
                              {shot.movementChoreography}
                            </p>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-zinc-400">
                            <div>
                              <strong className="text-zinc-300">Positions:</strong> {shot.characterPositions}
                            </div>
                            <div>
                              <strong className="text-zinc-300">Camera:</strong> {shot.cameraMovement}
                            </div>
                            <div>
                              <strong className="text-zinc-300">Lighting:</strong> {shot.lighting}
                            </div>
                            <div>
                              <strong className="text-zinc-300">Transition:</strong> {shot.transition}
                            </div>
                          </div>

                          {/* Sound effects & Dialogue */}
                          <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-zinc-800/60 text-[11px]">
                            {shot.dialogue && (
                              <span className="text-purple-300 bg-purple-950/30 border border-purple-500/20 px-2 py-0.5 rounded">
                                💬 "{shot.dialogue}"
                              </span>
                            )}
                            {shot.soundEffects && shot.soundEffects.length > 0 && (
                              <span className="text-amber-300 bg-amber-950/30 border border-amber-500/20 px-2 py-0.5 rounded flex items-center gap-1">
                                <Volume2 className="w-3 h-3" />
                                <span>SFX: {shot.soundEffects.map((s) => s.name).join(', ')}</span>
                              </span>
                            )}
                          </div>

                          {/* Generated WAN Prompt preview */}
                          <div className="p-2 rounded-lg bg-black/60 border border-zinc-800/80 space-y-1">
                            <span className="text-[10px] uppercase font-bold text-zinc-500">
                              WAN 2.1 Video Prompt (Strict Character Continuity Anchored):
                            </span>
                            <p className="text-[10px] font-mono text-zinc-400 line-clamp-2">
                              {shot.visualPrompt}
                            </p>
                          </div>
                        </div>
                      ) : (
                        /* Edit Mode */
                        <div className="space-y-3 pt-1 text-xs">
                          <div>
                            <label className="text-[11px] font-semibold text-zinc-300">
                              Action Choreography & Movement:
                            </label>
                            <textarea
                              value={shot.movementChoreography}
                              onChange={(e) => handleUpdateShotField(idx, 'movementChoreography', e.target.value)}
                              rows={2}
                              className="w-full mt-1 bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-red-500"
                            />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div>
                              <label className="text-[11px] font-semibold text-zinc-300">
                                Character Positions:
                              </label>
                              <input
                                type="text"
                                value={shot.characterPositions}
                                onChange={(e) => handleUpdateShotField(idx, 'characterPositions', e.target.value)}
                                className="w-full mt-1 bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-red-500"
                              />
                            </div>
                            <div>
                              <label className="text-[11px] font-semibold text-zinc-300">
                                Shot Duration (seconds):
                              </label>
                              <input
                                type="number"
                                min={2}
                                max={8}
                                value={shot.duration}
                                onChange={(e) => handleUpdateShotField(idx, 'duration', Number(e.target.value))}
                                className="w-full mt-1 bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-red-500"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="text-[11px] font-semibold text-zinc-300">
                              Full WAN Prompt:
                            </label>
                            <textarea
                              value={shot.visualPrompt}
                              onChange={(e) => handleUpdateShotField(idx, 'visualPrompt', e.target.value)}
                              rows={3}
                              className="w-full mt-1 bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-[11px] font-mono text-zinc-300 focus:outline-none focus:border-red-500"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Bottom Actions */}
              <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between gap-3 flex-wrap">
                <div className="text-zinc-400 text-xs">
                  <span>Approved plan will append </span>
                  <strong className="text-white">{currentPlan.shots.length} scenes</strong>
                  <span> to your active project with complete dialogue & audio cues.</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveStep('configure')}
                    className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-medium transition-colors"
                  >
                    Adjust Settings
                  </button>

                  <button
                    type="button"
                    onClick={handleApproveAndHandoff}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 via-orange-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-red-600/30 transition-all active:scale-95"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Approve & Add to Storyboard (Send to WAN)</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
