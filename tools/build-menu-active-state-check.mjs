import { CONFIG } from '../src/config.js';
import { createWorld, createTurret } from '../src/sim/world.js';
import { buyStructure } from '../src/sim/systems/economy.js';
import { drawBuildMenu, getBuildMenuButtons, getBuildButtonDisabledReason, isBuildQueueItemActive } from '../src/render/ui.js';

const canvas = { width: CONFIG.VIEWPORT_WIDTH, height: CONFIG.CANVAS_HEIGHT };
const structureWorld = createWorld(41);
structureWorld.matchState = 'playing';
structureWorld.teams.player.gold = 10_000;
const structurePurchase = buyStructure(structureWorld, 'player');
if (!structurePurchase.ok) throw new Error(`Structure fixture failed: ${JSON.stringify(structurePurchase)}`);
const structureItem = structureWorld.teams.player.productionQueue[0];
structureItem.remaining = structureItem.total / 2;
const structureButton = getBuildMenuButtons(canvas).find((button) => button.action === 'structure');
if (!isBuildQueueItemActive(structureItem, structureButton)) throw new Error('Active structure queue item must match its Structure button even with a null queue kind.');

const rects = [];
const ctx = new Proxy({
  canvas,
  fillStyle: '',
  fillRect(x, y, w, h) { rects.push({ fillStyle: this.fillStyle, x, y, w, h }); },
}, {
  get(target, key) { return key in target ? target[key] : () => {}; },
  set(target, key, value) { target[key] = value; return true; },
});
drawBuildMenu(ctx, structureWorld);
const structureProgress = rects.find((rect) => rect.fillStyle === '#8fd1e0' && rect.x === structureButton.rect.x && rect.y === structureButton.rect.y + structureButton.rect.h - CONFIG.BUILD_PROGRESS_BAR_HEIGHT && rect.w === structureButton.rect.w / 2);
if (!structureProgress) throw new Error(`Structure button must show a half-complete progress bar: ${JSON.stringify(rects)}`);

const maxTurretWorld = createWorld(43);
maxTurretWorld.teams.player.gold = 10_000;
for (const offset of CONFIG.TURRET_SLOT_OFFSETS) maxTurretWorld.structures.push(createTurret('player', CONFIG.PLAYER_HOME_X + offset, CONFIG.GROUND_Y));
const turretButton = getBuildMenuButtons(canvas).find((button) => button.action === 'turret');
const turretReason = getBuildButtonDisabledReason(maxTurretWorld, turretButton);
if (turretReason !== 'maxTurrets') throw new Error(`Expected maxTurrets after three buildable turrets, got ${turretReason}.`);

console.log('PASS — structures render active progress and a maxed turret button has a defined status.');
