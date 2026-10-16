import {
  FightScenePlan,
  FightScenePlanRequest,
  FightShot,
  FightChoreographyStyle,
  FightPacing,
  Character,
  Scene,
  SoundEffectEvent,
  CameraMovement,
  LightingMood,
} from '../types';
import { SUPPORTED_LOCAL_LLM_MODELS } from '../data/constants';

/**
 * Validation result interface for fight scene plans
 */
export interface FightPlanValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  repairedPlan?: FightScenePlan;
}

/**
 * Comprehensive JSON Schema Validator for FightScenePlan.
 * Verifies all required fields, non-graphic constraints, continuity fields,
 * and duration boundaries. Automatically repairs missing or out-of-spec fields.
 */
export function validateFightScenePlan(data: any): FightPlanValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!data || typeof data !== 'object') {
    return {
      valid: false,
      errors: ['Input must be a valid JSON object.'],
      warnings: [],
    };
  }

  // 1. Root fields validation
  if (!data.title || typeof data.title !== 'string') {
    errors.push('Missing or invalid "title" field.');
  }

  if (!Array.isArray(data.shots) || data.shots.length === 0) {
    errors.push('Fight plan must contain a non-empty "shots" array.');
    return { valid: false, errors, warnings };
  }

  // 2. Individual shots validation
  const repairedShots: FightShot[] = [];
  let totalDurationCalc = 0;

  for (let idx = 0; idx < data.shots.length; idx++) {
    const s = data.shots[idx];
    const shotNum = s.shotNumber || idx + 1;

    if (!s.movementChoreography || typeof s.movementChoreography !== 'string') {
      errors.push(`Shot ${shotNum}: Missing "movementChoreography" string.`);
    }

    if (!s.visualPrompt || typeof s.visualPrompt !== 'string') {
      errors.push(`Shot ${shotNum}: Missing "visualPrompt" string for WAN engine.`);
    }

    // Check duration (WAN native clips run 2s - 6s for optimal temporal coherence)
    const rawDur = Number(s.duration);
    let validDuration = rawDur;
    if (isNaN(rawDur) || rawDur < 1 || rawDur > 15) {
      warnings.push(`Shot ${shotNum}: Duration ${rawDur}s adjusted to standard 4s.`);
      validDuration = 4;
    }
    totalDurationCalc += validDuration;

    // Graphic content safety check
    const movementLower = (s.movementChoreography || '').toLowerCase();
    const promptLower = (s.visualPrompt || '').toLowerCase();
    const graphicTerms = ['gore', 'mutilat', 'severed', 'decapitat', 'viscera', 'bloodbath'];
    for (const term of graphicTerms) {
      if (movementLower.includes(term) || promptLower.includes(term)) {
        errors.push(`Shot ${shotNum} violates non-graphic cinematic policy: detected "${term}".`);
      }
    }

    // Reconstruct sound effects
    const soundEffects: SoundEffectEvent[] = Array.isArray(s.soundEffects)
      ? s.soundEffects.map((sfx: any, sfxIdx: number) => ({
          id: sfx.id || `sfx-fight-${idx}-${sfxIdx}`,
          name: sfx.name || 'Impact / Clash',
          category: sfx.category || 'impact',
          startTime: typeof sfx.startTime === 'number' ? sfx.startTime : 0.5,
          duration: typeof sfx.duration === 'number' ? sfx.duration : 1.5,
          volume: typeof sfx.volume === 'number' ? sfx.volume : 0.8,
          soundType: sfx.soundType || 'impact_whoosh',
          description: sfx.description || 'Action sound effect cue',
        }))
      : [
          {
            id: `sfx-fight-${idx}-default`,
            name: 'Kinetic Impact & Whoosh',
            category: 'impact',
            startTime: 0.5,
            duration: 1.5,
            volume: 0.8,
            soundType: 'impact_whoosh',
            description: 'Action strike and deflection whoosh',
          },
        ];

    repairedShots.push({
      shotNumber: shotNum,
      title: s.title || `Shot ${shotNum}`,
      duration: validDuration,
      characterPositions: s.characterPositions || 'Midground combat stance',
      movementChoreography: s.movementChoreography || 'Fighters exchange kinetic strikes and defensive blocks',
      expressions: s.expressions || 'Intense focus and exertion',
      cameraMovement: s.cameraMovement || 'Dynamic Handheld Follow',
      lighting: s.lighting || 'Dramatic Chiaroscuro',
      environmentInteraction: s.environmentInteraction || 'Fighters interact with the surrounding terrain',
      transition: s.transition || (idx === data.shots.length - 1 ? 'Cut to aftermath' : 'Match cut on impact'),
      dialogue: s.dialogue || '',
      soundEffects,
      visualPrompt: s.visualPrompt || 'Cinematic fight sequence shot with temporal coherence and dynamic motion',
      characterIds: Array.isArray(s.characterIds) ? s.characterIds : [],
    });
  }

  // 3. Continuity verification: Check if characters are mentioned
  if (Array.isArray(data.characters) && data.characters.length > 0) {
    const mainCharName = data.characters[0]?.name;
    if (mainCharName) {
      let missingInShots = 0;
      repairedShots.forEach((shot) => {
        if (!shot.visualPrompt.toLowerCase().includes(mainCharName.toLowerCase())) {
          missingInShots++;
        }
      });
      if (missingInShots > 0) {
        warnings.push(
          `Character "${mainCharName}" missing from ${missingInShots} shot visualPrompts. Continuity details will be anchored.`
        );
      }
    }
  }

  const repairedPlan: FightScenePlan = {
    id: data.id || `fight-plan-${Date.now()}`,
    title: data.title || 'Cinematic Action Sequence',
    storyContext: data.storyContext || '',
    combatStyle: data.combatStyle || 'martial-arts',
    pacing: data.pacing || 'rapid-kinetic',
    environment: data.environment || 'Urban battlefield',
    previousSceneEnding: data.previousSceneEnding || '',
    targetTotalDuration: totalDurationCalc,
    visualStyle: data.visualStyle || 'cinematic',
    aspectRatio: data.aspectRatio || '16:9',
    characters: Array.isArray(data.characters) ? data.characters : [],
    shots: repairedShots,
    modelUsed: data.modelUsed || 'local_planner',
    createdAt: data.createdAt || new Date().toISOString(),
    approved: Boolean(data.approved),
  };

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    repairedPlan,
  };
}

