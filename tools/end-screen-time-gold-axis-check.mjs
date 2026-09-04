import { createWorld } from '../src/sim/world.js';
import { drawWinLoseOverlay } from '../src/render/ui.js';

const canvas = { width: 1400, height: 540 };
const text = [];
const ctx = new Proxy({ canvas, fillStyle: '', strokeStyle: '', fillText(value, x, y) { text.push({ value, x, y }); } }, {
  get(target, key) { return key in target ? target[key] : () => {}; },
  set(target, key, value) { target[key] = value; return true; },
});
const world = createWorld(7);
world.matchState = 'won';
world.matchElapsedTime = 625;
world.goldHistory.samples = [
  { time: 0, difference: 0 },
  { time: 300, difference: 600 },
  { time: 625, difference: -300 },
];
drawWinLoseOverlay(ctx, world);
const labels = text.map(({ value }) => value);
if (!labels.some((label) => label.includes('Game Time: 02:05'))) throw new Error(`End screen must show formatted game time; got ${labels.join(' | ')}.`);
if (!labels.includes('Gold')) throw new Error(`Gold chart must label its y-axis; got ${labels.join(' | ')}.`);
for (const expected of ['+600', '0', '−600']) {
  if (!labels.includes(expected)) throw new Error(`Gold chart must render ${expected} y-axis tick; got ${labels.join(' | ')}.`);
}
console.log('PASS — end screen shows game time and a scaled Gold y-axis.');
