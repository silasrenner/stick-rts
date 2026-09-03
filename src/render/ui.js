import { CONFIG } from '../config.js';
import { UPDATE_LOG } from '../updateLog.js';
import { canAfford, getOccupiedCap, getPopulationState, countQueued } from '../sim/systems/economy.js';
import { getCap, livingStructures, livingTurrets } from '../sim/systems/supply.js';
import { isAliveEntity, isWatchAiMatch } from '../sim/world.js';
import { getGoldChartSegments } from '../sim/goldHistory.js';
import { drawStickFigure, TEAM_COLORS } from './stickFigure.js';

const BUILD_MENU_ITEMS = [
  { kind: 'miner', action: 'unit', label: 'Miner', costFn: () => CONFIG.UNIT_STATS.miner.cost },
  { kind: 'warrior', action: 'unit', label: 'Warrior', costFn: () => CONFIG.UNIT_STATS.warrior.cost },
  { kind: 'archer', action: 'unit', label: 'Archer', costFn: () => CONFIG.UNIT_STATS.archer.cost },
  { kind: 'catapult', action: 'unit', label: 'Catapult', costFn: () => CONFIG.UNIT_STATS.catapult.cost },
  { kind: 'structure', action: 'structure', label: 'Structure', costFn: () => CONFIG.STRUCTURE_COST },
  { kind: 'turret', action: 'turret', label: 'Turret', costFn: () => CONFIG.TURRET_COST },
  { kind: 'forgemaster', action: 'hero', label: 'Forgemaster', costFn: () => CONFIG.BASE_HERO_COST },
  { kind: 'hawkeye', action: 'hero', label: 'Hawkeye', costFn: () => CONFIG.BASE_HERO_COST },
  { kind: 'vanguard', action: 'hero', label: 'Vanguard', costFn: () => CONFIG.BASE_HERO_COST },
  { kind: 'raven', action: 'raven', label: 'Raven', costFn: () => CONFIG.RAVEN.cost },
];

// Single source of truth for why a purchase failed — used both for the
// persistent disabled-reason label under each build-menu button and for
// main.js's showMessage() feedback after an actual failed click.
export const PURCHASE_REASON_TEXT = {
  queueFull: 'Production queue is full',
  gold: 'Not enough gold',
  cap: 'Population cap reached',
  maxStructures: 'Max count reached',
  maxTurrets: 'Max count reached',
  heroAlive: 'Hero already deployed',
  heroCooldown: 'Hero respawning...',
  ravenActive: 'Raven already active',
  ravenCooldown: 'Raven recharging...',
};

// Button-local state labels must fit beside the glyph at the smallest useful
// type size. The full reason remains available through PURCHASE_REASON_TEXT
// for click feedback; these are the compact, persistent status labels.
const BUTTON_REASON_TEXT = {
  queueFull: 'Queue full',
  gold: 'Need more gold',
  cap: 'Population full',
  maxStructures: 'Max count reached',
  maxTurrets: 'Max count reached',
  heroAlive: 'Hero deployed',
  heroCooldown: 'Hero respawning',
  ravenActive: 'Raven active',
  ravenCooldown: 'Raven cooling',
};

// Shared canvas hierarchy palette. Every interactive surface uses a darker
// card than the battlefield plus a readable rim; active/disabled states remain
// unambiguous without relying on transparency.
export function getControlSurfaceStyle({ active = false, disabled = false, primary = false } = {}) {
  if (disabled) return { fill: '#161b23', border: '#3b4655', label: '#778394', shadow: '#080b10' };
  if (active || primary) return { fill: '#203d53', border: '#80d5f4', label: '#f4fbff', shadow: '#071017' };
  return { fill: '#202b38', border: '#71869b', label: '#eef5fb', shadow: '#0a1018' };
}

