import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import { wanVideoEngine } from './src/server/videoEngine.ts';
import {
  validateFightScenePlan,
  generateDeterministicFightPlan,
  convertFightPlanToScenes,
} from './src/utils/fightPlannerEngine.ts';
import { SUPPORTED_LOCAL_LLM_MODELS } from './src/data/constants.ts';

const require = createRequire(import.meta.url);
const archiver = require('archiver');

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '10mb' }));

// Initialize GoogleGenAI server-side with telemetry header
const geminiApiKey = process.env.GEMINI_API_KEY || '';
let ai: GoogleGenAI | null = null;
if (geminiApiKey) {
  ai = new GoogleGenAI({
    apiKey: geminiApiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// 1. Health & Config API
app.get('/api/config/status', async (req, res) => {
  const wanHealth = await wanVideoEngine.checkHealth();
  res.json({
    status: 'ok',
    hasGeminiKey: Boolean(geminiApiKey && geminiApiKey !== 'MY_GEMINI_API_KEY'),
    veoReady: false, // Requires paid API key tier with Veo preview access
    wanEngine: wanHealth,
    supportedStyles: [
      { id: 'cinematic', label: 'Cinematic', description: 'Photorealistic film grain, 35mm anamorphic lens, dramatic lighting' },
      { id: 'realistic-3d', label: 'Realistic 3D', description: 'Unreal Engine 5 render, raytraced subsurface scattering' },
      { id: 'anime', label: 'Anime', description: 'Vibrant cel-shaded aesthetic, high emotional dynamic framing' },
      { id: 'cartoon', label: 'Modern Cartoon', description: 'Stylized 3D geometry, expressive character proportions' },
      { id: 'children-animation', label: "Children's Animation", description: 'Soft whimsical textures, warm uplifting palette' },
    ],
    supportedAspectRatios: ['16:9', '9:16'],
  });
});

// Endpoint to view and export complete project source code
app.get('/api/source-code', (req, res) => {
  try {
    const fileList = [
      { path: 'package.json', category: 'Config & Dependencies' },
      { path: 'tsconfig.json', category: 'Config & Dependencies' },
      { path: 'vite.config.ts', category: 'Config & Dependencies' },
      { path: 'metadata.json', category: 'Config & Dependencies' },
      { path: 'index.html', category: 'HTML & Entry' },
      { path: '.env.example', category: 'Environment' },
      { path: 'server.ts', category: 'Backend Server' },
      { path: 'src/server/videoEngine.ts', category: 'Backend Engine' },
      { path: 'src/main.tsx', category: 'Frontend Entry' },
      { path: 'src/App.tsx', category: 'Frontend Core' },
      { path: 'src/index.css', category: 'Styles' },
      { path: 'src/types/index.ts', category: 'Types & Models' },
      { path: 'src/data/constants.ts', category: 'Constants & Demos' },
      { path: 'src/utils/storage.ts', category: 'Storage & Exports' },
      { path: 'src/utils/duration.ts', category: 'Storage & Exports' },
      { path: 'src/utils/audioEngine.ts', category: 'Audio & LipSync Engine' },
      { path: 'src/utils/fightPlannerEngine.ts', category: 'Fight Choreography Engine' },
      { path: 'src/components/Navbar.tsx', category: 'UI Components' },
      { path: 'src/components/MobileBottomNav.tsx', category: 'UI Components' },
      { path: 'src/components/StoryPromptInput.tsx', category: 'UI Components' },
      { path: 'src/components/CharacterConsistencyManager.tsx', category: 'UI Components' },
      { path: 'src/components/SceneList.tsx', category: 'UI Components' },
      { path: 'src/components/VideoPreviewArea.tsx', category: 'UI Components' },
      { path: 'src/components/AudioLipSyncStudio.tsx', category: 'UI Components' },
      { path: 'src/components/FightScenePlannerModal.tsx', category: 'UI Components' },
      { path: 'src/components/ProjectsLibrary.tsx', category: 'UI Components' },
      { path: 'src/components/ApiStatusModal.tsx', category: 'UI Components' },
      { path: 'src/components/ExportModal.tsx', category: 'UI Components' },
    ];

    const files = fileList.map((item) => {
      const fullPath = path.resolve(__dirname, item.path);
      let content = '';
      let exists = false;
      try {
        if (fs.existsSync(fullPath)) {
          content = fs.readFileSync(fullPath, 'utf-8');
          exists = true;
        }
      } catch (e) {
        content = `// Error reading file: ${e}`;
      }
      return {
        path: item.path,
        category: item.category,
        exists,
        content,
        size: content.length,
      };
    });

    res.json({ files, count: files.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to read source files' });
  }
});

// Helper to distribute total duration across scenes
function distributeServerDuration(totalSeconds: number, numScenes: number): number[] {
  const count = Math.max(1, numScenes);
  const total = Math.max(count * 2, totalSeconds);
  const base = Math.floor(total / count);
  let remainder = total % count;
  const result: number[] = [];
  for (let i = 0; i < count; i++) {
    if (remainder > 0) {
      result.push(base + 1);
      remainder--;
    } else {
      result.push(base);
    }
  }
  return result;
}

// 2. Generate Story & Scenes endpoint using Gemini 3.8 Flash
app.post('/api/story/generate', async (req, res) => {
  try {
    const {
      prompt,
      style = 'cinematic',
      numScenes = 4,
      totalDuration = 60,
      characters = [],
      aspectRatio = '16:9',
      language = 'en',
    } = req.body;

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const totalMovieDuration = Math.max(5, Math.min(7200, Number(totalDuration) || 60));
    const sceneCount = Math.max(2, Math.min(32, Number(numScenes) || 4));
    const distributedDurations = distributeServerDuration(totalMovieDuration, sceneCount);
    const avgDuration = Math.round(totalMovieDuration / sceneCount);

    // Language-specific instructions
    let languageInstruction = '';
    if (language === 'ur') {
      languageInstruction = `LANGUAGE REQUIREMENT: The user has selected URDU (اردو).
- The story title, logline, genre, character names/roles, action summaries, and dialogue MUST be written in authentic, elegant Urdu (standard Urdu script).
- CRITICAL: The 'visualPrompt' field for each scene MUST remain in descriptive English with cinematic keywords (${style}), camera motion, and visual details so video generation models (Wan 2.1) synthesize coherent visuals.`;
    } else if (language === 'hi') {
      languageInstruction = `LANGUAGE REQUIREMENT: The user has selected HINDI (हिन्दी).
- The story title, logline, genre, character names/roles, action summaries, and dialogue MUST be written in authentic Hindi (standard Devanagari script).
- CRITICAL: The 'visualPrompt' field for each scene MUST remain in descriptive English with cinematic keywords (${style}), camera motion, and visual details so video generation models (Wan 2.1) synthesize coherent visuals.`;
    }

    // Try Gemini if API key is present
    if (ai && geminiApiKey && geminiApiKey !== 'MY_GEMINI_API_KEY') {
      try {
        const charactersContext = characters.length > 0
          ? `User defined recurring characters:
${characters.map((c: any) => `- Name: ${c.name}, Role: ${c.role || 'Main'}, Appearance: ${c.visualDescription}, Clothing: ${c.attire || 'Consistent wardrobe'}, Props: ${c.keyProps || 'None'}`).join('\n')}
Make sure these characters appear consistently across relevant scenes with their exact appearance details preserved.`
          : 'Create 1 or 2 distinct main characters with memorable, consistent physical traits and clothing so they can be recognized across sequential video shots.';

        const systemInstruction = `You are an elite cinema director and AI video prompt engineer. Your job is to transform a story idea into a structured sequential storyboard script optimized for modern generative video models (such as Wan2.1, Google Veo, Sora, and Runway Gen-3).

CRITICAL REQUIREMENTS:
1. Divide the story into EXACTLY ${sceneCount} sequential, visually coherent scenes.
2. Total movie duration is ${totalMovieDuration} seconds total (divided across the ${sceneCount} scenes).
3. Maintain strict character consistency across all scenes (same facial structure, hair, clothing, color palette).
4. Specify camera movement (e.g. "Slow Pan Right", "Cinematic Zoom In", "Dolly Forward", "Dynamic Handheld Tracking", "Low Angle Orbit", "High Angle Crane Down").
5. Specify lighting & atmosphere (e.g. "Golden hour rim lighting with subtle volumetric haze", "Neon cyan and magenta cyberpunk reflections", "Moody noir shadows with soft keylight").
6. The "visualPrompt" for each scene must be a rich, descriptive prompt for video generation models, mentioning visual style (${style}), exact subject action, camera movement, composition, and consistency anchors.
${languageInstruction}`;

        const userPrompt = `Story Idea: "${prompt.trim()}"
Visual Style: ${style}
Number of Scenes: ${sceneCount}
Total Movie Duration: ${totalMovieDuration} seconds total (~${avgDuration}s per scene)
Aspect Ratio: ${aspectRatio}
Language: ${language}

${charactersContext}

Generate the story title, logline, genre, character list (with consistent appearance specs), and all ${sceneCount} sequential scenes.`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: userPrompt,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                logline: { type: Type.STRING },
                genre: { type: Type.STRING },
                characters: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      role: { type: Type.STRING },
                      visualDescription: { type: Type.STRING },
                      attire: { type: Type.STRING },
                      keyProps: { type: Type.STRING },
                    },
                    required: ['name', 'visualDescription'],
                  },
                },
                scenes: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      sceneNumber: { type: Type.INTEGER },
                      title: { type: Type.STRING },
                      visualPrompt: { type: Type.STRING },
                      actionSummary: { type: Type.STRING },
                      dialogue: { type: Type.STRING },
                      cameraMovement: { type: Type.STRING },
                      lighting: { type: Type.STRING },
                      charactersPresent: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                      },
                    },
                    required: ['sceneNumber', 'title', 'visualPrompt', 'cameraMovement', 'lighting'],
                  },
                },
              },
              required: ['title', 'logline', 'scenes'],
            },
          },
        });

        const textOutput = response.text || '';
        const parsed = JSON.parse(textOutput);

        // Map and validate response
        const mappedCharacters = (parsed.characters && parsed.characters.length > 0)
          ? parsed.characters.map((c: any, idx: number) => ({
              id: characters[idx]?.id || `char-${Date.now()}-${idx}`,
              name: c.name || `Character ${idx + 1}`,
              role: c.role || 'Protagonist',
              visualDescription: c.visualDescription || 'Distinctive appearance',
              attire: c.attire || 'Signature outfit',
              keyProps: c.keyProps || 'None',
            }))
          : characters.length > 0
          ? characters
          : [
              {
                id: `char-${Date.now()}-1`,
                name: 'Alex Vance',
                role: 'Protagonist',
                visualDescription: 'Late 20s, sharp angular jawline, messy dark brown hair, determined amber eyes',
                attire: 'Weathered graphite leather jacket over matte teal tactical sweater',
                keyProps: 'Glowing holographic pocket chronometer',
              },
            ];

        const mappedScenes = parsed.scenes.map((s: any, idx: number) => {
          const charName = (s.charactersPresent && s.charactersPresent[0]) || (mappedCharacters[0]?.name) || (language === 'ur' ? 'راوی' : (language === 'hi' ? 'सूत्रधार' : 'Narrator'));
          const dialogueLines = detectSceneDialogue(s.dialogue || '', s.actionSummary || '', charName, idx, language);
          const soundEffects = detectSceneSoundEffects(s.actionSummary || '', prompt, idx);
          const sceneMusicMood = detectSceneMusicMood(parsed.genre || '', s.actionSummary || '');

          return {
            id: `scene-${Date.now()}-${idx}`,
            sceneNumber: idx + 1,
            title: s.title || `Scene ${idx + 1}`,
            visualPrompt: s.visualPrompt || s.actionSummary || prompt,
            actionSummary: s.actionSummary || 'Key scene progression',
            dialogue: s.dialogue || (dialogueLines[0]?.text || ''),
            cameraMovement: s.cameraMovement || 'Slow Cinematic Pan',
            lighting: s.lighting || 'Cinematic dramatic lighting',
            duration: distributedDurations[idx] || avgDuration,
            characterIds: mappedCharacters.map((c: any) => c.name),
            status: 'ready',
            dialogueLines,
            soundEffects,
            sceneMusicMood,
          };
        });

        return res.json({
          title: parsed.title || 'Untitled Story',
          logline: parsed.logline || prompt,
          genre: parsed.genre || 'Cinematic Drama',
          totalDuration: totalMovieDuration,
          characters: mappedCharacters,
          scenes: mappedScenes,
          language: language || 'en',
          audioSettings: {
            masterVolume: 1.0,
            voiceVolume: 1.0,
            sfxVolume: 0.8,
            musicVolume: 0.35,
            globalMusicMood: detectSceneMusicMood(parsed.genre || '', prompt),
            autoDucking: true,
            duckingPercent: 75,
            language: language || 'en',
            ttsEngine: 'browser_speech',
            subtitleSettings: {
              enabled: true,
              language: 'same_as_audio',
              fontSize: 'base',
              showSpeakerName: true,
              rtlMode: language === 'ur',
            },
          },
          musicTrack: {
            mood: detectSceneMusicMood(parsed.genre || '', prompt),
            title: `${parsed.genre || 'Cinematic'} Theme`,
            volume: 0.35,
            duckingFactor: 0.25,
            enabled: true,
          },
          source: 'gemini-3.8-flash',
        });
      } catch (geminiError: any) {
        console.warn('Gemini story generation failed or timed out, falling back to smart director engine:', geminiError?.message);
        // Fall back gracefully to intelligent story synthesizer
      }
    }

    // Heuristic Smart Story Engine (Works without external API keys or offline)
    const fallbackStory = generateHeuristicStory(prompt, style, sceneCount, totalMovieDuration, characters, aspectRatio, language);
    return res.json(fallbackStory);
  } catch (err: any) {
    console.error('Error generating story:', err);
    res.status(500).json({ error: err.message || 'Internal server error while generating story' });
  }
});

