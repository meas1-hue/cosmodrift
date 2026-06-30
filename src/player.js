// The player's ship: movement, firing (with power-up modifiers), shield,
// invulnerability frames, lives, and rendering.

import { WIDTH, PLAYER, POWERUP, COLORS } from './config.js';
import { Bullet } from './bullet.js';
import { clamp, rand } from './utils.js';

export class Player {
  constructor(game) {
    this.game = game;
    this.w = PLAYER.width;
    this.h = PLAYER.height;
    this.reset(true);
  }

  reset(fullReset = false) {
    this.x = WIDTH / 2;
    this.y = PLAYER.y;
    if (fullReset) this.lives = PLAYER.startLives;
    this.cooldown = 0;
    this.invuln = fullReset ? 1.0 : PLAYER.invulnTime;
    this.shield = false;
    this.timers = { rapid: 0, spread: 0 }; // seconds remaining
    this.thrust = 0;
  }

  get alive() { return this.lives > 0; }

  addPowerup(kind) {
    switch (kind) {
      case 'rapid':  this.timers.rapid = POWERUP.duration; break;
      case 'spread': this.timers.spread = POWERUP.duration; break;
      case 'shield': this.shield = true; break;
      case 'life':   this.lives = Math.min(PLAYER.maxLives, this.lives + 1); break;
    }
  }

  // Returns the list of active power-up timers for the HUD.
  activeTimers() {
    const out = [];
    if (this.timers.rapid > 0)  out.push({ kind: 'rapid',  remain: this.timers.rapid,  total: POWERUP.duration });
    if (this.timers.spread > 0) out.push({ kind: 'spread', remain: this.timers.spread, total: POWERUP.duration });
    if (this.shield)            out.push({ kind: 'shield', remain: 1, total: 0 });
    return out;
  }

  hit() {
    if (this.invuln > 0) return false;
    if (this.shield) {
      this.shield = false;
      this.invuln = 0.8;
      return false; // absorbed, not a real hit
    }
    this.lives--;
    this.invuln = PLAYER.invulnTime;
    return true; // took damage
  }

  fire() {
    const g = this.game;
    const muzzleY = this.y - this.h / 2;
    if (this.timers.spread > 0) {
      const speed = PLAYER.bulletSpeed;
      g.bullets.push(new Bullet(this.x, muzzleY, true, 0, -speed));
      g.bullets.push(new Bullet(this.x, muzzleY, true, -180, -speed * 0.92));
      g.bullets.push(new Bullet(this.x, muzzleY, true, 180, -speed * 0.92));
    } else {
      g.bullets.push(new Bullet(this.x, muzzleY, true, 0, -PLAYER.bulletSpeed));
    }
    g.audio.shoot();
    // muzzle sparks
    g.particles.burst(this.x, muzzleY, 4, { speed: rand(60, 160), life: 0.2, color: COLORS.neon, size: 2 });
  }

  update(dt, input) {
    // Movement
    const axis = input.axis;
    this.x += axis * PLAYER.speed * dt;
    this.x = clamp(this.x, this.w / 2 + 6, WIDTH - this.w / 2 - 6);
    this.thrust = axis;

    // Timers
    if (this.invuln > 0) this.invuln -= dt;
    if (this.timers.rapid > 0) this.timers.rapid -= dt;
    if (this.timers.spread > 0) this.timers.spread -= dt;

    // Firing
    this.cooldown -= dt;
    const cd = this.timers.rapid > 0 ? PLAYER.fireCooldown * 0.45 : PLAYER.fireCooldown;
    if (input.isHeld('fire') && this.cooldown <= 0) {
      this.fire();
      this.cooldown = cd;
    }

    // Engine trail particles
    if (Math.random() < 0.8) {
      this.game.particles.emit(this.x + rand(-4, 4), this.y + this.h / 2, {
        angle: Math.PI / 2 + rand(-0.3, 0.3),
        speed: rand(60, 130),
        life: rand(0.2, 0.45),
        size: rand(1.5, 3),
        color: this.thrust !== 0 ? COLORS.neon2 : COLORS.neon,
      });
    }
  }

  draw(ctx) {
    // Blink during invulnerability.
    if (this.invuln > 0 && Math.floor(this.invuln * 12) % 2 === 0) return;

    ctx.save();
    ctx.translate(this.x, this.y);

    // Shield bubble
    if (this.shield) {
      ctx.save();
      ctx.globalAlpha = 0.5 + 0.2 * Math.sin(performance.now() / 120);
      ctx.strokeStyle = COLORS.neon;
      ctx.shadowBlur = 16; ctx.shadowColor = COLORS.neon;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, this.w * 0.85, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Ship body (sleek arrow)
    ctx.shadowBlur = 14;
    ctx.shadowColor = COLORS.neon;
    const grad = ctx.createLinearGradient(0, -this.h / 2, 0, this.h / 2);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.4, COLORS.neon);
    grad.addColorStop(1, '#1b8fb0');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, -this.h / 2);
    ctx.lineTo(this.w / 2, this.h / 2);
    ctx.lineTo(this.w * 0.18, this.h * 0.28);
    ctx.lineTo(-this.w * 0.18, this.h * 0.28);
    ctx.lineTo(-this.w / 2, this.h / 2);
    ctx.closePath();
    ctx.fill();

    // Cockpit
    ctx.shadowBlur = 6;
    ctx.shadowColor = COLORS.neon2;
    ctx.fillStyle = COLORS.neon2;
    ctx.beginPath();
    ctx.arc(0, -this.h * 0.06, 4, 0, Math.PI * 2);
    ctx.fill();

    // Engine flame
    ctx.shadowBlur = 12;
    ctx.shadowColor = COLORS.gold;
    ctx.fillStyle = COLORS.gold;
    const flame = 6 + Math.random() * 7;
    ctx.beginPath();
    ctx.moveTo(-5, this.h * 0.42);
    ctx.lineTo(0, this.h * 0.42 + flame);
    ctx.lineTo(5, this.h * 0.42);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }
}
