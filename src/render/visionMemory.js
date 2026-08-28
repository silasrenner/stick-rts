import { CONFIG } from '../config.js';

export function createVisionMemory() {
  return { samples: [], lastSampleAtByKey: new Map(), lastSampleByKey: new Map() };
}

function sourceKey(source, index) {
  return source.entityId != null ? `entity:${source.entityId}` : `anonymous:${index}`;
}

// This is strictly renderer-owned presentation history. It does not alter the
// current team-vision query used by AI, combat, or other simulation systems.
export function updateVisionMemory(memory, sources, now) {
  const expiresAt = now - CONFIG.VISION_SUSTAIN_SECONDS - CONFIG.VISION_FADE_SECONDS;
  memory.samples = memory.samples.filter((sample) => sample.seenAt > expiresAt);
  const liveSamples = new Set(memory.samples);
  for (const [key, sample] of memory.lastSampleByKey) {
    if (liveSamples.has(sample)) continue;
    memory.lastSampleByKey.delete(key);
    memory.lastSampleAtByKey.delete(key);
  }

  for (const [index, source] of sources.entries()) {
    const key = sourceKey(source, index);
    const previous = memory.lastSampleByKey.get(key);
    const unchanged = previous
      && previous.x === source.x
      && previous.y === source.y
      && previous.radius === source.radius;
    if (unchanged) {
      previous.seenAt = now;
      memory.lastSampleAtByKey.set(key, now);
      continue;
    }

    const lastSampleAt = memory.lastSampleAtByKey.get(key);
    if (lastSampleAt != null && now - lastSampleAt < CONFIG.VISION_MEMORY_SAMPLE_INTERVAL) continue;

    const oldestIndex = memory.samples.findIndex((sample) => sample.sourceKey === key);
    const sourceSamples = memory.samples.reduce((count, sample) => count + (sample.sourceKey === key ? 1 : 0), 0);
    if (sourceSamples >= CONFIG.VISION_MEMORY_MAX_SAMPLES_PER_SOURCE) memory.samples.splice(oldestIndex, 1);

    const sample = { sourceKey: key, x: source.x, y: source.y, radius: source.radius, seenAt: now };
    memory.samples.push(sample);
    memory.lastSampleByKey.set(key, sample);
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
