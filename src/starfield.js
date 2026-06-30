// Multi-layer parallax scrolling starfield + drifting nebula glow.

import { WIDTH, HEIGHT } from './config.js';
import { rand, randInt } from './utils.js';

class Layer {
  constructor(count, speed, size, alpha, color) {
    this.speed = speed;
    this.size = size;
    this.alpha = alpha;
    this.color = color;
    this.stars = [];
    for (let i = 0; i < count; i++) {
      this.stars.push({ x: rand(0, WIDTH), y: rand(0, HEIGHT), tw: rand(0, Math.PI * 2) });
    }
  }
  update(dt, boost) {
    const v = this.speed * boost;
    for (const s of this.stars) {
      s.y += v * dt;
      s.tw += dt * 3;
      if (s.y > HEIGHT) { s.y = -2; s.x = rand(0, WIDTH); }
    }
  }
  draw(ctx) {
    ctx.fillStyle = this.color;
    for (const s of this.stars) {
      const tw = 0.6 + 0.4 * Math.sin(s.tw);
      ctx.globalAlpha = this.alpha * tw;
      ctx.fillRect(s.x, s.y, this.size, this.size);
    }
    ctx.globalAlpha = 1;
  }
}

export class Starfield {
  constructor() {
    this.layers = [
      new Layer(60, 18, 1, 0.5, '#9fb8ff'),
      new Layer(40, 42, 1.6, 0.7, '#cfe2ff'),
      new Layer(22, 80, 2.4, 0.95, '#ffffff'),
    ];
    // Soft drifting nebula blobs for depth.
    this.nebulae = [];
    for (let i = 0; i < 3; i++) {
      this.nebulae.push({
        x: rand(0, WIDTH), y: rand(0, HEIGHT),
        r: rand(120, 240),
        hue: [180, 300, 260][i],
        drift: rand(4, 10),
      });
    }
  }

  update(dt, boost = 1) {
    for (const l of this.layers) l.update(dt, boost);
    for (const n of this.nebulae) {
      n.y += n.drift * dt;
      if (n.y - n.r > HEIGHT) { n.y = -n.r; n.x = rand(0, WIDTH); }
    }
  }

  draw(ctx) {
    // Nebula glow.
    ctx.globalCompositeOperation = 'lighter';
    for (const n of this.nebulae) {
      const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
      g.addColorStop(0, `hsla(${n.hue}, 90%, 60%, 0.10)`);
      g.addColorStop(1, 'hsla(0,0%,0%,0)');
      ctx.fillStyle = g;
      ctx.fillRect(n.x - n.r, n.y - n.r, n.r * 2, n.r * 2);
    }
    ctx.globalCompositeOperation = 'source-over';

    for (const l of this.layers) l.draw(ctx);
  }
}
