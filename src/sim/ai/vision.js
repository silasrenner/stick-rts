import { CONFIG } from '../../config.js';
import { isAliveEntity } from '../world.js';

// Scouting-gated: `team` only learns about enemies currently within
// AI_SIGHT_RANGE of one of its own living units — mirrors the player's
// camera-based fog of war (PLAN.md §2.4), just driven by unit position
// instead of camera position. If nothing is visible right now, memory is
// left as-is (goes stale) rather than cleared.
export function updateAiMemory(world, team) {
  const myUnits = world.units.filter((u) => u.team === team && isAliveEntity(u));
  const enemyUnits = world.units.filter((u) => u.team !== team && isAliveEntity(u));

  const visibleEnemies = enemyUnits.filter((enemy) =>
    myUnits.some((mine) => Math.abs(mine.x - enemy.x) <= CONFIG.AI_SIGHT_RANGE)
  );
  if (visibleEnemies.length === 0) return;

  const composition = {};
  for (const enemy of visibleEnemies) {
    composition[enemy.kind] = (composition[enemy.kind] ?? 0) + 1;
  }

  world.aiMemory[team] = { composition, lastScoutedAt: world.matchElapsedTime };
}

export function isMemoryFresh(world, team, maxStaleness) {
  const memory = world.aiMemory[team];
  if (!memory) return false;
  return world.matchElapsedTime - memory.lastScoutedAt <= maxStaleness;
}
