import { CONFIG } from './config.js';
import { createWorld, createUnit, isWatchAiMatch } from './sim/world.js';
import { createAccumulator } from './sim/loop.js';
import { runTick } from './sim/tick.js';
import { setTeamCommand } from './sim/systems/commands.js';
import { buyUnit, buyStructure, buyTurret, buyHero, buyRaven } from './sim/systems/economy.js';
import { attemptHeroAttack, activateSpecial } from './sim/systems/heroes.js';
import { render } from './render/renderer.js';
import {
  getBuildMenuButtons,
  getRematchButtonRect,
  getDifficultyButtonRects,
  getBackToMenuButtonRect,
  getMainMenuButtonRects,
  getPlayDifficultyRects,
  getWatchSetupRects,
  getSettingsRects,
  getUpdateLogBackRect,
  getPauseButtonRect,
  getPauseOverlayRects,
  getZoomButtonRects,
  getWatchSpeedButtonRect,
  getSpectatorViewRects,
  getTouchCommandRects,
  PURCHASE_REASON_TEXT,
} from './render/ui.js';
import { createCamera, updateCamera, zoomAt } from './render/camera.js';
import { bindDebugKeys } from './input/keyboard.js';
import { bindClick, pointInRect, bindMouseMove, bindCameraGestures, bindWheel } from './input/mouse.js';
import { createKeyState } from './input/keyState.js';

const DEFAULT_DIFFICULTY = 'medium';
const GAME_SPEEDS = [1, 5, 10, 20];
const DEFAULT_GAME_SPEED = 5;

const canvas = document.getElementById('game');
canvas.width = CONFIG.VIEWPORT_WIDTH;
canvas.height = CONFIG.CANVAS_HEIGHT;
const ctx = canvas.getContext('2d');

// Persistent UI state — deliberately not part of `world`, which is fully
// replaced on every resetMatch()/Watch-AI-start, so settings and menu
// navigation survive across matches.
const uiState = {
  menuScreen: 'main', // 'main' | 'playDifficulty' | 'watchSetup' | 'settings'
  settings: { fpsVisible: false, defaultDifficulty: DEFAULT_DIFFICULTY },
  watchSetup: { playerDifficulty: 'hard', aiDifficulty: 'hard', seed: null },
  speed: DEFAULT_GAME_SPEED,
  spectatorView: 'full', // render-only Watch AI perspective; never part of world.
  paused: false,
  touchControlsEnabled: window.matchMedia?.('(pointer: coarse)').matches || navigator.maxTouchPoints > 0,
};

let world = createWorld(); // starts in matchState 'menu'
let uiMessage = { text: '', timer: 0 };
const camera = createCamera();
const keyState = createKeyState();
let mouseX = null;
let dragDeltaX = 0;

function showMessage(text) {
  uiMessage = { text, timer: 2 };
}

function attemptBuyUnit(team, kind) {
  const result = buyUnit(world, team, kind);
  if (!result.ok && team === 'player') showMessage(PURCHASE_REASON_TEXT[result.reason]);
  return result;
}

function attemptBuyStructure(team) {
  const result = buyStructure(world, team);
  if (!result.ok && team === 'player') showMessage(PURCHASE_REASON_TEXT[result.reason]);
  return result;
}

function attemptBuyTurret(team) {
  const result = buyTurret(world, team);
  if (!result.ok && team === 'player') showMessage(PURCHASE_REASON_TEXT[result.reason]);
  return result;
}

function attemptBuyHero(team, kind) {
  const result = buyHero(world, team, kind);
  if (!result.ok && team === 'player') showMessage(PURCHASE_REASON_TEXT[result.reason]);
  return result;
}

function attemptBuyRaven(team) {
  const result = buyRaven(world, team);
  if (!result.ok && team === 'player') showMessage(PURCHASE_REASON_TEXT[result.reason]);
  return result;
}

// Default keeps Rematch on the just-ended match's own difficulty (unchanged
// v1 behavior); only falls back to the Settings default if that's somehow
// unset. Play's difficulty-select screen always passes an explicit arg.
function resetMatch(difficulty = world.teams.ai.difficulty ?? uiState.settings.defaultDifficulty) {
  world = createWorld();
  world.matchState = 'playing';
  world.teams.ai.difficulty = difficulty;
  uiMessage = { text: '', timer: 0 };
  uiState.speed = DEFAULT_GAME_SPEED;
  uiState.spectatorView = 'full';
  uiState.paused = false;
  camera.x = 0;
  camera.targetX = 0;
}

