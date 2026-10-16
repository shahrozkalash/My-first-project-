import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { MobileBottomNav, MobileStudioSection } from './components/MobileBottomNav';
import { StoryPromptInput } from './components/StoryPromptInput';
import { CharacterConsistencyManager } from './components/CharacterConsistencyManager';
import { SceneList } from './components/SceneList';
import { VideoPreviewArea } from './components/VideoPreviewArea';
import { ProjectsLibrary } from './components/ProjectsLibrary';
import { ApiStatusModal } from './components/ApiStatusModal';
import { ExportModal } from './components/ExportModal';
import { LocalEnginePage } from './components/LocalEnginePage';
import { AudioLipSyncStudio } from './components/AudioLipSyncStudio';
import { localHelperClient } from './utils/localHelperClient';
import {
  getStoredProjects,
  saveProjectToStorage,
  deleteProjectFromStorage,
  duplicateProjectInStorage,
  getActiveProjectId,
  setActiveProjectId,
  createNewProjectTemplate,
} from './utils/storage';
import { AspectRatio, Character, Project, Scene, VisualStyle } from './types';
import {
  DEFAULT_TOTAL_DURATION,
  distributeTotalDuration,
  recalculateSceneDurations,
  redistributeScenesEvenly,
} from './utils/duration';
import {
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Film,
  Users,
  Clapperboard,
  PlaySquare,
  Wand2,
} from 'lucide-react';

