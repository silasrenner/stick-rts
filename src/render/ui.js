import { CONFIG } from '../config.js';
import { canAfford, getUnitCount, hasLivingOrQueuedHero, getHeroCost, countQueued } from '../sim/systems/economy.js';
import { getCap, livingStructures } from '../sim/systems/supply.js';
import { isAliveEntity, isWatchAiMatch } from '../sim/world.js';

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
const BUTTON_HEIGHT = 30;
const BUTTON_GAP = 8;
const BUTTON_MARGIN_BOTTOM = 6;

// Single source of truth for why a purchase failed — used both for the
// persistent disabled-reason label under each build-menu button and for
// main.js's showMessage() feedback after an actual failed click.
export const PURCHASE_REASON_TEXT = {
  gold: 'Not enough gold',
  cap: 'Population cap reached',
  maxStructures: 'Max structures built',
  heroAlive: 'Hero already deployed',
  heroCooldown: 'Hero respawning...',
};

export function getBuildMenuButtons(canvas) {
  const totalWidth = BUILD_MENU_ITEMS.length * BUTTON_WIDTH + (BUILD_MENU_ITEMS.length - 1) * BUTTON_GAP;
  const startX = (canvas.width - totalWidth) / 2;
  const y = canvas.height - BUTTON_HEIGHT - BUTTON_MARGIN_BOTTOM;

  return BUILD_MENU_ITEMS.map((item, i) => ({
    ...item,
    rect: { x: startX + i * (BUTTON_WIDTH + BUTTON_GAP), y, w: BUTTON_WIDTH, h: BUTTON_HEIGHT },
  }));
}

// Mirrors the exact reason precedence economy.js's buyUnit/buyStructure/
// buyHero check in, so this persistent label always agrees with what a
// failed click would report via PURCHASE_REASON_TEXT. Returns null when
// the purchase would succeed.
export function getBuildButtonDisabledReason(world, button) {
  const cost = button.costFn(world);

  if (button.action === 'unit') {
    if (!canAfford(world, 'player', cost)) return 'gold';
    if (getUnitCount(world, 'player') + countQueued(world, 'player', 'unit') >= getCap(world, 'player')) return 'cap';
    return null;
  }
  if (button.action === 'structure') {
    if (livingStructures(world, 'player').length + countQueued(world, 'player', 'structure') >= CONFIG.MAX_STRUCTURES) {
      return 'maxStructures';
    }
    if (!canAfford(world, 'player', cost)) return 'gold';
    return null;
  }
  // hero
  if (hasLivingOrQueuedHero(world, 'player')) return 'heroAlive';
  if (world.teams.player.heroCooldownTimer > 0) return 'heroCooldown';
  if (!canAfford(world, 'player', cost)) return 'gold';
  return null;
}

export function drawBuildMenu(ctx, world) {
  // Clicks are inert once the match ends; don't imply otherwise. Also
  // hidden during Watch AI — neither side is player-controlled, so a build
  // menu that always affects 'player' would be misleading and clickable.
  if (world.matchState !== 'playing' || isWatchAiMatch(world)) return;

  for (const button of getBuildMenuButtons(ctx.canvas)) {
    const reason = getBuildButtonDisabledReason(world, button);
    const cost = button.costFn(world);
    const { x, y, w, h } = button.rect;

    ctx.globalAlpha = reason ? 0.55 : 1;
    ctx.fillStyle = button.action === 'hero' ? '#3a3320' : '#2c2c33';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = reason ? '#7a3a3a' : '#55555f';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = '#e8e8ee';
    ctx.font = '10px monospace';
    ctx.fillText(`${button.label} (${cost}g)`, x + 5, y + 13);

    if (reason) {
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#e0704a';
      ctx.font = '7px monospace';
      ctx.fillText(PURCHASE_REASON_TEXT[reason], x + 5, y + 24);
    }
    ctx.globalAlpha = 1;
  }
}

// Own-team-only living-unit counts by kind — never reads the enemy team.
// Doubles as the production-queue panel's context (the queue's items are
// what's about to add to these counts).
function getArmyComposition(world, team) {
  const counts = { miner: 0, warrior: 0, archer: 0 };
  for (const unit of world.units) {
    if (unit.team !== team || unit.isHero || !isAliveEntity(unit)) continue;
    if (counts[unit.kind] !== undefined) counts[unit.kind] += 1;
  }
  return counts;
}