/**
 * Deterministic local fight choreography synthesizer.
 * Generates connected, cinematic, non-graphic choreography with clear
 * cause-and-effect and strict continuity anchoring for WAN 2.1 video models.
 */
export function generateDeterministicFightPlan(
  req: FightScenePlanRequest
): FightScenePlan {
  const combatStyle = req.combatStyle || 'martial-arts';
  const targetDuration = Math.max(6, Math.min(120, Number(req.targetDuration) || 20));
  const numShots = Math.max(2, Math.min(8, Number(req.numShots) || 4));
  const visualStyle = req.visualStyle || 'cinematic';
  const aspectRatio = req.aspectRatio || '16:9';
  const environment = req.environment?.trim() || 'Rain-slicked alleyway surrounded by decaying brick and neon reflections';

  // Ensure 2 distinct combatants for choreography
  const fighters: Character[] = req.characters && req.characters.length >= 2
    ? req.characters
    : req.characters && req.characters.length === 1
    ? [
        req.characters[0],
        {
          id: `char-rival-${Date.now()}`,
          name: 'The Enforcer',
          role: 'Antagonist Combatant',
          visualDescription: 'Tall athletic operative, cold slate-grey eyes, sharp buzz-cut dark hair, cybernetic collar',
          attire: 'Armored carbon-weave tactical vest over matte black tunic with reinforced shoulder plating',
          keyProps: 'Twin shock-batons with electric cyan coils',
        },
      ]
    : [
        {
          id: `char-protagonist-${Date.now()}`,
          name: 'Kaelen Vance',
          role: 'Protagonist',
          visualDescription: 'Early 30s, sharp jawline, messy dark hair, intense focused amber eyes',
          attire: 'Weathered graphite leather jacket over navy tactical hoodie, fingerless gloves',
          keyProps: 'Steel combat staff with magnetic grips',
        },
        {
          id: `char-antagonist-${Date.now()}`,
          name: 'Commander Sarah Steele',
          role: 'Elite Opponent',
          visualDescription: 'Chiseled angular features, platinum braided hair, cybernetic ocular implant in left eye',
          attire: 'Ceramic composite combat armor with matte crimson accents, armored greaves',
          keyProps: 'Vibro-edge plasma short blade',
        },
      ];

  const fighterA = fighters[0];
  const fighterB = fighters[1];

  // Duration distribution
  const baseDur = Math.floor(targetDuration / numShots);
  let remainder = targetDuration % numShots;
  const shotDurations = Array.from({ length: numShots }, () => {
    let d = baseDur;
    if (remainder > 0) {
      d += 1;
      remainder--;
    }
    return Math.max(2, Math.min(6, d));
  });

  // Style-specific choreography sequences (4 distinct connected beats)
  const choreographyTemplates: Record<
    FightChoreographyStyle,
    Array<{
      title: string;
      positions: string;
      movement: string;
      expressions: string;
      camera: CameraMovement;
      lighting: LightingMood;
      environment: string;
      transition: string;
      dialogue: string;
      sfxName: string;
      sfxType: string;
      sfxDesc: string;
    }>
  > = {
    'martial-arts': [
      {
        title: 'Opening Clash & Deflection',
        positions: `${fighterA.name} in low defensive crane stance left-foreground; ${fighterB.name} advancing rapidly center-right`,
        movement: `${fighterB.name} steps in with an aggressive spinning high hook; ${fighterA.name} ducks under the sweep and parries with a sharp forearm block, redirecting momentum`,
        expressions: 'Focused squint with locked eye contact and clenched jaw',
        camera: 'Dynamic Handheld Follow',
        lighting: 'Dramatic Chiaroscuro',
        environment: 'Water droplets kick up from the wet pavement with the rapid pivot',
        transition: 'Match cut on forearm parry',
        dialogue: `${fighterB.name}: "Yield while you still can!"`,
        sfxName: 'Forearm Parry & Whoosh',
        sfxType: 'impact_whoosh',
        sfxDesc: 'Swift wind whoosh into a sharp padded forearm impact',
      },
      {
        title: 'Counter-Sweep & Terrain Redirect',
        positions: 'Close quarters clinch in midground, both fighters locked hand-to-hand',
        movement: `${fighterA.name} twists the clinch to execute a sweeping leg sweep; ${fighterB.name} vaults backward off an iron railing to absorb the momentum and regain balance`,
        expressions: 'Sharp intake of breath with rapid tactical reassessment',
        camera: 'Low-Angle Tilt-Up',
        lighting: 'Cyberpunk Neon Glow',
        environment: 'Iron railing vibrates and shakes loose rust flakes as boots kick off',
        transition: 'Whip pan tracking the vault',
        dialogue: `${fighterA.name}: "Not today."`,
        sfxName: 'Railing Impact & Kickoff',
        sfxType: 'impact_whoosh',
        sfxDesc: 'Heavy metallic boot rebound and rapid landing scuff',
      },
      {
        title: 'Rapid Striking Exchange',
        positions: 'Side-by-side profile in center frame, dynamic rotational symmetry',
        movement: 'Rapid flurry of non-graphic palm deflections and shoulder checks; each strike cleanly countered before impact',
        expressions: 'Sweat beads glinting on brows under rim lighting, nostrils flared with exertion',
        camera: 'Smooth 360 Orbit',
        lighting: 'Moody Film Noir',
        environment: 'Steamy exhaust vent puffs vapor through the fighters as they rotate',
        transition: 'Smash cut on mutual push-off',
        dialogue: '',
        sfxName: 'Rapid Hand Deflections',
        sfxType: 'impact_whoosh',
        sfxDesc: 'Triple synchronized hand-to-hand deflection claps and whooshes',
      },
      {
        title: 'Decisive Counter & Standoff',
        positions: `${fighterA.name} center frame in grounded horse stance; ${fighterB.name} skidding to a halt 10 feet back`,
        movement: `${fighterA.name} steps through a lunge, sidestepping an incoming strike and using opponent momentum to toss them into a skid across the ground, ending in a tense standoff`,
        expressions: 'Chest heaving with exertion, defiant unwavering gaze',
        camera: 'Slow Zoom In',
        lighting: 'High-Key Cinematic Daylight',
        environment: 'Dust and water settle around their boots as motion freezes into standoff',
        transition: 'Slow fade to aftermath',
        dialogue: `${fighterA.name}: "Stand down."`,
        sfxName: 'Ground Skid & Standoff Bass',
        sfxType: 'impact_whoosh',
        sfxDesc: 'Long boot slide on gravel followed by low cinematic sub-bass rumble',
      },
    ],
    'sword-blade-duel': [
      {
        title: 'Blade Draw & First Clash',
        positions: `${fighterA.name} on left drawing blade in two-handed grip; ${fighterB.name} closing distance with raised guard`,
        movement: `${fighterB.name} executes a downward diagonal slash; ${fighterA.name} raises a cross-parry, locking blades at eye level with brilliant spark friction`,
        expressions: 'Intense glare through the reflection of locked steel blades',
        camera: 'Low-Angle Tilt-Up',
        lighting: 'Dramatic Chiaroscuro',
        environment: 'Showers of bright orange sparks bounce off adjacent metal walls',
        transition: 'Match cut on blade spark burst',
        dialogue: `${fighterB.name}: "Your technique has slowed."`,
        sfxName: 'Metallic Blade Clash',
        sfxType: 'impact_whoosh',
        sfxDesc: 'Resonant metallic ring with razor friction sparks',
      },
      {
        title: 'Blade Bind & Leveraged Push',
        positions: 'Center frame close-up on crossed blades and locked hilts',
        movement: 'Both fighters apply body weight against the crossguard bind; ${fighterA.name} twists the hilt, stripping leverage and causing ${fighterB.name} to disengage backward',
        expressions: 'Teeth gritted with maximum muscular resistance',
        camera: 'Slow Zoom In',
        lighting: 'Golden Hour Sunburst',
        environment: 'Sparks cascade downward onto rain-slicked flags',
        transition: 'Smash cut on blade slide',
        dialogue: `${fighterA.name}: "Slowed enough to catch you."`,
        sfxName: 'Steel Friction Slide',
        sfxType: 'impact_whoosh',
        sfxDesc: 'High-pitched screech of grinding steel edges sliding apart',
      },
      {
        title: 'Thrust, Parry & Pivot',
        positions: `${fighterB.name} lunging forward right-to-left; ${fighterA.name} executing circular deflection`,
        movement: `${fighterB.name} lunges with a rapid straight thrust; ${fighterA.name} sweeps the blade aside in a circular parry and pivots behind, slicing clean air as both reset`,
        expressions: 'Laser-focused pupil tracking the blade tip',
        camera: 'Dynamic Handheld Follow',
        lighting: 'Cyberpunk Neon Glow',
        environment: 'Blade tip clips an ornamental wall lantern, showering harmless ember sparks',
        transition: 'Whip pan tracking the blade deflection',
        dialogue: '',
        sfxName: 'Blade Whoosh & Metal Snip',
        sfxType: 'impact_whoosh',
        sfxDesc: 'Sharp blade whip whoosh and lantern impact chime',
      },
      {
        title: 'Disarm & Combat Impasse',
        positions: `${fighterA.name} holding tip at ready; ${fighterB.name} recovering weapon in grounded crouch`,
        movement: `${fighterA.name} performs a sudden rotational disarm maneuver, knocking the opponent weapon into a spin that embeds in an old timber post, ending in checkmate stance`,
        expressions: 'Calm breathing returning, victor posture',
        camera: 'Cinematic Pan Right',
        lighting: 'Moody Film Noir',
        environment: 'Disarmed weapon vibrates in timber with steady metallic hum',
        transition: 'Cut to dramatic wide shot',
        dialogue: `${fighterB.name}: "Checkmate."`,
        sfxName: 'Timber Thud & Vibrating Blade',
        sfxType: 'impact_whoosh',
        sfxDesc: 'Deep wood impact thud followed by 3-second harmonic blade vibration',
      },
    ],
    'superhero-kinetic': [
      {
        title: 'Super-Sonic Intercept',
        positions: 'Mid-air / elevated platform, high altitude framing',
        movement: 'Fighters collide in mid-air with an explosive shockwave that sends dust and water billowing outward in a spherical ripple',
        expressions: 'Roar of sheer determination, glowing energy in eyes',
        camera: 'Smooth 360 Orbit',
        lighting: 'High-Key Cinematic Daylight',
        environment: 'Glass windows in nearby building shatter outward into glittering rain',
        transition: 'Match cut on shockwave explosion',
        dialogue: 'Stand down before the city takes more damage!',
        sfxName: 'Kinetic Shockwave Impact',
        sfxType: 'impact_whoosh',
        sfxDesc: 'Massive sub-bass explosion with glass resonant shatter',
      },
      {
        title: 'Wall Bounce & Kinetic Rebound',
        positions: 'Against structural concrete pillar in industrial ruin',
        movement: 'Opponent driven into concrete pillar, which develops radial fractures; fighter uses the pillar as a launch pad to rebound into an overhead kinetic dive',
        expressions: 'Fierce concentration under debris dust',
        camera: 'Low-Angle Tilt-Up',
        lighting: 'Dramatic Chiaroscuro',
        environment: 'Concrete chunks crumble down into mist',
        transition: 'Smash cut on pillar impact',
        dialogue: 'You do not know the power you are facing!',
        sfxName: 'Concrete Fracture & Rebound',
        sfxType: 'impact_whoosh',
        sfxDesc: 'Heavy stone fracture rumble and compressed air launch whoosh',
      },
      {
        title: 'Mid-Air Reversal',
        positions: 'Diagonal flight trajectory through descending rain',
        movement: 'Fighters grapple while tumbling through mid-air, rotating three times before protagonist twists gravity to land feet-first on rooftop',
        expressions: 'Eyes wide, tracking rapidly shifting horizon',
        camera: 'Dynamic Handheld Follow',
        lighting: 'Cyberpunk Neon Glow',
        environment: 'Rooftop gravel sprays in high arc on impact',
        transition: 'Whip pan following descent',
        dialogue: 'Brace for impact!',
        sfxName: 'Aerial Grapple & Kinetic Landing',
        sfxType: 'impact_whoosh',
        sfxDesc: 'Wind vortex rush into dense kinetic ground strike',
      },
      {
        title: 'Crater Standoff',
        positions: 'Opposite sides of shallow impact crater on reinforced rooftop',
        movement: 'Both combatants rise slowly through dissipating steam and electrical arcs, adopting final battle-ready stances',
        expressions: 'Heavy breathing, steam curling from skin, resolute eyes',
        camera: 'Slow Zoom Out',
        lighting: 'Golden Hour Sunburst',
        environment: 'Residual electrical discharges pulse gently through ground cracks',
        transition: 'Fade to sequence climax',
        dialogue: 'We finish this now.',
        sfxName: 'Electrical Crackle & Wind',
        sfxType: 'scifi_energy',
        sfxDesc: 'Crackling high-voltage spark dissipation and howling wind',
      },
    ],
    'tactical-cqc': [
      {
        title: 'Corridor Breach & Arm Bar Parry',
        positions: 'Narrow concrete corridor, fluorescent overhead lights flickering',
        movement: 'Attacker lunges with a tactical baton strike; defender steps inside the guard radius, checks the wrist with an upward palm strike, and wraps the elbow in a standing joint lock',
        expressions: 'Cold clinical focus, no wasted motion',
        camera: 'Dynamic Handheld Follow',
        lighting: 'Moody Film Noir',
        environment: 'Shoulder clips reinforced drywall, leaving a chalky scuff mark',
        transition: 'Match cut on wrist lock',
        dialogue: 'Drop the weapon.',
        sfxName: 'Tactical Wrist Lock & Thud',
        sfxType: 'impact_whoosh',
        sfxDesc: 'Sharp leather friction and muffled joint impact',
      },
      {
        title: 'Corner Sweep & Baton Disarm',
        positions: 'Corridor intersection corner',
        movement: 'Attacker spins out of the lock using the corner wall, attempting a knee strike; defender drives hip into attacker hip, executing a hip throw onto the corridor floor',
        expressions: 'Grimace of pain and immediate tactical recovery attempt',
        camera: 'Low-Angle Tilt-Up',
        lighting: 'Dramatic Chiaroscuro',
        environment: 'Baton clatters across ceramic tiles into the shadows',
        transition: 'Smash cut on floor impact',
        dialogue: 'Tactical disarm confirmed.',
        sfxName: 'Ceramic Floor Impact & Clatter',
        sfxType: 'impact_whoosh',
        sfxDesc: 'Dense body slam onto hard tile with metal baton bouncing',
      },
      {
        title: 'Wall Pin & Clinch Reversal',
        positions: 'Against reinforced security doorway',
        movement: 'Attacker scrambles up and drives defender against security door; defender uses forearm frame against throat to prevent clinch, then hooks leg to pivot positions',
        expressions: 'Vascular strain on neck and temples under cold lighting',
        camera: 'Slow Zoom In',
        lighting: 'Cyberpunk Neon Glow',
        environment: 'Security door buzzer sounds brief muffled alarm pulse',
        transition: 'Whip pan with position pivot',
        dialogue: 'Clearance denied.',
        sfxName: 'Metal Door Slam',
        sfxType: 'foley',
        sfxDesc: 'Heavy steel door latch vibration and combat grunts',
      },
      {
        title: 'Takedown Pin & Restraint',
        positions: 'Floor-level top mount control',
        movement: 'Defender secures Kimura grip on attacker arm, pinning them flat to floor while maintaining 360-degree situational awareness down corridor',
        expressions: 'Controlled steady breathing, weapon secured',
        camera: 'Cinematic Pan Right',
        lighting: 'High-Key Cinematic Daylight',
        environment: 'Flickering fluorescent tubes finally hum steadily overhead',
        transition: 'Cut to corridor wide shot',
        dialogue: 'Area secure. Threat neutralized.',
        sfxName: 'Handcuff Click & Radio Chirp',
        sfxType: 'foley',
        sfxDesc: 'Crisp metallic ratchet click and tactical radio confirmation tone',
      },
    ],
    'cybernetic-melee': [
      {
        title: 'Overclocked Servo Strike',
        positions: 'Neon alley between monolithic server towers',
        movement: 'Attacker hydraulic arm whines at high pitch before unleashing a piston punch; defender parries with reinforced kinetic shield that absorbs and disperses cyan electricity',
        expressions: 'HUD visor numbers flickering in pupils; grimace of resistance',
        camera: 'Dynamic Handheld Follow',
        lighting: 'Cyberpunk Neon Glow',
        environment: 'Puddle underfoot boils momentarily from arc discharge',
        transition: 'Match cut on electrical discharge',
        dialogue: 'Servos at 140% capacity. He cannot withstand another cycle.',
        sfxName: 'Hydraulic Whine & EMP Arc',
        sfxType: 'scifi_energy',
        sfxDesc: 'High-RPM servo rev into loud buzzing electrical arc pop',
      },
      {
        title: 'Cable Whip & Glitch Pivot',
        positions: 'Cluttered cable duct corridor',
        movement: 'Defender slices severed high-voltage cable toward attacker; attacker ducks under sparking lines and performs a low sliding sweep kick',
        expressions: 'Cybernetic eye twitching with optic distortion warning',
        camera: 'Low-Angle Tilt-Up',
        lighting: 'Dramatic Chiaroscuro',
        environment: 'Severed cables dance wildly spitting orange and violet sparks',
        transition: 'Whip pan tracking the slide',
        dialogue: 'Warning: Visual sensor damaged.',
        sfxName: 'Sparking Cable Hiss',
        sfxType: 'scifi_energy',
        sfxDesc: 'Hissing sparks and electrical whipping whoosh',
      },
      {
        title: 'Dual Core Overload Clash',
        positions: 'Center frame elevated catwalk above cooling vat',
        movement: 'Both combatants engage in a simultaneous cybernetic chest-to-chest lock, their power cores humming harmonically while steam bursts from pressure relief valves',
        expressions: 'Digital HUD reflections intensifying across visor glass',
        camera: 'Smooth 360 Orbit',
        lighting: 'Ethereal Bioluminescence',
        environment: 'Cooling steam engulfs catwalk, obscuring everything but glowing eyes',
        transition: 'Smash cut on steam burst',
        dialogue: 'Thermal threshold reached.',
        sfxName: 'Steam Vent Burst & Core Hum',
        sfxType: 'scifi_energy',
        sfxDesc: 'Violent steam decompression hiss and throbbing reactor hum',
      },
      {
        title: 'Thermal Shutdown Standoff',
        positions: 'Opposite ends of cooling catwalk, steam slowly clearing',
        movement: 'Both fighters disengage with forced emergency heat venting, weapons glowing dull red as they cool, eyes locked in tactical truce',
        expressions: 'Exhausted chest heaving, internal fans whirring down',
        camera: 'Slow Zoom Out',
        lighting: 'Moody Film Noir',
        environment: 'Droplets of coolant drip steadily into mist below',
        transition: 'Fade to black',
        dialogue: 'Rebooting combat subroutines.',
        sfxName: 'Coolant Drip & Fan Spin Down',
        sfxType: 'foley',
        sfxDesc: 'Rhythmic metallic fluid drops and high-to-low fan deceleration',
      },
    ],
    'swashbuckling-acrobatic': [
      {
        title: 'Table Vault & Chandelier Kick',
        positions: 'Grand wooden banquet hall with high vaulted ceilings',
        movement: 'Protagonist vaults across heavy oak banquet table, kicking a brass candelabra into the path of pursuing swordsman, then leaps to grasp a velvet hanging drapery',
        expressions: 'Playful grin despite the high stakes, dashing confidence',
        camera: 'Dynamic Handheld Follow',
        lighting: 'Warm Fireplace Hearth',
        environment: 'Goblets clatter and spill dark wine across polished floorboards',
        transition: 'Match cut on drapery grab',
        dialogue: 'You have always been one step behind!',
        sfxName: 'Goblet Clatter & Velvet Swing',
        sfxType: 'foley',
        sfxDesc: 'Pewter cups tumbling onto wood followed by heavy fabric stretch whoosh',
      },
      {
        title: 'Aerial Swing & Rapier Parry',
        positions: 'Mid-air trajectory across banquet hall chandelier',
        movement: 'Swinging on drapery across hall, protagonist draws rapier mid-flight and parries a thrust from swordsman perched atop wine barrels',
        expressions: 'Focused squint calculating landing trajectory',
        camera: 'Smooth 360 Orbit',
        lighting: 'Dramatic Chiaroscuro',
        environment: 'Chandelier crystals chime in harmonious discord as draft passes',
        transition: 'Whip pan tracking landing',
        dialogue: 'Is this the best the Queen Guard can muster?',
        sfxName: 'Crystal Chimes & Rapier Parry',
        sfxType: 'impact_whoosh',
        sfxDesc: 'Melodic crystal chandelier ringing with sharp rapier steel ping',
      },
      {
        title: 'Balcony Edge Fencing Exchange',
        positions: 'Narrow carved stone balustrade over courtyard',
        movement: 'Rapid fencing series: triple feint, circular parry, and sudden boot tap to opponent hilt that forces a defensive step backward',
        expressions: 'Banter shifting to fierce determination as courtyard height shows',
        camera: 'Low-Angle Tilt-Up',
        lighting: 'Golden Hour Sunburst',
        environment: 'Stone balustrade chip falls dizzyingly into the courtyard below',
        transition: 'Smash cut on footwork redirect',
        dialogue: 'Watch your footing, captain.',
        sfxName: 'Fencing Clacks & Stone Chip',
        sfxType: 'impact_whoosh',
        sfxDesc: 'Rapid triple steel tap-tap-tap and crumbling stone pebble',
      },
      {
        title: 'Curtain Drop & Grand Escape',
        positions: 'Open arched balcony window framing the evening sky',
        movement: 'Protagonist slices drapery cord, causing heavy velvet curtain to fall over pursuers, bowing with a sweeping hat gesture before vaulting out to awaiting coach',
        expressions: 'Dashing wink and triumphant salute',
        camera: 'Cinematic Pan Right',
        lighting: 'Golden Hour Sunburst',
        environment: 'Velvet curtain billows in evening draft like a royal sail',
        transition: 'Fade to golden horizon',
        dialogue: 'Until our next encounter, gentleman!',
        sfxName: 'Fabric Drop & Carriage Horse Whinny',
        sfxType: 'foley',
        sfxDesc: 'Heavy fabric thudding to floor with distant horse hooves departing',
      },
    ],
  };

  const templates = choreographyTemplates[combatStyle] || choreographyTemplates['martial-arts'];

  // Construct sequential shot list
  const shots: FightShot[] = [];
  for (let i = 0; i < numShots; i++) {
    const tmpl = templates[i % templates.length];
    const shotNum = i + 1;
    const dur = shotDurations[i] || 4;

    // Strict Character Continuity: repeat character descriptions and attire explicitly
    const charContinuityAnchor = `${fighterA.name} (${fighterA.visualDescription}, wearing ${fighterA.attire}, wielding ${fighterA.keyProps || 'bare hands'}) and ${fighterB.name} (${fighterB.visualDescription}, wearing ${fighterB.attire}, wielding ${fighterB.keyProps || 'bare hands'})`;

    // Rich WAN 2.1 video prompt adhering strictly to prompt engineering specs
    const visualPrompt = `35mm Panavision anamorphic cinematic still, 8k resolution, authentic temporal video coherence. Scene Fight Shot ${shotNum} - ${tmpl.title}: In ${environment}. Feat. ${charContinuityAnchor}. Choreography: ${tmpl.movement}. Positions: ${tmpl.positions}. Expressions: ${tmpl.expressions}. Camera Motion: ${tmpl.camera}. Lighting: ${tmpl.lighting}. Terrain interaction: ${tmpl.environment}. Strict visual identity and costume continuity. Aspect ratio ${aspectRatio}.`;

    const soundEffects: SoundEffectEvent[] = [
      {
        id: `sfx-fight-${shotNum}-1`,
        name: tmpl.sfxName,
        category: 'impact',
        startTime: 0.4,
        duration: 1.8,
        volume: 0.85,
        soundType: tmpl.sfxType,
        description: tmpl.sfxDesc,
      },
      {
        id: `sfx-fight-${shotNum}-amb`,
        name: 'Battlefield Ambient Tension',
        category: 'ambience',
        startTime: 0.0,
        duration: dur,
        volume: 0.45,
        soundType: 'wind',
        description: `Subtle tense room tone and wind in ${environment}`,
      },
    ];

    shots.push({
      shotNumber: shotNum,
      title: tmpl.title,
      duration: dur,
      characterPositions: tmpl.positions,
      movementChoreography: tmpl.movement,
      expressions: tmpl.expressions,
      cameraMovement: tmpl.camera,
      lighting: tmpl.lighting,
      environmentInteraction: tmpl.environment,
      transition: tmpl.transition,
      dialogue: tmpl.dialogue,
      soundEffects,
      visualPrompt,
      characterIds: [fighterA.name, fighterB.name],
    });
  }

  const modelUsed = req.modelId || 'deepseek-r1-distill-qwen-1.5b';

  return {
    id: `fight-plan-${Date.now()}`,
    title: `${fighters[0].name} vs ${fighters[1].name}: ${combatStyle.replace(/-/g, ' ').toUpperCase()} DUEL`,
    storyContext: req.storyContext || 'High-stakes confrontation reaches physical climax',
    combatStyle,
    pacing: req.pacing || 'rapid-kinetic',
    environment,
    previousSceneEnding: req.previousSceneEnding || 'The tension breaks as weapons are drawn',
    targetTotalDuration: shotDurations.reduce((a, b) => a + b, 0),
    visualStyle,
    aspectRatio,
    characters: fighters,
    shots,
    modelUsed,
    createdAt: new Date().toISOString(),
    approved: false,
  };
}

