export function getTeamHudLayout(canvas, panelWidth) {
  return { player: { x: 4, y: 4, w: panelWidth }, ai: { x: canvas.width - panelWidth - 4, y: 4, w: panelWidth } };
}
