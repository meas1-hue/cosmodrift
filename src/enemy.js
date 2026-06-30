// Enemies, the formation grid, dive/attack AI, and the per-wave spawner.
//
// Enemy lifecycle:
//   waiting  -> off-screen, counting down its staggered entrance delay
//   entering -> sweeps along a curved bezier path into its formation slot
//   formation-> sits in the swaying grid, occasionally selected to dive
//   diving   -> curves down toward the player firing, then loops back to re-enter

import {
  WIDTH, HEIGHT, ENEMY_TYPES, FORMATION, WAVE, BULLET, COLORS,
} from './config.js';
import { Bullet } from './bullet.js';
import { bezier2, easeInOutQuad, rand, chance, pick } from './utils.js';

let RNG_SIDE = 0;

class Enemy {
  constructor(manager, type, col, row, slotX, slotY, enterDelay) {
    this.mgr = manager;
    this.type = type;
    const def = ENEMY_TYPES[type];
    this.hp = def.hp;
    this.value = def.value;
    this.color = def.color;
    this.size = def.size;
    this.fireChance = def.fireChance;
    this.dropChance = def.dropChance;
    this.w = def.size;
    this.h = def.size;

    this.col = col;
    this.row = row;
    this.slotX = slotX;   // formation slot relative to formation origin
    this.slotY = slotY;
    this.x = slotX;
    this.y = slotY;

    this.alive = true;
    this.state = 'waiting';
    this.enterDelay = enterDelay;
    this.wob = rand(0, Math.PI * 2);

    this._beginEntrance();
  }

  // Build a curved entrance path from an off-screen point to the slot.
  _beginEntrance() {
    RNG_SIDE ^= 1;
    const fromLeft = RNG_SIDE === 0;
    const sx = fromLeft ? -40 : WIDTH + 40;
    const sy = rand(-40, 120);
    const targetX = this.mgr.originX + this.slotX;
    const targetY = this.mgr.originY + this.slotY;
    // control point creates a sweeping arc
    const cx = fromLeft ? rand(WIDTH * 0.5, WIDTH) : rand(0, WIDTH * 0.5);
    const cy = rand(HEIGHT * 0.35, HEIGHT * 0.55);
    this.path = { p0: { x: sx, y: sy }, p1: { x: cx, y: cy }, p2: { x: targetX, y: targetY } };
    this.x = sx; this.y = sy;
    this.pathT = 0;
    this.pathDur = rand(1.1, 1.7);
  }

  startDive(playerX) {
    if (this.state !== 'formation') return;
    this.state = 'diving';
    const p0 = { x: this.x, y: this.y };
    const targetX = Math.max(30, Math.min(WIDTH - 30, playerX + rand(-60, 60)));
    const p1 = { x: targetX < this.x ? this.x - rand(120, 220) : this.x + rand(120, 220), y: rand(HEIGHT * 0.4, HEIGHT * 0.6) };
    const p2 = { x: targetX, y: HEIGHT + 60 };
    this.path = { p0, p1, p2 };
    this.pathT = 0;
    this.pathDur = rand(1.6, 2.3) * this.mgr.diveSpeedFactor;
    this.fireTimer = rand(0.2, 0.5);
  }

  _formationPos() {
    return {
      x: this.mgr.originX + this.slotX,
      y: this.mgr.originY + this.slotY,
    };
  }

  hurt(dmg = 1) {
    this.hp -= dmg;
    return this.hp <= 0;
  }

  update(dt, game) {
    this.wob += dt * 4;

    if (this.state === 'waiting') {
      this.enterDelay -= dt;
      if (this.enterDelay <= 0) this.state = 'entering';
      return;
    }

    if (this.state === 'entering') {
      this.pathT += dt / this.pathDur;
      if (this.pathT >= 1) {
        this.state = 'formation';
        const fp = this._formationPos();
        this.x = fp.x; this.y = fp.y;
        return;
      }
      const t = easeInOutQuad(this.pathT);
      const p = bezier2(this.path.p0, this.path.p1, this.path.p2, t);
      this.x = p.x; this.y = p.y;
      return;
    }

    if (this.state === 'formation') {
      const fp = this._formationPos();
      this.x = fp.x;
      this.y = fp.y + Math.sin(this.wob) * 2;
      // occasional formation pot-shots
      if (chance(this.fireChance * 0.12 * dt)) this._fire(game, false);
      return;
    }

    if (this.state === 'diving') {
      this.pathT += dt / this.pathDur;
      const t = Math.min(1, this.pathT);
      const p = bezier2(this.path.p0, this.path.p1, this.path.p2, t);
      this.x = p.x; this.y = p.y;

      // fire aimed shots while diving
      this.fireTimer -= dt;
      if (this.fireTimer <= 0) {
        this._fire(game, true);
        this.fireTimer = rand(0.4, 0.9);
      }

      // engine trail
      if (chance(0.5)) {
        game.particles.emit(this.x, this.y - this.size * 0.4, {
          angle: -Math.PI / 2 + rand(-0.4, 0.4), speed: rand(40, 100),
          life: 0.3, size: 2, color: this.color,
        });
      }

      if (this.pathT >= 1) {
        // looped off the bottom — re-enter the formation
        this.state = 'entering';
        this._beginEntrance();
      }
      return;
    }
  }

