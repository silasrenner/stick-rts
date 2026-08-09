export function formatMatchClock(seconds) {
  const wholeSeconds = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(wholeSeconds / 60)).padStart(2, '0')}:${String(wholeSeconds % 60).padStart(2, '0')}`;
}

export function getGoldDifferential(world) {
  const total = (team) => world.teams[team].gold + (world.teams[team].goldSpent ?? 0);
  const difference = total('player') - total('ai');
  return { amount: Math.abs(difference), team: difference === 0 ? null : difference > 0 ? 'player' : 'ai' };
}
