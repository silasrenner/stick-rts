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

const mainCalls = [];
const fogCalls = [];
function createRecordingContext(calls) {
  return {
    canvas: { width: CONFIG.WORLD_WIDTH, height: 2500 },
    save: () => calls.push('save'),
    restore: () => calls.push('restore'),
    beginPath: () => calls.push('beginPath'),
    arc: () => calls.push('arc'),
    fill: () => calls.push('fill'),
    fillRect: () => calls.push('fillRect'),
    clearRect: () => calls.push('clearRect'),
    translate: (...args) => calls.push(`translate:${args.join(',')}`),
    drawImage: () => calls.push('drawImage'),
    set fillStyle(value) { calls.push(`fillStyle:${value}`); },
    set globalCompositeOperation(value) { calls.push(`composite:${value}`); },
    set globalAlpha(value) { calls.push(`alpha:${value}`); },
  };
}

const priorOffscreenCanvas = globalThis.OffscreenCanvas;
globalThis.OffscreenCanvas = class RecordingOffscreenCanvas {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.context = createRecordingContext(fogCalls);
  }

  getContext(kind) {
    if (kind !== '2d') throw new Error(`Expected 2d fog context, got ${kind}.`);
    return this.context;
  }
};

try {
  drawVisionFog(createRecordingContext(mainCalls), world, 'player', [], CONFIG.PLAYER_FOG_ALPHA);
} finally {
  globalThis.OffscreenCanvas = priorOffscreenCanvas;
}

expect(mainCalls.includes('drawImage'), 'Fog must composite an isolated surface onto the already-rendered world.');
expect(!mainCalls.includes('composite:destination-out'), 'Vision subtraction must never run against the main world canvas, which erases parallax/background pixels.');
expect(fogCalls.includes('composite:destination-out'), 'Vision bubbles must subtract from the isolated fog surface.');
expect(fogCalls.filter((call) => call === 'arc').length === 2, 'Both overlapping vision bubbles must be independently subtracted.');
expect(CONFIG.PLAYER_FOG_ALPHA === 0.30, `Player unseen terrain must use the lighter 0.30 opacity; got ${CONFIG.PLAYER_FOG_ALPHA}.`);
expect(CONFIG.VISION_RANGES.units.warrior === 425, `Warrior vision must remain 425, got ${CONFIG.VISION_RANGES.units.warrior}.`);
expect(CONFIG.RAVEN.movingVisionRadius === 375 && CONFIG.RAVEN.enemyBaseRevealRadius === 1000, 'Raven vision radii must remain unchanged.');

console.log('PASS — Player fog subtracts vision only from an isolated layer, preserves world pixels, and uses lighter unseen-terrain opacity.');
