const port = Number(process.env.PORT || 8812);
const response = await fetch(`http://127.0.0.1:${port}/api/commander`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ team: 'player', state: { gold: 450, population: 6, friendly: { warrior: 2, archer: 0, turret: 0 }, enemy: { warrior: 0, archer: 3, turret: 0 }, command: 'defend' } }),
});
if (!response.ok) throw new Error(`Enabled commander endpoint failed: ${response.status} ${await response.text()}`);
const decision = await response.json();
if (!['attack', 'defend', 'retreat'].includes(decision.command)) throw new Error(`Invalid commander decision: ${JSON.stringify(decision)}`);
console.log(`PASS — LAN commander endpoint returned ${JSON.stringify(decision)}`);
