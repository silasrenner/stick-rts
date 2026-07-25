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

// Pointer events cover mouse, pen, and touch. The previous mouse-only
// listeners made camera panning unreachable on mobile even though tap-generated
// click events still operated UI buttons. Pointer capture plus the window
// listeners keep a drag continuous after it leaves the canvas.
export function bindDrag(canvas, handler) {
  let activePointerId = null;
  let lastX = 0;

  canvas.addEventListener('pointerdown', (event) => {
    if (!event.isPrimary || activePointerId !== null) return;
    activePointerId = event.pointerId;
    lastX = event.clientX;
    canvas.setPointerCapture?.(event.pointerId);
  });
  window.addEventListener('pointermove', (event) => {
    if (event.pointerId !== activePointerId) return;
    const scaleX = canvas.width / canvas.getBoundingClientRect().width;
    const deltaX = (event.clientX - lastX) * scaleX;
    lastX = event.clientX;
    handler(deltaX);
  });
  const endDrag = (event) => {
    if (event.pointerId !== activePointerId) return;
    activePointerId = null;
  };
  window.addEventListener('pointerup', endDrag);
  window.addEventListener('pointercancel', endDrag);
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
