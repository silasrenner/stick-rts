import { createWorld } from '../src/sim/world.js';
import { drawMenuScreen, drawPauseOverlay, getGuideReferenceRows, getGuideTabRects, getMainMenuButtonRects, getPauseOverlayRects } from '../src/render/ui.js';

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
drawMenuScreen(guide.ctx, { menuScreen: 'guide', guidePage: 'play', paused: false, touchControlsEnabled: false, spectatorView: 'full' });
const labels = guide.text.map(({ value }) => value);
const tabs = getGuideTabRects(canvas);
expect(tabs.play && tabs.reference && !((tabs.play.x + tabs.play.w) > tabs.reference.x), `Guide needs two non-overlapping tabs: ${JSON.stringify(tabs)}.`);
for (const required of ['Game Guide', 'How to Play', 'Units & Buildings', 'Q', 'W', 'E', 'Attack', 'Defend', 'Retreat', 'Vision']) {
  expect(labels.some((value) => value === required || value.startsWith(`${required}:`)), `Guide must render ${required}; got ${labels.join(' | ')}.`);
}
expect(!labels.some((value) => value.toLowerCase().includes('heroes: disabled')), 'Guide must not tell players that heroes are disabled.');
expect(labels.some((value) => /forge|rally|hold|scout/i.test(value)), `Guide needs colorful, welcoming player language; got ${labels.join(' | ')}.`);

const paused = capture();
drawPauseOverlay(paused.ctx, 5);
expect(paused.text.some(({ value }) => value === 'Game Guide'), 'Pause overlay must render a Game Guide button.');

const referencePage = capture();
drawMenuScreen(referencePage.ctx, { menuScreen: 'guide', guidePage: 'reference', paused: false, touchControlsEnabled: false, spectatorView: 'full' });
for (const required of ['Miner', 'Warrior', 'Archer', 'Catapult', 'Structure', 'Turret', 'Raven', 'Cost', 'HP', 'DPS']) {
  expect(referencePage.text.some(({ value }) => value === required || value.startsWith(`${required}:`)), `Reference page must render ${required}.`);
}

const reference = Object.fromEntries(getGuideReferenceRows().map((row) => [row.label, row]));
for (const label of ['Miner', 'Warrior', 'Archer', 'Catapult', 'Structure', 'Turret', 'Raven']) expect(reference[label], `Guide reference must include ${label}.`);
expect(reference.Catapult.cost === 1050 && reference.Catapult.hp === 90 && reference.Catapult.dps === 12.2 && reference.Catapult.population === 4, `Catapult guide stats/role must derive from current config: ${JSON.stringify(reference.Catapult)}.`);
expect(reference.Warrior.cost === 137.5 && reference.Warrior.hp === 62.79 && reference.Warrior.dps === 15, `Warrior guide stats must derive from current config: ${JSON.stringify(reference.Warrior)}.`);
expect(reference.Turret.cost === 1560 && reference.Turret.hp === 900 && reference.Turret.dps === 23.8, `Turret guide stats must derive from current config: ${JSON.stringify(reference.Turret)}.`);
expect(reference.Raven.cost === 750 && reference.Raven.hp === null && reference.Raven.dps === null, `Raven guide stats must communicate a non-combat scout: ${JSON.stringify(reference.Raven)}.`);
expect(labels.some((value) => value.includes('Vision:')), `Guide must explain team vision; got ${labels.join(' | ')}.`);
expect(labels.some((value) => value.includes('next completed turret')), `Guide must explain repeated Player Defend; got ${labels.join(' | ')}.`);
expect(labels.some((value) => value.includes('Game Speed')), `Guide must explain the game-speed control; got ${labels.join(' | ')}.`);

console.log('PASS — Game Guide is reachable from landing and pause surfaces with required player-facing sections.');