// Audio and SFX heuristic analyzers
export function detectSceneMusicMood(genre: string, text: string): 'suspense' | 'adventure' | 'fantasy' | 'sadness' | 'happiness' | 'calm' {
  const combined = (genre + ' ' + text).toLowerCase();
  if (combined.includes('noir') || combined.includes('cyber') || combined.includes('mystery') || combined.includes('thrill') || combined.includes('tension')) {
    return 'suspense';
  }
  if (combined.includes('fantasy') || combined.includes('magic') || combined.includes('enchant') || combined.includes('mystic') || combined.includes('fairy')) {
    return 'fantasy';
  }
  if (combined.includes('sad') || combined.includes('loss') || combined.includes('melancholy') || combined.includes('grief') || combined.includes('tears')) {
    return 'sadness';
  }
  if (combined.includes('comedy') || combined.includes('joy') || combined.includes('happy') || combined.includes('cheer') || combined.includes('fun')) {
    return 'happiness';
  }
  if (combined.includes('peace') || combined.includes('calm') || combined.includes('serene') || combined.includes('meditat') || combined.includes('nature')) {
    return 'calm';
  }
  return 'adventure';
}

export function detectSceneSoundEffects(action: string, prompt: string, sceneIdx: number): any[] {
  const combined = (action + ' ' + prompt).toLowerCase();
  const sfxList: any[] = [];

  if (combined.includes('walk') || combined.includes('step') || combined.includes('run') || combined.includes('stride') || combined.includes('journey')) {
    sfxList.push({
      id: `sfx-${Date.now()}-${sceneIdx}-1`,
      name: 'Character Footsteps',
      category: 'movement',
      startTime: 0.3,
      duration: 2.2,
      volume: 0.75,
      soundType: 'footsteps',
      description: 'Synchronized movement across surface',
    });
  }
  if (combined.includes('rain') || combined.includes('storm') || combined.includes('thunder') || combined.includes('weather') || combined.includes('sky')) {
    sfxList.push({
      id: `sfx-${Date.now()}-${sceneIdx}-2`,
      name: 'Rain & Rolling Thunder',
      category: 'nature',
      startTime: 0.0,
      duration: 3.5,
      volume: 0.65,
      soundType: 'rain_thunder',
      description: 'Atmospheric storm ambience with distant thunder roll',
    });
  }
  if (combined.includes('door') || combined.includes('portal') || combined.includes('gate') || combined.includes('enter') || combined.includes('threshold')) {
    sfxList.push({
      id: `sfx-${Date.now()}-${sceneIdx}-3`,
      name: 'Threshold Creak & Close',
      category: 'foley',
      startTime: 0.8,
      duration: 1.8,
      volume: 0.8,
      soundType: 'door',
      description: 'Heavy door creak and latching closure',
    });
  }
  if (combined.includes('cyber') || combined.includes('neon') || combined.includes('laser') || combined.includes('device') || combined.includes('energy') || combined.includes('robot')) {
    sfxList.push({
      id: `sfx-${Date.now()}-${sceneIdx}-4`,
      name: 'Sci-Fi Energy Surge',
      category: 'scifi_magic',
      startTime: 1.2,
      duration: 2.4,
      volume: 0.8,
      soundType: 'scifi_energy',
      description: 'High-tech capacitor charge and frequency modulation',
    });
  }
  if (combined.includes('magic') || combined.includes('crystal') || combined.includes('relic') || combined.includes('ancient') || combined.includes('glow')) {
    sfxList.push({
      id: `sfx-${Date.now()}-${sceneIdx}-5`,
      name: 'Celestial Magical Chimes',
      category: 'scifi_magic',
      startTime: 0.6,
      duration: 3.0,
      volume: 0.7,
      soundType: 'magical_chime',
      description: 'Harmonic shimmer and mystery bells',
    });
  }
  if (combined.includes('climax') || combined.includes('surge') || combined.includes('strike') || combined.includes('impact') || combined.includes('burst')) {
    sfxList.push({
      id: `sfx-${Date.now()}-${sceneIdx}-6`,
      name: 'Cinematic Sub Impact',
      category: 'impact',
      startTime: 1.5,
      duration: 2.0,
      volume: 0.85,
      soundType: 'impact_whoosh',
      description: 'Dramatic whoosh into heavy kinetic sub-bass impact',
    });
  }

  if (sfxList.length === 0) {
    sfxList.push({
      id: `sfx-${Date.now()}-${sceneIdx}-amb`,
      name: 'Ambient Atmosphere & Wind',
      category: 'ambience',
      startTime: 0.0,
      duration: 3.0,
      volume: 0.5,
      soundType: 'wind',
      description: 'Subtle environmental room tone and breeze',
    });
  }

  return sfxList;
}

