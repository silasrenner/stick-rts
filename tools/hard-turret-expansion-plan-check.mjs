import { CONFIG } from '../src/config.js';
import { updateAiDecisions } from '../src/sim/ai/behavior.js';
import { createUnit, createWorld } from '../src/sim/world.js';

const DT = 1 / CONFIG.TICK_HZ;

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

function planSnapshot(seed) {
  const world = createWorld(seed);
  return JSON.stringify({
    player: world.teams.player.turretExpansionPlan,
    ai: world.teams.ai.turretExpansionPlan,
  });
}

// Planning is sampled once from isolated team-local seeded streams. It must be
// replayable, bounded to the approved one-or-two extra tower objective, and
// leave no dependence on decision-timer RNG draw order.
{
  const first = createWorld(1401);
  const second = createWorld(1401);
  expect(planSnapshot(1401) === planSnapshot(1401), 'The same match seed must produce identical per-team turret expansion plans.');
  for (const team of ['player', 'ai']) {
    const plan = first.teams[team].turretExpansionPlan;
    expect(plan.targetCount === 1 || plan.targetCount === 2, `${team}: targetCount must be one or two, got ${plan.targetCount}.`);
    expect(plan.eligibleAt.length === plan.targetCount, `${team}: each planned turret needs exactly one eligibility time.`);
    expect(plan.eligibleAt.every((time, index) => Number.isFinite(time) && time > 0 && (index === 0 || time > plan.eligibleAt[index - 1])), `${team}: eligibility windows must be increasing finite times.`);
    expect(JSON.stringify(plan) === JSON.stringify(second.teams[team].turretExpansionPlan), `${team}: same seed plan must replay exactly.`);
  }
}

// A due planned expansion must use the normal turret executor even when the
// force is launch-ready. The old blanket force-ready defer was the reason
// ordinary Watch matches never built their expansion line.
{
  const world = createWorld(1402);
  world.matchState = 'playing';
  for (const team of ['player', 'ai']) {
    const plan = world.teams[team].turretExpansionPlan;
    world.teams[team].difficulty = 'hard';
    world.teams[team].decisionTimer = 0;
    world.teams[team].gold = CONFIG.TURRET_COST + CONFIG.UNIT_STATS.warrior.cost * 3;
    world.matchElapsedTime = Math.max(world.matchElapsedTime, plan.eligibleAt[0]);
    const homeX = team === 'player' ? CONFIG.PLAYER_HOME_X : CONFIG.AI_HOME_X;
    for (let index = 0; index < CONFIG.HARD_TURRET_COMBAT_RESERVE; index += 1) {
      world.units.push(createUnit('warrior', team, homeX, CONFIG.GROUND_Y));
    }
  }
  updateAiDecisions(world, DT);
  for (const team of ['player', 'ai']) {
    const turret = world.teams[team].productionQueue.find((item) => item.action === 'turret');
    expect(turret, `${team}: a due funded planned turret must enqueue through the normal production queue.`);
    expect(world.teams[team].lastAiDecision.turretAttempt?.result?.ok === true, `${team}: decision record must report the normal successful turret execution.`);
  }
}

console.log('PASS — Hard teams receive deterministic one-or-two turret plans and execute due funded expansions through the normal economy path.');
