import { CONFIG } from '../config.js';

export const LANDING_RAVEN_SPEED = 560;
export const LANDING_RAVEN_INTERVAL_SECONDS = 15;
export const LANDING_RAVEN_REVEAL_LINGER_SECONDS = 2;
const OFFSCREEN_MARGIN = 60;

function getLandingRavenTiming(elapsedSeconds) {
  const flightDuration = (CONFIG.WORLD_WIDTH + OFFSCREEN_MARGIN * 2) / LANDING_RAVEN_SPEED;
  const cycleDuration = flightDuration + LANDING_RAVEN_INTERVAL_SECONDS;
  return { flightDuration, phase: elapsedSeconds % cycleDuration };
}

export function getLandingRavenFrame(elapsedSeconds) {
  const { flightDuration, phase } = getLandingRavenTiming(elapsedSeconds);
  if (phase >= flightDuration) return null;
  const progress = phase / flightDuration;
  return { x: -OFFSCREEN_MARGIN + (CONFIG.WORLD_WIDTH + OFFSCREEN_MARGIN * 2) * progress, y: 180 + Math.sin(progress * Math.PI * 2) * 10, progress, speed: LANDING_RAVEN_SPEED, team: 'player', state: 'scouting' };
}

// Menu-only presentation source. It borrows the gameplay Raven sight radius
// but is not a world vision source and cannot enter AI/simulation state.
export function getLandingRavenFogSource(elapsedSeconds) {
  const frame = getLandingRavenFrame(elapsedSeconds);
  if (frame) return { ...frame, radius: CONFIG.RAVEN.movingVisionRadius, alpha: 1 };
  const { flightDuration, phase } = getLandingRavenTiming(elapsedSeconds);
  const lingerElapsed = phase - flightDuration;
  if (lingerElapsed < 0 || lingerElapsed >= LANDING_RAVEN_REVEAL_LINGER_SECONDS) return null;
  return {
    x: CONFIG.WORLD_WIDTH + OFFSCREEN_MARGIN,
    y: 180,
    radius: CONFIG.RAVEN.movingVisionRadius,
    alpha: 1 - lingerElapsed / LANDING_RAVEN_REVEAL_LINGER_SECONDS,
  };
}

// Shared gameplay silhouette: callers choose placement/state but camera transforms it.
export function drawRaven(ctx, raven) {
  const color = raven.team === 'player' ? '#e0605c' : '#5c9be0';
  ctx.save(); ctx.strokeStyle = color; ctx.fillStyle = '#17171d'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(raven.x - 20, raven.y + 3); ctx.quadraticCurveTo(raven.x - 5, raven.y - 18, raven.x, raven.y - 3); ctx.quadraticCurveTo(raven.x + 5, raven.y - 18, raven.x + 20, raven.y + 3); ctx.quadraticCurveTo(raven.x, raven.y + 10, raven.x - 20, raven.y + 3); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#e8e8ee'; ctx.font = '10px monospace'; ctx.textAlign = 'center'; ctx.fillText(raven.state === 'revealing' ? 'REVEAL' : 'RAVEN', raven.x, raven.y - 24); ctx.restore();
}

export function drawLandingRaven(ctx, elapsedSeconds) { const raven = getLandingRavenFrame(elapsedSeconds); if (raven) drawRaven(ctx, raven); return raven; }