function getQueueItemLabel(item) {
  if (item.action === 'structure') return 'Structure';
  return BUILD_MENU_ITEMS.find((b) => b.kind === item.kind)?.label ?? item.kind;
}

export function drawHUD(ctx, world, uiMessage) {
  const gold = world.teams.player.gold;
  const cap = getCap(world, 'player');
  const count = getUnitCount(world, 'player');
  const command = world.teams.player.command;
  const heroCooldown = world.teams.player.heroCooldownTimer;
  const composition = getArmyComposition(world, 'player');
  const queue = world.teams.player.productionQueue;

  const lineHeight = 16;
  let panelLines = 4; // gold, units, command, army composition
  if (queue.length > 0) panelLines += 1;
  if (queue.length > 1) panelLines += 1;
  if (heroCooldown > 0) panelLines += 1;
  if (uiMessage && uiMessage.text) panelLines += 1;

  // Contrast backdrop for the HUD text stack — previously plain text
  // directly on the battlefield, which washed out against light terrain.
  ctx.fillStyle = 'rgba(20, 20, 26, 0.6)';
  ctx.fillRect(4, 4, 260, 8 + panelLines * lineHeight);

  let y = 16;
  ctx.fillStyle = '#e8e8ee';
  ctx.font = '13px monospace';
  ctx.fillText(`Gold: ${gold}`, 10, y);
  y += lineHeight;
  ctx.fillText(`Units: ${count}/${cap}`, 10, y);
  y += lineHeight;
  ctx.fillText(`Command: ${command[0].toUpperCase()}${command.slice(1)}`, 10, y);
  y += lineHeight;
  ctx.fillText(`Miners: ${composition.miner}  Warriors: ${composition.warrior}  Archers: ${composition.archer}`, 10, y);
  y += lineHeight;

  if (queue.length > 0) {
    ctx.fillStyle = '#8fd1e0';
    ctx.fillText(`Building: ${getQueueItemLabel(queue[0])} (${Math.max(0, queue[0].remaining).toFixed(1)}s)`, 10, y);
    ctx.fillStyle = '#e8e8ee';
    y += lineHeight;
  }
  if (queue.length > 1) {
    ctx.fillStyle = '#8a8a96';
    ctx.fillText(`Queued: ${queue.slice(1).map(getQueueItemLabel).join(', ')}`, 10, y);
    ctx.fillStyle = '#e8e8ee';
    y += lineHeight;
  }

  if (heroCooldown > 0) {
    ctx.fillStyle = '#e0a030';
    ctx.fillText(`Hero respawns in ${Math.ceil(heroCooldown)}s`, 10, y);
    y += lineHeight;
  }

  if (uiMessage && uiMessage.text) {
    ctx.fillStyle = '#e0a030';
    ctx.fillText(uiMessage.text, 10, y);
    y += lineHeight;
  }

  // The brief's one allowed off-screen signal: retriggered on every hit to
  // the player's statue (see combat.js applyDamage), independent of camera
  // culling and of the uiMessage slot above (build-menu feedback).
  if (world.matchState === 'playing' && world.teams.player.statueWarningTimer > 0) {
    const pulse = 0.6 + 0.4 * Math.sin(world.matchElapsedTime * 10);
    ctx.save();
    ctx.textAlign = 'center';
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#e03030';
    ctx.font = 'bold 15px monospace';
    ctx.fillText('Your statue is under attack!', ctx.canvas.width / 2, 24);
    ctx.restore();
  }
}

export function getRematchButtonRect(canvas) {
  return { x: canvas.width / 2 - 60, y: canvas.height / 2 + 20, w: 120, h: 30 };
}

const DIFFICULTY_ORDER = ['easy', 'medium', 'hard'];
const DIFFICULTY_BUTTON_WIDTH = 90;
const DIFFICULTY_BUTTON_HEIGHT = 24;
const DIFFICULTY_BUTTON_GAP = 10;