export function detectSceneDialogue(
  dialogueText: string,
  actionSummary: string,
  characterName: string,
  sceneIdx: number,
  language: string = 'en'
): any[] {
  let lineText = '';

  if (dialogueText && dialogueText.trim().length > 0) {
    lineText = dialogueText.trim();
  } else if (language === 'ur') {
    const urduLines = [
      'ہمیں آگے بڑھنا ہوگا، اب پیچھے ہٹنے کا کوئی راستہ نہیں۔',
      'دیکھو... یہ نشانی کچھ اور ہی کہانی بیان کر رہی ہے۔',
      'ثابت قدم رہو! ہم اپنی منزل کے بالکل قریب ہیں۔',
      'ہم نے کر دکھایا۔ افق کبھی اتنا خوبصورت نہیں لگا تھا۔',
    ];
    lineText = urduLines[sceneIdx % urduLines.length];
  } else if (language === 'hi') {
    const hindiLines = [
      'सफ़र शुरू हो चुका है, अब पीछे मुड़कर नहीं देखना।',
      'ध्यान से देखो... यह ऊर्जा कुछ अनोखा संकेत दे रही है।',
      'हिम्मत मत हारना! हम अपनी मंज़िल के बेहद करीब हैं।',
      'हमने कर दिखाया। नया सवेरा हमारा इंतज़ार कर रहा है।',
    ];
    lineText = hindiLines[sceneIdx % hindiLines.length];
  } else {
    const englishLines = [
      'The journey begins now. We cannot turn back.',
      'Look closely... the energy signature is shifting.',
      'Hold your ground! We are almost through!',
      'We made it. The horizon has never looked clearer.',
    ];
    lineText = englishLines[sceneIdx % englishLines.length];
  }

  const wordCount = Math.max(3, lineText.split(/\s+/).length);
  const dur = Math.max(2.0, Math.min(6.5, Math.round(wordCount * 0.42 * 10) / 10));

  // Determine appropriate voiceId based on language and speaker
  let voiceId = 'narrator';
  if (language === 'ur') {
    voiceId = characterName === 'زینب' || characterName === 'Zainab' || characterName === 'Lyra'
      ? 'ur_hero_female'
      : (characterName && characterName !== 'راوی' ? 'ur_hero_male' : 'ur_narrator');
  } else if (language === 'hi') {
    voiceId = characterName === 'अनन्या' || characterName === 'Ananya' || characterName === 'Lyra'
      ? 'hi_hero_female'
      : (characterName && characterName !== 'सूत्रधार' ? 'hi_hero_male' : 'hi_narrator');
  } else {
    voiceId = characterName === 'Lyra' ? 'hero_female' : (characterName ? 'hero_male' : 'narrator');
  }

  return [
    {
      id: `diag-${Date.now()}-${sceneIdx}-1`,
      speakerId: characterName ? `char-${characterName.toLowerCase().replace(/[^a-z0-9]/g, '')}` : 'narrator',
      speakerName: characterName || (language === 'ur' ? 'راوی' : (language === 'hi' ? 'सूत्रधार' : 'Narrator')),
      text: lineText,
      emotion: sceneIdx === 2 ? 'urgent' : (sceneIdx === 0 ? 'dramatic' : 'neutral'),
      startTime: 0.5,
      duration: dur,
      status: 'ready',
      voiceId,
      speed: 1.0,
      pitch: 1.0,
      language: language || 'en',
    },
  ];
}

