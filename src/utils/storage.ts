import { SAMPLE_PROJECTS } from '../data/constants';
import { Project, Scene } from '../types';

const STORAGE_KEY = 'storymotion_ai_projects';
const ACTIVE_PROJECT_KEY = 'storymotion_ai_active_id';

export function getStoredProjects(): Project[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Seed initial sample projects
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SAMPLE_PROJECTS));
      return SAMPLE_PROJECTS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map((p: any) => ({
        ...p,
        videoResolution: p.videoResolution || '720p',
        totalDuration: Number(p.totalDuration) || 60,
      }));
    }
    return SAMPLE_PROJECTS;
  } catch (e) {
    console.error('Failed to load projects from localStorage:', e);
    return SAMPLE_PROJECTS;
  }
}

export function saveProjectToStorage(project: Project): void {
  try {
    const projects = getStoredProjects();
    const existingIndex = projects.findIndex((p) => p.id === project.id);
    const updatedProject: Project = {
      ...project,
      videoResolution: project.videoResolution || '720p',
      totalDuration: Number(project.totalDuration) || 60,
      updatedAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      projects[existingIndex] = updatedProject;
    } else {
      projects.unshift(updatedProject);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  } catch (e) {
    console.error('Failed to save project to localStorage:', e);
  }
}

export function deleteProjectFromStorage(id: string): Project[] {
  try {
    const projects = getStoredProjects().filter((p) => p.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    return projects;
  } catch (e) {
    console.error('Failed to delete project:', e);
    return getStoredProjects();
  }
}

export function duplicateProjectInStorage(id: string): Project | null {
  try {
    const projects = getStoredProjects();
    const target = projects.find((p) => p.id === id);
    if (!target) return null;

    const duplicated: Project = {
      ...JSON.parse(JSON.stringify(target)),
      id: `proj-${Date.now()}`,
      title: `${target.title} (Copy)`,
      totalDuration: Number(target.totalDuration) || 60,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    projects.unshift(duplicated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    return duplicated;
  } catch (e) {
    console.error('Failed to duplicate project:', e);
    return null;
  }
}

export function getActiveProjectId(): string {
  try {
    const active = localStorage.getItem(ACTIVE_PROJECT_KEY);
    if (active) return active;
    const projects = getStoredProjects();
    return projects[0]?.id || '';
  } catch {
    return '';
  }
}

export function setActiveProjectId(id: string): void {
  try {
    localStorage.setItem(ACTIVE_PROJECT_KEY, id);
  } catch (e) {
    console.error('Failed to set active project id:', e);
  }
}

export function createNewProjectTemplate(): Project {
  return {
    id: `proj-${Date.now()}`,
    title: 'New Story Project',
    prompt: '',
    logline: '',
    genre: 'Cinematic',
    style: 'cinematic',
    aspectRatio: '16:9',
    videoResolution: '720p',
    totalDuration: 60,
    sceneDuration: 15,
    numScenes: 4,
    characters: [
      {
        id: `char-${Date.now()}-1`,
        name: 'Protagonist',
        role: 'Lead Character',
        visualDescription: 'Confident posture, expressive eyes, distinctive facial features',
        attire: 'Modern cinematic wardrobe with rich texture and unified color palette',
        keyProps: 'A meaningful personal token or device',
        avatarBg: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      },
    ],
    scenes: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// Download Helper
export function downloadFile(content: string, filename: string, type: string = 'text/plain') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Export Project as JSON
export function exportProjectJSON(project: Project) {
  const data = JSON.stringify(project, null, 2);
  const cleanTitle = project.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  downloadFile(data, `${cleanTitle}-storymotion.json`, 'application/json');
}

// Export Screenplay Script & Storyboard Markdown
export function exportStoryboardScript(project: Project) {
  const lines: string[] = [];
  lines.push(`# ${project.title}`);
  lines.push(`**Style:** ${project.style.toUpperCase()} | **Aspect Ratio:** ${project.aspectRatio} | **Duration:** ~${project.scenes.reduce((acc, s) => acc + s.duration, 0)}s`);
  if (project.logline) {
    lines.push(`\n### Logline\n${project.logline}`);
  }
  lines.push(`\n### Core Prompt\n> ${project.prompt}`);

  lines.push('\n## Character Consistency Profiles');
  project.characters.forEach((char) => {
    lines.push(`- **${char.name}** (${char.role})`);
    lines.push(`  - Visual Details: ${char.visualDescription}`);
    lines.push(`  - Wardrobe: ${char.attire}`);
    lines.push(`  - Key Props: ${char.keyProps}`);
  });

  lines.push('\n## Sequential Scene Breakdown');
  project.scenes.forEach((s) => {
    lines.push(`\n### Scene ${s.sceneNumber}: ${s.title} [${s.duration}s]`);
    lines.push(`- **Camera Motion:** ${s.cameraMovement}`);
    lines.push(`- **Lighting & Mood:** ${s.lighting}`);
    lines.push(`- **Characters Present:** ${s.characterIds.join(', ') || 'None'}`);
    lines.push(`- **Action:** ${s.actionSummary}`);
    if (s.dialogue) lines.push(`- **Dialogue:** "${s.dialogue}"`);
    if (s.transition) {
      lines.push(`- **Cinematic Transition:** ${s.transition.label || s.transition.type} (${s.transition.duration}s)`);
    }
    lines.push(`\n**Video Generation Visual Prompt:**\n\`\`\`\n${s.visualPrompt}\n\`\`\``);
  });

  const cleanTitle = project.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  downloadFile(lines.join('\n'), `${cleanTitle}-screenplay.md`, 'text/markdown');
}

// Export Veo & Runway Batch Video Generation Prompts
export function exportVeoBatchPrompts(project: Project) {
  const lines: string[] = [];
  lines.push(`# Google Veo & Video AI Batch Generation Prompts`);
  lines.push(`# Project: ${project.title}`);
  lines.push(`# Aspect Ratio: ${project.aspectRatio}`);
  lines.push(`# Generated with StoryMotion AI`);
  lines.push('\n---\n');

  project.scenes.forEach((s) => {
    lines.push(`[SCENE ${s.sceneNumber} - ${s.title.toUpperCase()}]`);
    lines.push(`DURATION: ${s.duration}s | ASPECT_RATIO: ${project.aspectRatio}`);
    lines.push(`PROMPT:`);
    lines.push(s.visualPrompt);
    lines.push('\n');
  });

  const cleanTitle = project.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  downloadFile(lines.join('\n'), `${cleanTitle}-veo-batch-prompts.txt`, 'text/plain');
}

// Export Complete Dialogue, Voice Acting & Audio Timeline
export function exportAudioScriptTimeline(project: Project) {
  const lines: string[] = [];
  lines.push(`# Complete Dialogue, Voice Acting & Audio Timeline`);
  lines.push(`# Project: ${project.title}`);
  lines.push(`# Total Runtime: ${project.totalDuration}s across ${project.scenes.length} scenes`);
  lines.push('\n---\n');

  project.scenes.forEach((s) => {
    lines.push(`\n## Shot ${s.sceneNumber}: ${s.title} (${s.duration}s)`);
    lines.push(`*Music Mood:* ${s.sceneMusicMood || 'Adventure'}`);

    lines.push(`\n### Spoken Dialogue & Voice Acting:`);
    if (s.dialogueLines && s.dialogueLines.length > 0) {
      s.dialogueLines.forEach((d) => {
        lines.push(
          `- [${d.startTime}s - ${(d.startTime + d.duration).toFixed(1)}s] **${d.speakerName}** (${d.emotion || 'neutral'}): "${d.text}" (Voice: ${d.voiceId || 'narrator'}, Speed: ${d.speed || 1.0}x, Pitch: ${d.pitch || 1.0}x)`
        );
      });
    } else {
      lines.push(`- *(No spoken dialogue)*`);
    }

    lines.push(`\n### Sound Effects (SFX) Timeline:`);
    if (s.soundEffects && s.soundEffects.length > 0) {
      s.soundEffects.forEach((sfx) => {
        lines.push(
          `- [${sfx.startTime}s - ${(sfx.startTime + sfx.duration).toFixed(1)}s] **${sfx.name}** [${sfx.category}]: ${sfx.description} (Vol: ${Math.round((sfx.volume ?? 0.8) * 100)}%)`
        );
      });
    } else {
      lines.push(`- *(No sound effects)*`);
    }
  });

  const cleanTitle = project.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  downloadFile(lines.join('\n'), `${cleanTitle}-audio-timeline.md`, 'text/markdown');
}

// Generate the exact Veo API Payload for copying or inspection
export function generateVeoApiPayload(project: Project, scene?: Scene) {
  const targetScene = scene || project.scenes[0];
  if (!targetScene) return null;

  return {
    model: 'veo-3.1-lite-generate-preview',
    prompt: targetScene.visualPrompt,
    config: {
      numberOfVideos: 1,
      resolution: '720p',
      aspectRatio: project.aspectRatio === '9:16' ? '9:16' : '16:9',
    },
    metadata: {
      projectTitle: project.title,
      sceneNumber: targetScene.sceneNumber,
      cameraMovement: targetScene.cameraMovement,
      lighting: targetScene.lighting,
      durationSeconds: targetScene.duration,
      characters: project.characters.map((c) => ({
        name: c.name,
        visualSpec: c.visualDescription,
        attire: c.attire,
      })),
    },
  };
}

// Generate the exact Wan 2.1 Video Engine API Payload for open-source inference servers
export function generateWanApiPayload(project: Project, scene?: Scene) {
  const targetScene = scene || project.scenes[0];
  if (!targetScene) return null;

  return {
    model: 'wan-2.1-t2v-1.4b',
    prompt: targetScene.visualPrompt,
    negative_prompt: 'blurry, low quality, distorted anatomy, morphing faces, stutter, artifacts',
    aspect_ratio: project.aspectRatio,
    resolution: project.aspectRatio === '9:16' ? '720x1280' : '1280x720',
    duration_seconds: targetScene.duration,
    num_frames: Math.min(81, Math.max(16, targetScene.duration * 16)),
    fps: 16,
    guidance_scale: 6.0,
    seed: 42,
    character_consistency: {
      cast: project.characters.map((c) => ({
        name: c.name,
        role: c.role,
        visualAnchors: c.visualDescription,
        wardrobe: c.attire,
        props: c.keyProps,
      })),
      presentInScene: targetScene.characterIds,
    },
    cinematic_parameters: {
      cameraMovement: targetScene.cameraMovement,
      lighting: targetScene.lighting,
      style: project.style,
    },
  };
}

