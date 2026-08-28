import { CONFIG } from '../../config.js';

export function setTeamCommand(world, team, command, { userInitiated = false } = {}) {
  const teamState = world.teams[team];
  if (command === 'defend' && userInitiated) {
    const completedBuildableTurrets = world.structures.filter((entity) => entity.team === team && entity.isTurret && !entity.isStartingTurret && entity.state !== 'destroying').length;
    const furthestCompletedIndex = Math.max(0, Math.min(completedBuildableTurrets - 1, CONFIG.TURRET_SLOT_OFFSETS.length - 1));
    if (teamState.defendCycleStarted) teamState.defendAnchorIndex = (teamState.defendAnchorIndex + 1) % (furthestCompletedIndex + 1);
    else {
      teamState.defendAnchorIndex = Math.min(teamState.defendAnchorIndex, furthestCompletedIndex);
      teamState.defendCycleStarted = true;
    }
  }
  teamState.command = command;
  for (const unit of world.units) {
    if (unit.team !== team || unit.state === 'dying') continue;
    unit.command = command;
    if (command === 'retreat') unit.targetId = null;
  }
}