// Helper for generating structured story when API key is unconfigured or offline
export function generateHeuristicStory(
  rawPrompt: string,
  style: string,
  sceneCount: number,
  totalMovieDuration: number,
  existingCharacters: any[],
  aspectRatio: string,
  language: string = 'en'
) {
  const cleanPrompt = rawPrompt.trim();
  const title = cleanPrompt.length > 36 ? cleanPrompt.slice(0, 32) + '...' : cleanPrompt;

  // Build or preserve consistent character based on language
  let defaultChars: any[] = [];
  if (language === 'ur') {
    defaultChars = [
      {
        id: `char-${Date.now()}-0`,
        name: 'طارق (Tariq)',
        role: 'مرکزی کردار (Protagonist)',
        visualDescription: 'Late 20s explorer, sharp focused eyes, dark hair, strong determined expression',
        attire: 'Traditional layered dark sherwani coat with carbon-fiber accents',
        keyProps: 'Antique compass with glowing blue needle',
        voiceId: 'ur_hero_male',
        voiceGender: 'male',
        voicePitch: 0.95,
        voiceSpeed: 1.0,
        preferredLanguage: 'ur',
      },
      {
        id: `char-${Date.now()}-1`,
        name: 'زینب (Zainab)',
        role: 'رہنما اور ساتھی (Guide)',
        visualDescription: 'Athletic, observant amber eyes, braided dark auburn hair',
        attire: 'Flowing hooded dusk cloak with amber luminescence trim',
        keyProps: 'Brass-ringed optical telescope',
        voiceId: 'ur_hero_female',
        voiceGender: 'female',
        voicePitch: 1.15,
        voiceSpeed: 1.0,
        preferredLanguage: 'ur',
      },
    ];
  } else if (language === 'hi') {
    defaultChars = [
      {
        id: `char-${Date.now()}-0`,
        name: 'आरव (Aarav)',
        role: 'नायक (Protagonist)',
        visualDescription: 'Late 20s bold explorer, sharp focused eyes, dark hair, confident expression',
        attire: 'Modern cinematic adventurer jacket with golden embroidery accents',
        keyProps: 'Antique compass with luminous blue needle',
        voiceId: 'hi_hero_male',
        voiceGender: 'male',
        voicePitch: 0.95,
        voiceSpeed: 1.0,
        preferredLanguage: 'hi',
      },
      {
        id: `char-${Date.now()}-1`,
        name: 'अनन्या (Ananya)',
        role: 'मार्गदर्शक (Guide)',
        visualDescription: 'Athletic, sharp intelligent eyes, braided dark hair',
        attire: 'Flowing hooded twilight cloak with amber trim',
        keyProps: 'Brass-ringed optical telescope',
        voiceId: 'hi_hero_female',
        voiceGender: 'female',
        voicePitch: 1.15,
        voiceSpeed: 1.0,
        preferredLanguage: 'hi',
      },
    ];
  } else {
    defaultChars = [
      {
        id: `char-${Date.now()}-0`,
        name: 'Kaelen Gray',
        role: 'Protagonist',
        visualDescription: 'Mid-30s explorer, chiseled features, cropped silver-streaked dark hair, intense grey eyes',
        attire: 'High-collar carbon fiber adventurer coat, utilitarian magnetic belts',
        keyProps: 'Antique compass with luminous blue needle',
        voiceId: 'hero_male',
        voiceGender: 'male',
        voicePitch: 0.95,
        voiceSpeed: 1.0,
        preferredLanguage: 'en',
      },
      {
        id: `char-${Date.now()}-1`,
        name: 'Lyra',
        role: 'Guide & Companion',
        visualDescription: 'Athletic build, iridescent braided auburn hair, thoughtful expression',
        attire: 'Layered hooded dusk cloak with amber luminescence trim',
        keyProps: 'Brass-ringed optical telescope',
        voiceId: 'hero_female',
        voiceGender: 'female',
        voicePitch: 1.15,
        voiceSpeed: 1.0,
        preferredLanguage: 'en',
      },
    ];
  }

  const characters = (existingCharacters && existingCharacters.length > 0) ? existingCharacters : defaultChars;

  const stylePrefixes: Record<string, string> = {
    cinematic: 'Cinematic 35mm film still, anamorphic lens flare, shallow depth of field, photorealistic, Panavision framing',
    'realistic-3d': 'Unreal Engine 5 cinematic render, raytracing, 8k textures, octane render lighting, hyper-detailed physics',
    anime: 'Studio Ghibli inspired anime aesthetic, Makoto Shinkai sky gradients, hand-drawn digital cel shading, vivid color palette',
    cartoon: 'Modern stylized 3D animation, Pixar quality character shading, expressive stylized lighting, volumetric bloom',
    'children-animation': 'Gentle whimsical 3D animation, clay-soft textures, storybook warm pastel tones, friendly rounded silhouettes',
  };

  const styleTag = stylePrefixes[style] || stylePrefixes.cinematic;

  const cameraMoves = [
    'Wide Establishing Drone Shot, gently descending',
    'Slow Push-In Dolly Shot on character expression',
    'Dynamic Tracking Shot following movement',
    'Dramatic Low-Angle Tilt-Up revealing surroundings',
    'Smooth 360-degree Orbit with depth parallax',
    'Medium Handheld Follow Shot with realistic micro-shake',
    'Slow Horizontal Pan across the vista',
    'Cinematic Crane Shot rising into the sky',
  ];

  const lightings = [
    'Golden hour sunset with amber backlight and soft volumetric dust particles',
    'Moody overcast twilight with soft diffused reflections and mist',
    'Vibrant cyberpunk neon glow with cyan highlights and deep violet shadows',
    'Dramatic high-contrast chiaroscuro with piercing beam of directional light',
    'Warm interior hearth lighting casting soft orange ambient reflections',
    'Ethereal bioluminescent ambient glow pulsing gently in low light',
  ];

  // Language-specific scene template texts
  const sceneTemplates = [
    {
      title: language === 'ur' ? 'آغازِ سفر (The Awakening)' : (language === 'hi' ? 'यात्रा का आरंभ (The Awakening)' : 'The Awakening Catalyst'),
      action: language === 'ur'
        ? 'کردار ایک وسیع اور پراسرار منظر کا جائزہ لیتا ہے اور ایک غیر متوقع سفر کا آغاز ہوتا ہے۔'
        : (language === 'hi'
        ? 'नायक एक विशाल और रहस्यमयी दृश्य का अवलोकन करता है जहां अप्रत्याशित घटना शुरू होती है।'
        : 'The protagonist surveys an extraordinary landscape as an unexpected event begins.'),
      camera: cameraMoves[0],
      lighting: lightings[0],
    },
    {
      title: language === 'ur' ? 'دریافت اور چیلنج (The Threshold)' : (language === 'hi' ? 'खोज और रहस्य (The Threshold)' : 'The Discovery & Threshold'),
      action: language === 'ur'
        ? 'مرکزی مقام کے قریب پہنچ کر اسرار کا سامنا کرنا اور اہم ترین فیصلہ لینا۔'
        : (language === 'hi'
        ? 'मुख्य केंद्र के समीप पहुंचकर रहस्य का सामना करना और निर्णायक कदम उठाना।'
        : 'Approaching the focal point, confronting the mystery, and making the pivotal decision.'),
      camera: cameraMoves[1],
      lighting: lightings[1],
    },
    {
      title: language === 'ur' ? 'بحران اور کشمکش (The Conflict)' : (language === 'hi' ? 'संघर्ष की घड़ी (The Conflict)' : 'The Rising Surge'),
      action: language === 'ur'
        ? 'تناؤ میں اضافہ ہوتا ہے جب کردار مرکزی رکاوٹ کا بہادری سے مقابلہ کرتے ہیں۔'
        : (language === 'hi'
        ? 'तनाव बढ़ता है जब पात्र केंद्रीय चुनौती का डटकर सामना करते हैं।'
        : 'Tension escalates as characters interact with the central anomaly or challenge.'),
      camera: cameraMoves[2],
      lighting: lightings[2],
    },
    {
      title: language === 'ur' ? 'انجام اور فتح (The Resolution)' : (language === 'hi' ? 'विजय और नई सुबह (The Resolution)' : 'The Climax Sequence'),
      action: language === 'ur'
        ? 'ایک شاندار اختتام جہاں تمام رکاوٹیں دور ہو جاتی ہیں اور نیا افق طلوع ہوتا ہے۔'
        : (language === 'hi'
        ? 'एक भव्य समापन जहां सभी बाधाएं दूर होती हैं और एक नया सवेरा सामने आता है।'
        : 'A peak visual spectacle where all elements converge in dramatic motion.'),
      camera: cameraMoves[3],
      lighting: lightings[3],
    },
  ];

  const distributedDurations = distributeServerDuration(totalMovieDuration, sceneCount);
  const selectedScenes = Array.from({ length: sceneCount }, (_, idx) => {
    const tmpl = sceneTemplates[idx % sceneTemplates.length];
    const cycle = Math.floor(idx / sceneTemplates.length);
    const sceneTitle = cycle > 0 ? `${tmpl.title} (${cycle + 1})` : tmpl.title;
    const cameraMove = cameraMoves[idx % cameraMoves.length];
    const lightingSetup = lightings[idx % lightings.length];
    const speakingChar = characters[idx % characters.length];
    const charDesc = characters[0] ? `Featuring ${characters[0].name} (${characters[0].visualDescription}, wearing ${characters[0].attire})` : '';
    
    // Notice: visualPrompt is kept in detailed English for diffusion models (Wan 2.1)
    const visualPrompt = `${styleTag}. Scene ${idx + 1} - ${sceneTitle}: ${cleanPrompt}. ${charDesc}. Action: ${tmpl.action}. Camera: ${cameraMove}. Lighting: ${lightingSetup}. Aspect Ratio ${aspectRatio}. 4K crisp render, temporal video consistency.`;

    const dialogueLines = detectSceneDialogue(
      '',
      tmpl.action,
      speakingChar.name,
      idx,
      language
    );
    const soundEffects = detectSceneSoundEffects(tmpl.action, cleanPrompt, idx);
    const sceneMusicMood = detectSceneMusicMood('Cinematic Journey', tmpl.action);

    return {
      id: `scene-${Date.now()}-${idx}`,
      sceneNumber: idx + 1,
      title: sceneTitle,
      visualPrompt,
      actionSummary: tmpl.action,
      dialogue: dialogueLines[0]?.text || '',
      cameraMovement: cameraMove,
      lighting: lightingSetup,
      duration: distributedDurations[idx] || Math.max(1, Math.round(totalMovieDuration / sceneCount)),
      characterIds: characters.map((c) => c.name),
      status: 'ready' as const,
      dialogueLines,
      soundEffects,
      sceneMusicMood,
    };
  });

  const globalMusicMood = detectSceneMusicMood('Cinematic Journey', cleanPrompt);

  return {
    title: title.charAt(0).toUpperCase() + title.slice(1),
    logline: `A ${style} visual odyssey exploring: ${cleanPrompt}`,
    genre: 'Cinematic Journey',
    totalDuration: totalMovieDuration,
    characters,
    scenes: selectedScenes,
    language: language || 'en',
    audioSettings: {
      masterVolume: 1.0,
      voiceVolume: 1.0,
      sfxVolume: 0.8,
      musicVolume: 0.35,
      globalMusicMood,
      autoDucking: true,
      duckingPercent: 75,
      language: language || 'en',
      ttsEngine: 'browser_speech',
      subtitleSettings: {
        enabled: true,
        language: 'same_as_audio',
        fontSize: 'base',
        showSpeakerName: true,
        rtlMode: language === 'ur',
      },
    },
    musicTrack: {
      mood: globalMusicMood,
      title: `${title} - Theme Suite`,
      volume: 0.35,
      duckingFactor: 0.25,
      enabled: true,
    },
    source: 'local-director-engine',
  };
}

