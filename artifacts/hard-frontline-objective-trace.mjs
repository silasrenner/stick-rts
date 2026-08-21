import { CONFIG } from '../src/config.js';
import { buildAiAssessment } from '../src/sim/ai/assessment.js';
import { DIFFICULTIES } from '../src/sim/ai/difficulties.js';
import { runTick } from '../src/sim/tick.js';
import { createWorld, findEntityById, isAliveEntity } from '../src/sim/world.js';

const seed = Number(process.argv[2] ?? 701);
const maxSeconds = Number(process.argv[3] ?? 3000);
const requestedTeam = process.argv[4] ?? 'ai';
const teams = requestedTeam === 'both' ? ['player', 'ai'] : [requestedTeam];

function compactSnapshot(world, team, label) {
  const assessment = buildAiAssessment(world, team, DIFFICULTIES.hard);
  return {
    label,
    time: Number(world.matchElapsedTime.toFixed(1)),
    goal: world.teams[team].strategicGoal,
    command: world.teams[team].command,
    totalFriendlyCombat: assessment.combatUnits,
    frontlineFriendlyCombat: assessment.frontline.friendlyCombatCount,
    frontlineFriendlyPower: assessment.frontline.friendlyPower,
    frontlineVisibleEnemyCombat: assessment.frontline.visibleEnemyCombatCount,
    frontlineVisibleEnemyPower: assessment.frontline.visibleEnemyPower,
    forwardMostFriendlyCombatX: assessment.objective.forwardMostFriendlyCombatX === null ? null : Number(assessment.objective.forwardMostFriendlyCombatX.toFixed(1)),
    objectiveDistanceRemaining: assessment.objective.distanceRemaining === null ? null : Number(assessment.objective.distanceRemaining.toFixed(1)),
    objectiveProgress: Number(assessment.objective.progress.toFixed(4)),
  };
}

function hasStructuralContact(world, team) {
  return world.units.some((unit) => {
    if (unit.team !== team || unit.isMiner || !isAliveEntity(unit) || unit.targetId === null) return false;
    const target = findEntityById(world, unit.targetId);
    return target?.team !== team && (target.isStructure || target.isStatue);
  });
}

const world = createWorld(seed);
world.matchState = 'playing';
world.teams.player.difficulty = 'hard';
world.teams.ai.difficulty = 'hard';
const cycles = Object.fromEntries(teams.map((team) => [team, []]));
const active = Object.fromEntries(teams.map((team) => [team, null]));
const previousCommand = Object.fromEntries(teams.map((team) => [team, world.teams[team].command]));

for (let tick = 0; tick < maxSeconds * CONFIG.TICK_HZ && world.matchState === 'playing'; tick += 1) {
  runTick(world, 1 / CONFIG.TICK_HZ);
  for (const team of teams) {
    const command = world.teams[team].command;
    const cycle = active[team];
    if (previousCommand[team] !== 'attack' && command === 'attack') {
      active[team] = { launch: compactSnapshot(world, team, 'attack-launch'), firstContact: null, midEngagement: null, structuralContact: null, exit: null };
      cycles[team].push(active[team]);
    }
    if (active[team]) {
      const assessment = buildAiAssessment(world, team, DIFFICULTIES.hard);
      if (!active[team].firstContact && assessment.frontline.visibleEnemyCombatCount > 0) {
        active[team].firstContact = compactSnapshot(world, team, 'first-contact');
      }
      if (active[team].firstContact && !active[team].midEngagement && world.matchElapsedTime >= active[team].firstContact.time + 10) {
        active[team].midEngagement = compactSnapshot(world, team, 'mid-engagement');
      }
      if (!active[team].structuralContact && hasStructuralContact(world, team)) {
        active[team].structuralContact = compactSnapshot(world, team, 'structural-contact');
      }
      if (previousCommand[team] === 'attack' && command !== 'attack') {
        active[team].exit = compactSnapshot(world, team, 'attack-exit-rebuild');
        active[team] = null;
      }
    }
    previousCommand[team] = command;
  }
}

console.log(JSON.stringify({ seed, maxSeconds, requestedTeam, outcome: world.matchState, duration: Number(world.matchElapsedTime.toFixed(1)), cycles }, null, 2));