function startWatchAiMatch(playerDifficulty, aiDifficulty, seed) {
  const resolvedSeed = seed ?? Date.now();
  world = createWorld(resolvedSeed);
  world.matchState = 'playing';
  world.teams.player.difficulty = playerDifficulty;
  world.teams.ai.difficulty = aiDifficulty;
  uiMessage = { text: '', timer: 0 };
  uiState.speed = DEFAULT_GAME_SPEED;
  uiState.spectatorView = 'full';
  uiState.paused = false;
  camera.x = 0;
  camera.targetX = 0;
  // Captured even if "Random" was picked, so a spectator can note/reuse a
  // good match's seed afterward.
  uiState.watchSetup.seed = resolvedSeed;
}

function backToMenu() {
  world = createWorld();
  uiState.menuScreen = 'main';
  uiState.paused = false;
  camera.x = 0;
  camera.targetX = 0;
}

function toggleHeroControl() {
  if (uiState.paused || isWatchAiMatch(world)) return;
  const hero = world.units.find((u) => u.team === 'player' && u.isHero && u.state !== 'dying');
  if (!hero) return;
  hero.controlled = !hero.controlled;
  // S10: re-enabling direct control resumes hero-follow even if manual
  // pan/zoom had broken it earlier.
  if (hero.controlled) camera.followBroken = false;
}

function attackWithControlledHero() {
  if (uiState.paused || isWatchAiMatch(world)) return;
  const hero = world.units.find((u) => u.team === 'player' && u.isHero && u.controlled);
  if (hero) attemptHeroAttack(world, hero);
}

function specialWithControlledHero() {
  if (uiState.paused || isWatchAiMatch(world)) return;
  const hero = world.units.find((u) => u.team === 'player' && u.isHero && u.controlled);
  if (hero) activateSpecial(world, hero);
}

function toggleFpsOverlay() {
  uiState.settings.fpsVisible = !uiState.settings.fpsVisible;
}

function togglePause() {
  if (world.matchState !== 'playing') return;
  uiState.paused = !uiState.paused;
}

function cycleGameSpeed() {
  const currentIndex = GAME_SPEEDS.indexOf(uiState.speed);
  uiState.speed = GAME_SPEEDS[(currentIndex + 1) % GAME_SPEEDS.length] ?? DEFAULT_GAME_SPEED;
}

// Debug-only stress scenario
// target (S8 — replaces the v1 "~40 units" criterion; spawns 100
// regardless of the final cap, so the engine has proven headroom above
// it). Spawns units directly (bypassing gold/cap, same as the rest of
// this file's window.__buy* debug hooks) clustered around the current
// camera center so they're immediately visible without needing to scroll
// to find them. Clusters are kept farther apart than any unit's
// acquireRange (max 300) so the two sides don't immediately fight and
// cull themselves before there's time to read the FPS overlay — this
// measures steady-state render/tick cost, not combat throughput.
// homeX/enemyHomeX are pinned to the spawn position AND formationExempt
// is set so sim/systems/formation.js never assigns these units a slot —
// without that flag, S7's formation system overrides positioning based
// on the team's live command regardless of homeX/enemyHomeX, so pinning
// alone (the v1/S7 approach) no longer holds units still once a real
// command reaches them (including one the AI behavior tree issues on its
// own once it sees a 100-unit "army" and decides to attack).
const STRESS_KINDS = ['warrior', 'archer'];
const STRESS_UNITS_PER_SIDE = 50;
const STRESS_CLUSTER_GAP = 500;
function spawnStressTest() {
  const midX = camera.x + CONFIG.VIEWPORT_WIDTH / 2;
  for (let i = 0; i < STRESS_UNITS_PER_SIDE; i++) {
    const kind = STRESS_KINDS[i % STRESS_KINDS.length];
    const px = midX - STRESS_CLUSTER_GAP / 2 - i * 4;
    const ax = midX + STRESS_CLUSTER_GAP / 2 + i * 4;
    const playerUnit = createUnit(kind, 'player', px, CONFIG.GROUND_Y);
    playerUnit.homeX = px;
    playerUnit.enemyHomeX = px;
    playerUnit.formationExempt = true;
    world.units.push(playerUnit);
    const aiUnit = createUnit(kind, 'ai', ax, CONFIG.GROUND_Y);
    aiUnit.homeX = ax;
    aiUnit.enemyHomeX = ax;
    aiUnit.formationExempt = true;
    world.units.push(aiUnit);
  }
}

