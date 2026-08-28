import { createWorld } from '../src/sim/world.js';
import { drawMenuScreen, drawPauseOverlay, getMainMenuButtonRects, getPauseOverlayRects } from '../src/render/ui.js';

const canvas = { width: 1400, height: 540 };
function capture() {
  const text = [];
  const ctx = new Proxy({ canvas, fillText(value, x, y) { text.push({ value, x, y }); } }, {
    get(target, key) { return key in target ? target[key] : () => {}; },
    set(target, key, value) { target[key] = value; return true; },
  });
  return { ctx, text };
}
function expect(condition, message) { if (!condition) throw new Error(message); }

expect(getMainMenuButtonRects(canvas).some(({ id, label }) => id === 'guide' && label === 'Game Guide'), 'Landing page must expose a Game Guide button.');
expect(getPauseOverlayRects(canvas).guide, 'Pause overlay must expose a Game Guide button rectangle.');

const landing = capture();
drawMenuScreen(landing.ctx, { menuScreen: 'main', paused: false, touchControlsEnabled: false, spectatorView: 'full' });
const title = landing.text.find(({ value }) => value === 'STICK RTS');
const play = getMainMenuButtonRects(canvas).find(({ id }) => id === 'play').rect;
expect(title && title.y + 20 < play.y, `Landing title must clear Play; title=${JSON.stringify(title)} play=${JSON.stringify(play)}.`);

const guide = capture();
drawMenuScreen(guide.ctx, { menuScreen: 'guide', paused: false, touchControlsEnabled: false, spectatorView: 'full' });
const labels = guide.text.map(({ value }) => value);
for (const required of ['Game Guide', 'Controls', 'Interface', 'Units', 'Q', 'W', 'E', 'Attack', 'Defend', 'Retreat', 'Miner', 'Warrior', 'Archer', 'Structure', 'Turret', 'Raven']) {
  expect(labels.some((value) => value === required || value.startsWith(`${required}:`)), `Guide must render ${required}; got ${labels.join(' | ')}.`);
}
expect(!labels.some((value) => value.toLowerCase().includes('heroes: disabled')), 'Guide must not tell players that heroes are disabled.');
expect(labels.some((value) => /forge|rally|hold|scout/i.test(value)), `Guide needs colorful, welcoming player language; got ${labels.join(' | ')}.`);

const paused = capture();
drawPauseOverlay(paused.ctx, 5);
expect(paused.text.some(({ value }) => value === 'Game Guide'), 'Pause overlay must render a Game Guide button.');

console.log('PASS — Game Guide is reachable from landing and pause surfaces with required player-facing sections.');