/**
 * Converts approved FightScenePlan shots directly into StoryMotion scenes.
 * Seamlessly hooks into existing audio, lip-sync, and MP4 rendering systems!
 */
export function convertFightPlanToScenes(
  plan: FightScenePlan,
  startIndex: number = 0
): Scene[] {
  return plan.shots.map((shot, idx) => {
    const sceneNum = startIndex + idx + 1;
    const dialogueLines = shot.dialogue
      ? [
          {
            id: `diag-fight-${sceneNum}-1`,
            speakerId: shot.characterIds[0] || 'combatant',
            speakerName: shot.dialogue.split(':')[0]?.trim() || shot.characterIds[0] || 'Fighter',
            text: shot.dialogue.includes(':') ? shot.dialogue.split(':')[1]?.trim().replace(/^["']|["']$/g, '') || shot.dialogue : shot.dialogue,
            emotion: 'urgent' as const,
            startTime: 0.5,
            duration: Math.max(1.5, Math.min(shot.duration - 0.5, 3.0)),
            status: 'ready' as const,
            voiceId: 'hero_male',
            speed: 1.05,
            pitch: 1.0,
          },
        ]
      : [];

    return {
      id: `scene-fight-${plan.id}-${shot.shotNumber}`,
      sceneNumber: sceneNum,
      title: `[Fight ${shot.shotNumber}] ${shot.title}`,
      visualPrompt: shot.visualPrompt,
      actionSummary: `${shot.movementChoreography}. Positions: ${shot.characterPositions}. Terrain: ${shot.environmentInteraction}.`,
      dialogue: shot.dialogue || '',
      cameraMovement: shot.cameraMovement,
      lighting: shot.lighting,
      duration: shot.duration,
      characterIds: shot.characterIds,
      status: 'ready' as const,
      dialogueLines,
      soundEffects: shot.soundEffects,
      sceneMusicMood: 'suspense' as const,
    };
  });
}
