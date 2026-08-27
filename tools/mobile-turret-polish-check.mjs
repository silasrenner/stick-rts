import { CONFIG } from '../src/config.js';
import { createWorld } from '../src/sim/world.js';
import { getBuildMenuButtons, drawBuildMenu, getPauseButtonRect, getTouchCommandRects, PURCHASE_REASON_TEXT } from '../src/render/ui.js';

const canvas = { width: CONFIG.VIEWPORT_WIDTH, height: CONFIG.CANVAS_HEIGHT };
function createContext() {
  const text = [];
  const fills = [];
  const ctx = new Proxy({
    canvas,
    fillStyle: '',
    strokeStyle: '',
    fillRect(x, y, w, h) { fills.push({ x, y, w, h, color: this.fillStyle }); },
    fillText(value, x, y) { text.push({ value, x, y }); },
  }, {
    get(target, key) { return key in target ? target[key] : () => {}; },
    set(target, key, value) { target[key] = value; return true; },
  });
  return { ctx, text, fills };
}
function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

if (CONFIG.TURRET_RANGE !== 700) throw new Error(`Turret range must be 700 after +25%; got ${CONFIG.TURRET_RANGE}.`);
if (CONFIG.TURRET_DAMAGE !== 47.6) throw new Error(`Turret damage must be 47.6 after -15%; got ${CONFIG.TURRET_DAMAGE}.`);
if (CONFIG.UNIT_STATS.archer.speed !== CONFIG.UNIT_STATS.warrior.speed) throw new Error(`Archer and Warrior must share move speed; got ${CONFIG.UNIT_STATS.archer.speed} vs ${CONFIG.UNIT_STATS.warrior.speed}.`);
for (const reason of ['maxStructures', 'maxTurrets']) {
  if (PURCHASE_REASON_TEXT[reason] !== 'Max count reached') throw new Error(`${reason} click feedback must use the exact max-count label; got ${PURCHASE_REASON_TEXT[reason]}.`);
}

const maxWorld = createWorld(84);
maxWorld.matchState = 'playing';
maxWorld.teams.player.gold = 100_000;
maxWorld.teams.player.productionQueue = [
  ...Array.from({ length: CONFIG.MAX_STRUCTURES }, () => ({ action: 'structure', kind: null, remaining: 1, total: 1 })),
  ...Array.from({ length: CONFIG.MAX_TURRETS }, () => ({ action: 'turret', kind: null, remaining: 1, total: 1 })),
];
const capture = createContext();
drawBuildMenu(capture.ctx, maxWorld);
for (const label of ['Structure', 'Turret']) {
  const button = getBuildMenuButtons(canvas).find((item) => item.label === label);
  if (!capture.text.some(({ value, x }) => value === 'Max count reached' && x === button.rect.x + 24)) {
    throw new Error(`${label} must render the exact max-count label; saw ${capture.text.map(({ value }) => value).join(' | ')}`);
  }
}

const mobilePause = getPauseButtonRect(canvas, false, true);
for (const control of getTouchCommandRects(canvas, maxWorld).army) {
  if (overlaps(mobilePause, control.rect)) throw new Error(`Mobile Pause overlaps ${control.action}: ${JSON.stringify({ mobilePause, control: control.rect })}`);
}

const queuedWorld = createWorld(85);
queuedWorld.matchState = 'playing';
queuedWorld.teams.player.productionQueue = [
  { action: 'structure', kind: null, remaining: 10, total: 20 },
  { action: 'turret', kind: null, remaining: 15, total: 15 },
];
const queueCapture = createContext();
drawBuildMenu(queueCapture.ctx, queuedWorld);
const chipFills = queueCapture.fills.filter(({ w, h }) => w === CONFIG.QUEUE_CHIP_WIDTH && h === CONFIG.QUEUE_CHIP_HEIGHT);
if (chipFills.length < 2) throw new Error(`Mobile queue must render active and pending chips; got ${chipFills.length}.`);

console.log('PASS — turret tuning, matched unit speeds, max-count labels, and mobile pause/queue layout are correct.');
