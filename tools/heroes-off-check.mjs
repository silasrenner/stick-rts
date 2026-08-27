import { CONFIG } from '../src/config.js';
import { createWorld } from '../src/sim/world.js';
import { buyHero, getPurchaseFeasibility } from '../src/sim/systems/economy.js';
import { createPurchaseCandidates } from '../src/sim/ai/actions.js';
import { getBuildMenuButtons } from '../src/render/ui.js';

if (CONFIG.HEROES_ENABLED !== false) throw new Error(`Expected heroes to be disabled, got ${CONFIG.HEROES_ENABLED}.`);

const world = createWorld(27);
world.teams.player.gold = 10_000;
const feasibility = getPurchaseFeasibility(world, 'player', { action: 'hero', kind: 'vanguard' });
if (feasibility.feasible || feasibility.reason !== 'heroesDisabled') {
  throw new Error(`Hero purchase must be authoritatively disabled: ${JSON.stringify(feasibility)}`);
}
const purchase = buyHero(world, 'player', 'vanguard');
if (purchase.ok || purchase.reason !== 'heroesDisabled' || world.teams.player.productionQueue.length !== 0) {
  throw new Error(`Disabled hero must not spend or queue: ${JSON.stringify({ purchase, queue: world.teams.player.productionQueue })}`);
}

if (createPurchaseCandidates().some((candidate) => candidate.action === 'hero')) {
  throw new Error('AI candidate set must not contain heroes while heroes are disabled.');
}
if (getBuildMenuButtons({ width: 1400, height: 540 }).some((button) => button.action === 'hero')) {
  throw new Error('Player build menu must not render hero buttons while heroes are disabled.');
}

console.log('PASS — heroes are preserved in source but unavailable to player and AI.');
