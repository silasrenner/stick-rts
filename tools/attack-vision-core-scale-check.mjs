import { CONFIG } from '../src/config.js';
import { createCamera, visibleWorldWidth, zoomAt } from '../src/render/camera.js';
import { drawKnownBase, drawStatue } from '../src/render/structures.js';
import { getPlayerAttackTargetRevealSources } from '../src/render/spectatorVision.js';
import { getTeamVisionSources } from '../src/sim/vision.js';
import { createUnit, createWorld } from '../src/sim/world.js';

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

function createRecordingContext(calls) {
  return {
    save: () => calls.push(['save']),
    restore: () => calls.push(['restore']),
    fillRect: (...args) => calls.push(['fillRect', ...args]),
    strokeRect: (...args) => calls.push(['strokeRect', ...args]),
    set fillStyle(value) { calls.push(['fillStyle', value]); },
    set strokeStyle(value) { calls.push(['strokeStyle', value]); },
    set lineWidth(value) { calls.push(['lineWidth', value]); },
  };
}

const world = createWorld(733);
world.units = [];
world.structures = [];
const playerArcher = createUnit('archer', 'player', 1000, CONFIG.GROUND_Y);
const hiddenEnemy = createUnit('warrior', 'ai', 1800, CONFIG.GROUND_Y);
world.units.push(playerArcher, hiddenEnemy);

expect(getPlayerAttackTargetRevealSources(world).length === 0, 'An enemy without a Player attacker must not gain attack disclosure.');
playerArcher.targetId = hiddenEnemy.id;
const disclosures = getPlayerAttackTargetRevealSources(world);
expect(disclosures.length === 1 && disclosures[0].entityId === hiddenEnemy.id, 'An actively targeted enemy mobile unit must gain Player-only attack disclosure.');
expect(disclosures[0].radius === CONFIG.VISION_RANGES.units.warrior, 'Attack disclosure must use the target\'s configured vision radius.');
playerArcher.targetId = null;
expect(getPlayerAttackTargetRevealSources(world).length === 0, 'Attack disclosure must end when the active target engagement ends.');

const catapult = createUnit('catapult', 'player', 2600, CONFIG.GROUND_Y);
world.units.push(catapult);
const catapultSource = getTeamVisionSources(world, 'player').find((source) => source.entityId === catapult.id);
expect(catapultSource?.radius === 900, `Catapult must contribute 900 vision, got ${catapultSource?.radius}.`);

expect(CONFIG.CAMERA_ZOOM_MIN === CONFIG.VIEWPORT_WIDTH / CONFIG.WORLD_WIDTH, 'Minimum zoom must derive from the active world width.');
const camera = createCamera();
zoomAt(camera, CONFIG.VIEWPORT_WIDTH / 2, 0.01);
expect(camera.zoom === CONFIG.CAMERA_ZOOM_MIN, 'Zoom-out must clamp exactly at the full-map minimum.');
expect(Math.abs(visibleWorldWidth(camera) - CONFIG.WORLD_WIDTH) < 1e-9, 'The minimum zoom must show the entire world width.');
expect(camera.x === 0 && camera.targetX === 0, 'A full-map camera cannot pan beyond the world bounds.');

const statue = world.statues.player;
const expectedWidth = 34 * CONFIG.CORE_RENDER_SCALE;
const expectedHeight = 80 * CONFIG.CORE_RENDER_SCALE;
const expectedX = statue.x - expectedWidth / 2;
const expectedY = statue.y - expectedHeight;
const liveCalls = [];
drawStatue(createRecordingContext(liveCalls), statue);
expect(liveCalls.some((call) => call.join(',') === `fillRect,${expectedX},${expectedY},${expectedWidth},${expectedHeight}`), 'Live core body must render at exactly 3× dimensions.');
expect(liveCalls.some((call) => call.join(',') === `strokeRect,${expectedX},${expectedY},${expectedWidth},${expectedHeight}`), 'Live core outline must match the 3× body dimensions.');
expect(liveCalls.some((call) => call.join(',') === `fillRect,${statue.x - 60},${expectedY - 12},120,4`), 'Live core health bar must scale and remain above the enlarged core.');
const knownCalls = [];
drawKnownBase(createRecordingContext(knownCalls), statue);
expect(knownCalls.some((call) => call.join(',') === `fillRect,${expectedX},${expectedY},${expectedWidth},${expectedHeight}`), 'Fogged known-core silhouette must use the same 3× dimensions.');

console.log('PASS — targeted enemies disclose vision only during engagement, Catapults contribute sight, full-map zoom clamps correctly, and both core render paths are 3×.');
