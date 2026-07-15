import { CONFIG } from './config.js';
import { createWorld, createUnit } from './sim/world.js';
import { createAccumulator } from './sim/loop.js';
import { updateMovement } from './sim/systems/movement.js';
import { updateCombat, updateDeaths } from './sim/systems/combat.js';
import { updateProjectiles } from './sim/systems/projectiles.js';
import { setTeamCommand } from './sim/systems/commands.js';
import { render } from './render/renderer.js';
import { bindDebugKeys } from './input/keyboard.js';

const canvas = document.getElementById('game');
canvas.width = CONFIG.CANVAS_WIDTH;
canvas.height = CONFIG.CANVAS_HEIGHT;
const ctx = canvas.getContext('2d');

const world = createWorld();

let playerSpawnRow = 0;
let aiSpawnRow = 0;

function spawnPlayer(kind) {
  const y = CONFIG.CANVAS_HEIGHT - 60 - (playerSpawnRow % 4) * 30;
  playerSpawnRow++;
  const unit = createUnit(kind, 'player', CONFIG.PLAYER_HOME_X, y);
  unit.command = 'defend';
  world.units.push(unit);
}

function spawnAi(kind) {
  const y = CONFIG.CANVAS_HEIGHT - 60 - (aiSpawnRow % 4) * 30;
  aiSpawnRow++;
  const unit = createUnit(kind, 'ai', CONFIG.AI_HOME_X, y);
  unit.command = 'attack';
  world.units.push(unit);
}

bindDebugKeys({
  '1': () => spawnPlayer('miner'),
  '2': () => spawnPlayer('warrior'),
  '3': () => spawnPlayer('archer'),
  '7': () => spawnAi('miner'),
  '8': () => spawnAi('warrior'),
  '9': () => spawnAi('archer'),
  q: () => setTeamCommand(world, 'player', 'attack'),
  w: () => setTeamCommand(world, 'player', 'defend'),
  e: () => setTeamCommand(world, 'player', 'retreat'),
});

const accumulator = createAccumulator(1000 / CONFIG.TICK_HZ);
let lastTime = performance.now();
let tickCount = 0;

function tick(dt) {
  updateMovement(world, dt);
  updateCombat(world, dt);
  updateProjectiles(world, dt);
  updateDeaths(world, dt);
  tickCount++;
}

function frame(time) {
  const deltaMs = time - lastTime;
  lastTime = time;
  accumulator.advance(deltaMs, tick);
  render(ctx, world);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);

window.__tickCount = () => tickCount;
window.__world = world;
// Manually steps the sim — rAF is throttled/paused on backgrounded tabs,
// which browser-automation verification runs into. Also lets a screenshot
// reflect the new state immediately instead of waiting on the next frame.
window.__forceTicks = (n = CONFIG.TICK_HZ) => {
  for (let i = 0; i < n; i++) tick(1 / CONFIG.TICK_HZ);
  render(ctx, world);
};
