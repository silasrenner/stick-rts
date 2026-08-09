import { getGoldDifferential, formatMatchClock } from '../src/render/matchTelemetry.js';

if (formatMatchClock(222.9) !== '03:42') throw new Error(`Clock formatting failed: ${formatMatchClock(222.9)}`);
const redLead = getGoldDifferential({ teams: { player: { gold: 83, goldSpent: 2500 }, ai: { gold: 100, goldSpent: 600 } } });
if (redLead.amount !== 1883 || redLead.team !== 'player') throw new Error(`Red differential failed: ${JSON.stringify(redLead)}`);
const tied = getGoldDifferential({ teams: { player: { gold: 100, goldSpent: 0 }, ai: { gold: 100, goldSpent: 0 } } });
if (tied.amount !== 0 || tied.team !== null) throw new Error(`Tie differential failed: ${JSON.stringify(tied)}`);
console.log('PASS — match clock and total-resource gold differential are correct.');
