import { CONFIG } from '../src/config.js';
import { createWorld } from '../src/sim/world.js';
import { buyUnit } from '../src/sim/systems/economy.js';
import { drawBuildMenu, getBuildMenuButtons } from '../src/render/ui.js';

const canvas = { width: CONFIG.VIEWPORT_WIDTH, height: CONFIG.CANVAS_HEIGHT };
const textCalls = [];
const ctx = new Proxy({
  canvas,
  fillText(text, x, y) { textCalls.push({ text, x, y }); },
}, {
  get(target, key) { return key in target ? target[key] : () => {}; },
  set(target, key, value) { target[key] = value; return true; },
});

const world = createWorld(29);
world.matchState = 'playing';
world.teams.player.gold = 10_000;
for (let i = 0; i < 4; i += 1) {
  const result = buyUnit(world, 'player', 'warrior');
  if (!result.ok) throw new Error(`Queue fixture setup failed at ${i + 1}: ${JSON.stringify(result)}`);
}

drawBuildMenu(ctx, world);
const queueLabel = textCalls.find((call) => call.text === '4/10');
if (!queueLabel) throw new Error(`Expected queue indicator 4/10; saw ${textCalls.map((call) => call.text).join(', ')}.`);
const firstButtonX = getBuildMenuButtons(canvas)[0].rect.x;
if (queueLabel.x >= firstButtonX) throw new Error(`Queue indicator must render left of the queue/button row: ${JSON.stringify({ queueLabel, firstButtonX })}`);
if (getBuildMenuButtons(canvas).some((button) => button.action === 'hero')) throw new Error('Hero buttons must be absent while heroes are disabled.');

console.log('PASS — queue indicator renders current/10 left of the queue row and the build menu has no heroes.');
