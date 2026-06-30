// Falling power-up pickups dropped by destroyed enemies.

import { HEIGHT, POWERUP, COLORS } from './config.js';
import { weightedPick, TAU } from './utils.js';

const STYLE = {
  rapid:  { color: COLORS.gold,  glyph: 'R' },
  spread: { color: COLORS.green, glyph: 'W' },
  shield: { color: COLORS.neon,  glyph: 'S' },
  life:   { color: COLORS.neon2, glyph: '+' },
};

export function randomPowerupKind() {
  return weightedPick(POWERUP.table).kind;
}

export class PowerUp {
  constructor(x, y, kind) {
    this.x = x;
    this.y = y;
    this.kind = kind;
    this.w = POWERUP.size;
    this.h = POWERUP.size;
    this.alive = true;
    this.t = 0;
    this.vx = 0;
  }

  update(dt) {
    this.t += dt;
    this.y += POWERUP.fallSpeed * dt;
    this.x += Math.sin(this.t * 3) * 18 * dt; // gentle wobble
    if (this.y > HEIGHT + 30) this.alive = false;
  }

  draw(ctx) {
    const st = STYLE[this.kind];
    const pulse = 0.7 + 0.3 * Math.sin(this.t * 6);
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(Math.sin(this.t * 2) * 0.2);

    // Diamond capsule
    ctx.shadowBlur = 16 * pulse;
    ctx.shadowColor = st.color;
    ctx.strokeStyle = st.color;
    ctx.lineWidth = 2;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    const r = this.w / 2;
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.lineTo(r, 0);
    ctx.lineTo(0, r);
    ctx.lineTo(-r, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Glyph
    ctx.shadowBlur = 0;
    ctx.fillStyle = st.color;
    ctx.font = '700 13px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(st.glyph, 0, 1);

    ctx.restore();
  }
}
