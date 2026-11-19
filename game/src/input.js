// Keyboard and mouse input. Held keys steer; one-shot presses are queued as
// flags and taken once by the loop, so a press between frames is never lost.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_ENTER = 4;
export const ACTION_MUTE = 8;

export function createInput(canvas, game) {
  const keys = new Set();
  let actions = 0;
  let mouseX = 0; let mouseY = 0; let mouseDown = false; let mouseSeen = false;
  let punchQueued = false;

  window.addEventListener('keydown', (event) => {
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) event.preventDefault();
    keys.add(event.code);
    if (event.repeat) return;
    if (event.code === 'Space' || event.code === 'Enter') actions |= ACTION_CONFIRM;
    if (event.code === 'KeyP' || event.code === 'Escape') actions |= ACTION_PAUSE;
    if (event.code === 'KeyE') actions |= ACTION_ENTER;
    if (event.code === 'KeyM') actions |= ACTION_MUTE;
    if (event.code === 'KeyF') punchQueued = true;
  });
  window.addEventListener('keyup', (event) => keys.delete(event.code));
  window.addEventListener('blur', () => keys.clear());

  canvas.addEventListener('mousemove', (event) => {
    const r = canvas.getBoundingClientRect();
    mouseX = event.clientX - r.left; mouseY = event.clientY - r.top; mouseSeen = true;
  });
  canvas.addEventListener('mousedown', (event) => {
    if (event.button === 0) mouseDown = true;
    if (event.button === 2) punchQueued = true;
    const r = canvas.getBoundingClientRect();
    mouseX = event.clientX - r.left; mouseY = event.clientY - r.top; mouseSeen = true;
  });
  window.addEventListener('mouseup', (event) => { if (event.button === 0) mouseDown = false; });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  return {
    moveX() {
      return ((keys.has('KeyD') || keys.has('ArrowRight')) ? 1 : 0) - ((keys.has('KeyA') || keys.has('ArrowLeft')) ? 1 : 0);
    },
    moveY() {
      return ((keys.has('KeyS') || keys.has('ArrowDown')) ? 1 : 0) - ((keys.has('KeyW') || keys.has('ArrowUp')) ? 1 : 0);
    },
    sprint() { return keys.has('ShiftLeft') || keys.has('ShiftRight'); },
    get shooting() { return mouseDown; },
    get punchPressed() { const v = punchQueued; punchQueued = false; return v; },
    get mouseActive() { return mouseSeen; },
    get mouseWorldX() { return game.camera.x + mouseX / game.viewScale; },
    get mouseWorldY() { return game.camera.y + mouseY / game.viewScale; },
    takeActions() { const t = actions; actions = 0; return t; },
  };
}
