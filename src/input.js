// Keyboard + touch input. Exposes held state (left/right/fire) and one-shot
// "pressed" edge events (start/pause/mute/etc). Call postUpdate() each frame
// to clear the edge events.

const KEY_MAP = {
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  Space: 'fire',
  Enter: 'confirm', NumpadEnter: 'confirm',
  KeyP: 'pause',
  KeyM: 'mute',
  Escape: 'pause',
};

export class Input {
  constructor(canvas, touchControls) {
    this.held = new Set();      // actions currently held
    this.pressed = new Set();   // actions that went down this frame (edge)
    this.anyKeyThisFrame = false;
    this.typed = '';            // alpha chars typed this frame (initials entry)
    this.backspace = false;     // backspace pressed this frame
    this._onFirstGesture = null;

    window.addEventListener('keydown', (e) => {
      const action = KEY_MAP[e.code];
      // Prevent page scroll on arrows/space.
      if (action || e.code === 'Space') e.preventDefault();
      this._fireFirstGesture();
      this.anyKeyThisFrame = true;
      // Capture letters / backspace for initials entry.
      if (/^Key[A-Z]$/.test(e.code)) this.typed += e.code.slice(3);
      if (e.code === 'Backspace') { e.preventDefault(); this.backspace = true; }
      if (!action) return;
      if (!this.held.has(action)) this.pressed.add(action);
      this.held.add(action);
    });

    window.addEventListener('keyup', (e) => {
      const action = KEY_MAP[e.code];
      if (action) this.held.delete(action);
    });

    // Lose focus -> release everything (avoids "stuck" movement).
    window.addEventListener('blur', () => this.held.clear());

    // Touch / pointer buttons.
    if (touchControls) {
      for (const btn of touchControls.querySelectorAll('[data-key]')) {
        const action = KEY_MAP[btn.dataset.key] || btn.dataset.key;
        const down = (e) => {
          e.preventDefault();
          this._fireFirstGesture();
          this.anyKeyThisFrame = true;
          if (!this.held.has(action)) this.pressed.add(action);
          this.held.add(action);
        };
        const up = (e) => { e.preventDefault(); this.held.delete(action); };
        btn.addEventListener('pointerdown', down);
        btn.addEventListener('pointerup', up);
        btn.addEventListener('pointercancel', up);
        btn.addEventListener('pointerleave', up);
      }
    }

    // Tapping the canvas counts as confirm/start on touch.
    canvas.addEventListener('pointerdown', () => {
      this._fireFirstGesture();
      this.anyKeyThisFrame = true;
      this.pressed.add('confirm');
    });
  }

  // Register a callback that runs once on the first user gesture
  // (needed to start the Web Audio context under autoplay policies).
  onFirstGesture(cb) { this._onFirstGesture = cb; }
  _fireFirstGesture() {
    if (this._onFirstGesture) { this._onFirstGesture(); this._onFirstGesture = null; }
  }

  isHeld(action) { return this.held.has(action); }
  wasPressed(action) { return this.pressed.has(action); }

  // Movement axis: -1 (left) .. +1 (right)
  get axis() {
    return (this.held.has('right') ? 1 : 0) - (this.held.has('left') ? 1 : 0);
  }

  postUpdate() {
    this.pressed.clear();
    this.anyKeyThisFrame = false;
    this.typed = '';
    this.backspace = false;
  }
}
