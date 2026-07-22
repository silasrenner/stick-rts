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

// Click-and-drag camera panning (S10: promoted from Watch AI to all match
// modes). mousedown arms it on the canvas; mousemove/mouseup listen on
// window so a drag that leaves the canvas mid-gesture still resolves
// correctly instead of getting stuck.
export function bindDrag(canvas, handler) {
  let dragging = false;
  let lastX = 0;

  canvas.addEventListener('mousedown', (event) => {
    dragging = true;
    lastX = event.clientX;
  });
  window.addEventListener('mousemove', (event) => {
    if (!dragging) return;
    const scaleX = canvas.width / canvas.getBoundingClientRect().width;
    const deltaX = (event.clientX - lastX) * scaleX;
    lastX = event.clientX;
    handler(deltaX);
  });
  window.addEventListener('mouseup', () => {
    dragging = false;
  });
}

// Scroll-wheel zoom, cursor-anchored. preventDefault stops the page from
// scrolling; { passive: false } is required for preventDefault to take
// effect on a wheel listener.
export function bindWheel(canvas, handler) {
  canvas.addEventListener(
    'wheel',
    (event) => {
      event.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const x = (event.clientX - rect.left) * scaleX;
      handler(event.deltaY, x);
    },
    { passive: false }
  );
}
