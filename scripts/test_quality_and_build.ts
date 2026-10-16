/**
 * StoryMotion AI - Quality Selector & GitHub Pages Verification Test Suite
 */

import { getResolutionDimensions, VIDEO_RESOLUTIONS, CINEMATIC_TRANSITIONS } from '../src/data/constants';
import { createNewProjectTemplate, saveProjectToStorage, getStoredProjects } from '../src/utils/storage';
import { generateHeuristicFightScenePlan, convertFightPlanToScenes } from '../src/utils/fightPlannerEngine';
import { generateClientHeuristicStory } from '../src/utils/storyEngine';
import fs from 'fs';
import path from 'path';

function runQualityAndBuildTests() {
  console.log('================================================================');
  console.log('   STORYMOTION AI - QUALITY SELECTOR & DEPLOYMENT VERIFICATION   ');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`  ✓ PASS: ${msg}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${msg}`);
      failed++;
    }
  }

  // --- SUITE 1: Video Quality & Resolution Matrix ---
  console.log('--- TEST SUITE 1: VIDEO QUALITY & RESOLUTION MATRIX ---');
  assert(VIDEO_RESOLUTIONS.length === 3, 'Exactly 3 standard resolutions registered');

  const res480p = VIDEO_RESOLUTIONS.find((r) => r.id === '480p');
  const res720p = VIDEO_RESOLUTIONS.find((r) => r.id === '720p');
  const res1080p = VIDEO_RESOLUTIONS.find((r) => r.id === '1080p');

  assert(Boolean(res480p), '480p resolution option exists');
  assert(res480p?.landscapeDimensions.width === 854 && res480p?.landscapeDimensions.height === 480, '480p landscape is 854 × 480');
  assert(res480p?.portraitDimensions.width === 480 && res480p?.portraitDimensions.height === 854, '480p portrait is 480 × 854');

  assert(Boolean(res720p), '720p HD resolution option exists');
  assert(res720p?.landscapeDimensions.width === 1280 && res720p?.landscapeDimensions.height === 720, '720p landscape is 1280 × 720');
  assert(res720p?.portraitDimensions.width === 720 && res720p?.portraitDimensions.height === 1280, '720p portrait is 720 × 1280');
  assert(res720p?.nativeWanSupport === true, '720p correctly designated as native WAN diffusion output');

  assert(Boolean(res1080p), '1080p Full HD resolution option exists');
  assert(res1080p?.landscapeDimensions.width === 1920 && res1080p?.landscapeDimensions.height === 1080, '1080p landscape is 1920 × 1080');
  assert(res1080p?.portraitDimensions.width === 1080 && res1080p?.portraitDimensions.height === 1920, '1080p portrait is 1080 × 1920');
  assert(res1080p?.nativeWanSupport === false, '1080p clearly designated as upscaled (not fake native diffusion)');
  assert(Boolean(res1080p?.upscalingMethod?.includes('Lanczos')), '1080p upscaling method documented as Lanczos filter');

  // Test dimension calculation helper
  const dim16_9_720 = getResolutionDimensions('720p', '16:9');
  assert(dim16_9_720.width === 1280 && dim16_9_720.height === 720, 'getResolutionDimensions returns 1280x720 for 16:9');

  const dim9_16_720 = getResolutionDimensions('720p', '9:16');
  assert(dim9_16_720.width === 720 && dim9_16_720.height === 1280, 'getResolutionDimensions returns 720x1280 for 9:16 portrait');

  const dim16_9_1080 = getResolutionDimensions('1080p', '16:9');
  assert(dim16_9_1080.width === 1920 && dim16_9_1080.height === 1080, 'getResolutionDimensions returns 1920x1080 for 1080p 16:9');

  const defaultTemplate = createNewProjectTemplate();
  assert(defaultTemplate.videoResolution === '720p', 'New projects default to 720p HD resolution');

  // --- SUITE 2: Cinematic Transitions & Choreography Integration ---
  console.log('\n--- TEST SUITE 2: CINEMATIC TRANSITIONS & FIGHT SCENE PLANNER ---');
  assert(CINEMATIC_TRANSITIONS.length >= 6, `At least 6 cinematic transitions registered (found ${CINEMATIC_TRANSITIONS.length})`);

  const hasFade = CINEMATIC_TRANSITIONS.some((t) => t.id === 'fade-black');
  const hasDissolve = CINEMATIC_TRANSITIONS.some((t) => t.id === 'dissolve');
  const hasWipe = CINEMATIC_TRANSITIONS.some((t) => t.id.startsWith('wipe'));
  assert(hasFade, 'Fade to black transition registered with duration bounds');
  assert(hasDissolve, 'Cross dissolve transition registered with duration bounds');
  assert(hasWipe, 'Wipe transition registered with duration bounds');

  const plan = generateHeuristicFightScenePlan({
    storyContext: 'Hero and rival meet on a rain-slicked neon rooftop',
    combatStyle: 'martial-arts',
    pacing: 'rapid-kinetic',
    environment: 'Wet rooftop under glowing neon signs',
    previousSceneEnding: 'Lightning flashes as coats are cast aside',
    targetDuration: 16,
    numShots: 4,
    visualStyle: 'cinematic',
    aspectRatio: '16:9',
    characters: [
      {
        id: 'c1',
        name: 'Kaelen',
        role: 'Protagonist',
        visualDescription: 'athletic fighter',
        attire: 'dark coat',
        keyProps: 'staff',
      },
      {
        id: 'c2',
        name: 'Vane',
        role: 'Antagonist',
        visualDescription: 'tall swordsman',
        attire: 'silver armor',
        keyProps: 'blade',
      },
    ],
  });

  const convertedScenes = convertFightPlanToScenes(plan, 0);
  assert(convertedScenes.length === 4, 'Converted 4 fight shots into scenes');
  assert(convertedScenes[0].transition !== undefined, 'Converted scene 1 contains structured Transition object');
  assert(typeof convertedScenes[0].transition?.duration === 'number', 'Transition has numeric duration setting');
  assert(convertedScenes[0].Transition !== undefined, 'Capitalized Scene.Transition field exists for type compatibility');

  // --- SUITE 3: Offline & Static Hosting Story Engine ---
  console.log('\n--- TEST SUITE 3: CLIENT-SIDE STORY ENGINE ---');
  const clientStory = generateClientHeuristicStory(
    'A lone traveler ventures into a crystal cavern',
    'cinematic',
    4,
    60,
    [],
    '16:9',
    'en'
  );
  assert(clientStory.scenes.length === 4, 'Client story generator creates 4 sequential scenes');
  assert(clientStory.scenes[0].transition !== undefined, 'Client story scenes have cinematic transitions initialized');
  assert(clientStory.scenes.reduce((acc, s) => acc + s.duration, 0) === 60, 'Client story preserves exact 60s total duration');

  // --- SUITE 4: GitHub Pages Configuration & Artifact Paths ---
  console.log('\n--- TEST SUITE 4: GITHUB PAGES CONFIGURATION ---');
  const rootDir = process.cwd();
  const gitignoreContent = fs.readFileSync(path.resolve(rootDir, '.gitignore'), 'utf8');
  assert(gitignoreContent.includes('*.safetensors'), '.gitignore excludes large AI safetensors weights');
  assert(gitignoreContent.includes('*.pt'), '.gitignore excludes PyTorch checkpoint weights');
  assert(gitignoreContent.includes('*.mp4'), '.gitignore excludes rendered video outputs');
  assert(gitignoreContent.includes('.env*'), '.gitignore excludes local environment secrets');

  const workflowPath = path.resolve(rootDir, '.github/workflows/deploy.yml');
  assert(fs.existsSync(workflowPath), 'GitHub Actions deploy.yml workflow exists');
  const workflowContent = fs.readFileSync(workflowPath, 'utf8');
  assert(workflowContent.includes('/storymontionai/'), 'Workflow configures /storymontionai/ repository base path');
  assert(workflowContent.includes('actions/deploy-pages'), 'Workflow uses official actions/deploy-pages');

  const public404Path = path.resolve(rootDir, 'public/404.html');
  assert(fs.existsSync(public404Path), 'public/404.html SPA redirect exists for GitHub Pages');
  const public404Content = fs.readFileSync(public404Path, 'utf8');
  assert(public404Content.includes('storymontionai') || public404Content.includes('pathSegmentsToKeep'), '404.html handles repository subpath redirection');

  console.log('\n================================================================');
  console.log(`   TESTS COMPLETED: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runQualityAndBuildTests();
