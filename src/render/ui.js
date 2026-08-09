import { CONFIG } from '../config.js';
import { canAfford, getUnitCount, hasLivingOrQueuedHero, getHeroCost, countQueued } from '../sim/systems/economy.js';
import { getCap, livingStructures, livingTurrets } from '../sim/systems/supply.js';
import { isAliveEntity, isWatchAiMatch } from '../sim/world.js';
import { drawStickFigure, TEAM_COLORS } from './stickFigure.js';
import { formatMatchClock, getGoldDifferential } from './matchTelemetry.js';
import { getTeamHudLayout } from './teamHud.js';

const BUILD_MENU_ITEMS = [
  { kind: 'miner', action: 'unit', label: 'Miner', costFn: () => CONFIG.UNIT_STATS.miner.cost },
  { kind: 'warrior', action: 'unit', label: 'Warrior', costFn: () => CONFIG.UNIT_STATS.warrior.cost },
  { kind: 'archer', action: 'unit', label: 'Archer', costFn: () => CONFIG.UNIT_STATS.archer.cost },
  { kind: 'structure', action: 'structure', label: 'Structure', costFn: () => CONFIG.STRUCTURE_COST },
  { kind: 'forgemaster', action: 'hero', label: 'Forgemaster', costFn: (world) => getHeroCost(world, 'player') },
  { kind: 'hawkeye', action: 'hero', label: 'Hawkeye', costFn: (world) => getHeroCost(world, 'player') },
  { kind: 'vanguard', action: 'hero', label: 'Vanguard', costFn: (world) => getHeroCost(world, 'player') },
];

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

// Button-local state labels must fit beside the glyph at the smallest useful
// type size. The full reason remains available through PURCHASE_REASON_TEXT
// for click feedback; these are the compact, persistent status labels.
const BUTTON_REASON_TEXT = {
  gold: 'Need more gold',
  cap: 'Population full',
  maxStructures: 'Structures full',
  heroAlive: 'Hero deployed',
  heroCooldown: 'Hero respawning',
};

// unit.x/unit.y is normally a world position; here we treat (x, feetY) as
// an icon-space anchor (the glyph's feet) and rely on drawStickFigure's own
// geometry (stickFigure.js) — an outer translate+scale shrinks it to icon
// size without needing a scale param on drawStickFigure itself.
function drawUnitGlyph(ctx, x, feetY, kind, { isHero = false, scale = CONFIG.HUD_GLYPH_SCALE } = {}) {
  ctx.save();
  ctx.translate(x, feetY);
  ctx.scale(scale, scale);
  drawStickFigure(ctx, {
    x: 0,
    y: 0,
    facing: 1,
    kind,
    team: 'player',
    isHero,
    state: 'idle',
    animPhase: 0,
    attackAnimTimer: 0,
    controlled: false,
    deathTimer: 0,
  });
  ctx.restore();
}

// 'structure' isn't a unit kind (no entry in stickFigure.js's KIND_COLORS),
// so it gets its own tiny icon rather than a drawStickFigure reuse — a
// direct reuse of structures.js's drawStructure would also draw a health
// bar we don't want at icon scale.
function drawStructureGlyph(ctx, x, feetY, size = 14) {
  ctx.save();
  ctx.fillStyle = '#2c2c33';
  ctx.strokeStyle = TEAM_COLORS.player;
  ctx.lineWidth = 1.5;
  ctx.fillRect(x - size / 2, feetY - size, size, size);
  ctx.strokeRect(x - size / 2, feetY - size, size, size);
  ctx.restore();
}

function drawKindGlyph(ctx, x, feetY, button) {
  if (button.action === 'structure') drawStructureGlyph(ctx, x, feetY);
  else drawUnitGlyph(ctx, x, feetY, button.kind, { isHero: button.action === 'hero', scale: CONFIG.BUILD_BUTTON_ICON_SCALE });
}

function getBuildButtonRowWidth() {
  const { BUILD_BUTTON_WIDTH: w, BUILD_BUTTON_GAP: gap } = CONFIG;
  return BUILD_MENU_ITEMS.length * w + (BUILD_MENU_ITEMS.length - 1) * gap;
}

