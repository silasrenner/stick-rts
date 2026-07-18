import { CONFIG } from '../config.js';
import { canAfford, getUnitCount, hasLivingHero, getHeroCost } from '../sim/systems/economy.js';
import { getCap, livingStructures } from '../sim/systems/supply.js';

const BUILD_MENU_ITEMS = [
  { kind: 'miner', action: 'unit', label: 'Miner', costFn: () => CONFIG.UNIT_STATS.miner.cost },
  { kind: 'warrior', action: 'unit', label: 'Warrior', costFn: () => CONFIG.UNIT_STATS.warrior.cost },
  { kind: 'archer', action: 'unit', label: 'Archer', costFn: () => CONFIG.UNIT_STATS.archer.cost },
  { kind: 'structure', action: 'structure', label: 'Structure', costFn: () => CONFIG.STRUCTURE_COST },
  { kind: 'forgemaster', action: 'hero', label: 'Forgemaster', costFn: (world) => getHeroCost(world, 'player') },
  { kind: 'hawkeye', action: 'hero', label: 'Hawkeye', costFn: (world) => getHeroCost(world, 'player') },
  { kind: 'vanguard', action: 'hero', label: 'Vanguard', costFn: (world) => getHeroCost(world, 'player') },
];

const BUTTON_WIDTH = 120;
const BUTTON_HEIGHT = 26;
const BUTTON_GAP = 8;
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
  const cost = button.costFn(world);
  if (!canAfford(world, 'player', cost)) return false;
  if (button.action === 'unit') return getUnitCount(world, 'player') < getCap(world, 'player');
  if (button.action === 'structure') return livingStructures(world, 'player').length < CONFIG.MAX_STRUCTURES;
  // hero
  return !hasLivingHero(world, 'player') && world.teams.player.heroCooldownTimer <= 0;
}

export function drawBuildMenu(ctx, world) {
  if (world.matchState !== 'playing') return; // clicks are inert once the match ends; don't imply otherwise

  for (const button of getBuildMenuButtons(ctx.canvas)) {
    const enabled = isBuildButtonEnabled(world, button);
    const cost = button.costFn(world);
    const { x, y, w, h } = button.rect;

    ctx.globalAlpha = enabled ? 1 : 0.4;
    ctx.fillStyle = button.action === 'hero' ? '#3a3320' : '#2c2c33';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#55555f';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = '#e8e8ee';
    ctx.font = '10px monospace';
    ctx.fillText(`${button.label} (${cost}g)`, x + 5, y + 17);
    ctx.globalAlpha = 1;
  }
}

export function drawHUD(ctx, world, uiMessage) {
  const gold = world.teams.player.gold;
  const cap = getCap(world, 'player');
  const count = getUnitCount(world, 'player');
  const command = world.teams.player.command;
  const heroCooldown = world.teams.player.heroCooldownTimer;

  ctx.fillStyle = '#e8e8ee';
  ctx.font = '13px monospace';
  ctx.fillText(`Gold: ${gold}`, 10, 16);
  ctx.fillText(`Units: ${count}/${cap}`, 10, 32);
  ctx.fillText(`Command: ${command[0].toUpperCase()}${command.slice(1)}`, 10, 48);

  if (heroCooldown > 0) {
    ctx.fillStyle = '#e0a030';
    ctx.fillText(`Hero respawns in ${Math.ceil(heroCooldown)}s`, 10, 64);
  }

  if (uiMessage && uiMessage.text) {
    ctx.fillStyle = '#e0a030';
    ctx.fillText(uiMessage.text, 10, 80);
  }
}

export function getRematchButtonRect(canvas) {
  return { x: canvas.width / 2 - 60, y: canvas.height / 2 + 20, w: 120, h: 30 };
}

const DIFFICULTY_ORDER = ['easy', 'medium', 'hard'];
const DIFFICULTY_BUTTON_WIDTH = 90;
const DIFFICULTY_BUTTON_HEIGHT = 24;
const DIFFICULTY_BUTTON_GAP = 10;

// Below the Rematch button — clicking one resets the match at that
// difficulty, fulfilling the brief's "win/lose screen offers rematch and
// difficulty change."
export function getDifficultyButtonRects(canvas) {
  const totalWidth =
    DIFFICULTY_ORDER.length * DIFFICULTY_BUTTON_WIDTH + (DIFFICULTY_ORDER.length - 1) * DIFFICULTY_BUTTON_GAP;
  const startX = canvas.width / 2 - totalWidth / 2;
  const y = canvas.height / 2 + 64;

  return DIFFICULTY_ORDER.map((difficulty, i) => ({
    difficulty,
    rect: {
      x: startX + i * (DIFFICULTY_BUTTON_WIDTH + DIFFICULTY_BUTTON_GAP),
      y,
      w: DIFFICULTY_BUTTON_WIDTH,
      h: DIFFICULTY_BUTTON_HEIGHT,
    },
  }));
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

  ctx.font = '11px monospace';
  ctx.fillStyle = '#8a8a96';
  ctx.fillText('Difficulty', ctx.canvas.width / 2, ctx.canvas.height / 2 + 58);

  const activeDifficulty = world.teams.ai.difficulty;
  for (const { difficulty, rect: btnRect } of getDifficultyButtonRects(ctx.canvas)) {
    const active = difficulty === activeDifficulty;
    ctx.fillStyle = active ? '#3a4d3a' : '#2c2c33';
    ctx.fillRect(btnRect.x, btnRect.y, btnRect.w, btnRect.h);
    ctx.strokeStyle = active ? '#4caf50' : '#55555f';
    ctx.strokeRect(btnRect.x, btnRect.y, btnRect.w, btnRect.h);
    ctx.fillStyle = '#e8e8ee';
    ctx.font = '12px monospace';
    ctx.fillText(
      difficulty[0].toUpperCase() + difficulty.slice(1),
      btnRect.x + btnRect.w / 2,
      btnRect.y + btnRect.h / 2 + 4
    );
  }

  ctx.restore();
}