// 3. Enhance single scene prompt endpoint
app.post('/api/story/enhance-prompt', async (req, res) => {
  try {
    const { prompt, style = 'cinematic', cameraMovement = 'Cinematic Pan', lighting = 'Golden hour' } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    if (ai && geminiApiKey && geminiApiKey !== 'MY_GEMINI_API_KEY') {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: `Enhance this video generation prompt for maximum visual realism, temporal stability, and cinematic quality:
Current Prompt: "${prompt}"
Style: ${style}
Camera Movement: ${cameraMovement}
Lighting: ${lighting}

Return ONLY the enhanced prompt string without commentary.`,
        });
        const enhanced = response.text?.trim() || prompt;
        return res.json({ enhancedPrompt: enhanced });
      } catch (e) {
        // Fallback
      }
    }

    // Fallback enhancement
    const enhanced = `${prompt.trim()}, shot in ${style} aesthetic, ${cameraMovement}, ${lighting}, 35mm lens, photorealistic filmic texture, 8k resolution, volumetric atmosphere, ultra-smooth motion vector.`;
    res.json({ enhancedPrompt: enhanced });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to enhance prompt' });
  }
});

// 4. Video Generation Endpoint (Veo / Video API Integration point)
// As required by user:
// - Prepare a secure backend integration point for a real video-generation API, such as an eligible Google Veo API.
// - Clearly distinguish working features from features requiring API configuration.
// - Do not display fake generated videos or pretend that generation has succeeded.
app.post('/api/video/generate', async (req, res) => {
  try {
    const { scenePrompt, aspectRatio = '16:9', duration = 5 } = req.body;

    if (!scenePrompt) {
      return res.status(400).json({ error: 'scenePrompt is required' });
    }

    // Check if real Veo API call is possible
    if (!geminiApiKey || geminiApiKey === 'MY_GEMINI_API_KEY') {
      return res.status(403).json({
        error: 'API_KEY_REQUIRED',
        message: 'Google Veo video generation requires an active Gemini API key configured with Veo model access.',
        requiresExternalApi: true,
        apiTarget: 'veo-3.1-lite-generate-preview',
        requestPayload: {
          model: 'veo-3.1-lite-generate-preview',
          prompt: scenePrompt,
          config: {
            numberOfVideos: 1,
            resolution: '720p',
            aspectRatio: aspectRatio === '9:16' ? '9:16' : '16:9',
          },
        },
      });
    }

    // Attempt real Veo generation if user has Veo access
    if (ai) {
      try {
        const operation = await (ai.models as any).generateVideos({
          model: 'veo-3.1-lite-generate-preview',
          prompt: scenePrompt,
          config: {
            numberOfVideos: 1,
            resolution: '720p',
            aspectRatio: aspectRatio === '9:16' ? '9:16' : '16:9',
          },
        });

        return res.json({
          success: true,
          operationName: operation.name,
          message: 'Video generation started with Google Veo.',
        });
      } catch (veoErr: any) {
        console.warn('Veo API call error:', veoErr?.message);
        return res.status(402).json({
          error: 'VEO_PAID_ACCESS_REQUIRED',
          message: veoErr?.message || 'Video generation with Google Veo requires a billing-enabled Google Cloud Project with Veo preview permissions.',
          requiresExternalApi: true,
          apiTarget: 'veo-3.1-lite-generate-preview',
          hint: 'The story plan, scene composition, and character consistency prompts are completely functional and ready for export to any video pipeline.',
        });
      }
    }

    return res.status(400).json({ error: 'AI client not initialized' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error processing video generation' });
  }
});

// 5. Video Status Polling endpoint
app.post('/api/video/status', async (req, res) => {
  try {
    const { operationName } = req.body;
    if (!operationName) {
      return res.status(400).json({ error: 'operationName is required' });
    }
    if (!ai) {
      return res.status(400).json({ error: 'AI client not initialized' });
    }

    const op: any = { name: operationName };
    const updated = await (ai.operations as any).getVideosOperation({ operation: op });
    res.json({
      done: updated.done,
      error: updated.error,
      metadata: updated.metadata,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to check video status' });
  }
});

// 6. Modular Wan Video Engine Endpoints
// Check Wan inference engine reachability and model config
app.get('/api/video/engine/status', async (req, res) => {
  try {
    const health = await wanVideoEngine.checkHealth();
    res.json(health);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to check video engine status' });
  }
});

// Submit a video generation job to Wan inference server
app.post('/api/video/engine/generate', async (req, res) => {
  try {
    const {
      sceneId,
      sceneNumber = 1,
      prompt,
      negativePrompt,
      aspectRatio = '16:9',
      duration = 5,
      resolution = '720p',
      guidanceScale,
      seed,
      characterConsistencyTags = [],
      referenceImageUrl,
      cameraMovement,
      lighting,
      style,
    } = req.body;

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const result = await wanVideoEngine.submitJob({
      sceneId: sceneId || `scene_${Date.now()}`,
      sceneNumber: Number(sceneNumber) || 1,
      prompt: prompt.trim(),
      negativePrompt,
      aspectRatio: aspectRatio === '9:16' ? '9:16' : '16:9',
      duration: Math.max(1, Math.min(120, Number(duration) || 5)),
      resolution,
      guidanceScale,
      seed,
      characterConsistencyTags,
      referenceImageUrl,
      cameraMovement,
      lighting,
      style,
    });

    const statusCode = result.success ? 200 : (result.error === 'ENGINE_NOT_CONFIGURED' ? 412 : 502);
    return res.status(statusCode).json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'SERVER_ERROR', message: err.message });
  }
});

// List all jobs in video engine registry
app.get('/api/video/engine/jobs', (req, res) => {
  try {
    const jobs = wanVideoEngine.listJobs();
    res.json({ jobs, count: jobs.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to list jobs' });
  }
});

// Test connection probe endpoint
app.post('/api/video/engine/test-connection', async (req, res) => {
  try {
    const health = await wanVideoEngine.checkHealth();
    res.json(health);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Connection test failed' });
  }
});

// Check Wan generation job status
app.get('/api/video/engine/job/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    if (!jobId) {
      return res.status(400).json({ error: 'jobId is required' });
    }
    const status = await wanVideoEngine.getJobStatus(jobId);
    res.json(status);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to check Wan job status' });
  }
});

// Stream/proxy generated video from Wan inference server
app.get('/api/video/engine/video/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const status = await wanVideoEngine.getJobStatus(jobId);

    if (!status.videoUrl) {
      return res.status(404).json({ error: 'Video file not yet ready or job failed' });
    }

    const videoRes = await fetch(status.videoUrl);
    if (!videoRes.ok) {
      return res.status(502).json({ error: 'Failed to fetch video stream from inference server' });
    }

    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Disposition', `inline; filename="wan-scene-${jobId}.mp4"`);
    
    const arrayBuffer = await videoRes.arrayBuffer();
    res.send(Buffer.from(arrayBuffer));
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to stream video' });
  }
});