export default function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveId] = useState<string>('');
  const [currentTab, setCurrentTab] = useState<'studio' | 'audio-studio' | 'projects' | 'local-engine' | 'api-info'>('studio');
  const [mobileSection, setMobileSection] = useState<MobileStudioSection>('prompt');

  // Active project state
  const [currentProject, setCurrentProject] = useState<Project>(createNewProjectTemplate());
  const [selectedSceneIndex, setSelectedSceneIndex] = useState<number>(0);

  // Async / generation states
  const [isGeneratingStory, setIsGeneratingStory] = useState(false);
  const [generationStepMessage, setGenerationStepMessage] = useState('');
  const [enhancingSceneId, setEnhancingSceneId] = useState<string | null>(null);
  const [renderingSceneId, setRenderingSceneId] = useState<string | null>(null);
  const [isRenderingAll, setIsRenderingAll] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Modals
  const [isApiModalOpen, setIsApiModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 1. Initial Load
  useEffect(() => {
    const loadedProjects = getStoredProjects();
    setProjects(loadedProjects);

    const savedActiveId = getActiveProjectId();
    const matched = loadedProjects.find((p) => p.id === savedActiveId) || loadedProjects[0];

    if (matched) {
      setCurrentProject(matched);
      setActiveId(matched.id);
    } else {
      const fresh = createNewProjectTemplate();
      setCurrentProject(fresh);
      setActiveId(fresh.id);
      saveProjectToStorage(fresh);
    }
  }, []);

  // 2. Auto-save project changes locally
  const updateProject = (updated: Project) => {
    setCurrentProject(updated);
    setIsSaving(true);
    saveProjectToStorage(updated);
    setProjects((prev) =>
      prev.map((p) => (p.id === updated.id ? updated : p))
    );
    setTimeout(() => setIsSaving(false), 400);
  };

  // Switch Active Project
  const handleSelectProject = (id: string) => {
    const target = projects.find((p) => p.id === id);
    if (target) {
      setCurrentProject(target);
      setActiveId(id);
      setActiveProjectId(id);
      setSelectedSceneIndex(0);
      setCurrentTab('studio');
      showToast(`Loaded "${target.title}"`, 'success');
    }
  };

  // Create New Project
  const handleNewProject = () => {
    const newProj = createNewProjectTemplate();
    const updatedProjects = [newProj, ...projects];
    setProjects(updatedProjects);
    setCurrentProject(newProj);
    setActiveId(newProj.id);
    setActiveProjectId(newProj.id);
    setSelectedSceneIndex(0);
    saveProjectToStorage(newProj);
    setCurrentTab('studio');
    setMobileSection('prompt');
    showToast('New project created', 'success');
  };

  // Duplicate Project
  const handleDuplicateProject = (id: string) => {
    const dup = duplicateProjectInStorage(id);
    if (dup) {
      setProjects(getStoredProjects());
      showToast(`Duplicated as "${dup.title}"`, 'success');
    }
  };

  // Delete Project
  const handleDeleteProject = (id: string) => {
    if (projects.length <= 1) {
      showToast('Cannot delete the last remaining project', 'error');
      return;
    }
    const remaining = deleteProjectFromStorage(id);
    setProjects(remaining);
    if (activeProjectId === id && remaining.length > 0) {
      setCurrentProject(remaining[0]);
      setActiveId(remaining[0].id);
      setActiveProjectId(remaining[0].id);
    }
    showToast('Project deleted', 'info');
  };

  // Import Project
  const handleImportProject = (imported: Project) => {
    saveProjectToStorage(imported);
    const updated = getStoredProjects();
    setProjects(updated);
    setCurrentProject(imported);
    setActiveId(imported.id);
    setActiveProjectId(imported.id);
    setCurrentTab('studio');
    showToast(`Imported project "${imported.title}"`, 'success');
  };

  // Generate Story & Sequential Scenes via Server API (Gemini or Smart Director)
  const handleGenerateStory = async () => {
    setIsGeneratingStory(true);
    setGenerationStepMessage('Analyzing story core & theme...');

    try {
      // Step simulation for rich UX feedback
      const timer1 = setTimeout(() => {
        setGenerationStepMessage('Directing camera movements & cinematic lighting...');
      }, 700);

      const timer2 = setTimeout(() => {
        setGenerationStepMessage('Synthesizing consistent character prompts across shots...');
      }, 1400);

      const res = await fetch('/api/story/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: currentProject.prompt,
          style: currentProject.style,
          numScenes: currentProject.numScenes,
          totalDuration: currentProject.totalDuration || DEFAULT_TOTAL_DURATION,
          duration: Math.round((currentProject.totalDuration || DEFAULT_TOTAL_DURATION) / currentProject.numScenes),
          characters: currentProject.characters,
          aspectRatio: currentProject.aspectRatio,
        }),
      });

      clearTimeout(timer1);
      clearTimeout(timer2);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to generate story');
      }

      const data = await res.json();

      const updatedProj: Project = {
        ...currentProject,
        title: data.title || currentProject.title,
        logline: data.logline || currentProject.prompt,
        genre: data.genre || currentProject.genre,
        totalDuration: Number(data.totalDuration) || currentProject.totalDuration || DEFAULT_TOTAL_DURATION,
        sceneDuration: Math.round((Number(data.totalDuration) || currentProject.totalDuration || DEFAULT_TOTAL_DURATION) / (data.scenes?.length || currentProject.numScenes)),
        characters: data.characters && data.characters.length > 0 ? data.characters : currentProject.characters,
        scenes: data.scenes || [],
      };

      updateProject(updatedProj);
      setSelectedSceneIndex(0);
      showToast(`Generated ${updatedProj.scenes.length} sequential scenes!`, 'success');

      // On mobile, automatically advance to scenes section
      if (window.innerWidth < 768) {
        setMobileSection('scenes');
      }
    } catch (err: any) {
      console.error('Error generating story:', err);
      showToast(err.message || 'Error generating story', 'error');
    } finally {
      setIsGeneratingStory(false);
      setGenerationStepMessage('');
    }
  };

  // Enhance Scene Prompt with AI
  const handleEnhanceScenePrompt = async (sceneId: string) => {
    const scene = currentProject.scenes.find((s) => s.id === sceneId);
    if (!scene) return;

    setEnhancingSceneId(sceneId);
    try {
      const res = await fetch('/api/story/enhance-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: scene.visualPrompt,
          style: currentProject.style,
          cameraMovement: scene.cameraMovement,
          lighting: scene.lighting,
        }),
      });

      if (!res.ok) throw new Error('Failed to enhance prompt');
      const data = await res.json();

      if (data.enhancedPrompt) {
        const updatedScenes = currentProject.scenes.map((s) =>
          s.id === sceneId ? { ...s, visualPrompt: data.enhancedPrompt } : s
        );
        updateProject({ ...currentProject, scenes: updatedScenes });
        showToast('Scene prompt enhanced with cinematic details!', 'success');
      }
    } catch (e: any) {
      showToast('Could not enhance prompt: ' + e.message, 'error');
    } finally {
      setEnhancingSceneId(null);
    }
  };

  // Render Individual Scene with Wan Engine
  const handleRenderSingleScene = async (scene: Scene) => {
    setRenderingSceneId(scene.id);
    try {
      // Find previous scene's videoUrl or character image if available for continuity
      const sceneIdx = currentProject.scenes.findIndex((s) => s.id === scene.id);
      const prevScene = sceneIdx > 0 ? currentProject.scenes[sceneIdx - 1] : null;

      const payload = {
        sceneId: scene.id,
        sceneNumber: scene.sceneNumber,
        prompt: scene.visualPrompt,
        aspectRatio: currentProject.aspectRatio,
        aspect_ratio: currentProject.aspectRatio,
        duration: scene.duration,
        duration_seconds: scene.duration,
        resolution: currentProject.aspectRatio === '9:16' ? '720x1280' : '1280x720',
        characterConsistencyTags: currentProject.characters.map((c) => c.name),
        cameraMovement: scene.cameraMovement,
        lighting: scene.lighting,
        referenceImageUrl: prevScene?.videoUrl,
      };

      const data = await localHelperClient.submitJob(payload);
      if (!data || (!data.success && !data.jobId && !data.job_id)) {
        if (data?.error === 'LOCAL_ENGINE_OFFLINE' || data?.error === 'ENGINE_NOT_CONFIGURED') {
          showToast('Local Windows Helper is offline. Launch start.bat on your PC or visit the Local Engine tab.', 'error');
        } else {
          showToast(data?.message || data?.error || 'Video engine failed to generate shot', 'error');
        }
        return;
      }

      const jobId = data.jobId || data.job_id;
      showToast(`Shot ${scene.sceneNumber} submitted to local NVIDIA GPU queue!`, 'success');

      // Mark scene as queued
      let updatedScenes = currentProject.scenes.map((s) =>
        s.id === scene.id
          ? {
              ...s,
              status: 'queued' as const,
              engineJobId: jobId,
              engineProgress: 10,
            }
          : s
      );
      updateProject({ ...currentProject, scenes: updatedScenes });

      // Poll until completed or failed
      let isDone = false;
      let pollTries = 0;
      while (!isDone && pollTries < 150) {
        await new Promise((r) => setTimeout(r, 2000));
        pollTries++;
        const job = await localHelperClient.getJobStatus(jobId);
        if (job) {
          const finishedVideo = job.videoUrl || (job as any).video_url;
          if (job.status === 'completed' && finishedVideo) {
            isDone = true;
            updatedScenes = currentProject.scenes.map((s) =>
              s.id === scene.id
                ? {
                    ...s,
                    status: 'completed' as const,
                    videoUrl: finishedVideo,
                    engineProgress: 100,
                  }
                : s
            );
            updateProject({ ...currentProject, scenes: updatedScenes });
            showToast(`Shot ${scene.sceneNumber} finished rendering on GPU!`, 'success');
          } else if (job.status === 'failed' || job.status === 'cancelled') {
            isDone = true;
            updatedScenes = currentProject.scenes.map((s) =>
              s.id === scene.id
                ? {
                    ...s,
                    status: 'error' as const,
                    generationError: job.error || 'Rendering failed on inference server',
                  }
                : s
            );
            updateProject({ ...currentProject, scenes: updatedScenes });
            showToast(`Shot ${scene.sceneNumber} failed: ${job.error || 'Server error'}`, 'error');
          } else if (job.progress) {
            updatedScenes = currentProject.scenes.map((s) =>
              s.id === scene.id
                ? {
                    ...s,
                    status: 'generating' as const,
                    engineProgress: job.progress,
                  }
                : s
            );
            updateProject({ ...currentProject, scenes: updatedScenes });
          }
        }
      }
    } catch (e: any) {
      showToast(`Error connecting to video engine: ${e.message}`, 'error');
    } finally {
      setRenderingSceneId(null);
    }
  };

  // Batch render all scenes with controlled queue and cancellation
  const handleRenderAllScenes = async () => {
    if (currentProject.scenes.length === 0) return;
    setIsRenderingAll(true);
    showToast('Starting sequential batch rendering of all scenes...', 'info');

    for (const scene of currentProject.scenes) {
      // If user cancelled batch, break
      await handleRenderSingleScene(scene);
    }
    setIsRenderingAll(false);
    showToast('Batch rendering sequence completed!', 'success');
  };

  // Character Management
  const handleAddCharacter = (character: Character) => {
    const updatedChars = [...currentProject.characters, character];
    updateProject({ ...currentProject, characters: updatedChars });
    showToast(`Added character "${character.name}"`, 'success');
  };

  const handleUpdateCharacter = (character: Character) => {
    const updatedChars = currentProject.characters.map((c) =>
      c.id === character.id ? character : c
    );
    updateProject({ ...currentProject, characters: updatedChars });
    showToast(`Updated "${character.name}"`, 'info');
  };

  const handleDeleteCharacter = (id: string) => {
    const updatedChars = currentProject.characters.filter((c) => c.id !== id);
    updateProject({ ...currentProject, characters: updatedChars });
    showToast('Character removed', 'info');
  };

  // Sync Characters with All Scene Prompts
  const handleSyncCharactersWithScenes = () => {
    if (currentProject.characters.length === 0) return;

    const charDescriptions = currentProject.characters
      .map((c) => `${c.name} (${c.visualDescription}, wearing ${c.attire})`)
      .join('; ');

    const updatedScenes = currentProject.scenes.map((scene) => {
      // Check if prompt already contains character
      let prompt = scene.visualPrompt;
      currentProject.characters.forEach((char) => {
        if (!prompt.includes(char.name)) {
          prompt += ` Featuring ${char.name} (${char.visualDescription}, wearing ${char.attire}).`;
        }
      });
      return {
        ...scene,
        visualPrompt: prompt,
        characterIds: currentProject.characters.map((c) => c.name),
      };
    });

    updateProject({ ...currentProject, scenes: updatedScenes });
    showToast('Synced character visual consistency into all scenes!', 'success');
  };

  // Scene Operations with Total Duration Preserved
  const handleUpdateScene = (scene: Scene) => {
    const updated = currentProject.scenes.map((s) => (s.id === scene.id ? scene : s));
    updateProject({ ...currentProject, scenes: updated });
  };

  const handleSceneDurationChange = (sceneId: string, newDuration: number) => {
    const targetTotal = Number(currentProject.totalDuration) || DEFAULT_TOTAL_DURATION;
    const updatedScenes = recalculateSceneDurations(
      currentProject.scenes,
      sceneId,
      newDuration,
      targetTotal
    );
    updateProject({
      ...currentProject,
      scenes: updatedScenes,
      sceneDuration: Math.round(targetTotal / Math.max(1, updatedScenes.length)),
    });
  };

  const handleRedistributeEvenly = () => {
    const targetTotal = Number(currentProject.totalDuration) || DEFAULT_TOTAL_DURATION;
    const updatedScenes = redistributeScenesEvenly(currentProject.scenes, targetTotal);
    updateProject({
      ...currentProject,
      sceneDuration: Math.round(targetTotal / Math.max(1, updatedScenes.length)),
      scenes: updatedScenes,
    });
    showToast(`Evenly balanced ${targetTotal}s across ${updatedScenes.length} scenes!`, 'success');
  };

  const handleTotalDurationChange = (newTotal: number) => {
    const validTotal = Math.max(10, Math.round(newTotal));
    const updatedScenes = currentProject.scenes.length > 0
      ? redistributeScenesEvenly(currentProject.scenes, validTotal)
      : [];
    updateProject({
      ...currentProject,
      totalDuration: validTotal,
      sceneDuration: Math.round(validTotal / Math.max(1, currentProject.numScenes)),
      scenes: updatedScenes,
    });
    showToast(`Total movie duration set to ${validTotal}s`, 'info');
  };

  const handleNumScenesChange = (newCount: number) => {
    const validCount = Math.max(2, Math.min(8, Math.round(newCount)));
    const targetTotal = Number(currentProject.totalDuration) || DEFAULT_TOTAL_DURATION;
    updateProject({
      ...currentProject,
      numScenes: validCount,
      sceneDuration: Math.round(targetTotal / validCount),
    });
  };

  const handleAddScene = () => {
    const nextNum = currentProject.scenes.length + 1;
    const targetTotal = Number(currentProject.totalDuration) || DEFAULT_TOTAL_DURATION;
    const newScene: Scene = {
      id: `scene-${Date.now()}`,
      sceneNumber: nextNum,
      title: `Scene ${nextNum}: Progression`,
      visualPrompt: `Cinematic ${currentProject.style} visual shot. Subject moves deliberately across the environment with smooth camera motion. Aspect Ratio ${currentProject.aspectRatio}.`,
      actionSummary: 'Key character progression and environment exploration.',
      dialogue: '',
      cameraMovement: 'Cinematic Pan Right',
      lighting: 'Golden Hour Sunburst',
      duration: Math.max(1, Math.round(targetTotal / nextNum)),
      characterIds: currentProject.characters.map((c) => c.name),
      status: 'ready',
    };
    const candidateScenes = [...currentProject.scenes, newScene];
    // Keep total movie duration at exactly targetTotal (default 60s)
    const redistributed = redistributeScenesEvenly(candidateScenes, targetTotal);

    updateProject({
      ...currentProject,
      numScenes: redistributed.length,
      sceneDuration: Math.round(targetTotal / redistributed.length),
      scenes: redistributed,
    });
    setSelectedSceneIndex(redistributed.length - 1);
    showToast(`Added Scene ${nextNum} (Total duration preserved at ${targetTotal}s)`, 'success');
  };

  const handleDeleteScene = (id: string) => {
    const targetTotal = Number(currentProject.totalDuration) || DEFAULT_TOTAL_DURATION;
    const filtered = currentProject.scenes.filter((s) => s.id !== id);
    if (filtered.length === 0) {
      updateProject({ ...currentProject, scenes: [], numScenes: 0 });
      showToast('Scene deleted', 'info');
      return;
    }
    const reindexed = filtered.map((s, idx) => ({ ...s, sceneNumber: idx + 1 }));
    // Keep total movie duration at exactly targetTotal (default 60s)
    const redistributed = redistributeScenesEvenly(reindexed, targetTotal);

    updateProject({
      ...currentProject,
      numScenes: redistributed.length,
      sceneDuration: Math.round(targetTotal / redistributed.length),
      scenes: redistributed,
    });
    setSelectedSceneIndex(Math.max(0, selectedSceneIndex - 1));
    showToast(`Scene deleted (Total duration preserved at ${targetTotal}s)`, 'info');
  };

  const handleDuplicateScene = (id: string) => {
    const target = currentProject.scenes.find((s) => s.id === id);
    if (!target) return;
    const targetTotal = Number(currentProject.totalDuration) || DEFAULT_TOTAL_DURATION;
    const nextNum = currentProject.scenes.length + 1;
    const dup: Scene = {
      ...target,
      id: `scene-${Date.now()}`,
      sceneNumber: nextNum,
      title: `${target.title} (Continuation)`,
    };
    const candidate = [...currentProject.scenes, dup];
    const redistributed = redistributeScenesEvenly(candidate, targetTotal);

    updateProject({
      ...currentProject,
      numScenes: redistributed.length,
      sceneDuration: Math.round(targetTotal / redistributed.length),
      scenes: redistributed,
    });
    showToast(`Duplicated as Scene ${dup.sceneNumber} (Total duration preserved at ${targetTotal}s)`, 'success');
  };

  const handleMoveScene = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= currentProject.scenes.length) return;

    const list = [...currentProject.scenes];
    const [moved] = list.splice(index, 1);
    list.splice(targetIndex, 0, moved);

    const reindexed = list.map((s, idx) => ({ ...s, sceneNumber: idx + 1 }));
    updateProject({ ...currentProject, scenes: reindexed });
    setSelectedSceneIndex(targetIndex);
  };

  return (
    <div className="min-h-screen bg-[#030305] text-zinc-100 flex flex-col font-sans selection:bg-purple-600 selection:text-white pb-20 md:pb-8">
      {/* Cinematic subtle background grid */}
      <div className="fixed inset-0 bg-grid-cinematic pointer-events-none opacity-40 z-0" />

      {/* Global Top Navbar */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        onNewProject={handleNewProject}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        projectCount={projects.length}
        activeProjectTitle={currentProject.title}
        isSaving={isSaving}
      />

      {/* Toast notification */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-2xl backdrop-blur-md text-xs font-medium border animate-in fade-in slide-in-from-top-3 max-w-sm">
          {toastMessage.type === 'success' && (
            <div className="p-1 bg-emerald-500/20 text-emerald-400 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          )}
          {toastMessage.type === 'error' && (
            <div className="p-1 bg-red-500/20 text-red-400 rounded-lg">
              <AlertCircle className="w-4 h-4" />
            </div>
          )}
          {toastMessage.type === 'info' && (
            <div className="p-1 bg-purple-500/20 text-purple-400 rounded-lg">
              <Sparkles className="w-4 h-4" />
            </div>
          )}
          <span className="text-zinc-200">{toastMessage.text}</span>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 relative z-10 max-w-7xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-6">
        {/* VIEW 1: PROJECTS LIBRARY */}
        {currentTab === 'projects' && (
          <ProjectsLibrary
            projects={projects}
            activeProjectId={activeProjectId}
            onSelectProject={handleSelectProject}
            onNewProject={handleNewProject}
            onDuplicateProject={handleDuplicateProject}
            onDeleteProject={handleDeleteProject}
            onImportProject={handleImportProject}
          />
        )}

        {/* VIEW 2: ZERO-COST LOCAL ENGINE & WINDOWS HELPER */}
        {(currentTab === 'local-engine' || currentTab === 'api-info') && (
          <LocalEnginePage
            activeProject={currentProject}
            onUpdateProject={updateProject}
            onNavigateToStudio={() => setCurrentTab('studio')}
            onShowToast={showToast}
          />
        )}

        {/* VIEW 3: AUDIO & LIP-SYNC STUDIO */}
        {currentTab === 'audio-studio' && (
          <AudioLipSyncStudio
            project={currentProject}
            onUpdateProject={updateProject}
            currentSceneIndex={selectedSceneIndex}
            onSelectSceneIndex={setSelectedSceneIndex}
            onShowToast={showToast}
            onNavigateToLocalEngine={() => setCurrentTab('local-engine')}
          />
        )}

        {/* VIEW 4: MAIN STORY STUDIO */}
        {currentTab === 'studio' && (
          <div className="space-y-6">
            {/* Mobile Section Tabs for Android Screen Experience */}
            <div className="md:hidden flex items-center gap-1.5 p-1 bg-zinc-950 border border-zinc-800 rounded-xl overflow-x-auto text-xs">
              <button
                onClick={() => setMobileSection('prompt')}
                className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  mobileSection === 'prompt'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Story & Style</span>
              </button>
              <button
                onClick={() => setMobileSection('characters')}
                className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  mobileSection === 'characters'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Cast ({currentProject.characters.length})</span>
              </button>
              <button
                onClick={() => setMobileSection('scenes')}
                className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  mobileSection === 'scenes'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Clapperboard className="w-3.5 h-3.5" />
                <span>Scenes ({currentProject.scenes.length})</span>
              </button>
              <button
                onClick={() => setMobileSection('preview')}
                className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  mobileSection === 'preview'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <PlaySquare className="w-3.5 h-3.5" />
                <span>Preview</span>
              </button>
            </div>

            {/* Desktop 2-Column Responsive Layout / Mobile Single View */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Story Director & Scene Controls (7 cols on Desktop) */}
              <div className="lg:col-span-7 space-y-6">
                {/* 1. Prompt & Story Generation Panel (Always shown on desktop; filtered on mobile) */}
                <div className={`md:block ${mobileSection === 'prompt' ? 'block' : 'hidden'}`}>
                  <StoryPromptInput
                    prompt={currentProject.prompt}
                    setPrompt={(p) => updateProject({ ...currentProject, prompt: p })}
                    style={currentProject.style}
                    setStyle={(s) => updateProject({ ...currentProject, style: s })}
                    aspectRatio={currentProject.aspectRatio}
                    setAspectRatio={(ar) => updateProject({ ...currentProject, aspectRatio: ar })}
                    totalDuration={currentProject.totalDuration || DEFAULT_TOTAL_DURATION}
                    setTotalDuration={handleTotalDurationChange}
                    numScenes={currentProject.numScenes}
                    setNumScenes={handleNumScenesChange}
                    characters={currentProject.characters}
                    isGenerating={isGeneratingStory}
                    onGenerateStory={handleGenerateStory}
                    generationStepMessage={generationStepMessage}
                    onSelectInspiration={(insp) =>
                      updateProject({ ...currentProject, prompt: insp, title: insp.slice(0, 32) + '...' })
                    }
                  />
                </div>

                {/* 2. Character Consistency Manager */}
                <div className={`md:block ${mobileSection === 'characters' ? 'block' : 'hidden'}`}>
                  <CharacterConsistencyManager
                    characters={currentProject.characters}
                    onAddCharacter={handleAddCharacter}
                    onUpdateCharacter={handleUpdateCharacter}
                    onDeleteCharacter={handleDeleteCharacter}
                    onApplyToAllScenes={handleSyncCharactersWithScenes}
                  />
                </div>

                {/* 3. Sequential Scene List & Prompts */}
                <div className={`md:block ${mobileSection === 'scenes' ? 'block' : 'hidden'}`}>
                  <SceneList
                    scenes={currentProject.scenes}
                    characters={currentProject.characters}
                    totalDuration={currentProject.totalDuration || DEFAULT_TOTAL_DURATION}
                    onUpdateScene={handleUpdateScene}
                    onSceneDurationChange={handleSceneDurationChange}
                    onRedistributeEvenly={handleRedistributeEvenly}
                    onAddScene={handleAddScene}
                    onDeleteScene={handleDeleteScene}
                    onDuplicateScene={handleDuplicateScene}
                    onMoveScene={handleMoveScene}
                    onEnhanceScenePrompt={handleEnhanceScenePrompt}
                    enhancingSceneId={enhancingSceneId}
                    onSelectSceneForPreview={(scene) => {
                      const idx = currentProject.scenes.findIndex((s) => s.id === scene.id);
                      if (idx >= 0) setSelectedSceneIndex(idx);
                      if (window.innerWidth < 768) setMobileSection('preview');
                    }}
                    selectedSceneId={currentProject.scenes[selectedSceneIndex]?.id}
                    onRenderScene={handleRenderSingleScene}
                    renderingSceneId={renderingSceneId}
                    onRenderAllScenes={handleRenderAllScenes}
                    isRenderingAll={isRenderingAll}
                    onOpenAudioStudio={(sceneIdx) => {
                      setSelectedSceneIndex(sceneIdx);
                      setCurrentTab('audio-studio');
                    }}
                  />
                </div>
              </div>

              {/* Right Column: Video Viewport & Generation Controls (5 cols on Desktop, sticky) */}
              <div
                className={`lg:col-span-5 md:block ${
                  mobileSection === 'preview' ? 'block' : 'hidden md:block'
                }`}
              >
                <div className="lg:sticky lg:top-20 space-y-4">
                  <VideoPreviewArea
                    project={currentProject}
                    currentSceneIndex={selectedSceneIndex}
                    onSelectSceneIndex={setSelectedSceneIndex}
                    onOpenVeoModal={() => setIsApiModalOpen(true)}
                    onSceneVideoReady={(sceneId, videoUrl) => {
                      const updatedScenes = currentProject.scenes.map((s) =>
                        s.id === sceneId ? { ...s, videoUrl, status: 'completed' as const } : s
                      );
                      updateProject({ ...currentProject, scenes: updatedScenes });
                      showToast('Wan scene video ready for preview & download!', 'success');
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Mobile Android-First Bottom Navigation Bar */}
      <MobileBottomNav
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        studioSection={mobileSection}
        setStudioSection={setMobileSection}
        sceneCount={currentProject.scenes.length}
        characterCount={currentProject.characters.length}
      />

      {/* Global Modals */}
      <ApiStatusModal
        isOpen={isApiModalOpen}
        onClose={() => setIsApiModalOpen(false)}
        activeProject={currentProject}
      />

      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        project={currentProject}
      />
    </div>
  );
}
