// Thin click wrapper — converts a click event to canvas-local coordinates
// (accounting for any CSS scaling) and hands them to the caller, which
// does its own hit-testing against whatever's currently on screen.
export function bindClick(canvas, handler) {
  canvas.addEventListener('click', (event) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;
    handler(x, y);
  });
}

export function pointInRect(x, y, rect) {
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

// Tracks cursor x in canvas-local coordinates for edge-scroll; null once
// the mouse leaves the canvas so the camera stops scrolling.
export function bindMouseMove(canvas, handler) {
  canvas.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    handler((event.clientX - rect.left) * scaleX);
  });
  canvas.addEventListener('mouseleave', () => handler(null));
}
