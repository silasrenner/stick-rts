// Canvas input helpers keep CSS-scaled mobile coordinates in the game's
// fixed logical 1400x540 coordinate system.
function canvasPoint(canvas, clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (clientX - rect.left) * (canvas.width / rect.width),
    y: (clientY - rect.top) * (canvas.height / rect.height),
  };
}

export function bindClick(canvas, handler) {
  canvas.addEventListener('click', (event) => {
    const point = canvasPoint(canvas, event.clientX, event.clientY);
    handler(point.x, point.y);
  });
}

export function pointInRect(x, y, rect) {
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

export function bindMouseMove(canvas, handler) {
  canvas.addEventListener('mousemove', (event) => handler(canvasPoint(canvas, event.clientX, event.clientY).x));
  canvas.addEventListener('mouseleave', () => handler(null));
}

// One controller serves desktop drag, mobile one-finger pan, and pinch zoom.
// A small physical-pixel threshold lets normal UI taps stay taps.
export function bindCameraGestures(canvas, { onPan, onZoom, onDragEnd }) {
  const pointers = new Map();
  let lastPan = null;
  let startPan = null;
  let dragStarted = false;
  let lastPinch = null;
  const DRAG_THRESHOLD_PX = 7;

  const pinch = () => {
    const points = [...pointers.values()];
    if (points.length !== 2) return null;
    const [a, b] = points;
    return { x: (a.x + b.x) / 2, distance: Math.hypot(a.x - b.x, a.y - b.y) };
  };
  const beginSinglePointer = () => {
    const point = pointers.values().next().value ?? null;
    lastPan = point;
    startPan = point;
    dragStarted = false;
    lastPinch = null;
  };

  canvas.addEventListener('pointerdown', (event) => {
    if (!event.isPrimary && event.pointerType !== 'touch') return;
    pointers.set(event.pointerId, { ...canvasPoint(canvas, event.clientX, event.clientY), screenX: event.clientX });
    canvas.setPointerCapture?.(event.pointerId);
    if (pointers.size === 1) beginSinglePointer();
    else if (pointers.size === 2) lastPinch = pinch();
  });

  window.addEventListener('pointermove', (event) => {
    if (!pointers.has(event.pointerId)) return;
    const point = { ...canvasPoint(canvas, event.clientX, event.clientY), screenX: event.clientX };
    pointers.set(event.pointerId, point);
    if (pointers.size >= 2) {
      const current = pinch();
      if (current && lastPinch && current.distance > 0 && lastPinch.distance > 0) onZoom(current.x, current.distance / lastPinch.distance);
      lastPinch = current;
      return;
    }
    if (!lastPan || !startPan) return;
    const deltaX = point.x - lastPan.x;
    if (!dragStarted) {
      if (Math.abs(point.screenX - startPan.screenX) < DRAG_THRESHOLD_PX) return;
      dragStarted = true;
      // Apply the full displacement once the gesture becomes a drag, so the
      // threshold never creates a dead zone in camera movement.
      onPan(point.x - startPan.x);
    } else {
      onPan(deltaX);
    }
    lastPan = point;
  });

  const endPointer = (event) => {
    if (!pointers.has(event.pointerId)) return;
    pointers.delete(event.pointerId);
    if (pointers.size === 1) beginSinglePointer();
    else if (pointers.size === 0) {
      if (dragStarted) onDragEnd?.();
      lastPan = null;
      startPan = null;
      dragStarted = false;
      lastPinch = null;
    }
  };
  window.addEventListener('pointerup', endPointer);
  window.addEventListener('pointercancel', endPointer);
}

export function bindWheel(canvas, handler) {
  canvas.addEventListener('wheel', (event) => {
    event.preventDefault();
    handler(event.deltaY, canvasPoint(canvas, event.clientX, event.clientY).x);
  }, { passive: false });
}