// 7. Windows Local Helper Download & Control APIs
// One-click downloadable ZIP archive containing the complete Windows Local Helper
app.get('/api/download/windows-helper', (req, res) => {
  try {
    const helperDir = path.resolve(__dirname, 'windows-helper');
    if (!fs.existsSync(helperDir)) {
      return res.status(404).json({ error: 'windows-helper directory not found' });
    }

    res.attachment('StoryMotion-AI-Windows-Helper.zip');
    res.setHeader('Content-Type', 'application/zip');

    const archive = typeof archiver === 'function'
      ? archiver('zip', { zlib: { level: 9 } })
      : new archiver.ZipArchive({ zlib: { level: 9 } });

    archive.on('error', (err: any) => {
      console.error('Archive build error:', err);
      if (!res.headersSent) {
        res.status(500).send({ error: err.message });
      }
    });

    archive.pipe(res);
    archive.directory(helperDir, 'StoryMotion-AI-Windows-Helper');
    archive.finalize();
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to generate Windows Helper package' });
  }
});

// Pair local helper token
app.post('/api/helper/pair', (req, res) => {
  const { token, engineUrl } = req.body;
  if (token) wanVideoEngine.setPairingToken(token);
  if (engineUrl) wanVideoEngine.setEngineUrl(engineUrl);
  res.json({ success: true, message: 'Local pairing credentials updated' });
});