export function drawControlSurface(ctx, rect, options = {}) {
  const style = getControlSurfaceStyle(options);
  ctx.fillStyle = style.shadow;
  ctx.fillRect(rect.x + 2, rect.y + 3, rect.w, rect.h);
  ctx.fillStyle = style.fill;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.strokeStyle = style.border;
  ctx.lineWidth = options.active || options.primary ? 2 : 1;
  ctx.strokeRect(rect.x + 0.5, rect.y + 0.5, rect.w - 1, rect.h - 1);
  return style;
}

function drawScreenTitle(ctx, text, y, { accent = '#80d5f4', size = 22 } = {}) {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = `bold ${size}px monospace`;
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#081018';
  ctx.strokeText(text, ctx.canvas.width / 2 + 2, y + 3);
  ctx.fillStyle = accent;
  ctx.fillText(text, ctx.canvas.width / 2, y);
  ctx.lineWidth = 1;
  ctx.strokeStyle = '#e8f8ff';
  ctx.strokeText(text, ctx.canvas.width / 2, y);
  ctx.restore();
}

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

function drawTurretGlyph(ctx, x, feetY, size = 14) {
  ctx.save();
  ctx.fillStyle = '#2c2c33';
  ctx.strokeStyle = TEAM_COLORS.player;
  ctx.lineWidth = 1.5;
  ctx.fillRect(x - size / 2, feetY - size * 0.55, size, size * 0.55);
  ctx.strokeRect(x - size / 2, feetY - size * 0.55, size, size * 0.55);
  ctx.beginPath();
  ctx.moveTo(x, feetY - size * 0.55);
  ctx.lineTo(x + size * 0.8, feetY - size);
  ctx.stroke();
  ctx.restore();
}

export function getBuildGlyphVariant(button) {
  if (button.action === 'structure') return 'structure';
  if (button.action === 'turret') return 'turret';
  if (button.action === 'raven') return 'raven';
  return 'unit';
}

function drawRavenGlyph(ctx, x, y, size = 14) {
  ctx.save();
  ctx.strokeStyle = TEAM_COLORS.player;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x - size, y - size * 0.35);
  ctx.quadraticCurveTo(x, y - size, x + size, y - size * 0.35);
  ctx.quadraticCurveTo(x, y - size * 0.1, x - size, y - size * 0.35);
  ctx.stroke();
  ctx.restore();
}

function drawKindGlyph(ctx, x, feetY, button) {
  const variant = getBuildGlyphVariant(button);
  if (variant === 'structure') drawStructureGlyph(ctx, x, feetY);
  else if (variant === 'turret') drawTurretGlyph(ctx, x, feetY);
  else if (variant === 'raven') drawRavenGlyph(ctx, x, feetY);
  else drawUnitGlyph(ctx, x, feetY, button.kind, { isHero: button.action === 'hero', scale: CONFIG.BUILD_BUTTON_ICON_SCALE });
}

function getBuildButtonRowWidth() {
  const { BUILD_BUTTON_WIDTH: w, BUILD_BUTTON_GAP: gap } = CONFIG;
  const items = getVisibleBuildMenuItems();
  return items.length * w + (items.length - 1) * gap;
}