// Row of 3 difficulty buttons centered on canvas at a given y — shared
// layout math for the win/lose overlay and every S9 menu screen that picks
// a difficulty (Play, Settings' default, Watch AI's two side pickers).
function difficultyButtonRectsAt(canvas, y) {
  const totalWidth =
    DIFFICULTY_ORDER.length * DIFFICULTY_BUTTON_WIDTH + (DIFFICULTY_ORDER.length - 1) * DIFFICULTY_BUTTON_GAP;
  const startX = canvas.width / 2 - totalWidth / 2;

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

// Below the Rematch button — clicking one resets the match at that
// difficulty, fulfilling the brief's "win/lose screen offers rematch and
// difficulty change."
export function getDifficultyButtonRects(canvas) {
  return difficultyButtonRectsAt(canvas, canvas.height / 2 + 64);
}

// Shared draw for any row of difficulty-button rects — highlights
// `activeDifficulty` if it matches one of the rendered buttons.
function drawDifficultyButtons(ctx, rects, activeDifficulty) {
  for (const { difficulty, rect } of rects) {
    const active = difficulty === activeDifficulty;
    ctx.fillStyle = active ? '#3a4d3a' : '#2c2c33';
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.strokeStyle = active ? '#4caf50' : '#55555f';
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
    ctx.fillStyle = '#e8e8ee';
    ctx.font = '12px monospace';
    ctx.fillText(difficulty[0].toUpperCase() + difficulty.slice(1), rect.x + rect.w / 2, rect.y + rect.h / 2 + 4);
  }
}

function drawMenuButton(ctx, rect, label, active = false) {
  ctx.fillStyle = active ? '#3a4d3a' : '#2c2c33';
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.strokeStyle = active ? '#4caf50' : '#55555f';
  ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  ctx.fillStyle = '#e8e8ee';
  ctx.font = '14px monospace';
  ctx.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2 + 5);
}

export function getBackButtonRect(canvas) {
  return { x: 20, y: 20, w: 80, h: 28 };
}

function drawBackButton(ctx) {
  drawMenuButton(ctx, getBackButtonRect(ctx.canvas), '< Back');
}

export function getBackToMenuButtonRect(canvas) {
  return { x: canvas.width / 2 - 70, y: canvas.height / 2 + 20, w: 140, h: 30 };
}

export function drawWinLoseOverlay(ctx, world) {
  if (world.matchState !== 'won' && world.matchState !== 'lost') return;

  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  ctx.textAlign = 'center';
  ctx.fillStyle = world.matchState === 'won' ? '#4caf50' : '#e03030';
  ctx.font = 'bold 32px monospace';
  ctx.fillText(world.matchState === 'won' ? 'Victory!' : 'Defeat', ctx.canvas.width / 2, ctx.canvas.height / 2 - 20);

  if (isWatchAiMatch(world)) {
    drawMenuButton(ctx, getBackToMenuButtonRect(ctx.canvas), 'Back to Menu');
    ctx.restore();
    return;
  }

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

  drawDifficultyButtons(ctx, getDifficultyButtonRects(ctx.canvas), world.teams.ai.difficulty);

  ctx.restore();
}

// ---------------------------------------------------------------------
// S9 landing menu — matchState 'menu'. uiState is main.js's own
// (non-world) persistent UI state: { menuScreen, settings, watchSetup }.
// ---------------------------------------------------------------------

const MENU_BUTTON_WIDTH = 200;
const MENU_BUTTON_HEIGHT = 40;
const MENU_BUTTON_GAP = 16;
const MENU_ITEMS = [
  { id: 'play', label: 'Play' },
  { id: 'watchAi', label: 'Watch AI' },
  { id: 'settings', label: 'Settings' },
];

export function getMainMenuButtonRects(canvas) {
  const totalHeight = MENU_ITEMS.length * MENU_BUTTON_HEIGHT + (MENU_ITEMS.length - 1) * MENU_BUTTON_GAP;
  const startY = canvas.height / 2 - totalHeight / 2 + 20;
  const x = canvas.width / 2 - MENU_BUTTON_WIDTH / 2;
  return MENU_ITEMS.map((item, i) => ({
    ...item,
    rect: { x, y: startY + i * (MENU_BUTTON_HEIGHT + MENU_BUTTON_GAP), w: MENU_BUTTON_WIDTH, h: MENU_BUTTON_HEIGHT },
  }));
}

function drawMainMenu(ctx) {
  ctx.textAlign = 'center';
  ctx.fillStyle = '#e8e8ee';
  ctx.font = 'bold 40px monospace';
  ctx.fillText('STICK RTS', ctx.canvas.width / 2, ctx.canvas.height / 2 - 100);

  for (const { label, rect } of getMainMenuButtonRects(ctx.canvas)) {
    drawMenuButton(ctx, rect, label);
  }
}