// Watch AI has no player-controlled side — gate the player's own command
// keys the same way the hero-control functions above already are.
function setPlayerCommand(command) {
  if (uiState.paused || isWatchAiMatch(world)) return;
  setTeamCommand(world, 'player', command, { userInitiated: true });
}

// The 'ai' team now makes its own decisions (sim/ai/behavior.js) — no
// more keyboard stand-in for it. Only the player's own commands and hero
// controls remain bound. f/s stay active during Watch AI — dev tools, not
// gameplay input.
bindDebugKeys({
  q: () => setPlayerCommand('attack'),
  w: () => setPlayerCommand('defend'),
  e: () => setPlayerCommand('retreat'),
  h: () => toggleHeroControl(),
  j: () => attackWithControlledHero(),
  k: () => specialWithControlledHero(),
  f: () => toggleFpsOverlay(),
  s: () => spawnStressTest(),
  p: () => togglePause(),
  escape: () => togglePause(),
});

function handleMenuClick(x, y) {
  switch (uiState.menuScreen) {
    case 'playDifficulty': {
      const rects = getPlayDifficultyRects(canvas);
      if (pointInRect(x, y, rects.back)) {
        uiState.menuScreen = 'main';
        return;
      }
      for (const { difficulty, rect } of rects.difficulty) {
        if (pointInRect(x, y, rect)) {
          resetMatch(difficulty);
          uiState.menuScreen = 'main';
          return;
        }
      }
      return;
    }
    case 'watchSetup': {
      const rects = getWatchSetupRects(canvas);
      if (pointInRect(x, y, rects.back)) {
        uiState.menuScreen = 'main';
        return;
      }
      if (pointInRect(x, y, rects.reroll)) {
        uiState.watchSetup.seed = Date.now();
        return;
      }
      if (pointInRect(x, y, rects.start)) {
        startWatchAiMatch(uiState.watchSetup.playerDifficulty, uiState.watchSetup.aiDifficulty, uiState.watchSetup.seed);
        uiState.menuScreen = 'main';
        return;
      }
      for (const { difficulty, rect } of rects.playerDifficulty) {
        if (pointInRect(x, y, rect)) {
          uiState.watchSetup.playerDifficulty = difficulty;
          return;
        }
      }
      for (const { difficulty, rect } of rects.aiDifficulty) {
        if (pointInRect(x, y, rect)) {
          uiState.watchSetup.aiDifficulty = difficulty;
          return;
        }
      }
      return;
    }
    case 'updates': {
      if (pointInRect(x, y, getUpdateLogBackRect(canvas))) uiState.menuScreen = 'main';
      return;
    }
    case 'settings': {
      const rects = getSettingsRects(canvas);
      if (pointInRect(x, y, rects.back)) {
        uiState.menuScreen = 'main';
        return;
      }
      if (pointInRect(x, y, rects.fpsToggle)) {
        toggleFpsOverlay();
        return;
      }
      for (const { difficulty, rect } of rects.defaultDifficulty) {
        if (pointInRect(x, y, rect)) {
          uiState.settings.defaultDifficulty = difficulty;
          return;
        }
      }
      return;
    }
    default: {
      for (const { id, rect } of getMainMenuButtonRects(canvas)) {
        if (!pointInRect(x, y, rect)) continue;
        if (id === 'play') uiState.menuScreen = 'playDifficulty';
        else if (id === 'watchAi') uiState.menuScreen = 'watchSetup';
        else if (id === 'updates') uiState.menuScreen = 'updates';
        else if (id === 'settings') uiState.menuScreen = 'settings';
        return;
      }
    }
  }
}

