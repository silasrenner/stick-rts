import { CONFIG } from '../src/config.js';
import { createWorld, isAliveEntity } from '../src/sim/world.js';
import { runTick } from '../src/sim/tick.js';

const SEEDS = [701, 702, 703, 704, 705];
const HALVED_YIELD = 11.5;
const ORIGINAL_YIELD = 23;
const SIMULATION_TICKS = 180_000;

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

function simulate(seed, goldPerTrip) {
  CONFIG.GOLD_PER_TRIP = goldPerTrip;
  const world = createWorld(seed);
  world.matchState = 'playing';
  world.teams.player.difficulty = null;
  world.teams.ai.difficulty = 'hard';
  world.teams.ai.decisionTimer = 0;

  const purchases = { miner: 0, warrior: 0, archer: 0 };
  let lastDecision = null;
  let firstAttackAt = null;
  for (let tick = 0; tick < SIMULATION_TICKS && world.matchState === 'playing'; tick += 1) {
    runTick(world, 1 / CONFIG.TICK_HZ);
    const decision = world.teams.ai.lastAiDecision;
    if (!decision || decision === lastDecision) continue;
    lastDecision = decision;
    const kind = decision.selection?.result?.ok ? decision.selection.candidate?.kind : null;
    if (kind in purchases) purchases[kind] += 1;
    if (firstAttackAt === null && decision.command === 'attack') firstAttackAt = world.matchElapsedTime;
  }
  const living = Object.fromEntries(Object.keys(purchases).map((kind) => [
    kind,
    world.units.filter((unit) => unit.team === 'ai' && unit.kind === kind && isAliveEntity(unit)).length,
  ]));
  return { seed, goldPerTrip, purchases, living, firstAttackAt, gold: world.teams.ai.gold, outcome: world.matchState };
}

const configuredYield = CONFIG.GOLD_PER_TRIP;
const halved = SEEDS.map((seed) => simulate(seed, HALVED_YIELD));
const restored = SEEDS.map((seed) => simulate(seed, ORIGINAL_YIELD));
CONFIG.GOLD_PER_TRIP = configuredYield;

const halved701 = halved.find((result) => result.seed === 701);
expect(halved701.purchases.miner === 78 && halved701.purchases.warrior === 2 && halved701.firstAttackAt === null, `Expected the halved-income seed-701 spiral; got ${JSON.stringify(halved701)}.`);
for (const result of restored) {
  expect(result.purchases.miner >= 18 && result.purchases.miner <= 21, `Original income must restore the 18–21 miner composition at seed ${result.seed}; got ${JSON.stringify(result)}.`);
  expect(result.purchases.warrior >= 36 && result.purchases.warrior <= 39, `Original income must restore the 36–39 warrior purchases at seed ${result.seed}; got ${JSON.stringify(result)}.`);
  expect(result.firstAttackAt >= 450 && result.firstAttackAt <= 500, `Original income must restore first attack to the prior 450–500s window at seed ${result.seed}; got ${JSON.stringify(result)}.`);
}
expect(configuredYield === ORIGINAL_YIELD, `GOLD_PER_TRIP must restore the original ${ORIGINAL_YIELD}; got ${configuredYield}.`);

console.log(JSON.stringify({ halved, restored, configuredYield }, null, 2));
console.log('PASS — original 23-gold trips restore the prior Hard composition and first-attack timing cohort.');