export function getBuildButtonRowRect(canvas) {
  return { y: canvas.height - CONFIG.BUILD_BUTTON_HEIGHT - CONFIG.BUILD_BUTTON_MARGIN_BOTTOM, h: CONFIG.BUILD_BUTTON_HEIGHT };
}

// Directly above the build-button row — the two rows together are the
// "one bottom bar (build + queue)" from PLAN.md §5.
export function getQueueChipRowRect(canvas) {
  const buildRow = getBuildButtonRowRect(canvas);
  return { y: buildRow.y - CONFIG.BOTTOM_BAR_ROW_GAP - CONFIG.QUEUE_CHIP_HEIGHT, h: CONFIG.QUEUE_CHIP_HEIGHT };
}

// Top edge of the whole consolidated bottom bar — renderer.js's legend
// anchors above this so the two never collide regardless of tuning changes
// to either bar's height.
export function getBottomBarTop(canvas) {
  return getQueueChipRowRect(canvas).y;
}

// Screen-space zoom controls are intentionally large enough to remain
// discoverable on phones; pinch remains available as the direct gesture.
export function getZoomButtonRects(canvas, spectator = false) {
  const size = spectator ? 24 : 34;
  const gap = spectator ? 4 : 6;
  const x = canvas.width - size - 8;
  const y = spectator ? canvas.height - size * 2 - gap - 8 : 10;
  return {
    in: { x, y, w: size, h: size },
    out: { x, y: y + size + gap, w: size, h: size },
  };
}

