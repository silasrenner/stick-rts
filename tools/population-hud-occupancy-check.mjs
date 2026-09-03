import { CONFIG } from '../src/config.js';
import { createStructure, createUnit, createWorld } from '../src/sim/world.js';
import { buyUnit } from '../src/sim/systems/economy.js';
import { drawHUD } from '../src/render/ui.js';

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

function drawHudText(world) {
  const calls = [];
  const ctx = new Proxy({ canvas: { width: CONFIG.VIEWPORT_WIDTH, height: CONFIG.CANVAS_HEIGHT }, fillText(text) { calls.push(String(text)); } }, {
    get(target, key) { return key in target ? target[key] : () => {}; },
    set(target, key, value) { target[key] = value; return true; },
  });
  drawHUD(ctx, world, null);
  return calls;
}

const world = createWorld(701);
world.matchState = 'playing';
world.units = [];
world.structures = [createStructure('player', 140, CONFIG.GROUND_Y), createStructure('player', 180, CONFIG.GROUND_Y)];
for (let i = 0; i < 25; i += 1) world.units.push(createUnit('warrior', 'player', 0, CONFIG.GROUND_Y));
for (let i = 0; i < 4; i += 1) world.units.push(createUnit('catapult', 'player', 0, CONFIG.GROUND_Y));
const fullHud = drawHudText(world);
expect(fullHud.includes('Population: 41/41'), `HUD must show authoritative weighted live population for four Catapults, not literal units: ${JSON.stringify(fullHud)}.`);
expect(!fullHud.some((text) => text.includes('29/41') || text.includes('units')), `HUD must not add a literal-unit tag or show the old 29/41 count: ${JSON.stringify(fullHud)}.`);

const queuedWorld = createWorld(702);
queuedWorld.matchState = 'playing';
queuedWorld.units = [];
queuedWorld.structures = [createStructure('player', 140, CONFIG.GROUND_Y), createStructure('player', 180, CONFIG.GROUND_Y)];
queuedWorld.teams.player.gold = 10_000;
for (let i = 0; i < 24; i += 1) queuedWorld.units.push(createUnit('warrior', 'player', 0, CONFIG.GROUND_Y));
expect(buyUnit(queuedWorld, 'player', 'catapult').ok, 'Queue fixture must accept one Catapult reservation.');
const queuedHud = drawHudText(queuedWorld);
expect(queuedHud.includes('Population: 28/41 (+4 queued)'), `HUD must retain the current queued suffix while using reserved population: ${JSON.stringify(queuedHud)}.`);

console.log('PASS — Population HUD uses authoritative weighted occupancy and preserves queued-unit presentation.');
