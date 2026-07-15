export function setTeamCommand(world, team, command) {
  for (const unit of world.units) {
    if (unit.team !== team || unit.state === 'dying') continue;
    unit.command = command;
    if (command === 'retreat') unit.targetId = null;
  }
}
