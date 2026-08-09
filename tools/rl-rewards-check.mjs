import { calculateRlReward } from '../src/rl/rewards.js';

const forward = calculateRlReward({ enemyCoreDamage: 75, ownCoreDamage: 20, enemyCombatLoss: 3, ownCombatLoss: 1, terminal: null });
const mirrored = calculateRlReward({ enemyCoreDamage: 20, ownCoreDamage: 75, enemyCombatLoss: 1, ownCombatLoss: 3, terminal: null });
if (forward.total !== -mirrored.total || forward.components.coreDamage !== -mirrored.components.coreDamage || forward.components.combatExchange !== -mirrored.components.combatExchange) {
  throw new Error(`Reward is not team-symmetric: ${JSON.stringify({ forward, mirrored })}`);
}
const win = calculateRlReward({ enemyCoreDamage: 2000, ownCoreDamage: 0, terminal: 'win' });
const loss = calculateRlReward({ enemyCoreDamage: 0, ownCoreDamage: 2000, terminal: 'loss' });
if (win.components.terminal <= Math.abs(win.components.coreDamage) || win.total !== -loss.total) {
  throw new Error(`Terminal result is not dominant and symmetric: ${JSON.stringify({ win, loss })}`);
}
console.log('PASS — RL reward is explicit, terminal-dominant, and team-symmetric.');
