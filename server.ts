import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import { wanVideoEngine } from './src/server/videoEngine.ts';

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
      { path: 'src/components/Navbar.tsx', category: 'UI Components' },
      { path: 'src/components/MobileBottomNav.tsx', category: 'UI Components' },
      { path: 'src/components/StoryPromptInput.tsx', category: 'UI Components' },
      { path: 'src/components/CharacterConsistencyManager.tsx', category: 'UI Components' },
      { path: 'src/components/SceneList.tsx', category: 'UI Components' },
      { path: 'src/components/VideoPreviewArea.tsx', category: 'UI Components' },
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
    } = req.body;

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const totalMovieDuration = Math.max(5, Math.min(7200, Number(totalDuration) || 60));
    const sceneCount = Math.max(2, Math.min(32, Number(numScenes) || 4));
    const distributedDurations = distributeServerDuration(totalMovieDuration, sceneCount);
    const avgDuration = Math.round(totalMovieDuration / sceneCount);

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
6. The "visualPrompt" for each scene must be a rich, descriptive prompt for video generation models, mentioning visual style (${style}), exact subject action, camera movement, composition, and consistency anchors.`;

        const userPrompt = `Story Idea: "${prompt.trim()}"
Visual Style: ${style}
Number of Scenes: ${sceneCount}
Total Movie Duration: ${totalMovieDuration} seconds total (~${avgDuration}s per scene)
Aspect Ratio: ${aspectRatio}

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

        const mappedScenes = parsed.scenes.map((s: any, idx: number) => ({
          id: `scene-${Date.now()}-${idx}`,
          sceneNumber: idx + 1,
          title: s.title || `Scene ${idx + 1}`,
          visualPrompt: s.visualPrompt || s.actionSummary || prompt,
          actionSummary: s.actionSummary || 'Key scene progression',
          dialogue: s.dialogue || '',
          cameraMovement: s.cameraMovement || 'Slow Cinematic Pan',
          lighting: s.lighting || 'Cinematic dramatic lighting',
          duration: distributedDurations[idx] || avgDuration,
          characterIds: mappedCharacters.map((c: any) => c.name),
          status: 'ready',
        }));

        return res.json({
          title: parsed.title || 'Untitled Story',
          logline: parsed.logline || prompt,
          genre: parsed.genre || 'Cinematic Drama',
          totalDuration: totalMovieDuration,
          characters: mappedCharacters,
          scenes: mappedScenes,
          source: 'gemini-3.8-flash',
        });
      } catch (geminiError: any) {
        console.warn('Gemini story generation failed or timed out, falling back to smart director engine:', geminiError?.message);
        // Fall back gracefully to intelligent story synthesizer
      }
    }

    // Heuristic Smart Story Engine (Works without external API keys or offline)
    const fallbackStory = generateHeuristicStory(prompt, style, sceneCount, totalMovieDuration, characters, aspectRatio);
    return res.json(fallbackStory);
  } catch (err: any) {
    console.error('Error generating story:', err);
    res.status(500).json({ error: err.message || 'Internal server error while generating story' });
  }
});

