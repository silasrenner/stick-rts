import { createWorld, createUnit } from '../src/sim/world.js';
import { applyCommanderDecision } from '../src/commander/runtime.js';
import { parseCommanderDecision } from '../src/commander/providers.js';

const world = createWorld(9101);
world.matchState = 'playing';
const warrior = createUnit('warrior', 'player', 200, 440);
world.units.push(warrior);

const accepted = parseCommanderDecision('{"command":"attack","objective":"pressure","targetIntent":"attack-enemy-core","horizonSeconds":30,"purchasePriority":["warrior"]}');
if (!accepted.ok) throw new Error(`Expected valid model output to be accepted: ${JSON.stringify(accepted)}`);
if (!applyCommanderDecision(world, 'player', accepted).ok) throw new Error('Accepted commander intent did not apply.');
const before = {
  command: world.teams.player.command,
  priority: [...world.teams.player.commanderPriority],
  plan: { ...world.teams.player.commanderPlan },
  unitCommand: warrior.command,
  revision: world.teams.player.commanderEvent.revision,
};

const malformed = parseCommanderDecision('{"command":"attack","objective":"pressure"}');
if (malformed.ok || malformed.reason !== 'rejected-schema') {
  throw new Error(`Malformed output was not a rejected-schema result: ${JSON.stringify(malformed)}`);
}
const rejected = applyCommanderDecision(world, 'player', malformed);
if (rejected.ok || rejected.reason !== 'rejected-schema') {
  throw new Error(`Runtime did not preserve the rejection result: ${JSON.stringify(rejected)}`);
}
const after = world.teams.player;
if (after.command !== before.command || after.commanderPriority.join('|') !== before.priority.join('|')
  || JSON.stringify(after.commanderPlan) !== JSON.stringify(before.plan) || warrior.command !== before.unitCommand
  || after.commanderEvent.revision !== before.revision) {
  throw new Error('Rejected model output caused strategic world mutation.');
}
if (after.commanderEvent.status !== 'rejected-schema') {
  throw new Error(`Rejected output was not recorded as telemetry: ${JSON.stringify(after.commanderEvent)}`);
}

const noPlanWorld = createWorld(9102);
noPlanWorld.matchState = 'playing';
const noPlanResult = applyCommanderDecision(noPlanWorld, 'player', { ok: false, reason: 'rejected-provider', detail: 'timeout' });
if (noPlanResult.ok || noPlanWorld.teams.player.commanderPlan || noPlanWorld.teams.player.commanderPriority?.length) {
  throw new Error('An initial provider rejection created a fallback plan or purchase intent.');
}
if (noPlanWorld.teams.player.command !== 'defend') {
  throw new Error('Initial provider rejection changed the world command.');
}

console.log('PASS — malformed/provider commander results preserve accepted intent and never synthesize a fallback strategy.');
