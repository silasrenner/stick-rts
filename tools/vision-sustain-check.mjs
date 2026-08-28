import { CONFIG } from '../src/config.js';
import { createVisionMemory, getSustainedVisionSamples, updateVisionMemory } from '../src/render/visionMemory.js';

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

const memory = createVisionMemory();
const source = { entityId: 7, x: 1000, y: 400, radius: 425 };
updateVisionMemory(memory, [source], 0);
expect(getSustainedVisionSamples(memory, 0).length === 1, 'A current vision source must be recorded for presentation memory.');

updateVisionMemory(memory, [], 10);
const sustained = getSustainedVisionSamples(memory, 10);
expect(sustained.length === 1 && sustained[0].alpha === 1, 'A revealed area must remain fully light for exactly 10 seconds after sight is lost.');

updateVisionMemory(memory, [], 11);
const fading = getSustainedVisionSamples(memory, 11);
expect(fading.length === 1 && Math.abs(fading[0].alpha - 0.5) < 1e-9, 'At one second into the two-second fade, remembered vision must be half transparent.');

updateVisionMemory(memory, [], 12);
expect(getSustainedVisionSamples(memory, 12).length === 0, 'Remembered vision must be gone after 10 seconds sustain plus 2 seconds fade.');

const moving = createVisionMemory();
updateVisionMemory(moving, [{ entityId: 8, x: 100, y: 400, radius: 425 }], 0);
updateVisionMemory(moving, [{ entityId: 8, x: 500, y: 400, radius: 425 }], 0.25);
expect(getSustainedVisionSamples(moving, 0.25).some((entry) => entry.x === 100), 'A moving source must preserve its previously revealed area during sustain.');
expect(getSustainedVisionSamples(moving, 0.25).some((entry) => entry.x === 500), 'A moving source must record its newer revealed area.');

const stationary = createVisionMemory();
updateVisionMemory(stationary, [{ entityId: 9, x: 100, y: 400, radius: 425 }], 0);
updateVisionMemory(stationary, [{ entityId: 9, x: 100, y: 400, radius: 425 }], 0.25);
expect(stationary.samples.length === 1 && stationary.samples[0].seenAt === 0.25, 'An unmoved source must refresh its retained clearance instead of appending redundant 0.25s samples.');

const bounded = createVisionMemory();
for (let i = 0; i < CONFIG.VISION_MEMORY_MAX_SAMPLES_PER_SOURCE + 8; i += 1) {
  updateVisionMemory(bounded, [{ entityId: 10, x: i * 200, y: 400, radius: 425 }], i * 0.25);
}
expect(bounded.samples.length === CONFIG.VISION_MEMORY_MAX_SAMPLES_PER_SOURCE, 'A moving source history must be capped so sustained fog work remains bounded.');
expect(bounded.samples.some((entry) => entry.x === (CONFIG.VISION_MEMORY_MAX_SAMPLES_PER_SOURCE + 7) * 200), 'Bounded moving history must retain the newest reveal position.');

const population = createVisionMemory();
const populationSources = Array.from({ length: 100 }, (_, i) => ({ entityId: i, x: i * 40, y: 400, radius: 425 }));
for (let step = 0; step < 48; step += 1) {
  updateVisionMemory(population, populationSources.map((source) => ({ ...source, x: source.x + step * 200 })), step * 0.25);
}
expect(population.samples.length <= 100 * CONFIG.VISION_MEMORY_MAX_SAMPLES_PER_SOURCE, 'Population-scale moving vision history must be bounded by the per-source cap.');

console.log('PASS — presentation-only vision memory sustains 10s, fades for 2s, retains a moving reveal trail, and bounds redundant history.');
