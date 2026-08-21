import { CONFIG } from '../../config.js';
import { getVisibleEnemyEntities } from '../vision.js';

function snapshotEnemy(entity, seenAt) {
  return {
    id: entity.id,
    kind: entity.kind ?? (entity.isTurret ? 'turret' : entity.isStatue ? 'statue' : 'unknown'),
    team: entity.team,
    x: entity.x,
    y: entity.y,
    hp: entity.hp,
    maxHp: entity.maxHp,
    state: entity.state,
    isHero: entity.isHero === true,
    isStructure: entity.isStructure === true,
    isTurret: entity.isTurret === true,
    isStatue: entity.isStatue === true,
    lastSeenAt: seenAt,
  };
}

function isMobileEnemy(enemy) {
  return !enemy.isStructure && !enemy.isStatue;
}

function compositionFrom(enemies) {
  const composition = {};
  for (const enemy of enemies) {
    if (!isMobileEnemy(enemy)) continue;
    composition[enemy.kind] = (composition[enemy.kind] ?? 0) + 1;
  }
  return composition;
}

function retainRecentMobileMemories(prior, visibleIds, now, memoryDuration) {
  return [...(prior.rememberedEnemyUnits ?? []), ...(prior.currentlyVisibleEnemies ?? []).filter(isMobileEnemy)]
    .filter((enemy) => !visibleIds.has(enemy.id))
    .filter((enemy) => now - enemy.lastSeenAt <= memoryDuration);
}

function retainKnownStructures(prior, visibleStructures) {
  const previouslySeen = [...(prior.rememberedEnemyStructures ?? []), ...(prior.currentlyVisibleEnemies ?? []).filter((enemy) => enemy.isStructure)];
  const rememberedById = new Map(previouslySeen.map((enemy) => [enemy.id, enemy]));
  for (const structure of visibleStructures) rememberedById.set(structure.id, structure);
  return [...rememberedById.values()];
}

function knownEnemyBase(team, prior, visibleBases) {
  const enemyTeam = team === 'player' ? 'ai' : 'player';
  const visibleBase = visibleBases.find((base) => base.team === enemyTeam);
  return {
    id: visibleBase?.id ?? prior.knownEnemyBase?.id ?? null,
    kind: 'statue',
    team: enemyTeam,
    x: enemyTeam === 'player' ? CONFIG.PLAYER_HOME_X : CONFIG.AI_HOME_X,
    y: CONFIG.GROUND_Y,
    lastSeenAt: visibleBase?.lastSeenAt ?? prior.knownEnemyBase?.lastSeenAt ?? null,
  };
}

// AI live knowledge is the exact current team-visibility query used by the
// Left/Right spectator presentation. All snapshots are created from currently
// visible entities; after sight is lost, only the copied observation remains.
export function updateAiMemory(world, team, memoryDuration = Infinity) {
  const now = world.matchElapsedTime;
  const visibleEnemies = getVisibleEnemyEntities(world, team)
    .map((entity) => snapshotEnemy(entity, now));
  const prior = world.aiMemory[team] ?? {};
  const visibleUnits = visibleEnemies.filter(isMobileEnemy);
  const visibleStructures = visibleEnemies.filter((enemy) => enemy.isStructure);
  const visibleBases = visibleEnemies.filter((enemy) => enemy.isStatue);
  // Contact metadata is derived solely from this tick's copied, team-visible
  // snapshots. "Meaningful" is combat or defensive/production structure, not
  // a hidden-state correctness check and not a parallel memory channel.
  const hasCurrentContact = visibleEnemies.length > 0;
  const hasMeaningfulObservation = visibleEnemies.some((enemy) =>
    (isMobileEnemy(enemy) && enemy.kind !== 'miner') || (enemy.isStructure && !enemy.isStatue),
  );
  const rememberedEnemyUnits = [
    ...retainRecentMobileMemories(prior, new Set(visibleUnits.map((enemy) => enemy.id)), now, memoryDuration),
  ];

  world.aiMemory[team] = {
    currentlyVisibleEnemies: visibleEnemies,
    currentlyVisibleComposition: compositionFrom(visibleUnits),
    rememberedEnemyUnits,
    rememberedComposition: compositionFrom(rememberedEnemyUnits),
    rememberedEnemyStructures: retainKnownStructures(prior, visibleStructures),
    knownEnemyBase: knownEnemyBase(team, prior, visibleBases),
    composition: compositionFrom([...visibleUnits, ...rememberedEnemyUnits]),
    lastScoutedAt: visibleUnits.length > 0 ? now : prior.lastScoutedAt ?? null,
    lastCurrentEnemyContactAt: hasCurrentContact ? now : prior.lastCurrentEnemyContactAt ?? null,
    lastMeaningfulEnemyObservationAt: hasMeaningfulObservation ? now : prior.lastMeaningfulEnemyObservationAt ?? null,
  };
}

export function isMemoryFresh(world, team, maxStaleness) {
  const memory = world.aiMemory[team];
  if (!memory || memory.lastScoutedAt === null || memory.lastScoutedAt === undefined) return false;
  return world.matchElapsedTime - memory.lastScoutedAt <= maxStaleness;
}