// Only "Back to Menu" is clickable during Watch AI (shown on the win/lose
// overlay) — the build menu is hidden and player commands are suppressed,
// so there's nothing else on screen a click could meaningfully hit.
function handleWatchAiClick(x, y) {
  if (world.matchState === 'playing') {
    const selected = getSpectatorViewRects(canvas).find((control) => pointInRect(x, y, control.rect));
    if (selected) {
      uiState.spectatorView = selected.view;
      return;
    }
  }
  if (world.matchState === 'playing' && pointInRect(x, y, getWatchSpeedButtonRect(canvas))) {
    cycleGameSpeed();
    return;
  }
  if ((world.matchState === 'won' || world.matchState === 'lost') && pointInRect(x, y, getBackToMenuButtonRect(canvas))) backToMenu();
}

function touchControlAt(x, y) {
  if (!uiState.touchControlsEnabled || world.matchState !== 'playing' || isWatchAiMatch(world)) return null;
  return [...getTouchCommandRects(canvas, world).army, ...getTouchCommandRects(canvas, world).hero]
    .find((control) => control.enabled !== false && pointInRect(x, y, control.rect)) ?? null;
}

function runTouchControl(action) {
  if (action === 'attack' || action === 'defend' || action === 'retreat') setPlayerCommand(action);
  else if (action === 'heroControl') toggleHeroControl();
  else if (action === 'heroAttack') attackWithControlledHero();
  else if (action === 'heroSpecial') specialWithControlledHero();
}

function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return { x: (event.clientX - rect.left) * (canvas.width / rect.width), y: (event.clientY - rect.top) * (canvas.height / rect.height) };
}

let heldHeroControl = null;
canvas.addEventListener('pointerdown', (event) => {
  if (event.pointerType !== 'touch') return;
  const control = touchControlAt(canvasPoint(event).x, canvasPoint(event).y);
  if (!control) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  canvas.setPointerCapture(event.pointerId);
  if (control.action === 'heroLeft' || control.action === 'heroRight') {
    heldHeroControl = { pointerId: event.pointerId, key: control.action === 'heroLeft' ? 'arrowleft' : 'arrowright' };
    keyState.setVirtual(heldHeroControl.key, true);
  } else runTouchControl(control.action);
});
function releaseHeldHeroControl(event) {
  if (!heldHeroControl || event.pointerId !== heldHeroControl.pointerId) return;
  keyState.setVirtual(heldHeroControl.key, false);
  heldHeroControl = null;
}
canvas.addEventListener('pointerup', releaseHeldHeroControl);
canvas.addEventListener('pointercancel', releaseHeldHeroControl);

bindClick(canvas, (x, y) => {
  if (world.matchState === 'playing') {
    if (pointInRect(x, y, getPauseButtonRect(canvas, isWatchAiMatch(world)))) {
      togglePause();
      return;
    }
    if (uiState.paused) {
      const rects = getPauseOverlayRects(canvas);
      if (pointInRect(x, y, rects.speed)) cycleGameSpeed();
      else if (pointInRect(x, y, rects.resume)) togglePause();
      else if (pointInRect(x, y, rects.exit)) backToMenu();
      return;
    }
  }
  if (world.matchState !== 'menu') {
    const zoomButtons = getZoomButtonRects(canvas, isWatchAiMatch(world));
    if (pointInRect(x, y, zoomButtons.in)) {
      zoomAt(camera, canvas.width / 2, 1.25);
      return;
    }
    if (pointInRect(x, y, zoomButtons.out)) {
      zoomAt(camera, canvas.width / 2, 0.8);
      return;
    }
  }
  if (world.matchState === 'menu') {
    handleMenuClick(x, y);
    return;
  }

  if (isWatchAiMatch(world)) {
    handleWatchAiClick(x, y);
    return;
  }

  if (world.matchState !== 'playing') {
    if (pointInRect(x, y, getRematchButtonRect(canvas))) {
      resetMatch();
      return;
    }
    for (const { difficulty, rect } of getDifficultyButtonRects(canvas)) {
      if (pointInRect(x, y, rect)) {
        resetMatch(difficulty);
        return;
      }
    }
    return;
  }

  for (const button of getBuildMenuButtons(canvas)) {
    if (!pointInRect(x, y, button.rect)) continue;
    if (button.action === 'unit') attemptBuyUnit('player', button.kind);
    else if (button.action === 'structure') attemptBuyStructure('player');
    else if (button.action === 'turret') attemptBuyTurret('player');
    else if (button.action === 'raven') attemptBuyRaven('player');
    else attemptBuyHero('player', button.kind);
    return;
  }
});