export function getPlayDifficultyRects(canvas) {
  return { difficulty: difficultyButtonRectsAt(canvas, canvas.height / 2), back: getBackButtonRect(canvas) };
}

function drawPlayDifficultyScreen(ctx) {
  ctx.textAlign = 'center';
  ctx.fillStyle = '#e8e8ee';
  ctx.font = 'bold 22px monospace';
  ctx.fillText('Select Difficulty', ctx.canvas.width / 2, ctx.canvas.height / 2 - 40);

  const rects = getPlayDifficultyRects(ctx.canvas);
  drawDifficultyButtons(ctx, rects.difficulty, null);
  drawMenuButton(ctx, rects.back, '< Back');
}

const WATCH_ROW_LABEL_OFFSET = 24;

export function getWatchSetupRects(canvas) {
  return {
    playerDifficulty: difficultyButtonRectsAt(canvas, 140),
    aiDifficulty: difficultyButtonRectsAt(canvas, 220),
    reroll: { x: canvas.width / 2 - 60, y: 280, w: 120, h: 28 },
    start: { x: canvas.width / 2 - 60, y: 330, w: 120, h: 34 },
    back: getBackButtonRect(canvas),
  };
}

function drawWatchAiSetupScreen(ctx, uiState) {
  const { playerDifficulty, aiDifficulty, seed } = uiState.watchSetup;
  const rects = getWatchSetupRects(ctx.canvas);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#e8e8ee';
  ctx.font = 'bold 20px monospace';
  ctx.fillText('Watch AI', ctx.canvas.width / 2, 80);

  ctx.font = '12px monospace';
  ctx.fillStyle = '#8a8a96';
  ctx.fillText('Left side', ctx.canvas.width / 2, 140 - WATCH_ROW_LABEL_OFFSET);
  drawDifficultyButtons(ctx, rects.playerDifficulty, playerDifficulty);

  ctx.fillStyle = '#8a8a96';
  ctx.fillText('Right side', ctx.canvas.width / 2, 220 - WATCH_ROW_LABEL_OFFSET);
  drawDifficultyButtons(ctx, rects.aiDifficulty, aiDifficulty);

  ctx.fillStyle = '#8a8a96';
  ctx.fillText(`Seed: ${seed ?? 'Random'}`, ctx.canvas.width / 2, 270);
  drawMenuButton(ctx, rects.reroll, 'Reroll Seed');
  drawMenuButton(ctx, rects.start, 'Start');
  drawMenuButton(ctx, rects.back, '< Back');
}

export function getSettingsRects(canvas) {
  return {
    fpsToggle: { x: canvas.width / 2 - 50, y: 140, w: 100, h: 28 },
    defaultDifficulty: difficultyButtonRectsAt(canvas, 220),
    back: getBackButtonRect(canvas),
  };
}

function drawSettingsScreen(ctx, uiState) {
  const rects = getSettingsRects(ctx.canvas);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#e8e8ee';
  ctx.font = 'bold 20px monospace';
  ctx.fillText('Settings', ctx.canvas.width / 2, 80);

  ctx.font = '12px monospace';
  ctx.fillStyle = '#8a8a96';
  ctx.fillText('FPS Overlay', ctx.canvas.width / 2, 116);
  drawMenuButton(ctx, rects.fpsToggle, uiState.settings.fpsVisible ? 'On' : 'Off', uiState.settings.fpsVisible);

  ctx.fillStyle = '#8a8a96';
  ctx.fillText('Default Difficulty', ctx.canvas.width / 2, 196);
  drawDifficultyButtons(ctx, rects.defaultDifficulty, uiState.settings.defaultDifficulty);

  drawMenuButton(ctx, rects.back, '< Back');
}

export function drawMenuScreen(ctx, uiState) {
  ctx.save();
  switch (uiState.menuScreen) {
    case 'playDifficulty':
      drawPlayDifficultyScreen(ctx);
      break;
    case 'watchSetup':
      drawWatchAiSetupScreen(ctx, uiState);
      break;
    case 'settings':
      drawSettingsScreen(ctx, uiState);
      break;
    default:
      drawMainMenu(ctx);
  }
  ctx.restore();
}
