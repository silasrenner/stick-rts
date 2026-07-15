import { drawStickFigure } from './stickFigure.js';

// Reads world state only; never mutates it.
export function render(ctx, world) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  for (const unit of world.units) {
    drawStickFigure(ctx, unit);
  }
}
