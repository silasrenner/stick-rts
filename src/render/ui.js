import { CONFIG } from '../config.js';
import { canAfford, getUnitCount } from '../sim/systems/economy.js';
import { getCap, livingStructures } from '../sim/systems/supply.js';

const BUILD_MENU_ITEMS = [
  { kind: 'miner', action: 'unit', label: 'Miner', cost: CONFIG.UNIT_STATS.miner.cost },
  { kind: 'warrior', action: 'unit', label: 'Warrior', cost: CONFIG.UNIT_STATS.warrior.cost },
  { kind: 'archer', action: 'unit', label: 'Archer', cost: CONFIG.UNIT_STATS.archer.cost },
  { kind: 'structure', action: 'structure', label: 'Structure', cost: CONFIG.STRUCTURE_COST },
];

const BUTTON_WIDTH = 130;
const BUTTON_HEIGHT = 26;
const BUTTON_GAP = 10;
const BUTTON_MARGIN_BOTTOM = 6;

export function getBuildMenuButtons(canvas) {
  const totalWidth = BUILD_MENU_ITEMS.length * BUTTON_WIDTH + (BUILD_MENU_ITEMS.length - 1) * BUTTON_GAP;
  const startX = (canvas.width - totalWidth) / 2;
  const y = canvas.height - BUTTON_HEIGHT - BUTTON_MARGIN_BOTTOM;

  return BUILD_MENU_ITEMS.map((item, i) => ({
    ...item,
    rect: { x: startX + i * (BUTTON_WIDTH + BUTTON_GAP), y, w: BUTTON_WIDTH, h: BUTTON_HEIGHT },
  }));
}

export function isBuildButtonEnabled(world, button) {
  if (!canAfford(world, 'player', button.cost)) return false;
  if (button.action === 'unit') return getUnitCount(world, 'player') < getCap(world, 'player');
  return livingStructures(world, 'player').length < CONFIG.MAX_STRUCTURES;
}

export function drawBuildMenu(ctx, world) {
  if (world.matchState !== 'playing') return; // clicks are inert once the match ends; don't imply otherwise

  for (const button of getBuildMenuButtons(ctx.canvas)) {
    const enabled = isBuildButtonEnabled(world, button);
    const { x, y, w, h } = button.rect;

    ctx.globalAlpha = enabled ? 1 : 0.4;
    ctx.fillStyle = '#2c2c33';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#55555f';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = '#e8e8ee';
    ctx.font = '11px monospace';
    ctx.fillText(`${button.label} (${button.cost}g)`, x + 6, y + 17);
    ctx.globalAlpha = 1;
  }
}

export function drawHUD(ctx, world, uiMessage) {
  const gold = world.teams.player.gold;
  const cap = getCap(world, 'player');
  const count = getUnitCount(world, 'player');
  const command = world.teams.player.command;

  ctx.fillStyle = '#e8e8ee';
  ctx.font = '13px monospace';
  ctx.fillText(`Gold: ${gold}`, 10, 16);
  ctx.fillText(`Units: ${count}/${cap}`, 10, 32);
  ctx.fillText(`Command: ${command[0].toUpperCase()}${command.slice(1)}`, 10, 48);

  if (uiMessage && uiMessage.text) {
    ctx.fillStyle = '#e0a030';
    ctx.fillText(uiMessage.text, 10, 64);
  }
}

export function getRematchButtonRect(canvas) {
  return { x: canvas.width / 2 - 60, y: canvas.height / 2 + 20, w: 120, h: 30 };
}

export function drawWinLoseOverlay(ctx, world) {
  if (world.matchState === 'playing') return;

  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  ctx.textAlign = 'center';
  ctx.fillStyle = world.matchState === 'won' ? '#4caf50' : '#e03030';
  ctx.font = 'bold 32px monospace';
  ctx.fillText(world.matchState === 'won' ? 'Victory!' : 'Defeat', ctx.canvas.width / 2, ctx.canvas.height / 2 - 20);

  const rect = getRematchButtonRect(ctx.canvas);
  ctx.fillStyle = '#2c2c33';
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.strokeStyle = '#e8e8ee';
  ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  ctx.fillStyle = '#e8e8ee';
  ctx.font = '14px monospace';
  ctx.fillText('Rematch', rect.x + rect.w / 2, rect.y + rect.h / 2 + 5);

  ctx.restore();
}
