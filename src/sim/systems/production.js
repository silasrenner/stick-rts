import { CONFIG } from '../../config.js';
import { createUnit, createStructure, createTurret } from '../world.js';
import { getUnitCount } from './economy.js';
import { livingStructures, livingTurrets } from './supply.js';

// One sequential FIFO queue per team (economy.js's buyUnit/buyHero/
// buyStructure already validated gold/cap and deducted gold at enqueue
// time). Only the head item's timer ticks — purchases complete in order,
// one at a time, per the brief's default production model. No re-check
// of gold/cap at completion; the entity always materializes once its
// timer elapses.
export function updateProductionQueue(world, dt) {
  for (const team of ['player', 'ai']) {
    const queue = world.teams[team].productionQueue;
    if (queue.length === 0) continue;

    const item = queue[0];
    item.remaining -= dt;
    if (item.remaining <= 0) {
      queue.shift();
      materialize(world, team, item);
    }
  }
}

function materialize(world, team, item) {
  const homeX = team === 'player' ? CONFIG.PLAYER_HOME_X : CONFIG.AI_HOME_X;

  if (item.action === 'turret') {
    const slotIndex = livingTurrets(world, team).filter((turret) => !turret.isStartingTurret).length;
    const sign = team === 'player' ? 1 : -1;
    const x = homeX + sign * CONFIG.TURRET_SLOT_OFFSETS[slotIndex];
    world.structures.push(createTurret(team, x, CONFIG.GROUND_Y));
    return;
  }

  if (item.action === 'structure') {
    const slotIndex = livingStructures(world, team).length;
    const sign = team === 'player' ? 1 : -1;
    const x = homeX + sign * CONFIG.STRUCTURE_SLOT_OFFSETS[slotIndex];
    world.structures.push(createStructure(team, x, CONFIG.GROUND_Y));
    return;
  }

  // unit or hero
  const y = CONFIG.GROUND_Y - (getUnitCount(world, team) % 4) * 30;
  const unit = createUnit(item.kind, team, homeX, y);
  unit.command = world.teams[team].command;
  world.units.push(unit);
}
