// Projectiles for both the player and enemies.

import { HEIGHT, BULLET, PLAYER, COLORS } from './config.js';

export class Bullet {
  // friendly = true -> player bullet (travels up). vx optional for spread shots.
  constructor(x, y, friendly, vx = 0, vy = null) {
    this.x = x;
    this.y = y;
    this.friendly = friendly;
    this.w = friendly ? BULLET.playerW : BULLET.enemyW;
    this.h = friendly ? BULLET.playerH : BULLET.enemyH;
    this.vx = vx;
    this.vy = vy != null ? vy : (friendly ? -PLAYER.bulletSpeed : BULLET.enemySpeed);
    this.color = friendly ? COLORS.neon : COLORS.red;
    this.alive = true;
    this.trail = 0;
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.y < -20 || this.y > HEIGHT + 20 || this.x < -20 || this.x > 560) {
      this.alive = false;
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.shadowBlur = 12;
    ctx.shadowColor = this.color;
    ctx.fillStyle = this.color;
    if (this.friendly) {
      // bright core + soft tail
      ctx.fillRect(this.x - this.w / 2, this.y - this.h / 2, this.w, this.h);
      ctx.globalAlpha = 0.4;
      ctx.fillRect(this.x - this.w / 2, this.y, this.w, this.h);
    } else {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.w, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}
