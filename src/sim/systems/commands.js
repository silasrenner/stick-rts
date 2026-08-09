export function setTeamCommand(world, team, command, { userInitiated = false } = {}) {
  const teamState = world.teams[team];
  if (command === 'defend' && userInitiated && teamState.defendAnchor === 'outer') teamState.defendAnchor = 'inner';
  teamState.command = command;
  for (const unit of world.units) {
    if (unit.team !== team || unit.state === 'dying') continue;
    unit.command = command;
    if (command === 'retreat') unit.targetId = null;
  }
}