  _fire(game, aimed) {
    let vx = 0, vy = BULLET.enemySpeed;
    if (aimed) {
      const dx = game.player.x - this.x;
      const dy = game.player.y - this.y;
      const len = Math.hypot(dx, dy) || 1;
      const sp = BULLET.enemySpeed;
      vx = (dx / len) * sp;
      vy = (dy / len) * sp;
    }
    game.bullets.push(new Bullet(this.x, this.y + this.size * 0.4, false, vx, vy));
    game.audio.enemyShoot();
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    // diving enemies point downward
    if (this.state === 'diving') ctx.rotate(Math.PI);
    const s = this.size / 2;
    const flap = Math.sin(this.wob) * 0.18;

    ctx.shadowBlur = 12;
    ctx.shadowColor = this.color;
    ctx.fillStyle = this.color;
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2;

    // Wings
    ctx.save();
    ctx.rotate(flap);
    ctx.beginPath();
    ctx.moveTo(-s * 0.3, 0);
    ctx.lineTo(-s * 1.15, -s * 0.5);
    ctx.lineTo(-s * 0.5, s * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.rotate(-flap);
    ctx.beginPath();
    ctx.moveTo(s * 0.3, 0);
    ctx.lineTo(s * 1.15, -s * 0.5);
    ctx.lineTo(s * 0.5, s * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Body
    const grad = ctx.createLinearGradient(0, -s, 0, s);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.5, this.color);
    grad.addColorStop(1, 'rgba(0,0,0,0.4)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.55, s * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#04030c';
    ctx.beginPath(); ctx.arc(-s * 0.2, -s * 0.1, s * 0.12, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(s * 0.2, -s * 0.1, s * 0.12, 0, Math.PI * 2); ctx.fill();

    // Captain crown / damage tint
    if (this.type === 'captain') {
      ctx.fillStyle = COLORS.ink;
      ctx.shadowBlur = 6; ctx.shadowColor = COLORS.gold;
      ctx.beginPath();
      ctx.moveTo(-s * 0.4, -s * 0.7);
      ctx.lineTo(-s * 0.2, -s * 1.0);
      ctx.lineTo(0, -s * 0.7);
      ctx.lineTo(s * 0.2, -s * 1.0);
      ctx.lineTo(s * 0.4, -s * 0.7);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }
}

export class EnemyManager {
  constructor(game) {
    this.game = game;
    this.enemies = [];
    this.originX = WIDTH / 2;
    this.originY = FORMATION.top;
    this.swayT = 0;
    this.diveTimer = 0;
    this.diveInterval = WAVE.diveIntervalBase;
    this.diveSpeedFactor = 1;
    this.cleared = false;
  }

  startWave(wave) {
    this.enemies = [];
    this.cleared = false;
    this.swayT = 0;

    const rows = Math.min(3 + Math.floor(wave / 1.5), 5);
    const cols = FORMATION.cols;
    // Type by row: top rows tougher.
    const rowType = (r) => {
      if (r === 0) return 'captain';
      if (r <= 2) return 'soldier';
      return 'drone';
    };

    const gridW = (cols - 1) * FORMATION.cellW;
    let delay = 0;
    for (let r = 0; r < rows; r++) {
      const type = rowType(r);
      // captains row is sparser and centered
      const rowCols = type === 'captain' ? Math.min(4, cols) : cols;
      const rowW = (rowCols - 1) * FORMATION.cellW;
      for (let c = 0; c < rowCols; c++) {
        const slotX = -rowW / 2 + c * FORMATION.cellW;
        const slotY = r * FORMATION.cellH;
        this.enemies.push(new Enemy(this, type, c, r, slotX, slotY, delay));
        delay += 0.12; // stagger the stream of entrances
      }
    }

    // Difficulty scaling.
    this.diveInterval = Math.max(WAVE.diveIntervalMin, WAVE.diveIntervalBase - (wave - 1) * 0.18);
    this.diveSpeedFactor = Math.max(0.55, 1 - (wave - 1) * 0.05);
    this.diveTimer = this.diveInterval + 1.5; // grace before first dive
    this.swayAmp = FORMATION.swayAmpBase + wave * 1.5;
  }

  get count() { return this.enemies.length; }

  update(dt) {
    // Formation sway.
    this.swayT += dt * FORMATION.swaySpeed;
    this.originX = WIDTH / 2 + Math.sin(this.swayT) * (this.swayAmp || FORMATION.swayAmpBase);

    for (const e of this.enemies) e.update(dt, this.game);

    // Launch dives.
    const settled = this.enemies.filter((e) => e.state === 'formation');
    if (settled.length > 0) {
      this.diveTimer -= dt;
      if (this.diveTimer <= 0) {
        const divers = Math.random() < 0.25 ? 2 : 1; // occasional pair dive
        for (let i = 0; i < divers && i < settled.length; i++) {
          pick(settled).startDive(this.game.player.x);
        }
        this.diveTimer = this.diveInterval * rand(0.8, 1.2);
      }
    }

    // Remove dead, detect wave clear.
    this.enemies = this.enemies.filter((e) => e.alive);
    if (this.enemies.length === 0) this.cleared = true;
  }

  draw(ctx) {
    for (const e of this.enemies) e.draw(ctx);
  }
}

export { Enemy };
