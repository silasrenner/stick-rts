import { createScriptedOpponentEnvironment } from '../src/rl/environment.js';

const env = createScriptedOpponentEnvironment({ opponentDifficulty: 'hard', decisionSeconds: 5, maxEpisodeSeconds: 30 });
const initial = env.reset(22001);
if (env.world.teams.player.difficulty !== null || env.world.teams.ai.difficulty !== 'hard') {
  throw new Error('Scripted-opponent environment must leave the learner policy-controlled and enable only the named scripted opponent.');
}
const playerAction = initial.actionMask.findIndex(Boolean);
const step = env.step(playerAction);
if (!step.actionResult.ok) throw new Error(`Expected learner legal action, got ${JSON.stringify(step.actionResult)}`);
if (env.world.teams.ai.productionQueue.length === 0) {
  throw new Error('Named scripted Hard opponent did not produce through the shared authoritative simulation.');
}
if (!Array.isArray(step.observation) || step.observation.length !== 35 || !Array.isArray(step.actionMask) || step.actionMask.length !== 18) {
  throw new Error('Scripted-opponent transition must preserve the RL observation/mask contract.');
}
console.log('PASS — learner acts through bounded RL macros against an explicit scripted Hard opponent in the shared simulator.');