// Helper for generating structured story when API key is unconfigured or offline
function generateHeuristicStory(
  rawPrompt: string,
  style: string,
  sceneCount: number,
  totalMovieDuration: number,
  existingCharacters: any[],
  aspectRatio: string
) {
  const cleanPrompt = rawPrompt.trim();
  const title = cleanPrompt.length > 36 ? cleanPrompt.slice(0, 32) + '...' : cleanPrompt;

  // Build or preserve consistent character
  const characters = existingCharacters.length > 0 ? existingCharacters : [
    {
      id: `char-${Date.now()}-0`,
      name: 'Kaelen Gray',
      role: 'Protagonist',
      visualDescription: 'Mid-30s explorer, chiseled features, cropped silver-streaked dark hair, intense grey eyes',
      attire: 'High-collar carbon fiber adventurer coat, utilitarian magnetic belts',
      keyProps: 'Antique compass with luminous blue needle',
    },
    {
      id: `char-${Date.now()}-1`,
      name: 'Lyra',
      role: 'Guide & Companion',
      visualDescription: 'Athletic build, iridescent braided auburn hair, thoughtful expression',
      attire: 'Layered hooded dusk cloak with amber luminescence trim',
      keyProps: 'Brass-ringed optical telescope',
    }
  ];

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

  const sceneTemplates = [
    {
      title: 'The Awakening Catalyst',
      action: 'The protagonist surveys an extraordinary landscape as an unexpected event begins.',
      camera: cameraMoves[0],
      lighting: lightings[0],
    },
    {
      title: 'The Discovery & Threshold',
      action: 'Approaching the focal point, confronting the mystery, and making the pivotal decision.',
      camera: cameraMoves[1],
      lighting: lightings[1],
    },
    {
      title: 'The Rising Surge',
      action: 'Tension escalates as characters interact with the central anomaly or challenge.',
      camera: cameraMoves[2],
      lighting: lightings[2],
    },
    {
      title: 'The Climax Sequence',
      action: 'A peak visual spectacle where all elements converge in dramatic motion.',
      camera: cameraMoves[3],
      lighting: lightings[3],
    },
    {
      title: 'The Reversal & Revelation',
      action: 'An unexpected truth or breathtaking transformation changes the perspective.',
      camera: cameraMoves[4],
      lighting: lightings[4],
    },
    {
      title: 'The Aftermath & Horizon',
      action: 'The dust settles as the camera pulls back, revealing the transformed world into the future.',
      camera: cameraMoves[5],
      lighting: lightings[5],
    },
    {
      title: 'The Journey Continues',
      action: 'Characters set out towards a new horizon with renewed resolve.',
      camera: cameraMoves[6],
      lighting: lightings[0],
    },
    {
      title: 'Grand Finale Resolution',
      action: 'A lingering cinematic tableau that leaves a haunting, beautiful impression.',
      camera: cameraMoves[7],
      lighting: lightings[1],
    },
  ];

  const distributedDurations = distributeServerDuration(totalMovieDuration, sceneCount);
  const selectedScenes = Array.from({ length: sceneCount }, (_, idx) => {
    const tmpl = sceneTemplates[idx % sceneTemplates.length];
    const cycle = Math.floor(idx / sceneTemplates.length);
    const sceneTitle = cycle > 0 ? `${tmpl.title} (Part ${cycle + 1})` : tmpl.title;
    const cameraMove = cameraMoves[idx % cameraMoves.length];
    const lightingSetup = lightings[idx % lightings.length];
    const charDesc = characters[0] ? `Featuring ${characters[0].name} (${characters[0].visualDescription}, wearing ${characters[0].attire})` : '';
    const visualPrompt = `${styleTag}. Scene ${idx + 1} - ${sceneTitle}: ${cleanPrompt}. ${charDesc}. Action: ${tmpl.action}. Camera: ${cameraMove}. Lighting: ${lightingSetup}. Aspect Ratio ${aspectRatio}. 4K crisp render, temporal video consistency.`;

    return {
      id: `scene-${Date.now()}-${idx}`,
      sceneNumber: idx + 1,
      title: sceneTitle,
      visualPrompt,
      actionSummary: tmpl.action,
      dialogue: idx === 1 ? 'Look... it is finally beginning.' : '',
      cameraMovement: cameraMove,
      lighting: lightingSetup,
      duration: distributedDurations[idx] || Math.max(1, Math.round(totalMovieDuration / sceneCount)),
      characterIds: characters.map((c) => c.name),
      status: 'ready' as const,
    };
  });

  return {
    title: title.charAt(0).toUpperCase() + title.slice(1),
    logline: `A ${style} visual odyssey exploring: ${cleanPrompt}`,
    genre: 'Cinematic Journey',
    totalDuration: totalMovieDuration,
    characters,
    scenes: selectedScenes,
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

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
