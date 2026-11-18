// Keyboard + mouse input with edge detection. Gameplay reads `keys` for
// held state and `pressed` for single-fire actions (E, pause, mute), so
// one keypress can never trigger the same action twice.
export const keys = {};
export const pressed = {};
export const mouse = { x: 0, y: 0, down: false, clicked: false, wheel: 0 };

const KEYMAP = {
  KeyW: 'up', ArrowUp: 'up',
  KeyS: 'down', ArrowDown: 'down',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
  ShiftLeft: 'run', ShiftRight: 'run',
  KeyE: 'interact', KeyM: 'mute', KeyR: 'reload',
  Escape: 'pause', KeyP: 'pause',
  Digit1: 'slot1', Digit2: 'slot2', Digit3: 'slot3',
  KeyF: 'horn',
};

export function bindInput(canvas) {
  window.addEventListener('keydown', (e) => {
    const name = KEYMAP[e.code];
    if (name) {
      if (!keys[name]) pressed[name] = true;
      keys[name] = true;
      if (['up', 'down', 'left', 'right'].includes(name)) e.preventDefault();
    }
  });
  window.addEventListener('keyup', (e) => {
    const name = KEYMAP[e.code];
    if (name) keys[name] = false;
  });
  canvas.addEventListener('mousemove', (e) => {
    const r = canvas.getBoundingClientRect();
    mouse.x = (e.clientX - r.left) * (canvas.width / r.width);
    mouse.y = (e.clientY - r.top) * (canvas.height / r.height);
  });
  canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0) { mouse.down = true; mouse.clicked = true; }
  });
  window.addEventListener('mouseup', (e) => {
    if (e.button === 0) mouse.down = false;
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  window.addEventListener('blur', () => {
    for (const k of Object.keys(keys)) keys[k] = false;
    mouse.down = false;
  });
}

export function endFrameInput() {
  for (const k of Object.keys(pressed)) pressed[k] = false;
  mouse.clicked = false;
  mouse.wheel = 0;
}
