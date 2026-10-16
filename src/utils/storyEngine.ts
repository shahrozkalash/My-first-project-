import { Character, Scene, Transition, SupportedLanguage } from '../types';
import { DEFAULT_TOTAL_DURATION, distributeTotalDuration } from './duration';
import { DEFAULT_SCENE_TRANSITION } from '../data/constants';

/**
 * Client-Side Heuristic Story Generator
 * Enables full story planning, sequential scene direction, character consistency,
 * and audio/lip-sync cue generation without requiring an active backend or paid API.
 * Ensures the web app remains completely usable when hosted on static GitHub Pages!
 */

export function detectClientSoundEffects(action: string, prompt: string, sceneIdx: number) {
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

export function detectClientDialogue(
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

export function generateClientHeuristicStory(
  rawPrompt: string,
  style: string,
  sceneCount: number,
  totalMovieDuration: number,
  existingCharacters: Character[],
  aspectRatio: string,
  language: SupportedLanguage | string = 'en'
) {
  const cleanPrompt = rawPrompt.trim() || 'A cinematic adventure into uncharted territory';
  const title = cleanPrompt.length > 36 ? cleanPrompt.slice(0, 32) + '...' : cleanPrompt;

  let defaultChars: Character[] = [];
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
      transition: { type: 'dissolve' as const, duration: 1.0, label: 'Cross Dissolve' },
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
      transition: { type: 'wipe-right' as const, duration: 0.8, label: 'Wipe Right' },
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
      transition: { type: 'whip-pan' as const, duration: 0.4, label: 'Whip Pan' },
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
      transition: { type: 'fade-black' as const, duration: 1.0, label: 'Fade to Black' },
    },
  ];

  const distributedDurations = distributeTotalDuration(totalMovieDuration || DEFAULT_TOTAL_DURATION, sceneCount);

  const selectedScenes: Scene[] = Array.from({ length: sceneCount }, (_, idx) => {
    const tmpl = sceneTemplates[idx % sceneTemplates.length];
    const cycle = Math.floor(idx / sceneTemplates.length);
    const sceneTitle = cycle > 0 ? `${tmpl.title} (${cycle + 1})` : tmpl.title;
    const cameraMove = cameraMoves[idx % cameraMoves.length];
    const lightingSetup = lightings[idx % lightings.length];
    const speakingChar = characters[idx % characters.length];
    const charDesc = characters[0] ? `Featuring ${characters[0].name} (${characters[0].visualDescription}, wearing ${characters[0].attire})` : '';

    const visualPrompt = `${styleTag}. Scene ${idx + 1} - ${sceneTitle}: ${cleanPrompt}. ${charDesc}. Action: ${tmpl.action}. Camera: ${cameraMove}. Lighting: ${lightingSetup}. Aspect Ratio ${aspectRatio}. 4K crisp render, temporal video consistency.`;

    const dialogueLines = detectClientDialogue(
      '',
      tmpl.action,
      speakingChar.name,
      idx,
      language
    );
    const soundEffects = detectClientSoundEffects(tmpl.action, cleanPrompt, idx);
    const transitionObj: Transition = idx === sceneCount - 1
      ? { type: 'fade-black', duration: 1.0, label: 'Fade to Black', description: 'Final Outro resolution' }
      : tmpl.transition;

    return {
      id: `scene-${Date.now()}-${idx}`,
      sceneNumber: idx + 1,
      title: sceneTitle,
      visualPrompt,
      actionSummary: tmpl.action,
      dialogue: dialogueLines[0]?.text || '',
      cameraMovement: cameraMove,
      lighting: lightingSetup,
      duration: distributedDurations[idx] || Math.max(1, Math.round((totalMovieDuration || 60) / sceneCount)),
      characterIds: characters.map((c) => c.name),
      status: 'ready' as const,
      dialogueLines,
      soundEffects,
      sceneMusicMood: 'adventure' as const,
      transition: transitionObj,
      Transition: transitionObj,
    };
  });

  return {
    title: title.charAt(0).toUpperCase() + title.slice(1),
    logline: `A ${style} visual odyssey exploring: ${cleanPrompt}`,
    genre: 'Cinematic Journey',
    totalDuration: totalMovieDuration || DEFAULT_TOTAL_DURATION,
    characters,
    scenes: selectedScenes,
    language: language || 'en',
  };
}

export function enhanceClientPrompt(prompt: string, style: string = 'cinematic'): string {
  const clean = prompt.trim();
  const enhancers = [
    '35mm anamorphic lens, shallow depth of field, photorealistic lighting, natural volumetric atmosphere',
    'Panavision 8k crisp detail, temporal coherence, micro-surface textures, natural color grading',
    'octane render reflections, cinematic motion blur, dramatic rim lighting, authentic film grain',
  ];
  const chosen = enhancers[Math.abs(clean.length) % enhancers.length];
  return `${clean}. ${chosen}, ${style} aesthetic, high temporal stability.`;
}