// Proxy system check
app.get('/api/helper/status', async (req, res) => {
  try {
    const health = await wanVideoEngine.checkHealth();
    res.json(health);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Helper status check failed' });
  }
});

// Proxy model download trigger
app.post('/api/helper/model/download', async (req, res) => {
  try {
    const { modelId } = req.body;
    if (!modelId) return res.status(400).json({ error: 'modelId is required' });
    const result = await wanVideoEngine.downloadModel(modelId);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to trigger model download' });
  }
});

// Proxy cancel model download
app.post('/api/helper/model/cancel-download', async (req, res) => {
  try {
    const result = await wanVideoEngine.cancelDownload();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to cancel download' });
  }
});

// Proxy start engine
app.post('/api/helper/engine/start', async (req, res) => {
  try {
    const { modelId } = req.body;
    const result = await wanVideoEngine.startEngine(modelId || 'wan-2.1-t2v-1.4b');
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to start engine' });
  }
});

// Proxy stop engine
app.post('/api/helper/engine/stop', async (req, res) => {
  try {
    const result = await wanVideoEngine.stopEngine();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to stop engine' });
  }
});

// Proxy test engine (1-second smoke test)
app.post('/api/helper/engine/test', async (req, res) => {
  try {
    const result = await wanVideoEngine.submitTestJob();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Test video generation failed' });
  }
});

// Proxy fetch live helper logs
app.get('/api/helper/logs', async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 100;
    const logs = await wanVideoEngine.getLogs(limit);
    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to retrieve logs' });
  }
});

// Proxy cancel job
app.post('/api/helper/job/cancel', async (req, res) => {
  try {
    const { jobId } = req.body;
    if (!jobId) return res.status(400).json({ error: 'jobId is required' });
    const result = await wanVideoEngine.cancelJob(jobId);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to cancel job' });
  }
});

// Proxy local audio TTS generation
app.post('/api/helper/audio/tts/generate', async (req, res) => {
  try {
    const result = await wanVideoEngine.generateDialogueAudio(req.body);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to generate dialogue audio' });
  }
});

// Proxy local lip-sync processing
app.post('/api/helper/audio/lipsync/process', async (req, res) => {
  try {
    const result = await wanVideoEngine.processLipSync(req.body);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to process lip-sync' });
  }
});

// Proxy local FFmpeg audio mixing & MP4 assembly
app.post('/api/helper/audio/mix/assemble', async (req, res) => {
  try {
    const result = await wanVideoEngine.assembleFinalMp4(req.body);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to assemble MP4 with audio mix' });
  }
});