bindMouseMove(canvas, (x) => {
  mouseX = x;
});

bindCameraGestures(canvas, {
  onPan: (dx) => { dragDeltaX += dx; },
  onZoom: (x, factor) => zoomAt(camera, x, factor),
});

// S10: cursor-anchored scroll-wheel zoom. Exponential step (1.1^n) so
// zoom feels smooth and frame-rate-independent regardless of wheel notch
// size across trackpads/mice; deltaY > 0 (scroll down) zooms out.
bindWheel(canvas, (deltaY, x) => {
  zoomAt(camera, x, Math.pow(1.1, -deltaY / 100));
});

const accumulator = createAccumulator(1000 / CONFIG.TICK_HZ);
let lastTime = performance.now();
let tickCount = 0;
let fps = 60;

function tick(dt) {
  const input = {
    player: {
      moveLeft: keyState.isDown('arrowleft') || keyState.isDown('a'),
      moveRight: keyState.isDown('arrowright') || keyState.isDown('d'),
    },
  };

  runTick(world, dt, input);

  if (uiMessage.timer > 0) {
    uiMessage.timer -= dt;
    if (uiMessage.timer <= 0) uiMessage = { text: '', timer: 0 };
  }
  tickCount++;
}

function advanceSimulation(deltaMs) {
  if (uiState.paused) return;
  accumulator.advance(deltaMs * (world.matchState === 'playing' ? uiState.speed : 1), tick);
}

function frame(time) {
  const deltaMs = time - lastTime;
  lastTime = time;
  advanceSimulation(deltaMs);
  updateCamera(camera, world, mouseX, deltaMs / 1000, dragDeltaX);
  dragDeltaX = 0; // consumed for this frame — only read inside updateCamera's Watch-AI branch, harmless otherwise
  render(ctx, world, camera, uiMessage, uiState);
  if (deltaMs > 0) fps = fps * 0.9 + (1000 / deltaMs) * 0.1; // smoothed, avoids a jittery per-frame readout
  if (uiState.settings.fpsVisible) drawFpsOverlay(ctx, fps, world.units.length);
  requestAnimationFrame(frame);
}

function drawFpsOverlay(ctx, fps, unitCount) {
  ctx.save();
  ctx.textAlign = 'right';
  ctx.fillStyle = fps >= 55 ? '#4caf50' : fps >= 30 ? '#e0a030' : '#e03030';
  ctx.font = '12px monospace';
  ctx.fillText(`${fps.toFixed(0)} fps  (${unitCount} units)`, ctx.canvas.width - 10, 16);
  ctx.restore();
}

requestAnimationFrame(frame);

window.__tickCount = () => tickCount;
// world is reassigned on rematch — a getter keeps this live rather than stale.
Object.defineProperty(window, '__world', { get: () => world, configurable: true });
window.__camera = camera;
window.__resetMatch = resetMatch;
window.__buyUnit = attemptBuyUnit;
window.__buyStructure = attemptBuyStructure;
window.__buyHero = attemptBuyHero;
window.__buyRaven = attemptBuyRaven;
window.__setCommand = (team, command) => setTeamCommand(world, team, command);
window.__toggleHeroControl = toggleHeroControl;
window.__heroAttack = attackWithControlledHero;
window.__heroSpecial = specialWithControlledHero;
window.__spawnStressTest = spawnStressTest;
window.__toggleFpsOverlay = toggleFpsOverlay;
window.__togglePause = togglePause;
window.__advanceSimulation = advanceSimulation;
window.__fps = () => fps;
window.__uiState = uiState;
window.__startWatchAiMatch = startWatchAiMatch;
window.__backToMenu = backToMenu;
window.__forceTicks = (n = CONFIG.TICK_HZ) => {
  if (!uiState.paused) {
    for (let i = 0; i < n; i++) tick(1 / CONFIG.TICK_HZ);
  }
  updateCamera(camera, world, mouseX, n / CONFIG.TICK_HZ, dragDeltaX);
  dragDeltaX = 0;
  render(ctx, world, camera, uiMessage, uiState);
};
