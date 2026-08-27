import { createWorld } from '../src/sim/world.js';
import { UPDATE_LOG } from '../src/updateLog.js';
import { getDifficultyButtonRects, getExitToMenuButtonRect, drawWinLoseOverlay } from '../src/render/ui.js';
import { render } from '../src/render/renderer.js';

const canvas = { width: 1400, height: 540 };
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
function overlaps(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }

if (UPDATE_LOG.length !== 10) throw new Error(`Update Log must contain exactly ten player-facing updates; got ${UPDATE_LOG.length}.`);
for (const [index, entry] of UPDATE_LOG.entries()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.date) || typeof entry.text !== 'string' || !entry.text) throw new Error(`Update ${index + 1} must have an ISO date and non-empty text: ${JSON.stringify(entry)}.`);
}
for (let i = 1; i < UPDATE_LOG.length; i += 1) {
  if (UPDATE_LOG[i - 1].date < UPDATE_LOG[i].date) throw new Error('Update Log must be newest-first.');
}

const resultWorld = createWorld(91);
resultWorld.matchState = 'won';
resultWorld.teams.ai.difficulty = 'hard';
const resultCapture = createContext();
drawWinLoseOverlay(resultCapture.ctx, resultWorld);
const exitRect = getExitToMenuButtonRect(canvas);
if (!resultCapture.text.some(({ value }) => value === 'Exit to Menu')) throw new Error('Player victory overlay must render Exit to Menu.');
if (getDifficultyButtonRects(canvas).some(({ rect }) => overlaps(exitRect, rect))) throw new Error(`Exit to Menu must not overlap difficulty selection: ${JSON.stringify(exitRect)}.`);

const playerWorld = createWorld(92);
playerWorld.matchState = 'playing';
playerWorld.teams.ai.difficulty = 'medium';
const playerCapture = createContext();
render(playerCapture.ctx, playerWorld, { x: 0, zoom: 0.7 }, { text: '', timer: 0 }, { paused: false, touchControlsEnabled: false, spectatorView: 'full' });
const playerLabels = playerCapture.text.map(({ value }) => value);
if (playerLabels.some((value) => value.startsWith('AI difficulty:') || value.startsWith('Your command:'))) {
  throw new Error(`Player-vs-AI must not render AI difficulty or command/debug descriptions: ${playerLabels.join(' | ')}`);
}

const updateCapture = createContext();
const menuWorld = createWorld(93);
render(updateCapture.ctx, menuWorld, { x: 0, zoom: 0.7 }, { text: '', timer: 0 }, { menuScreen: 'updates', paused: false, touchControlsEnabled: false, spectatorView: 'full' });
if (!updateCapture.fills.some(({ x, y, w, h }) => x === 64 && y === 86 && w === 1272 && h === 372)) {
  throw new Error('Update Log must paint an opaque reading panel behind dated rows.');
}

console.log('PASS — victory exit, Player-vs-AI text cleanup, and dated ten-update history are correct.');
