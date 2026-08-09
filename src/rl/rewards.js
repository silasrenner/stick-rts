import { CONFIG } from '../config.js';

// Training feedback only. These values never change simulation mechanics and
// are emitted as named components in every transition/checkpoint report.
export function calculateRlReward({ enemyCoreDamage = 0, ownCoreDamage = 0, enemyCombatLoss = 0, ownCombatLoss = 0, terminal = null }) {
  const coreDamage = (enemyCoreDamage - ownCoreDamage) / CONFIG.STATUE_HP;
  // Small, symmetric contact signal; terminal and core damage remain decisive.
  const combatExchange = (enemyCombatLoss - ownCombatLoss) * 0.05;
  const terminalComponent = terminal === 'win' ? 2 : terminal === 'loss' ? -2 : 0;
  return {
    total: coreDamage + combatExchange + terminalComponent,
    components: { coreDamage, combatExchange, terminal: terminalComponent },
  };
}