function getVisibleBuildMenuItems() {
  return BUILD_MENU_ITEMS.filter((item) => CONFIG.HEROES_ENABLED || item.action !== 'hero');
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
    const style = drawControlSurface(ctx, rect);
    ctx.fillStyle = style.label;
    ctx.font = `bold ${spectator ? 18 : 24}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(action === 'in' ? '+' : '−', rect.x + rect.w / 2, rect.y + rect.h * 0.75);
  }
  ctx.textAlign = 'left';
}

export function getWatchSpeedButtonRect(canvas) {
  return { x: 8, y: canvas.height - 30, w: 50, h: 22 };
}

export function getSpectatorViewRects(canvas) {
  const y = canvas.height - 30;
  const startX = 160;
  const width = 52;
  const gap = 4;
  return ['full', 'left', 'right'].map((view, index) => ({
    view,
    label: view[0].toUpperCase() + view.slice(1),
    rect: { x: startX + index * (width + gap), y, w: width, h: 22 },
  }));
}

export function drawSpectatorViewSelector(ctx, selectedView) {
  for (const { view, label, rect } of getSpectatorViewRects(ctx.canvas)) {
    const selected = view === selectedView;
    ctx.fillStyle = selected ? '#3c5265' : '#24242c';
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.strokeStyle = selected ? '#8fd1e0' : '#88889a';
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
    ctx.fillStyle = '#f0f0f4';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, rect.x + rect.w / 2, rect.y + 15);
  }
  ctx.textAlign = 'left';
}

export function drawWatchSpeedButton(ctx, speed) {
  const rect = getWatchSpeedButtonRect(ctx.canvas);
  ctx.fillStyle = '#24242c'; ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.strokeStyle = '#88889a'; ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  ctx.fillStyle = '#f0f0f4'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(`${speed}×`, rect.x + rect.w / 2, rect.y + 15); ctx.textAlign = 'left';
}

// Pause placement: Player-vs-AI groups it with the top-right zoom controls;
// Watch keeps the compact speed/pause row at bottom left.
export function getPauseButtonRect(canvas, spectator = false, touchControlsEnabled = false) {
  if (spectator) return { x: 64, y: canvas.height - 30, w: 88, h: 22 };
  if (touchControlsEnabled) return { x: canvas.width - 98, y: 136, w: 90, h: 28 };
  const zoom = getZoomButtonRects(canvas, false);
  return { x: zoom.in.x - 96, y: zoom.in.y, w: 90, h: 28 };
}

export function getPauseOverlayRects(canvas) {
  return {
    speed: { x: canvas.width / 2 - 70, y: canvas.height / 2 - 2, w: 140, h: 34 },
    resume: { x: canvas.width / 2 - 70, y: canvas.height / 2 + 44, w: 140, h: 34 },
    guide: { x: canvas.width / 2 - 70, y: canvas.height / 2 + 90, w: 140, h: 34 },
    exit: { x: canvas.width / 2 - 70, y: canvas.height / 2 + 136, w: 140, h: 34 },
  };
}

export function drawPauseButton(ctx, paused, spectator = false, touchControlsEnabled = false) {
  drawMenuButton(ctx, getPauseButtonRect(ctx.canvas, spectator, touchControlsEnabled), paused ? 'Resume (P)' : 'Pause (P)', paused);
}

export function drawPauseOverlay(ctx, speed) {
  const rects = getPauseOverlayRects(ctx.canvas);
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.68)';
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#e8e8ee';
  ctx.font = 'bold 30px monospace';
  ctx.fillText('Paused', ctx.canvas.width / 2, ctx.canvas.height / 2 - 48);
  ctx.font = '13px monospace';
  ctx.fillStyle = '#b8b8c2';
  ctx.fillText('Simulation and both AIs are frozen.', ctx.canvas.width / 2, ctx.canvas.height / 2 - 24);
  drawMenuButton(ctx, rects.speed, `Game Speed: ${speed}×`);
  drawMenuButton(ctx, rects.resume, 'Resume');
  drawMenuButton(ctx, rects.guide, 'Game Guide');
  drawMenuButton(ctx, rects.exit, 'Exit to Menu');
  ctx.restore();
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

  return getVisibleBuildMenuItems().map((item, i) => ({
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
    const populationCost = CONFIG.UNIT_STATS[button.kind]?.populationCost ?? 1;
    if (getOccupiedCap(world, 'player') + populationCost > getCap(world, 'player')) return 'cap';
    return null;
  }
  if (button.action === 'structure') {
    if (livingStructures(world, 'player').length + countQueued(world, 'player', 'structure') >= CONFIG.MAX_STRUCTURES) {
      return 'maxStructures';
    }
    if (!canAfford(world, 'player', cost)) return 'gold';
    return null;
  }
  if (button.action === 'raven') {
    if (world.ravens.some((raven) => raven.team === 'player')) return 'ravenActive';
    if (world.teams.player.ravenCooldownTimer > 0) return 'ravenCooldown';
    if (!canAfford(world, 'player', cost)) return 'gold';
    return null;
  }
  if (button.action === 'turret') {
    if (livingTurrets(world, 'player').length + countQueued(world, 'player', 'turret') >= CONFIG.MAX_TURRETS) return 'maxTurrets';
    if (!canAfford(world, 'player', cost)) return 'gold';
    return null;
  }
  return 'heroesDisabled';
}

export function isBuildQueueItemActive(item, button) {
  if (!item || !button || item.action !== button.action) return false;
  return item.kind === button.kind || (item.kind === null && button.kind === item.action);
}

// Raven is deliberately not a FIFO production item, but its short preparation
// lifecycle is still player-facing build work. Expose only that state as a
// button progress value; flight, reveal, exit, and cooldown retain their
// existing status labels without pretending to be queued production.
export function getRavenPreparationProgress(world, team = 'player') {
  const raven = world.ravens.find((entry) => entry.team === team && entry.state === 'preparing');
  if (!raven) return null;
  return Math.max(0, Math.min(1, 1 - raven.preparationRemaining / CONFIG.RAVEN.preparationTime));
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

function drawQueueChip(ctx, x, y, w, h, chip, { active = false, progress = 0 } = {}) {
  ctx.fillStyle = active ? '#263945' : '#2c2c33';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = active ? '#8fd1e0' : '#55555f';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, h);

  // Reserve the chip's right edge for a two-digit stacked count. Centering
  // the glyph caused its right arm to collide with ×80 at queue stress size.
  drawKindGlyph(ctx, x + 10, y + h - 7, { action: chip.action, kind: chip.kind });

  ctx.textAlign = 'right';
  ctx.fillStyle = '#e8e8ee';
  ctx.font = '10px monospace';
  ctx.fillText(`×${chip.count}`, x + w - 4, y + h - 4);
  if (active) {
    const barH = CONFIG.BUILD_PROGRESS_BAR_HEIGHT;
    ctx.fillStyle = '#1a1a1f';
    ctx.fillRect(x, y + h - barH, w, barH);
    ctx.fillStyle = '#8fd1e0';
    ctx.fillRect(x, y + h - barH, w * progress, barH);
  }
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

function drawQueueChipRow(ctx, queue) {
  const activeItem = queue[0] ?? null;
  const chips = groupQueueChips(queue.slice(1));
  const canvas = ctx.canvas;
  const { y, h } = getQueueChipRowRect(canvas);
  const { QUEUE_CHIP_WIDTH: chipW, QUEUE_CHIP_GAP: gap } = CONFIG;
  const rowWidth = getBuildButtonRowWidth();
  const startX = (canvas.width - rowWidth) / 2;
  ctx.fillStyle = '#b8b8c2';
  ctx.font = '12px monospace';
  ctx.textAlign = 'right';
  ctx.fillText(`${queue.length}/${CONFIG.PRODUCTION_QUEUE_LIMIT}`, startX - gap, y + h / 2 + 4);
  ctx.textAlign = 'left';
  if (!activeItem) return;

  const maxSlots = Math.max(1, Math.floor((rowWidth + gap) / (chipW + gap)));
  const progress = Math.max(0, Math.min(1, 1 - activeItem.remaining / activeItem.total));
  drawQueueChip(ctx, startX, y, chipW, h, { ...activeItem, count: 1 }, { active: true, progress });
  if (maxSlots === 1 || chips.length === 0) return;

  const pendingSlots = maxSlots - 1;
  const overflow = chips.length > pendingSlots;
  const visibleCount = overflow ? Math.max(0, pendingSlots - 1) : chips.length;
  for (let i = 0; i < visibleCount; i++) {
    drawQueueChip(ctx, startX + (i + 1) * (chipW + gap), y, chipW, h, chips[i]);
  }
  if (overflow) {
    const remaining = chips.slice(visibleCount).reduce((sum, chip) => sum + chip.count, 0);
    drawQueueOverflowChip(ctx, startX + (visibleCount + 1) * (chipW + gap), y, chipW, h, remaining);
  }
}

export function drawBuildMenu(ctx, world) {
  // Clicks are inert once the match ends; don't imply otherwise. Also
  // hidden during Watch AI — neither side is player-controlled, so a build
  // menu that always affects 'player' would be misleading and clickable.
  if (world.matchState !== 'playing' || isWatchAiMatch(world)) return;

  const queue = world.teams.player.productionQueue;
  drawQueueChipRow(ctx, queue);

  const activeItem = queue[0] ?? null;

  for (const button of getBuildMenuButtons(ctx.canvas)) {
    const reason = getBuildButtonDisabledReason(world, button);
    const cost = button.costFn(world);
    const { x, y, w, h } = button.rect;
    const queueItemIsActive = isBuildQueueItemActive(activeItem, button);
    const ravenPreparationProgress = button.action === 'raven' ? getRavenPreparationProgress(world) : null;
    const isActive = queueItemIsActive || ravenPreparationProgress !== null;

    // Solid fills throughout (never ctx.globalAlpha) — at CAMERA_ZOOM_MAX
    // world content can reach into the footer band (pre-existing S10
    // camera/ground-plane geometry, out of S11's scope), and a translucent
    // disabled-button background let it bleed through. "Disabled" reads via
    // color choice instead: muted fill/border/label, not transparency.
    drawControlSurface(ctx, { x, y, w, h }, { active: isActive, disabled: Boolean(reason), primary: isActive });

    drawKindGlyph(ctx, x + 12, y + h - 9, button);

    // Separate the unit name from cost/state. A single "Forgemaster (1350g)"
    // line overflowed its 120px card; two deliberate hierarchy lines remain
    // readable in every hero, cap, and queue state.
    ctx.fillStyle = reason ? '#9696a2' : '#e8e8ee';
    ctx.font = '10px monospace';
    ctx.fillText(button.label, x + 24, y + 12);

    ctx.fillStyle = reason ? '#e0704a' : isActive ? '#8fd1e0' : '#d8c67a';
    ctx.font = '8px monospace';
    const populationCost = button.action === 'unit' ? (CONFIG.UNIT_STATS[button.kind]?.populationCost ?? 1) : null;
    ctx.fillText(reason ? (BUTTON_REASON_TEXT[reason] ?? 'Unavailable') : `${cost}g${populationCost > 1 ? ` · ${populationCost} pop` : ''}`, x + 24, y + 23);

    if (isActive) {
      const progress = ravenPreparationProgress ?? Math.max(0, Math.min(1, 1 - activeItem.remaining / activeItem.total));
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
  const counts = { miner: 0, warrior: 0, archer: 0 };
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
  const gold = world.teams.player.gold;
  const cap = getCap(world, 'player');
  const population = getPopulationState(world, 'player');
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
  ctx.fillText(`Population: ${population.reserved}/${cap}${population.queued > 0 ? ` (+${population.queued} queued)` : ''}`, 10, y);
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

  if (statueWarning) {
    const pulse = 0.6 + 0.4 * Math.sin(world.matchElapsedTime * 10);
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#e03030';
    ctx.font = 'bold 12px monospace';
    ctx.fillText('Your statue is under attack!', 10, y);
    ctx.restore();
    y += lineHeight;
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
    const style = drawControlSurface(ctx, rect, { active, primary: active });
    ctx.fillStyle = style.label;
    ctx.font = 'bold 12px monospace';
    ctx.fillText(difficulty[0].toUpperCase() + difficulty.slice(1), rect.x + rect.w / 2, rect.y + rect.h / 2 + 4);
  }
}

function drawMenuButton(ctx, rect, label, active = false) {
  ctx.save();
  const style = drawControlSurface(ctx, rect, { active, primary: active });
  ctx.fillStyle = style.label;
  ctx.font = 'bold 14px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2 + 5);
  ctx.restore();
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

export function getExitToMenuButtonRect(canvas) {
  return { x: canvas.width / 2 - 70, y: canvas.height / 2 + 104, w: 140, h: 30 };
}

export function drawGoldDifferenceChart(ctx, world) {
  const { samples } = world.goldHistory;
  if (samples.length < 2) return;
  const x = 260; const y = 70; const width = 880; const height = 140;
  const zeroY = y + height / 2;
  ctx.fillStyle = '#17171d'; ctx.fillRect(x, y, width, height);
  ctx.strokeStyle = '#555565'; ctx.strokeRect(x, y, width, height);
  ctx.strokeStyle = '#8a8a96'; ctx.beginPath(); ctx.moveTo(x, zeroY); ctx.lineTo(x + width, zeroY); ctx.stroke();
  for (const segment of getGoldChartSegments(samples, x, y, width, height)) {
    const color = segment.team === 'player' ? '#5c9be0' : '#e0605c';
    ctx.fillStyle = `${color}55`;
    ctx.beginPath(); ctx.moveTo(segment.from.x, zeroY); ctx.lineTo(segment.from.x, segment.from.y); ctx.lineTo(segment.to.x, segment.to.y); ctx.lineTo(segment.to.x, zeroY); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(segment.from.x, segment.from.y); ctx.lineTo(segment.to.x, segment.to.y); ctx.stroke();
  }
  const difference = samples.at(-1).difference;
  ctx.textAlign = 'center'; ctx.font = '12px monospace'; ctx.fillStyle = difference >= 0 ? '#8fc8ff' : '#ff9a91';
  ctx.fillText(`${difference >= 0 ? 'BLUE' : 'RED'} GOLD LEAD: ${Math.abs(difference).toFixed(0)}`, x + width / 2, y - 10);
  ctx.fillStyle = '#a8a8b4'; ctx.font = '10px monospace'; ctx.textAlign = 'left'; ctx.fillText('00:00', x, y + height + 14); ctx.textAlign = 'right'; ctx.fillText(`${Math.floor(samples.at(-1).time / 60)}:${String(samples.at(-1).time % 60).padStart(2, '0')}`, x + width, y + height + 14); ctx.textAlign = 'center';
}

export function drawWinLoseOverlay(ctx, world) {
  if (world.matchState !== 'won' && world.matchState !== 'lost') return;

  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  drawScreenTitle(ctx, world.matchState === 'won' ? 'Victory!' : 'Defeat', ctx.canvas.height / 2 - 20, { accent: world.matchState === 'won' ? '#79e6b0' : '#ff817a', size: 32 });

  if (isWatchAiMatch(world)) {
    drawMenuButton(ctx, getBackToMenuButtonRect(ctx.canvas), 'Back to Menu');
    ctx.restore();
    return;
  }

  drawGoldDifferenceChart(ctx, world);

  const rect = getRematchButtonRect(ctx.canvas);
  drawMenuButton(ctx, rect, 'Rematch', true);

  ctx.font = '11px monospace';
  ctx.fillStyle = '#8a8a96';
  ctx.fillText('Difficulty', ctx.canvas.width / 2, ctx.canvas.height / 2 + 58);

  drawDifficultyButtons(ctx, getDifficultyButtonRects(ctx.canvas), world.teams.ai.difficulty);
  drawMenuButton(ctx, getExitToMenuButtonRect(ctx.canvas), 'Exit to Menu');

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
  { id: 'updates', label: 'Update Log' },
  { id: 'guide', label: 'Game Guide' },
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
  drawScreenTitle(ctx, 'STICK RTS', 110, { size: 40 });

  for (const { label, rect } of getMainMenuButtonRects(ctx.canvas)) {
    drawMenuButton(ctx, rect, label);
  }
}

export function getPlayDifficultyRects(canvas) {
  return { difficulty: difficultyButtonRectsAt(canvas, canvas.height / 2), back: getBackButtonRect(canvas) };
}

function drawPlayDifficultyScreen(ctx) {
  ctx.textAlign = 'center';
  drawScreenTitle(ctx, 'Select Difficulty', ctx.canvas.height / 2 - 40, { size: 22 });

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
  drawScreenTitle(ctx, 'Watch AI', 80, { size: 20 });

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
  drawScreenTitle(ctx, 'Settings', 80, { size: 20 });

  ctx.font = '12px monospace';
  ctx.fillStyle = '#8a8a96';
  ctx.fillText('FPS Overlay', ctx.canvas.width / 2, 116);
  drawMenuButton(ctx, rects.fpsToggle, uiState.settings.fpsVisible ? 'On' : 'Off', uiState.settings.fpsVisible);

  ctx.fillStyle = '#8a8a96';
  ctx.fillText('Default Difficulty', ctx.canvas.width / 2, 196);
  drawDifficultyButtons(ctx, rects.defaultDifficulty, uiState.settings.defaultDifficulty);

  drawMenuButton(ctx, rects.back, '< Back');
}

export function getUpdateLogBackRect(canvas) { return getBackButtonRect(canvas); }

function drawUpdateLogScreen(ctx) {
  ctx.fillStyle = '#1f1f27';
  ctx.fillRect(64, 86, 1272, 372);
  ctx.textAlign = 'center';
  drawScreenTitle(ctx, 'Update Log', 74, { size: 20 });
  ctx.textAlign = 'left';
  ctx.font = '12px monospace';
  ctx.fillStyle = '#d0d0d8';
  UPDATE_LOG.forEach((entry, index) => ctx.fillText(`${entry.date}  —  ${entry.text}`, 90, 116 + index * 34));
  drawMenuButton(ctx, getUpdateLogBackRect(ctx.canvas), '< Back');
}

function drawGuideKeycap(ctx, x, y, key, description) {
  ctx.save();
  ctx.fillStyle = '#303644'; ctx.strokeStyle = '#8fd1e0'; ctx.lineWidth = 1;
  ctx.fillRect(x, y - 13, 24, 18); ctx.strokeRect(x, y - 13, 24, 18);
  ctx.textAlign = 'center'; ctx.fillStyle = '#f6d68a'; ctx.font = 'bold 12px monospace'; ctx.fillText(key, x + 12, y);
  ctx.textAlign = 'left'; ctx.fillStyle = '#d0d0d8'; ctx.font = '12px monospace'; ctx.fillText(description, x + 34, y);
  ctx.restore();
}

export function getGuideReferenceRows() {
  const dps = (stats) => stats.damage === 0 ? 0 : Number((stats.damage / stats.attackCooldown).toFixed(1));
  return [
    { label: 'Miner', cost: CONFIG.UNIT_STATS.miner.cost, hp: CONFIG.UNIT_STATS.miner.hp, dps: dps(CONFIG.UNIT_STATS.miner) },
    { label: 'Warrior', cost: CONFIG.UNIT_STATS.warrior.cost, hp: CONFIG.UNIT_STATS.warrior.hp, dps: dps(CONFIG.UNIT_STATS.warrior) },
    { label: 'Archer', cost: CONFIG.UNIT_STATS.archer.cost, hp: CONFIG.UNIT_STATS.archer.hp, dps: dps(CONFIG.UNIT_STATS.archer) },
    { label: 'Catapult', cost: CONFIG.UNIT_STATS.catapult.cost, hp: CONFIG.UNIT_STATS.catapult.hp, dps: dps(CONFIG.UNIT_STATS.catapult), population: CONFIG.UNIT_STATS.catapult.populationCost, description: '4 pop siege: splash, favors defenses' },
    { label: 'Structure', cost: CONFIG.STRUCTURE_COST, hp: CONFIG.STRUCTURE_HP, dps: 0 },
    { label: 'Turret', cost: CONFIG.TURRET_COST, hp: CONFIG.TURRET_HP, dps: Number((CONFIG.TURRET_DAMAGE / CONFIG.TURRET_ATTACK_COOLDOWN).toFixed(1)) },
    { label: 'Raven', cost: CONFIG.RAVEN.cost, hp: null, dps: null },
  ];
}

export function getGuideTabRects(canvas) {
  return { play: { x: canvas.width / 2 - 190, y: 96, w: 180, h: 28 }, reference: { x: canvas.width / 2 + 10, y: 96, w: 180, h: 28 } };
}

function drawGuideTabs(ctx, page) {
  const tabs = getGuideTabRects(ctx.canvas);
  drawMenuButton(ctx, tabs.play, 'How to Play', page === 'play');
  drawMenuButton(ctx, tabs.reference, 'Units & Buildings', page === 'reference');
}

function drawGameGuideScreen(ctx, uiState) {
  const page = uiState.guidePage ?? 'play';
  ctx.fillStyle = '#1f1f27'; ctx.fillRect(64, 54, 1272, 432);
  ctx.textAlign = 'center'; ctx.fillStyle = '#e8e8ee'; ctx.font = 'bold 24px monospace'; ctx.fillText('Game Guide', ctx.canvas.width / 2, 84);
  drawGuideTabs(ctx, page);
  if (page === 'reference') {
    ctx.textAlign = 'left'; ctx.font = 'bold 16px monospace'; ctx.fillStyle = '#8fd1e0'; ctx.fillText('Units & Buildings', 100, 166);
    for (const [index, row] of getGuideReferenceRows().entries()) {
      const col = index % 4; const rowIndex = Math.floor(index / 4); const x = 100 + col * 300; const y = 184 + rowIndex * 126;
      ctx.fillStyle = '#292b35'; ctx.fillRect(x, y, 280, 108); ctx.strokeStyle = '#4b596c'; ctx.strokeRect(x, y, 280, 108);
      ctx.fillStyle = '#f6d68a'; ctx.font = 'bold 14px monospace'; ctx.fillText(row.label, x + 14, y + 26);
      ctx.fillStyle = '#d0d0d8'; ctx.font = '11px monospace'; ctx.fillText(`Cost: ${row.cost}g`, x + 14, y + 52); ctx.fillText(`HP: ${row.hp ?? '—'}`, x + 106, y + 52); ctx.fillText(`DPS: ${row.dps ?? 'Scout'}`, x + 178, y + 52);
      ctx.fillStyle = '#8a8a96'; ctx.font = '10px monospace'; ctx.fillText(row.description ?? (row.dps === null ? 'Temporary enemy-base vision' : row.label === 'Turret' ? 'Stationary defensive fire' : row.label === 'Structure' ? 'Raises population capacity' : 'Battlefield role'), x + 14, y + 80);
    }
  } else {
    ctx.textAlign = 'left'; ctx.fillStyle = '#8fd1e0'; ctx.font = 'bold 16px monospace'; ctx.fillText('Commands', 110, 166);
    drawGuideKeycap(ctx, 110, 204, 'Q', 'Attack: rally toward the enemy core');
    drawGuideKeycap(ctx, 110, 242, 'W', 'Defend: press again for the next completed turret');
    drawGuideKeycap(ctx, 110, 280, 'E', 'Retreat: pull fighters back to safety');
    ctx.fillStyle = '#d0d0d8'; ctx.font = '12px monospace'; ctx.fillText('P / Escape: pause', 110, 322); ctx.fillText('Game Speed: 1× → 5× → 10× → 20×', 110, 348);
    ctx.fillStyle = '#8fd1e0'; ctx.font = 'bold 16px monospace'; ctx.fillText('Vision & scouting', 720, 166);
    ctx.fillStyle = '#d0d0d8'; ctx.font = '12px monospace';
    ['Vision: friendly units and defenses reveal nearby enemies.', 'Unseen enemies disappear from view.', 'Ravens temporarily reveal the enemy base.'].forEach((line, index) => ctx.fillText(line, 720, 204 + index * 32));
  }
  drawMenuButton(ctx, getBackButtonRect(ctx.canvas), '< Back');
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
    case 'updates':
      drawUpdateLogScreen(ctx);
      break;
    case 'guide':
      drawGameGuideScreen(ctx, uiState);
      break;
    case 'settings':
      drawSettingsScreen(ctx, uiState);
      break;
    default:
      drawMainMenu(ctx);
  }
  ctx.restore();
}
