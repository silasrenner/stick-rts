import { CONFIG } from '../config.js';
import { getOccupiedCap } from '../sim/systems/economy.js';
import { getCap, livingStructures, livingTurrets } from '../sim/systems/supply.js';
import { isAliveEntity, isWatchAiMatch } from '../sim/world.js';
import { TEAM_COLORS } from './stickFigure.js';
import { formatMatchClock, getGoldDifferential } from './matchTelemetry.js';
import { spectatorViewTeam } from './spectatorVision.js';

function composition(world, team) {
  const counts = { miner: 0, warrior: 0, archer: 0 };
  for (const unit of world.units) if (unit.team === team && !unit.isHero && isAliveEntity(unit) && unit.kind in counts) counts[unit.kind] += 1;
  return { ...counts, structures: livingStructures(world, team).length, turrets: livingTurrets(world, team).length };
}

// Full retains the complete debug telemetry. Team perspectives intentionally
// omit enemy resources, population, and composition as live enemy information.
export function drawWatchTelemetryOverlay(ctx, world, spectatorView = 'full') {
  if (!isWatchAiMatch(world) || world.matchState !== 'playing') return;
  const perspectiveTeam = spectatorViewTeam(spectatorView);
  const teams = perspectiveTeam === null ? ['player', 'ai'] : [perspectiveTeam];
  for (const team of teams) {
    const left = team === 'player'; const x = left ? 4 : ctx.canvas.width - CONFIG.HUD_PANEL_WIDTH - 4;
    const textX = left ? x + 8 : x + CONFIG.HUD_PANEL_WIDTH - 8; const state = world.teams[team]; const c = composition(world, team);
    ctx.save(); ctx.fillStyle = 'rgba(20,20,26,.72)'; ctx.fillRect(x, 4, CONFIG.HUD_PANEL_WIDTH, 72);
    ctx.textAlign = left ? 'left' : 'right'; ctx.fillStyle = left ? TEAM_COLORS.player : TEAM_COLORS.ai; ctx.font = 'bold 12px monospace'; ctx.fillText(left ? 'RED' : 'BLUE', textX, 18);
    ctx.fillStyle = '#e8e8ee'; ctx.font = '12px monospace'; ctx.fillText(`${state.gold} gold`, textX, 35); ctx.fillText(`${getOccupiedCap(world, team)}/${getCap(world, team)} pop`, textX, 51); ctx.fillText(`M${c.miner} W${c.warrior} A${c.archer} S${c.structures} T${c.turrets}`, textX, 67); ctx.restore();
  }
  const diff = getGoldDifferential(world); ctx.save(); ctx.textAlign = 'center'; ctx.fillStyle = '#e8e8ee'; ctx.font = 'bold 16px monospace'; ctx.fillText(formatMatchClock(world.matchElapsedTime), ctx.canvas.width / 2, 20);
  if (perspectiveTeam === null) { ctx.fillStyle = diff.team === 'player' ? TEAM_COLORS.player : diff.team === 'ai' ? TEAM_COLORS.ai : '#e8e8ee'; ctx.font = 'bold 13px monospace'; ctx.fillText(`${diff.amount} gold`, ctx.canvas.width / 2, 40); }
  ctx.restore();
}
