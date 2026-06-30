// Entry point: sets up the canvas (with HiDPI support), wires input,
// constructs the Game, and runs the delta-time render loop.

import { WIDTH, HEIGHT } from './config.js';
import { Game } from './game.js';
import { Input } from './input.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d', { alpha: false });

// --- HiDPI: render at device pixel ratio while keeping logical WIDTH/HEIGHT. ---
function setupHiDPI() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(WIDTH * dpr);
  canvas.height = Math.round(HEIGHT * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = true;
}
setupHiDPI();
window.addEventListener('resize', setupHiDPI);

// --- Touch controls: reveal on touch-capable devices. ---
const isTouch = window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
const touchControls = document.getElementById('touch-controls');
if (isTouch) touchControls.hidden = false;

// --- Input + Game ---
const input = new Input(canvas, touchControls);
const game = new Game(ctx, input);

// --- Main loop (delta-time, frame-rate independent) ---
let last = performance.now();
function frame(now) {
  let dt = (now - last) / 1000;
  last = now;
  // Clamp dt so a backgrounded tab doesn't teleport everything on return.
  if (dt > 0.05) dt = 0.05;

  game.update(dt);
  game.render();
  input.postUpdate();

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
