import { CONFIG } from '../src/config.js';
import { createUnit, createWorld } from '../src/sim/world.js';
import { updateFormationSlots } from '../src/sim/systems/formation.js';
import { drawStickFigure } from '../src/render/stickFigure.js';
import { getBottomBarTop, getBuildButtonRowRect, getQueueChipRowRect } from '../src/render/ui.js';

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

const catapult = CONFIG.UNIT_STATS.catapult;
expect(catapult.renderScale === 2.25, `Catapult render scale must be 2.25× after the approved 25% reduction; got ${catapult.renderScale}.`);
expect(catapult.projectileSpeed === 180, `Catapult projectile speed must be 180px/s; got ${catapult.projectileSpeed}.`);
expect(CONFIG.BUILD_BUTTON_ICON_SCALE === 0.24, `Build-menu glyph scale must be 0.24; got ${CONFIG.BUILD_BUTTON_ICON_SCALE}.`);
expect(CONFIG.QUEUE_CHIP_WIDTH === 40 && CONFIG.QUEUE_CHIP_HEIGHT === 24, `Queue chips must be 40×24px; got ${CONFIG.QUEUE_CHIP_WIDTH}×${CONFIG.QUEUE_CHIP_HEIGHT}.`);
expect(CONFIG.CATAPULT_FORMATION_SLOT_SPACING_Y === 52, `Catapult formation file spacing must be 52px; got ${CONFIG.CATAPULT_FORMATION_SLOT_SPACING_Y}.`);

for (const team of ['player', 'ai']) {
  const world = createWorld(405);
  world.matchState = 'playing';
  const first = createUnit('catapult', team, 0, CONFIG.GROUND_Y);
  const second = createUnit('catapult', team, 0, CONFIG.GROUND_Y);
  const archer = createUnit('archer', team, 0, CONFIG.GROUND_Y);
  world.units.push(first, second, archer);
  updateFormationSlots(world);
  expect(Math.abs(first.slotY - second.slotY) === 52, `${team} Catapult files must be separated vertically by 52px; got ${Math.abs(first.slotY - second.slotY)}.`);
  expect(Math.abs(first.slotY - archer.slotY) === 0, `${team} first Catapult and Archer anchors must share the ground row; got ${JSON.stringify({ catapultY: first.slotY, archerY: archer.slotY })}.`);
}

const calls = [];
const ctx = {
  save() {}, restore() {}, translate() {}, scale() {},
  fillRect(...args) { calls.push(['fillRect', ...args]); },
  strokeRect(...args) { calls.push(['strokeRect', ...args]); },
  beginPath() {}, arc() {}, fill() {}, stroke() {},
  moveTo(...args) { calls.push(['moveTo', ...args]); },
  lineTo(...args) { calls.push(['lineTo', ...args]); },
};
drawStickFigure(ctx, { kind: 'catapult', team: 'player', facing: 1, x: 0, y: 0, state: 'idle', attackAnimTimer: 0 });
const armStart = calls.find((call) => call[0] === 'moveTo' && call[1] === 7 && call[2] === -20);
const armEnd = calls.find((call) => call[0] === 'lineTo' && call[1] === -18 && call[2] === -48);
const sling = calls.find((call) => call[0] === 'fillRect' && call[1] === -24 && call[2] === -51 && call[3] === 10 && call[4] === 7);
expect(armStart && armEnd && sling, `Catapult arm/sling must be flipped toward local negative X; got ${JSON.stringify(calls)}.`);

const canvas = { width: 1400, height: 540 };
const buildRow = getBuildButtonRowRect(canvas);
const queueRow = getQueueChipRowRect(canvas);
expect(queueRow.h === 24 && queueRow.y === buildRow.y - CONFIG.BOTTOM_BAR_ROW_GAP - 24, `Queue row must use 24px chips above the build row; got ${JSON.stringify({ buildRow, queueRow })}.`);
expect(getBottomBarTop(canvas) === queueRow.y, 'Bottom-bar top must stay aligned with the resized queue row.');

console.log('PASS — Catapult visual density, flipped arm, projectile travel, and compact build/queue presentation meet the approved contract.');
