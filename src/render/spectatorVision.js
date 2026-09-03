import { findEntityById, isAliveEntity } from '../sim/world.js';
import { getVisionRadius, isEntityVisibleToTeam } from '../sim/vision.js';

export const SPECTATOR_VIEWS = ['full', 'left', 'right'];

export function spectatorViewTeam(view) {
  if (view === 'left') return 'player';
  if (view === 'right') return 'ai';
  return null;
}

// Presentation-only adapter. It reads a live simulation query but never writes
// world state; selecting a perspective cannot enter the simulation or AI path.
export function isEntityVisibleInSpectatorView(world, view, entity) {
  const team = spectatorViewTeam(view);
  return team === null || isEntityVisibleToTeam(world, team, entity);
}

// Player-vs-AI intentionally differs from limited Watch views: enemy static
// defenses are known, while enemy mobile activity still needs current player
// vision. Statues use the renderer's known-base silhouette path instead.
export function isEntityVisibleInPlayerView(world, entity) {
  if (entity?.team !== 'ai') return true;
  return isEntityVisibleToTeam(world, 'player', entity);
}

// Renderer-only disclosure: Player units with an active enemy target reveal
// the target's ordinary vision bubble in Player presentation. This covers
// mobile enemies as well as static objectives without becoming a simulation
// vision source or affecting AI knowledge.
export function getPlayerAttackTargetRevealSources(world) {
  const targets = new Map();
  for (const unit of world.units) {
    if (unit.team !== 'player' || !isAliveEntity(unit) || unit.targetId == null) continue;
    const target = findEntityById(world, unit.targetId);
    if (target?.team === 'ai' && isAliveEntity(target)) targets.set(target.id, target);
  }
  return [...targets.values()]
    .map((target) => ({ entityId: target.id, x: target.x, y: target.y, radius: getVisionRadius(target), playerAttackReveal: true }))
    .filter((source) => source.radius > 0);
}

// Health is live state, so the Player may see it only while the static enemy
// objective is currently visible or is the active target of a Player attack.
// This stays renderer-owned and never changes simulation/team vision.
export function isPlayerStaticHealthVisible(world, entity) {
  if (entity?.team !== 'ai' || !(entity.isStatue || entity.isStructure) || !isAliveEntity(entity)) return false;
  return isEntityVisibleInPlayerView(world, entity)
    || getPlayerAttackTargetRevealSources(world).some((source) => source.entityId === entity.id);
}

// Renderer-only disclosure: a hostile unit/turret actively attacking this
// team exposes its ordinary sight bubble to the target team's presentation.
// It never enters world.visionSources or simulation/AI knowledge.
export function getCombatRevealSources(world, viewerTeam) {
  return [...world.units, ...world.structures]
    .filter((attacker) => attacker.team !== viewerTeam && isAliveEntity(attacker) && attacker.targetId != null && attacker.attackAnimTimer > 0)
    .filter((attacker) => findEntityById(world, attacker.targetId)?.team === viewerTeam)
    .map((attacker) => ({ entityId: attacker.id, x: attacker.x, y: attacker.y, radius: getVisionRadius(attacker), combatReveal: true }))
    .filter((source) => source.radius > 0);
}
