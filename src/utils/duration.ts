import { Scene } from '../types';

export const DEFAULT_TOTAL_DURATION = 60; // Exactly 60 seconds by default

export interface DurationPreset {
  seconds: number;
  label: string;
  tag?: string;
}

export const DURATION_PRESETS: DurationPreset[] = [
  { seconds: 60, label: '60s (1m)', tag: 'Default' },
  { seconds: 180, label: '3 min' },
  { seconds: 300, label: '5 min' },
  { seconds: 600, label: '10 min', tag: 'Cinema' },
  { seconds: 1800, label: '30 min', tag: 'Feature' },
];

/**
 * Distributes a total duration (in seconds) across numScenes evenly.
 * Guarantees that the sum of the returned array equals totalSeconds exactly,
 * and that each scene receives at least 1 second.
 */
export function distributeTotalDuration(totalSeconds: number, numScenes: number): number[] {
  const count = Math.max(1, Math.round(numScenes));
  const total = Math.max(count, Math.round(totalSeconds));
  const base = Math.floor(total / count);
  let remainder = total % count;

  const result: number[] = [];
  for (let i = 0; i < count; i++) {
    const dur = base + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder--;
    result.push(dur);
  }
  return result;
}

/**
 * Calculates the total duration of a scene list.
 */
export function getTotalScenesDuration(scenes: Scene[]): number {
  if (!scenes || scenes.length === 0) return 0;
  return scenes.reduce((sum, s) => sum + (Number(s.duration) || 0), 0);
}

/**
 * Redistributes total movie duration evenly across all scenes.
 */
export function redistributeScenesEvenly(scenes: Scene[], totalDuration: number = DEFAULT_TOTAL_DURATION): Scene[] {
  if (!scenes || scenes.length === 0) return [];
  const targetTotal = Math.max(scenes.length, Number(totalDuration) || DEFAULT_TOTAL_DURATION);
  const durations = distributeTotalDuration(targetTotal, scenes.length);

  return scenes.map((s, idx) => ({
    ...s,
    duration: durations[idx],
  }));
}

/**
 * When a specific scene's duration is updated, automatically recalculates
 * the other scenes' durations to preserve the total movie duration.
 *
 * Algorithm:
 * 1. Clamps newDuration between 1 and totalDuration - (N - 1) so every other scene has >= 1s.
 * 2. If only 1 scene exists, sets duration = totalDuration.
 * 3. Allocates remaining seconds (R = totalDuration - clampedDuration) proportionally to other scenes.
 * 4. Uses largest-remainder method so the sum of all scenes equals totalDuration exactly.
 */
export function recalculateSceneDurations(
  scenes: Scene[],
  targetSceneId: string,
  rawNewDuration: number,
  targetTotalDuration: number = DEFAULT_TOTAL_DURATION
): Scene[] {
  if (!scenes || scenes.length === 0) return [];

  const total = Math.max(scenes.length, Number(targetTotalDuration) || DEFAULT_TOTAL_DURATION);

  if (scenes.length === 1) {
    return [{ ...scenes[0], duration: total }];
  }

  const targetIndex = scenes.findIndex((s) => s.id === targetSceneId);
  if (targetIndex === -1) return scenes;

  // Each other scene must receive at least 1s
  const minOtherTotal = scenes.length - 1;
  const maxAllowed = total - minOtherTotal;
  const clampedTargetDuration = Math.max(1, Math.min(maxAllowed, Math.round(rawNewDuration)));

  const remainingDuration = total - clampedTargetDuration;
  const otherIndices = scenes.map((_, i) => i).filter((i) => i !== targetIndex);

  const currentOtherSum = otherIndices.reduce((sum, i) => sum + (Number(scenes[i].duration) || 1), 0);

  // Proportional targets
  interface Candidate {
    index: number;
    ideal: number;
    floored: number;
    fraction: number;
  }

  const candidates: Candidate[] = otherIndices.map((i) => {
    const cur = Number(scenes[i].duration) || 1;
    const ratio = currentOtherSum > 0 ? cur / currentOtherSum : 1 / otherIndices.length;
    const ideal = ratio * remainingDuration;
    const floored = Math.max(1, Math.floor(ideal));
    return {
      index: i,
      ideal,
      floored,
      fraction: ideal - floored,
    };
  });

  // Calculate floored sum
  let flooredSum = candidates.reduce((sum, c) => sum + c.floored, 0);

  // If floored sum exceeds remainingDuration (due to Math.max(1, ...)), decrement from candidates with lowest fraction
  while (flooredSum > remainingDuration) {
    candidates.sort((a, b) => a.fraction - b.fraction);
    let reduced = false;
    for (const c of candidates) {
      if (c.floored > 1) {
        c.floored--;
        flooredSum--;
        reduced = true;
        break;
      }
    }
    if (!reduced) break;
  }

  // If floored sum is less than remainingDuration, distribute remainder to highest fractions
  let remainder = remainingDuration - flooredSum;
  if (remainder > 0) {
    candidates.sort((a, b) => b.fraction - a.fraction);
    let rIdx = 0;
    while (remainder > 0) {
      candidates[rIdx % candidates.length].floored++;
      remainder--;
      rIdx++;
    }
  }

  // Build updated scene array
  const updatedScenes = [...scenes];
  updatedScenes[targetIndex] = {
    ...scenes[targetIndex],
    duration: clampedTargetDuration,
  };

  for (const c of candidates) {
    updatedScenes[c.index] = {
      ...scenes[c.index],
      duration: c.floored,
    };
  }

  return updatedScenes;
}

/**
 * Format duration in human readable format (e.g. 5s, 60s, 10m 00s, 30m)
 */
export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  if (s < 60) return `${s}s`;
  const mins = Math.floor(s / 60);
  const remainingSecs = s % 60;
  if (mins >= 60) {
    const hours = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hours}h ${remMins > 0 ? `${remMins}m` : ''}`.trim();
  }
  return `${mins}m ${remainingSecs > 0 ? `${remainingSecs}s` : ''}`.trim();
}

/**
 * Format timecode in mm:ss or hh:mm:ss for media players and scrubbers
 */
export function formatTimecode(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const mins = Math.floor(s / 60);
  const remainingSecs = s % 60;
  if (mins >= 60) {
    const hours = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hours}:${remMins < 10 ? '0' : ''}${remMins}:${remainingSecs < 10 ? '0' : ''}${remainingSecs}`;
  }
  return `${mins < 10 ? '0' : ''}${mins}:${remainingSecs < 10 ? '0' : ''}${remainingSecs}`;
}