export function drawZoomControls(ctx, spectator = false) {
  const rects = getZoomButtonRects(ctx.canvas, spectator);
  for (const [action, rect] of Object.entries(rects)) {
    ctx.fillStyle = '#24242c';
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.strokeStyle = '#777783';
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
    ctx.fillStyle = '#f0f0f4';
    ctx.font = `bold ${spectator ? 18 : 24}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(action === 'in' ? '+' : '−', rect.x + rect.w / 2, rect.y + rect.h * 0.75);
  }
  ctx.textAlign = 'left';
}

export function getWatchSpeedButtonRect(canvas) {
  return { x: 8, y: canvas.height - 30, w: 50, h: 22 };
}

export function drawWatchSpeedButton(ctx, speed) {
  const rect = getWatchSpeedButtonRect(ctx.canvas);
  ctx.fillStyle = '#24242c'; ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.strokeStyle = '#88889a'; ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  ctx.fillStyle = '#f0f0f4'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(`${speed}×`, rect.x + rect.w / 2, rect.y + 15);
  ctx.textAlign = 'left';
}

export function getTouchCommandRects(canvas, world) {
  const army = [
    { action: 'attack', label: 'ATTACK', rect: { x: canvas.width - 160, y: 10, w: 112, h: 36 } },
    { action: 'defend', label: 'DEFEND', rect: { x: canvas.width - 160, y: 52, w: 112, h: 36 } },
    { action: 'retreat', label: 'RETREAT', rect: { x: canvas.width - 160, y: 94, w: 112, h: 36 } },
  ];
  const hero = world.units.find((u) => u.team === 'player' && u.isHero && u.state !== 'dying');
  if (!hero) return { army, hero: [] };
  const y = getBottomBarTop(canvas) - 52;
  const startX = canvas.width - 330;
  return { army, hero: [
    { action: 'heroControl', label: hero.controlled ? 'AUTO' : 'CONTROL', rect: { x: startX, y, w: 74, h: 42 }, enabled: true },
    { action: 'heroLeft', label: '◀', rect: { x: startX + 80, y, w: 48, h: 42 }, enabled: hero.controlled },
    { action: 'heroAttack', label: 'ATK', rect: { x: startX + 134, y, w: 58, h: 42 }, enabled: hero.controlled && hero.attackTimer <= 0 },
    { action: 'heroSpecial', label: 'SKILL', rect: { x: startX + 198, y, w: 70, h: 42 }, enabled: hero.controlled && hero.specialTimer <= 0 },
    { action: 'heroRight', label: '▶', rect: { x: startX + 274, y, w: 48, h: 42 }, enabled: hero.controlled },
  ] };
}

export function drawTouchCommandControls(ctx, world) {
  const controls = getTouchCommandRects(ctx.canvas, world);
  for (const control of [...controls.army, ...controls.hero]) {
    const enabled = control.enabled !== false;
    ctx.fillStyle = enabled ? '#24242c' : '#17171c';
    ctx.strokeStyle = enabled ? '#88889a' : '#3e3e48';
    ctx.fillRect(control.rect.x, control.rect.y, control.rect.w, control.rect.h);
    ctx.strokeRect(control.rect.x, control.rect.y, control.rect.w, control.rect.h);
    ctx.fillStyle = enabled ? '#f0f0f4' : '#777783';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(control.label, control.rect.x + control.rect.w / 2, control.rect.y + 25);
  }
  ctx.textAlign = 'left';
}

export function getBuildMenuButtons(canvas) {
  const { BUILD_BUTTON_WIDTH: w, BUILD_BUTTON_GAP: gap } = CONFIG;
  const totalWidth = getBuildButtonRowWidth();
  const startX = (canvas.width - totalWidth) / 2;
  const { y, h } = getBuildButtonRowRect(canvas);

  return BUILD_MENU_ITEMS.map((item, i) => ({
    ...item,
    rect: { x: startX + i * (w + gap), y, w, h },
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

// Groups consecutive identical (action, kind) queue entries into stacked
// chips — e.g. [warrior,warrior,archer] -> [{warrior,count:2},{archer,count:1}].
// Consecutive (not global) grouping preserves the queue's actual build order.
function groupQueueChips(queue) {
  const chips = [];
  for (const item of queue) {
    const last = chips[chips.length - 1];
    if (last && last.action === item.action && last.kind === item.kind) last.count += 1;
    else chips.push({ action: item.action, kind: item.kind, count: 1 });
  }
  return chips;
}

function drawQueueChip(ctx, x, y, w, h, chip) {
  ctx.fillStyle = '#2c2c33'; // solid — see drawBuildMenu's note on avoiding bleed-through at high zoom
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#55555f';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, h);

  // Reserve the chip's right edge for a two-digit stacked count. Centering
  // the glyph caused its right arm to collide with ×80 at queue stress size.
  drawKindGlyph(ctx, x + 10, y + h - 7, { action: chip.action, kind: chip.kind });

  ctx.textAlign = 'right';
  ctx.fillStyle = '#e8e8ee';
  ctx.font = '10px monospace';
  ctx.fillText(`×${chip.count}`, x + w - 4, y + h - 4);
  ctx.textAlign = 'left';
}

// Bounded overflow indicator — this is what makes the row's width bounded
// regardless of queue length, instead of the S10 bug's unbounded text line.
function drawQueueOverflowChip(ctx, x, y, w, h, remaining) {
  ctx.fillStyle = '#2c2c33'; // solid — see drawBuildMenu's note on avoiding bleed-through at high zoom
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#55555f';
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = '#8a8a96';
  ctx.font = '9px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`+${remaining}`, x + w / 2, y + h / 2 - 1);
  ctx.fillText('more', x + w / 2, y + h / 2 + 10);
  ctx.textAlign = 'left';
}

function drawQueueChipRow(ctx, queuedItems) {
  const chips = groupQueueChips(queuedItems);
  if (chips.length === 0) return;

  const canvas = ctx.canvas;
  const { y, h } = getQueueChipRowRect(canvas);
  const { QUEUE_CHIP_WIDTH: chipW, QUEUE_CHIP_GAP: gap } = CONFIG;
  const rowWidth = getBuildButtonRowWidth();
  const startX = (canvas.width - rowWidth) / 2;
  const maxSlots = Math.max(1, Math.floor((rowWidth + gap) / (chipW + gap)));

  const overflow = chips.length > maxSlots;
  const visibleCount = overflow ? maxSlots - 1 : chips.length;

  for (let i = 0; i < visibleCount; i++) {
    drawQueueChip(ctx, startX + i * (chipW + gap), y, chipW, h, chips[i]);
  }
  if (overflow) {
    const remaining = chips.slice(visibleCount).reduce((sum, c) => sum + c.count, 0);
    drawQueueOverflowChip(ctx, startX + visibleCount * (chipW + gap), y, chipW, h, remaining);
  }
}

export function drawBuildMenu(ctx, world) {
  // Clicks are inert once the match ends; don't imply otherwise. Also
  // hidden during Watch AI — neither side is player-controlled, so a build
  // menu that always affects 'player' would be misleading and clickable.
  if (world.matchState !== 'playing' || isWatchAiMatch(world)) return;

  const queue = world.teams.player.productionQueue;
  drawQueueChipRow(ctx, queue.slice(1));

  const activeItem = queue[0] ?? null;

  for (const button of getBuildMenuButtons(ctx.canvas)) {
    const reason = getBuildButtonDisabledReason(world, button);
    const cost = button.costFn(world);
    const { x, y, w, h } = button.rect;
    const isActive = activeItem && activeItem.action === button.action && activeItem.kind === button.kind;

    // Solid fills throughout (never ctx.globalAlpha) — at CAMERA_ZOOM_MAX
    // world content can reach into the footer band (pre-existing S10
    // camera/ground-plane geometry, out of S11's scope), and a translucent
    // disabled-button background let it bleed through. "Disabled" reads via
    // color choice instead: muted fill/border/label, not transparency.
    ctx.fillStyle = reason ? '#232328' : button.action === 'hero' ? '#3a3320' : '#2c2c33';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = reason ? '#7a3a3a' : '#55555f';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);

    drawKindGlyph(ctx, x + 12, y + h - 9, button);

    // Separate the unit name from cost/state. A single "Forgemaster (1350g)"
    // line overflowed its 120px card; two deliberate hierarchy lines remain
    // readable in every hero, cap, and queue state.
    ctx.fillStyle = reason ? '#9696a2' : '#e8e8ee';
    ctx.font = '10px monospace';
    ctx.fillText(button.label, x + 24, y + 12);

    ctx.fillStyle = reason ? '#e0704a' : isActive ? '#8fd1e0' : '#d8c67a';
    ctx.font = '8px monospace';
    ctx.fillText(reason ? BUTTON_REASON_TEXT[reason] : `${cost}g`, x + 24, y + 23);

    if (isActive) {
      const progress = Math.max(0, Math.min(1, 1 - activeItem.remaining / activeItem.total));
      const barH = CONFIG.BUILD_PROGRESS_BAR_HEIGHT;
      ctx.fillStyle = '#1a1a1f';
      ctx.fillRect(x, y + h - barH, w, barH);
      ctx.fillStyle = '#8fd1e0';
      ctx.fillRect(x, y + h - barH, w * progress, barH);
    }
  }
}

// Own-team-only living-unit counts by kind — never reads the enemy team.
function getArmyComposition(world, team) {
  const counts = { miner: 0, warrior: 0, archer: 0, structure: livingStructures(world, team).length, turret: livingTurrets(world, team).length };
  for (const unit of world.units) {
    if (unit.team !== team || unit.isHero || !isAliveEntity(unit)) continue;
    if (counts[unit.kind] !== undefined) counts[unit.kind] += 1;
  }
  return counts;
}

// Glyph + count per kind, replacing the old "Miners: N Warriors: N
// Archers: N" text line with the owner-approved icon presentation.
function drawArmyCompositionRow(ctx, x, y, composition) {
  const KIND_COL_WIDTH = 50;
  ctx.font = '11px monospace';
  ctx.fillStyle = '#e8e8ee';
  ctx.textAlign = 'left';
  ['miner', 'warrior', 'archer'].forEach((kind, i) => {
    const cx = x + i * KIND_COL_WIDTH;
    drawUnitGlyph(ctx, cx + 6, y + 4, kind);
    ctx.fillText(String(composition[kind]), cx + 15, y);
  });
}

export function drawHUD(ctx, world, uiMessage) {
  if (isWatchAiMatch(world)) {
    drawWatchTelemetry(ctx, world);
    return;
  }
  const gold = world.teams.player.gold;
  const cap = getCap(world, 'player');
  const count = getUnitCount(world, 'player');
  const command = world.teams.player.command;
  const heroCooldown = world.teams.player.heroCooldownTimer;
  const composition = getArmyComposition(world, 'player');
  // The brief's one allowed off-screen signal: retriggered on every hit to
  // the player's statue (see combat.js applyDamage), independent of camera
  // culling. S11: folded into the top strip instead of a separate floating
  // banner, per PLAN.md §5's "one compact top strip ... statue warning".
  const statueWarning = world.matchState === 'playing' && world.teams.player.statueWarningTimer > 0;

  const lineHeight = 16;
  let rows = 4; // gold, units, command, army composition glyph row
  if (heroCooldown > 0) rows += 1;
  if (uiMessage && uiMessage.text) rows += 1;
  if (statueWarning) rows += 1;

  // Fixed-width backdrop — the S10 bug was an unbounded-width text line
  // (the production queue listed inline here); every row below is a short,
  // bounded string that comfortably fits CONFIG.HUD_PANEL_WIDTH, and the
  // queue itself now lives in the bottom bar's bounded chip row instead.
  ctx.fillStyle = 'rgba(20, 20, 26, 0.6)';
  ctx.fillRect(4, 4, CONFIG.HUD_PANEL_WIDTH, 8 + rows * lineHeight);

  let y = 16;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#e8e8ee';
  ctx.font = '13px monospace';
  ctx.fillText(`Gold: ${gold}`, 10, y);
  y += lineHeight;
  ctx.fillText(`Units: ${count}/${cap}`, 10, y);
  y += lineHeight;
  ctx.fillText(`Command: ${command[0].toUpperCase()}${command.slice(1)}`, 10, y);
  y += lineHeight;

  drawArmyCompositionRow(ctx, 10, y, composition);
  y += lineHeight;

  if (heroCooldown > 0) {
    ctx.fillStyle = '#e0a030';
    ctx.font = '13px monospace';
    ctx.fillText(`Hero respawns in ${Math.ceil(heroCooldown)}s`, 10, y);
    ctx.fillStyle = '#e8e8ee';
    y += lineHeight;
  }

  if (uiMessage && uiMessage.text) {
    ctx.fillStyle = '#e0a030';
    ctx.fillText(uiMessage.text, 10, y);
    ctx.fillStyle = '#e8e8ee';
    y += lineHeight;
  }

  drawWatchTelemetry(ctx, world);
}

function drawWatchTelemetry(ctx, world) {
  if (!isWatchAiMatch(world)) return;
  const panelWidth = CONFIG.HUD_PANEL_WIDTH;
  for (const team of ['player', 'ai']) {
    const layout = getTeamHudLayout(ctx.canvas, panelWidth)[team];
    const state = world.teams[team]; const c = getArmyComposition(world, team);
    const x = team === 'player' ? layout.x + 8 : layout.x + layout.w - 8;
    ctx.save(); ctx.fillStyle = 'rgba(20,20,26,.72)'; ctx.fillRect(layout.x, 4, layout.w, 72);
    ctx.textAlign = team === 'player' ? 'left' : 'right'; ctx.fillStyle = team === 'player' ? TEAM_COLORS.player : TEAM_COLORS.ai; ctx.font = 'bold 12px monospace'; ctx.fillText(team === 'player' ? 'RED' : 'BLUE', x, 18);
    ctx.fillStyle = '#e8e8ee'; ctx.font = '12px monospace'; ctx.fillText(`${state.gold} gold`, x, 35); ctx.fillText(`${getUnitCount(world, team)}/${getCap(world, team)} pop`, x, 51); ctx.fillText(`M${c.miner} W${c.warrior} A${c.archer} S${c.structure} T${c.turret}`, x, 67);
    const event = state.commanderEvent; if (event && world.matchElapsedTime - event.at <= 7) { ctx.fillStyle = team === 'player' ? TEAM_COLORS.player : TEAM_COLORS.ai; ctx.fillText(`${event.command.toUpperCase()} ← COMMANDER`, x, 92); }
    ctx.restore();
  }
  const diff = getGoldDifferential(world); ctx.save(); ctx.textAlign = 'center'; ctx.fillStyle = '#e8e8ee'; ctx.font = 'bold 16px monospace'; ctx.fillText(formatMatchClock(world.matchElapsedTime), ctx.canvas.width / 2, 20); ctx.fillStyle = diff.team === 'player' ? TEAM_COLORS.player : diff.team === 'ai' ? TEAM_COLORS.ai : '#e8e8ee'; ctx.font = 'bold 13px monospace'; ctx.fillText(`${diff.amount} gold`, ctx.canvas.width / 2, 40); ctx.restore();
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
  { id: 'leagueHistory', label: 'Strategy League' },
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

export function getWatchSetupRects(canvas) {
  return {
    scripted: { x: canvas.width / 2 - 130, y: 170, w: 260, h: 44 },
    localGemma: { x: canvas.width / 2 - 130, y: 250, w: 260, h: 44 },
    back: getBackButtonRect(canvas),
  };
}

function drawWatchAiSetupScreen(ctx) {
  const rects = getWatchSetupRects(ctx.canvas);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#e8e8ee';
  ctx.font = 'bold 24px monospace';
  ctx.fillText('Watch AI', ctx.canvas.width / 2, 105);
  ctx.font = '13px monospace';
  ctx.fillStyle = '#8a8a96';
  ctx.fillText('Choose the commander for both teams', ctx.canvas.width / 2, 132);
  drawMenuButton(ctx, rects.scripted, 'Scripted AI');
  drawMenuButton(ctx, rects.localGemma, 'Local Gemma');
  drawMenuButton(ctx, rects.back, '< Back');
}

export function getLeagueHistoryRects(canvas) {
  return { back: getBackButtonRect(canvas) };
}

function drawLeagueHistoryScreen(ctx, history) {
  const { status, view } = history ?? { status: 'unavailable', view: null };
  ctx.textAlign = 'center'; ctx.fillStyle = '#e8e8ee'; ctx.font = 'bold 22px monospace';
  ctx.fillText('Strategy League', ctx.canvas.width / 2, 52);
  if (status === 'loading') {
    ctx.font = '13px monospace'; ctx.fillStyle = '#8a8a96'; ctx.fillText('Loading local companion history…', ctx.canvas.width / 2, 120);
  } else if (status !== 'ready' || !view) {
    ctx.font = '13px monospace'; ctx.fillStyle = '#d8a050'; ctx.fillText('Local companion history unavailable.', ctx.canvas.width / 2, 120);
  } else {
    ctx.font = 'bold 15px monospace'; ctx.fillStyle = '#e8e8ee';
    ctx.fillText(`${view.matches} completed matches  •  RED ${view.wins.red} — ${view.wins.blue} BLUE`, ctx.canvas.width / 2, 88);
    for (const [team, x, color] of [['red', 220, TEAM_COLORS.player], ['blue', ctx.canvas.width - 220, TEAM_COLORS.ai]]) {
      const profile = view.profiles[team];
      ctx.fillStyle = color; ctx.font = 'bold 14px monospace'; ctx.fillText(`${team.toUpperCase()} r${profile.revision} (${profile.status})`, x, 126);
      ctx.fillStyle = '#bcbcc6'; ctx.font = '11px monospace'; ctx.fillText(profile.summary, x, 146);
    }
    ctx.fillStyle = '#e8e8ee'; ctx.font = 'bold 13px monospace'; ctx.fillText('Recent results', ctx.canvas.width / 2, 190);
    ctx.font = '12px monospace';
    if (view.recent.length === 0) { ctx.fillStyle = '#8a8a96'; ctx.fillText('No completed Watch matches recorded yet.', ctx.canvas.width / 2, 216); }
    view.recent.forEach((match, index) => {
      ctx.fillStyle = match.winner === 'red' ? TEAM_COLORS.player : TEAM_COLORS.ai;
      ctx.fillText(`${index + 1}. ${match.winner.toUpperCase()} won  •  ${match.duration}`, ctx.canvas.width / 2, 216 + index * 22);
    });
  }
  drawMenuButton(ctx, getLeagueHistoryRects(ctx.canvas).back, '< Back');
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
    case 'leagueHistory':
      drawLeagueHistoryScreen(ctx, uiState.leagueHistory);
      break;
    case 'settings':
      drawSettingsScreen(ctx, uiState);
      break;
    default:
      drawMainMenu(ctx);
  }
  ctx.restore();
}
