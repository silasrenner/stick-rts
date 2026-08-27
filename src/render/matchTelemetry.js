export function formatMatchClock(seconds) {
  const wholeSeconds = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(wholeSeconds / 60)).padStart(2, '0')}:${String(wholeSeconds % 60).padStart(2, '0')}`;
}

export function getGoldDifferential(world) {
  const total = (team) => world.teams[team].gold + (world.teams[team].goldSpent ?? 0);
  const difference = total('player') - total('ai');
  return { amount: Math.abs(difference), team: difference === 0 ? null : difference > 0 ? 'player' : 'ai' };
}

// A team's kills are the opponent's authoritative unit-loss total. The
// simulation intentionally records losses at the death transition, so this
// remains accurate after a dying unit has been removed from world.units.
export function getUnitKillTotals(world) {
  return {
    player: world.teams.ai.losses ?? 0,
    ai: world.teams.player.losses ?? 0,
  };
}
