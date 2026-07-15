import { CONFIG } from './config.js';
import { createWorld } from './sim/world.js';
import { createAccumulator } from './sim/loop.js';
import { runTick } from './sim/tick.js';
import { setTeamCommand } from './sim/systems/commands.js';
import { buyUnit, buyStructure } from './sim/systems/economy.js';
import { render } from './render/renderer.js';
import { getBuildMenuButtons, getRematchButtonRect } from './render/ui.js';
import { bindDebugKeys } from './input/keyboard.js';
import { bindClick, pointInRect } from './input/mouse.js';

const canvas = document.getElementById('game');
canvas.width = CONFIG.CANVAS_WIDTH;
canvas.height = CONFIG.CANVAS_HEIGHT;
const ctx = canvas.getContext('2d');

let world = createWorld();
let uiMessage = { text: '', timer: 0 };

const PURCHASE_REASON_TEXT = {
  gold: 'Not enough gold',
  cap: 'Population cap reached',
  maxStructures: 'Max structures built',
};

function showMessage(text) {
  uiMessage = { text, timer: 2 };
}

function attemptBuyUnit(team, kind) {
  const result = buyUnit(world, team, kind);
  if (!result.ok && team === 'player') showMessage(PURCHASE_REASON_TEXT[result.reason]);
  return result;
}

function attemptBuyStructure(team) {
  const result = buyStructure(world, team);
  if (!result.ok && team === 'player') showMessage(PURCHASE_REASON_TEXT[result.reason]);
  return result;
}

function resetMatch() {
  world = createWorld();
  uiMessage = { text: '', timer: 0 };
}

bindDebugKeys({
  // AI-stand-in purchases go through the same buyUnit/buyStructure the
  // player's build menu uses — gold/cap-gated identically, just triggered
  // by keyboard instead of a click since there's no AI to decide yet.
  '7': () => attemptBuyUnit('ai', 'miner'),
  '8': () => attemptBuyUnit('ai', 'warrior'),
  '9': () => attemptBuyUnit('ai', 'archer'),
  '0': () => attemptBuyStructure('ai'),
  q: () => setTeamCommand(world, 'player', 'attack'),
  w: () => setTeamCommand(world, 'player', 'defend'),
  e: () => setTeamCommand(world, 'player', 'retreat'),
  i: () => setTeamCommand(world, 'ai', 'attack'),
  o: () => setTeamCommand(world, 'ai', 'defend'),
  p: () => setTeamCommand(world, 'ai', 'retreat'),
});

bindClick(canvas, (x, y) => {
  if (world.matchState !== 'playing') {
    if (pointInRect(x, y, getRematchButtonRect(canvas))) resetMatch();
    return;
  }

  for (const button of getBuildMenuButtons(canvas)) {
    if (!pointInRect(x, y, button.rect)) continue;
    if (button.action === 'unit') attemptBuyUnit('player', button.kind);
    else attemptBuyStructure('player');
    return;
  }
});

const accumulator = createAccumulator(1000 / CONFIG.TICK_HZ);
let lastTime = performance.now();
let tickCount = 0;

function tick(dt) {
  runTick(world, dt);
  if (uiMessage.timer > 0) {
    uiMessage.timer -= dt;
    if (uiMessage.timer <= 0) uiMessage = { text: '', timer: 0 };
  }
  tickCount++;
}

function frame(time) {
  const deltaMs = time - lastTime;
  lastTime = time;
  accumulator.advance(deltaMs, tick);
  render(ctx, world, uiMessage);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);

window.__tickCount = () => tickCount;
// world is reassigned on rematch — a getter keeps this live rather than stale.
Object.defineProperty(window, '__world', { get: () => world, configurable: true });
window.__resetMatch = resetMatch;
window.__buyUnit = attemptBuyUnit;
window.__buyStructure = attemptBuyStructure;
window.__setCommand = (team, command) => setTeamCommand(world, team, command);
window.__forceTicks = (n = CONFIG.TICK_HZ) => {
  for (let i = 0; i < n; i++) tick(1 / CONFIG.TICK_HZ);
  render(ctx, world, uiMessage);
};
