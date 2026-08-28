import { CONFIG } from '../config.js';

export function createVisionMemory() {
  return { samples: [], lastSampleAtByKey: new Map() };
}

function sourceKey(source, index) {
  return source.entityId != null ? `entity:${source.entityId}` : `anonymous:${index}`;
}

// This is strictly renderer-owned presentation history. It does not alter the
// current team-vision query used by AI, combat, or other simulation systems.
export function updateVisionMemory(memory, sources, now) {
  const expiresAt = now - CONFIG.VISION_SUSTAIN_SECONDS - CONFIG.VISION_FADE_SECONDS;
  memory.samples = memory.samples.filter((sample) => sample.seenAt > expiresAt);
  for (const [index, source] of sources.entries()) {
    const key = sourceKey(source, index);
    const lastSampleAt = memory.lastSampleAtByKey.get(key);
    if (lastSampleAt != null && now - lastSampleAt < CONFIG.VISION_MEMORY_SAMPLE_INTERVAL) continue;
    memory.samples.push({ x: source.x, y: source.y, radius: source.radius, seenAt: now });
    memory.lastSampleAtByKey.set(key, now);
  }
}

export function getSustainedVisionSamples(memory, now) {
  const sustain = CONFIG.VISION_SUSTAIN_SECONDS;
  const fade = CONFIG.VISION_FADE_SECONDS;
  return memory.samples
    .map((sample) => {
      const age = now - sample.seenAt;
      const alpha = age <= sustain ? 1 : Math.max(0, 1 - (age - sustain) / fade);
      return { ...sample, alpha };
    })
    .filter((sample) => sample.alpha > 0);
}
