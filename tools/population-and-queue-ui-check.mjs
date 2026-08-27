import { CONFIG } from '../src/config.js';
import { createUnit, createWorld } from '../src/sim/world.js';
import { buyStructure, buyTurret, buyUnit, getOccupiedCap } from '../src/sim/systems/economy.js';
import { drawBuildMenu, drawHUD, getBuildMenuButtons, getQueueChipRowRect } from '../src/render/ui.js';

const canvas = { width: CONFIG.VIEWPORT_WIDTH, height: CONFIG.CANVAS_HEIGHT };
function createContext() {
  const text = [];
  const strokes = [];
  const ctx = new Proxy({
    canvas,
    fillStyle: '',
    strokeStyle: '',
    fillText(value, x, y) { text.push({ value, x, y }); },
    strokeRect(x, y, w, h) { strokes.push({ color: this.strokeStyle, x, y, w, h }); },
  }, {
    get(target, key) { return key in target ? target[key] : () => {}; },
    set(target, key, value) { target[key] = value; return true; },
  });
  return { ctx, text, strokes };
}

// A full literal army must not prevent a turret purchase, and neither a
// queued nor completed turret may add to population reservation/accounting.
const fullWorld = createWorld(71);
fullWorld.matchState = 'playing';
fullWorld.teams.player.gold = 100_000;
for (let i = 0; i < CONFIG.BASE_UNIT_CAP; i += 1) fullWorld.units.push(createUnit('miner', 'player', 200 + i, CONFIG.GROUND_Y));
const turretPurchase = buyTurret(fullWorld, 'player');
if (!turretPurchase.ok) throw new Error(`Turret must not be blocked by population: ${JSON.stringify(turretPurchase)}`);
if (getOccupiedCap(fullWorld, 'player') !== CONFIG.BASE_UNIT_CAP) throw new Error(`Queued turret must not reserve population; got ${getOccupiedCap(fullWorld, 'player')}.`);

// HUD primary count is the literal living-unit count; queued units remain
// visible as an explicit reservation rather than silently inflating it.
const hudWorld = createWorld(72);
hudWorld.matchState = 'playing';
hudWorld.teams.player.gold = 100_000;
hudWorld.units.push(createUnit('warrior', 'player', 300, CONFIG.GROUND_Y));
if (!buyUnit(hudWorld, 'player', 'archer').ok) throw new Error('HUD fixture could not queue a unit.');
const hudCapture = createContext();
drawHUD(hudCapture.ctx, hudWorld, null);
if (!hudCapture.text.some(({ value }) => value === `Population: 1/${CONFIG.BASE_UNIT_CAP} (+1 queued)`)) {
  throw new Error(`HUD must show literal units plus explicit queue reservation; saw ${hudCapture.text.map(({ value }) => value).join(' | ')}`);
}

// The active queue head must retain its structure glyph rather than vanish
// when it moves out of the pending chip list.
const queueWorld = createWorld(73);
queueWorld.matchState = 'playing';
queueWorld.teams.player.gold = 100_000;
if (!buyStructure(queueWorld, 'player').ok || !buyTurret(queueWorld, 'player').ok) throw new Error('Queue fixture could not enqueue structure then turret.');
queueWorld.teams.player.productionQueue[0].remaining = queueWorld.teams.player.productionQueue[0].total / 2;
const queueCapture = createContext();
drawBuildMenu(queueCapture.ctx, queueWorld);
const firstButtonX = getBuildMenuButtons(canvas)[0].rect.x;
const queueRect = getQueueChipRowRect(canvas);
const activeStructureGlyph = queueCapture.strokes.some((stroke) => stroke.x === firstButtonX + 3 && stroke.y === queueRect.y + 7 && stroke.w === 14 && stroke.h === 14);
if (!activeStructureGlyph) throw new Error('Active structure must remain visible as a structure glyph in the queue row.');

console.log('PASS — population counts literal units, turrets reserve zero slots, and active structure queue glyphs persist.');
