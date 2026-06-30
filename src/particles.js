// Lightweight particle system: explosions, sparks, engine trails, debris.

import { rand, randInt, TAU } from './utils.js';

class Particle {
  constructor() { this.alive = false; }
  spawn(x, y, opts) {
    this.alive = true;
    this.x = x; this.y = y;
    const a = opts.angle ?? rand(0, TAU);
    const sp = opts.speed ?? rand(40, 220);
    this.vx = Math.cos(a) * sp;
    this.vy = Math.sin(a) * sp;
    this.life = opts.life ?? rand(0.3, 0.8);
    this.maxLife = this.life;
    this.size = opts.size ?? rand(1.5, 3.5);
    this.color = opts.color ?? '#fff';
    this.drag = opts.drag ?? 0.9;
    this.gravity = opts.gravity ?? 0;
    this.glow = opts.glow ?? true;
  }
  update(dt) {
    this.life -= dt;
    if (this.life <= 0) { this.alive = false; return; }
    this.vx *= Math.pow(this.drag, dt * 60);
    this.vy *= Math.pow(this.drag, dt * 60);
    this.vy += this.gravity * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }
}

export class Particles {
  constructor(max = 600) {
    this.pool = [];
    for (let i = 0; i < max; i++) this.pool.push(new Particle());
    this.cursor = 0;
  }

  _next() {
    // Round-robin reuse; overwrites oldest if pool is exhausted.
    for (let i = 0; i < this.pool.length; i++) {
      const idx = (this.cursor + i) % this.pool.length;
      if (!this.pool[idx].alive) { this.cursor = idx + 1; return this.pool[idx]; }
    }
    const p = this.pool[this.cursor % this.pool.length];
    this.cursor++;
    return p;
  }

  emit(x, y, opts = {}) { this._next().spawn(x, y, opts); }

  burst(x, y, count, opts = {}) {
    for (let i = 0; i < count; i++) this.emit(x, y, opts);
  }

  // A satisfying explosion: a flash of fast sparks + slower glowing embers.
  explosion(x, y, color, scale = 1) {
    const n = Math.round(14 * scale);
    for (let i = 0; i < n; i++) {
      this.emit(x, y, {
        speed: rand(80, 300) * scale,
        life: rand(0.35, 0.85),
        size: rand(2, 4.5) * scale,
        color,
        drag: 0.88,
      });
    }
    for (let i = 0; i < Math.round(6 * scale); i++) {
      this.emit(x, y, {
        speed: rand(20, 90),
        life: rand(0.5, 1.1),
        size: rand(1, 2.5),
        color: '#ffffff',
        drag: 0.92,
      });
    }
  }

  update(dt) {
    for (const p of this.pool) if (p.alive) p.update(dt);
  }

  draw(ctx) {
    ctx.globalCompositeOperation = 'lighter';
    for (const p of this.pool) {
      if (!p.alive) continue;
      const t = p.life / p.maxLife;
      ctx.globalAlpha = Math.max(0, t);
      ctx.fillStyle = p.color;
      if (p.glow) { ctx.shadowBlur = 8; ctx.shadowColor = p.color; }
      const s = p.size * (0.4 + 0.6 * t);
      ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }
}
