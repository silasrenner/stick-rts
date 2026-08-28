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

console.log('PASS — presentation-only vision memory sustains 10s, fades for 2s, and retains a moving reveal trail.');
