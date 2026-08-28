import { CONFIG } from '../src/config.js';
import { drawVisionFog } from '../src/render/renderer.js';
import { createWorld } from '../src/sim/world.js';

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

const world = createWorld(511);
world.units = [];
world.structures = [];
world.statues = {};
world.visionSources = [
  { team: 'player', x: 1000, y: 400, radius: 200, active: true },
  { team: 'player', x: 1150, y: 400, radius: 200, active: true },
];
const calls = [];
const ctx = {
  save: () => calls.push('save'),
  restore: () => calls.push('restore'),
  beginPath: () => calls.push('beginPath'),
  rect: () => calls.push('rect'),
  arc: () => calls.push('arc'),
  fill: () => calls.push('fill'),
  fillRect: () => calls.push('fillRect'),
  clip: (...args) => calls.push(`clip:${args.join(',')}`),
  set fillStyle(value) { calls.push(`fillStyle:${value}`); },
  set globalCompositeOperation(value) { calls.push(`composite:${value}`); },
};

drawVisionFog(ctx, world, 'player');
expect(calls.includes('fillRect'), 'Fog must begin as one full dark-world layer.');
expect(calls.includes('composite:destination-out'), 'Each vision bubble must subtract from fog instead of using an even-odd clip.');
expect(calls.filter((call) => call === 'arc').length === 2, 'Both overlapping vision bubbles must be independently subtracted.');
expect(!calls.some((call) => call.startsWith('clip:evenodd')), 'Even-odd clipping must not darken overlapping visible areas.');
expect(CONFIG.VISION_RANGES.units.warrior === 425, `Warrior vision must be 25% larger (425), got ${CONFIG.VISION_RANGES.units.warrior}.`);
expect(CONFIG.RAVEN.movingVisionRadius === 375 && CONFIG.RAVEN.enemyBaseRevealRadius === 1000, 'Raven vision bubbles must also increase 25%.');

console.log('PASS — fog subtracts the union of overlapping vision bubbles and all vision radii are 25% larger.');
