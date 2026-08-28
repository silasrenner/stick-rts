import { recordGoldHistory, getGoldChartSegments } from '../src/sim/goldHistory.js';

const world = { matchElapsedTime: 0, teams: { player: { gold: 300, goldSpent: 0 }, ai: { gold: 300, goldSpent: 0 } }, goldHistory: { nextSampleAt: 0, samples: [] } };
recordGoldHistory(world);
world.matchElapsedTime = 1.2; world.teams.player.gold = 500; recordGoldHistory(world);
world.matchElapsedTime = 2.2; world.teams.ai.gold = 800; recordGoldHistory(world);
if (world.goldHistory.samples.map((sample) => sample.time).join(',') !== '0,1,2') throw new Error(`Gold history must sample once per sim second: ${JSON.stringify(world.goldHistory.samples)}`);
if (world.goldHistory.samples.map((sample) => sample.difference).join(',') !== '0,200,-300') throw new Error(`Gold history must use total-resource differential: ${JSON.stringify(world.goldHistory.samples)}`);
const segments = getGoldChartSegments(world.goldHistory.samples, 100, 40, 200, 80);
if (!segments.some((segment) => segment.team === 'player') || !segments.some((segment) => segment.team === 'ai')) throw new Error(`Gold chart must segment blue and red leads across zero: ${JSON.stringify(segments)}`);
console.log('PASS — gold history is authoritative, one-second sampled, and chart segments split at zero.');
