import { getUnitKillTotals } from '../src/render/matchTelemetry.js';
import { getPauseButtonRect, getZoomButtonRects } from '../src/render/ui.js';

const world = { teams: { player: { losses: 2 }, ai: { losses: 5 } } };
const kills = getUnitKillTotals(world);
if (kills.player !== 5 || kills.ai !== 2) {
  throw new Error(`Kills must derive from opponent unit losses: ${JSON.stringify(kills)}`);
}

const canvas = { width: 1400, height: 540 };
const playerPause = getPauseButtonRect(canvas, false);
const playerZoom = getZoomButtonRects(canvas, false);
if (playerPause.x + playerPause.w + 6 !== playerZoom.in.x || playerPause.y !== playerZoom.in.y) {
  throw new Error(`Player pause must sit immediately left of the top-right zoom controls: ${JSON.stringify({ playerPause, playerZoom })}`);
}

const watchPause = getPauseButtonRect(canvas, true);
if (watchPause.x !== 64 || watchPause.y !== 510) {
  throw new Error(`Watch pause placement must remain unchanged: ${JSON.stringify(watchPause)}`);
}

console.log('PASS — unit kills derive from opponent losses and pause layout keeps Player-vs-AI beside zoom while Watch remains unchanged.');
