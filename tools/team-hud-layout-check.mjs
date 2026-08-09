import { getTeamHudLayout } from '../src/render/teamHud.js';

const layout = getTeamHudLayout({ width: 1400, height: 540 }, 280);
if (layout.player.x !== 4 || layout.ai.x !== 1116) throw new Error(`HUD panels are not pinned to opposing sides: ${JSON.stringify(layout)}`);
if (layout.player.w !== 280 || layout.ai.w !== 280) throw new Error(`HUD panel widths are wrong: ${JSON.stringify(layout)}`);
console.log('PASS — Red and Blue HUD panels reserve opposing top corners.');
