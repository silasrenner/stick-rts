import { createWorld, createUnit } from '../src/sim/world.js';
import { buildCommanderState, applyCommanderDecision, isCommanderReplanDue, isCurrentCommanderRequest } from '../src/commander/runtime.js';

const world = createWorld(3);
world.matchState = 'playing';
world.teams.player.gold = 450;
const playerWarrior = createUnit('warrior', 'player', 200, 440);
const playerArcher = createUnit('archer', 'player', 220, 440);
playerWarrior.targetId = 99;
playerArcher.targetId = 99;
world.units.push(playerWarrior, playerArcher, createUnit('archer', 'ai', 300, 440));
const state = buildCommanderState(world, 'player');
if (state.gold !== 450 || state.purchaseOptions.miner.cost !== 100 || state.purchaseOptions.archer.cost !== 280 || state.friendly.warrior !== 1 || state.enemy.archer !== 1) throw new Error(`Commander state is not team-scoped or does not expose purchase costs: ${JSON.stringify(state)}`);
applyCommanderDecision(world, 'player', { ok: true, decision: { command: 'attack', objective: 'pressure', targetIntent: 'attack-enemy-core', horizonSeconds: 30, purchasePriority: ['turret', 'archer'] } });
if (world.teams.player.command !== 'attack' || playerWarrior.command !== 'attack' || playerArcher.command !== 'attack'
  || world.teams.player.commanderPriority.join(',') !== 'turret,archer' || world.teams.player.commanderPlan?.objective !== 'pressure' || world.teams.player.commanderPlan?.horizonSeconds !== 30) throw new Error('Validated strategic plan was not applied to the team and its units.');
if (isCommanderReplanDue(world, 'player')) throw new Error('A fresh active strategic plan requested an unnecessary replan.');
world.matchElapsedTime = 30;
if (!isCommanderReplanDue(world, 'player')) throw new Error('An expired strategic plan did not request a replan.');
world.matchElapsedTime = 0;
if (world.teams.player.commanderEvent?.command !== 'attack' || world.teams.player.commanderEvent?.revision !== 1 || world.teams.player.commanderEvent?.at !== world.matchElapsedTime) throw new Error(`Commander event was not recorded: ${JSON.stringify(world.teams.player.commanderEvent)}`);
const rejected = applyCommanderDecision(world, 'player', { ok: false, reason: 'rejected-schema', detail: 'invalid command' });
if (rejected.ok || world.teams.player.command !== 'attack' || world.teams.player.commanderPriority.join(',') !== 'turret,archer'
  || playerWarrior.command !== 'attack' || playerArcher.command !== 'attack' || world.teams.player.commanderEvent?.revision !== 1
  || world.teams.player.commanderEvent?.status !== 'rejected-schema') {
  throw new Error(`A rejected companion response mutated deterministic commander strategy: ${JSON.stringify(world.teams.player)}`);
}
applyCommanderDecision(world, 'player', { ok: true, decision: { command: 'retreat', objective: 'recover', targetIntent: 'retreat-home', horizonSeconds: 30, purchasePriority: ['miner'] } });
if (playerWarrior.command !== 'retreat' || playerArcher.command !== 'retreat' || playerWarrior.targetId !== null || playerArcher.targetId !== null) {
  throw new Error('Commander retreat did not use the deterministic unit-command boundary.');
}
const controller = { pending: true };
world.modelCommander = controller;
if (!isCurrentCommanderRequest(world, world, controller)) throw new Error('Current model request was incorrectly rejected.');
const replacementWorld = createWorld(4);
replacementWorld.matchState = 'playing';
replacementWorld.modelCommander = { pending: true };
if (isCurrentCommanderRequest(replacementWorld, world, controller)) throw new Error('A stale response could affect a replacement Watch world.');
world.matchState = 'won';
if (isCurrentCommanderRequest(world, world, controller)) throw new Error('A completed match accepted a late commander response.');
console.log('PASS — model commander receives scoped state, applies validated intent, and rejects stale/finished-match responses.');