// Proxy local FFmpeg multi-scene master movie assembly at exact requested resolution
app.post(['/api/helper/video/assemble-movie', '/api/video/assemble-movie'], async (req, res) => {
  try {
    const { title, aspectRatio = '16:9', resolution = '720p', scenes = [] } = req.body;
    if (!scenes || !Array.isArray(scenes) || scenes.length === 0) {
      return res.status(400).json({ error: 'Scenes array is required for movie assembly' });
    }

    const result = await wanVideoEngine.assembleMovie({
      title: title || 'StoryMotion Movie',
      aspectRatio,
      resolution,
      scenes,
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: 'HELPER_OFFLINE',
      message: `Failed to contact local Windows Helper for MP4 assembly: ${err.message || err}. Ensure windows-helper\\start.bat is running on your machine.`,
    });
  }
});

// ========================================================
// 11. Zero-Cost Local Fight Scene Planner Endpoints
// ========================================================

// Get list of supported free local LLM models with verified licenses
app.get('/api/fight-planner/models', async (req, res) => {
  try {
    const health = await wanVideoEngine.checkHealth();
    const helperLlmModels = (health as any)?.llmEngine?.models || {};

    const enriched = SUPPORTED_LOCAL_LLM_MODELS.map((m) => {
      const helperState = helperLlmModels[m.id];
      const downloaded = helperState ? Boolean(helperState.downloaded) : false;
      const compatible = helperState ? Boolean(helperState.compatible) : m.compatible;
      return {
        ...m,
        downloaded,
        compatible,
      };
    });

    res.json({
      models: enriched,
      defaultModel: 'deepseek-r1-distill-qwen-1.5b',
      hardware: health.hardware,
      isHelperReachable: health.reachable,
      zeroCost: true,
    });
  } catch (err: any) {
    res.json({
      models: SUPPORTED_LOCAL_LLM_MODELS,
      defaultModel: 'deepseek-r1-distill-qwen-1.5b',
      isHelperReachable: false,
      zeroCost: true,
    });
  }
});

// Generate structured fight scene plan
app.post('/api/fight-planner/generate', async (req, res) => {
  try {
    const {
      storyContext,
      combatStyle = 'martial-arts',
      pacing = 'rapid-kinetic',
      environment,
      previousSceneEnding = '',
      targetDuration = 20,
      numShots = 4,
      visualStyle = 'cinematic',
      aspectRatio = '16:9',
      characters = [],
      modelId = 'deepseek-r1-distill-qwen-1.5b',
      forceOfflineFallback = false,
    } = req.body;

    if (!environment || typeof environment !== 'string' || environment.trim().length === 0) {
      return res.status(400).json({ error: 'Environment description is required for spatial fight planning.' });
    }

    const health = await wanVideoEngine.checkHealth();
    let helperResult: any = null;

    // If local Windows helper is online, try contacting it
    if (health.reachable && !forceOfflineFallback) {
      try {
        helperResult = await wanVideoEngine.generateFightScenePlan({
          storyContext,
          combatStyle,
          pacing,
          environment,
          previousSceneEnding,
          targetDuration,
          numShots,
          visualStyle,
          aspectRatio,
          characters,
          modelId,
        });

        if (helperResult?.success && helperResult?.plan) {
          const validated = validateFightScenePlan(helperResult.plan);
          return res.json({
            success: true,
            plan: validated.repairedPlan || helperResult.plan,
            validation: validated,
            source: 'local_hardware_llm',
            modelUsed: modelId,
            message: `Fight plan synthesized via local ${modelId} inference on your machine.`,
          });
        }

        // If helper responded with honest MODEL_NOT_INSTALLED:
        if (helperResult?.status === 'model_not_installed') {
          return res.status(412).json({
            success: false,
            status: 'model_not_installed',
            error: 'MODEL_NOT_INSTALLED',
            message: helperResult.message || `Local model '${modelId}' is not installed on this PC.`,
            requiredModel: modelId,
            hardwareRequired: helperResult.hardwareRequired,
            license: helperResult.license,
            helperOnline: true,
          });
        }
      } catch (helperErr: any) {
        console.warn('Local helper LLM probe error:', helperErr.message);
      }
    }

    // Deterministic local choreographic blueprint generator
    // Generates non-graphic readable movement with clear cause-and-effect and character continuity
    const deterministicPlan = generateDeterministicFightPlan({
      storyContext: storyContext || 'High-stakes tactical duel',
      combatStyle,
      pacing,
      environment,
      previousSceneEnding,
      targetDuration,
      numShots,
      visualStyle,
      aspectRatio,
      characters,
      modelId,
    });

    const validation = validateFightScenePlan(deterministicPlan);

    return res.json({
      success: true,
      plan: validation.repairedPlan || deterministicPlan,
      validation,
      source: 'local-choreographer-engine',
      modelUsed: modelId,
      helperReachable: health.reachable,
      note: health.reachable
        ? `Windows Helper is online. For local neural LLM execution, download ${modelId} weights.`
        : 'Windows Helper offline. Generated via deterministic local choreographer engine.',
      zeroCost: true,
    });
  } catch (err: any) {
    console.error('Error generating fight plan:', err);
    res.status(500).json({ error: err.message || 'Internal error generating fight plan' });
  }
});

// Validate Fight Plan JSON Schema
app.post('/api/fight-planner/validate', (req, res) => {
  try {
    const result = validateFightScenePlan(req.body);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ valid: false, errors: [err.message] });
  }
});

// Handoff approved fight scene plan to WAN scenes
app.post('/api/fight-planner/handoff-to-wan', (req, res) => {
  try {
    const { plan, startIndex = 0 } = req.body;
    if (!plan || !Array.isArray(plan.shots)) {
      return res.status(400).json({ error: 'Valid fight scene plan with shots is required.' });
    }

    const validated = validateFightScenePlan(plan);
    const safePlan = validated.repairedPlan || plan;
    const scenes = convertFightPlanToScenes(safePlan, Number(startIndex) || 0);

    res.json({
      success: true,
      scenes,
      shotCount: scenes.length,
      message: `Handoff successful: ${scenes.length} fight shots converted to WAN scenes with character continuity anchors.`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to convert fight plan to WAN scenes' });
  }
});

// In production, serve built frontend; in dev, mount Vite middleware
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`StoryMotion AI server running on http://0.0.0.0:${PORT}`);
  });
}

if (process.env.TEST_MODE !== '1') {
  startServer().catch((err) => {
    console.error('Fatal server startup error:', err);
    process.exit(1);
  });
}
