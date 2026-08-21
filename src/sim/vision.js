import { CONFIG } from '../config.js';
import { isAliveEntity } from './world.js';

// Team vision is a read-only simulation query surface. It deliberately has no
// tick/update loop, cache, or AI dependency: callers always derive the current
// deterministic union from authoritative world state.
export function getVisionRadius(source) {
  if (typeof source?.visionRadius === 'number') return source.visionRadius;
  if (source?.isStatue) return CONFIG.VISION_RANGES.core;
  if (source?.isTurret) return CONFIG.VISION_RANGES.turret;
  if (source?.isStructure) return CONFIG.VISION_RANGES.structure;
  if (source?.isHero) return CONFIG.VISION_RANGES.hero;
  return CONFIG.VISION_RANGES.units[source?.kind] ?? 0;
}

function isActiveTemporarySource(source) {
  return source?.active !== false && typeof source?.x === 'number' && typeof source?.radius === 'number';
}

// Returns simple position/radius descriptors so temporary reveals can later be
// added as non-unit, non-targetable, non-population-bearing records in
// world.visionSources without changing visibility consumers.
export function getTeamVisionSources(world, team) {
  const entitySources = [
    ...world.units,
    ...world.structures,
    ...Object.values(world.statues),
  ]
    .filter((entity) => entity.team === team && isAliveEntity(entity))
    .map((entity) => ({ entityId: entity.id, team, x: entity.x, y: entity.y, radius: getVisionRadius(entity) }))
    .filter((source) => source.radius > 0);

  const temporarySources = (world.visionSources ?? [])
    .filter((source) => source.team === team && isActiveTemporarySource(source))
    .map((source) => ({ entityId: source.entityId ?? null, team, x: source.x, y: source.y, radius: source.radius }));

  return [...entitySources, ...temporarySources];
}

export function isPositionVisibleToTeam(world, team, x, y = 0) {
  return getTeamVisionSources(world, team).some((source) => Math.hypot(source.x - x, source.y - y) <= source.radius);
}

// Friendly entities are always available to their own team. Enemy entity
// visibility is current-only: no fog memory or ghost representation exists.
export function isEntityVisibleToTeam(world, team, entity) {
  if (!entity) return false;
  if (entity.team === team) return true;
  return isAliveEntity(entity) && isPositionVisibleToTeam(world, team, entity.x, entity.y);
}

export function getVisibleEnemyEntities(world, team) {
  return [
    ...world.units,
    ...world.structures,
    ...Object.values(world.statues),
  ].filter((entity) => entity.team !== team && isEntityVisibleToTeam(world, team, entity));
}
