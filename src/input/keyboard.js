// Thin wrapper for the S2 debug harness — maps single keys to handlers.
// Not the generic continuous-input abstraction hero direct-control (S4)
// will need; that's a separate concern for when it's actually required.
export function bindDebugKeys(handlerMap) {
  window.addEventListener('keydown', (event) => {
    if (event.repeat) return; // ignore OS/browser auto-repeat while a key is held
    const handler = handlerMap[event.key.toLowerCase()];
    if (handler) handler();
  });
}
