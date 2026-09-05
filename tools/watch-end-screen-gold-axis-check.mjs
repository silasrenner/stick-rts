import { createWorld } from '../src/sim/world.js';
import { drawWinLoseOverlay } from '../src/render/ui.js';

const canvas = { width: 1400, height: 540 };
const text = [];
const ctx = new Proxy({ canvas, fillStyle: '', strokeStyle: '', fillText(value, x, y) { text.push({ value, x, y }); } }, {
  get(target, key) { return key in target ? target[key] : () => {}; },
  set(target, key, value) { target[key] = value; return true; },
});
const world = createWorld(1601);
world.matchState = 'won';
world.teams.player.difficulty = 'hard';
world.teams.ai.difficulty = 'hard';
world.goldHistory.samples = [{ time: 0, difference: 0 }, { time: 300, difference: 600 }, { time: 600, difference: -250 }];
drawWinLoseOverlay(ctx, world);
const labels = text.map(({ value }) => value);
if (!labels.includes('Gold')) throw new Error(`Watch AI end screen must retain the signed Gold delta graph axis; got ${labels.join(' | ')}.`);
if (!labels.includes('Back to Menu')) throw new Error(`Watch AI end screen must retain Back to Menu; got ${labels.join(' | ')}.`);
console.log('PASS — Watch AI end screen renders the Gold delta graph and Back to Menu.');
