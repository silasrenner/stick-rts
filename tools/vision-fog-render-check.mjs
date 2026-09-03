import { readFileSync } from 'node:fs';
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
    createLinearGradient: (...args) => {
      calls.push(`linearGradient:${args.join(',')}`);
      return { addColorStop: (offset, color) => calls.push(`linearStop:${offset},${color}`) };
    },
    createRadialGradient: (...args) => {
      calls.push(`radialGradient:${args.join(',')}`);
      return { addColorStop: (offset, color) => calls.push(`colorStop:${offset},${color}`) };
    },
    fillRect: (...args) => calls.push(`fillRect:${args.join(',')}`),
    clearRect: (...args) => calls.push(`clearRect:${args.join(',')}`),
    translate: (...args) => calls.push(`translate:${args.join(',')}`),
    setTransform: (...args) => calls.push(`setTransform:${args.join(',')}`),
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
  drawVisionFog(createRecordingContext(mainCalls), world, 'player', { x: 0, zoom: 0.5 }, [], CONFIG.PLAYER_FOG_ALPHA, CONFIG.PLAYER_FOG_COLOR, 330, 472, CONFIG.PLAYER_FOG_FEATHER * 0.5, CONFIG.PLAYER_FOG_BOUNDARY_FEATHER * 0.5);
} finally {
  globalThis.OffscreenCanvas = priorOffscreenCanvas;
}

expect(mainCalls.includes('drawImage'), 'Fog must composite an isolated surface onto the already-rendered world.');
expect(!mainCalls.includes('composite:destination-out'), 'Vision subtraction must never run against the main world canvas, which erases parallax/background pixels.');
expect(fogCalls.includes('composite:destination-out'), 'Vision bubbles must subtract from the isolated fog surface.');
expect(fogCalls.filter((call) => call === 'arc').length === 2, 'Both overlapping vision bubbles must be independently subtracted.');
expect(fogCalls.includes(`linearStop:0.08450704225352113,${CONFIG.PLAYER_FOG_COLOR}`), `Player fog boundary must fade into configured pale color; got ${CONFIG.PLAYER_FOG_COLOR}.`);
expect(fogCalls.includes(`fillRect:0,330,${CONFIG.WORLD_WIDTH},142`), 'At 0.5x zoom, Player fog top must project from world y=220 to screen y=330 while retaining the UI bottom boundary.');
expect(CONFIG.PLAYER_FOG_TOP === 220, `Player fog must begin halfway up the world at y=220; got ${CONFIG.PLAYER_FOG_TOP}.`);
expect(CONFIG.PLAYER_FOG_COLOR === 'rgba(225, 232, 240, 0.075)', `Player fog must use the requested half-opacity 0.075 veil; got ${CONFIG.PLAYER_FOG_COLOR}.`);
expect(CONFIG.PLAYER_FOG_FEATHER === 36 && CONFIG.PLAYER_FOG_BOUNDARY_FEATHER === 24, 'Fog visual feathers must be world-space values scaled by camera zoom.');
expect(CONFIG.RAVEN.movingVisionRadius === 562.5, `Flying Raven vision must increase 50% to 562.5; got ${CONFIG.RAVEN.movingVisionRadius}.`);
expect(fogCalls.some((call) => call.startsWith('linearGradient:')), 'Player fog must use a linear gradient to soften its top and bottom edges.');
expect(fogCalls.includes('linearStop:0,rgba(225, 232, 240, 0)') && fogCalls.includes('linearStop:1,rgba(225, 232, 240, 0)'), 'Fog boundary gradient must fade to transparent at both top and bottom.');
const rendererSource = readFileSync(new URL('../src/render/renderer.js', import.meta.url), 'utf8');
const structureDraw = rendererSource.indexOf('for (const structure of world.structures)');
const fogDraw = rendererSource.indexOf('drawVisionFog(ctx, world, spectatorTeam');
const foggedStaticPass = rendererSource.indexOf('drawFoggedKnownStatics(ctx, world, spectatorTeam, visible);');
expect(structureDraw !== -1 && fogDraw !== -1 && structureDraw < fogDraw, 'Structures and turrets must be drawn before fog so known enemy static defenses remain visibly fogged.');
expect(foggedStaticPass > fogDraw, 'Unseen known enemy structures/turrets/core need a restrained post-fog silhouette pass so they remain visible through the 0.84 fog.');
expect(CONFIG.PLAYER_FOG_ALPHA === 0.30, `Player unseen terrain must retain its existing 0.30 opacity contract; got ${CONFIG.PLAYER_FOG_ALPHA}.`);
expect(CONFIG.VISION_RANGES.units.warrior === 425, `Warrior vision must remain 425, got ${CONFIG.VISION_RANGES.units.warrior}.`);
expect(CONFIG.RAVEN.movingVisionRadius === 562.5 && CONFIG.RAVEN.enemyBaseRevealRadius === 1000, 'Raven flying vision must be 562.5 while base-reveal radius stays unchanged.');

console.log('PASS — Player fog subtracts vision only from an isolated layer, preserves world pixels, and uses lighter unseen-terrain opacity.');
