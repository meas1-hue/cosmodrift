// Game orchestrator: owns all entities, runs the state machine, resolves
// collisions, manages waves/scoring, and renders the world + overlays.

import { WIDTH, HEIGHT, COLORS, SCORE, ENEMY_TYPES } from './config.js';
import { Player } from './player.js';
import { EnemyManager } from './enemy.js';
import { PowerUp, randomPowerupKind } from './powerup.js';
import { Particles } from './particles.js';
import { Starfield } from './starfield.js';
import { AudioEngine } from './audio.js';
import { drawHUD } from './hud.js';
import { loadScores, qualifies, saveScore, topScore } from './storage.js';
import { aabb, rand } from './utils.js';

const STATE = { TITLE: 'title', PLAYING: 'playing', PAUSED: 'paused', GAME_OVER: 'gameover', ENTER_SCORE: 'enter' };

export class Game {
  constructor(ctx, input) {
    this.ctx = ctx;
    this.input = input;
    this.audio = new AudioEngine();
    this.starfield = new Starfield();
    this.particles = new Particles();
    this.player = new Player(this);
    this.enemies = new EnemyManager(this);

    this.bullets = [];
    this.powerups = [];

    this.score = 0;
    this.wave = 1;
    this.highScore = topScore();
    this.scores = loadScores();

    this.state = STATE.TITLE;
    this.shake = 0;
    this.time = 0;
    this.waveBanner = 0;
    this.flash = 0;

    // Audio needs a user gesture to start.
    this.input.onFirstGesture(() => this.audio.init());
  }

  // ---- lifecycle ----
  newGame() {
    this.score = 0;
    this.wave = 1;
    this.bullets = [];
    this.powerups = [];
    this.particles = new Particles();
    this.player.reset(true);
    this.enemies.startWave(1);
    this.waveBanner = 2.2;
    this.state = STATE.PLAYING;
    this.audio.setIntensity(0);
    this.audio.startMusic();
  }

  nextWave() {
    this.wave++;
    this.score += SCORE.waveClearBase * (this.wave - 1);
    this.enemies.startWave(this.wave);
    this.waveBanner = 2.0;
    this.audio.waveClear();
    this.audio.setIntensity(Math.min(1, (this.wave - 1) / 8));
  }

  gameOver() {
    this.audio.stopMusic();
    this.audio.gameOver();
    this.highScore = Math.max(this.highScore, this.score);
    if (qualifies(this.score)) {
      this.entry = { letters: ['A', 'A', 'A'], idx: 0 };
      this.state = STATE.ENTER_SCORE;
    } else {
      this.scores = loadScores();
      this.state = STATE.GAME_OVER;
    }
  }

  addShake(amount) { this.shake = Math.min(18, this.shake + amount); }

  // ---- update ----
  update(dt) {
    this.time += dt;
    this.starfield.update(dt, this.state === STATE.PLAYING ? 1 : 0.4);
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 40);
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 3);

    // Global: mute toggle.
    if (this.input.wasPressed('mute')) this.audio.toggleMute();

    switch (this.state) {
      case STATE.TITLE: this.updateTitle(); break;
      case STATE.PLAYING: this.updatePlaying(dt); break;
      case STATE.PAUSED: this.updatePaused(); break;
      case STATE.GAME_OVER: this.updateGameOver(); break;
      case STATE.ENTER_SCORE: this.updateEnterScore(); break;
    }

    // Particles always animate (nice on overlays too).
    this.particles.update(dt);
  }

  updateTitle() {
    if (this.input.wasPressed('confirm') || this.input.wasPressed('fire')) {
      this.audio.init();
      this.audio.uiBlip();
      this.newGame();
    }
  }

  updatePaused() {
    if (this.input.wasPressed('pause') || this.input.wasPressed('confirm')) {
      this.state = STATE.PLAYING;
    }
  }

  updateGameOver() {
    if (this.input.wasPressed('confirm') || this.input.wasPressed('fire')) {
      this.audio.uiBlip();
      this.scores = loadScores();
      this.state = STATE.TITLE;
    }
  }

  updateEnterScore() {
    const e = this.entry;
    // Type letters directly with the keyboard.
    if (this.input.typed) {
      for (const ch of this.input.typed) {
        if (e.idx < 3) { e.letters[e.idx] = ch; e.idx++; this.audio.uiBlip(); }
      }
    }
    if (this.input.backspace && e.idx > 0) { e.idx--; this.audio.uiBlip(); }

    // Arrow fallback: cycle the current letter; Space commits & advances.
    if (e.idx < 3) {
      const cur = e.letters[e.idx].charCodeAt(0) - 65;
      if (this.input.wasPressed('left'))  { e.letters[e.idx] = String.fromCharCode(((cur + 25) % 26) + 65); this.audio.uiBlip(); }
      if (this.input.wasPressed('right')) { e.letters[e.idx] = String.fromCharCode(((cur + 1) % 26) + 65); this.audio.uiBlip(); }
      if (this.input.wasPressed('fire'))  { e.idx++; this.audio.uiBlip(); }
    }

    // Enter (or tap) finalizes with whatever is shown.
    if (this.input.wasPressed('confirm')) {
      this.scores = saveScore(e.letters.join(''), this.score);
      this.highScore = topScore();
      this.state = STATE.GAME_OVER;
    }
  }

  updatePlaying(dt) {
    if (this.input.wasPressed('pause')) { this.state = STATE.PAUSED; return; }

    if (this.waveBanner > 0) this.waveBanner -= dt;

    this.player.update(dt, this.input);
    this.enemies.update(dt);

    for (const b of this.bullets) b.update(dt);
    for (const p of this.powerups) p.update(dt);

    this.resolveCollisions();

    // cull dead
    this.bullets = this.bullets.filter((b) => b.alive);
    this.powerups = this.powerups.filter((p) => p.alive);

    // wave progression
    if (this.enemies.cleared) this.nextWave();
  }

  resolveCollisions() {
    const player = this.player;

    // Player bullets vs enemies.
    for (const b of this.bullets) {
      if (!b.friendly || !b.alive) continue;
      for (const e of this.enemies.enemies) {
        if (!e.alive || e.state === 'waiting') continue;
        if (aabb(b, e)) {
          b.alive = false;
          this.particles.burst(b.x, b.y, 5, { color: COLORS.neon, speed: rand(40, 140), life: 0.25, size: 2 });
          if (e.hurt(1)) this.destroyEnemy(e);
          break;
        }
      }
    }

    // Enemy bullets vs player.
    if (player.invuln <= 0) {
      for (const b of this.bullets) {
        if (b.friendly || !b.alive) continue;
        if (aabb(b, player)) {
          b.alive = false;
          this.damagePlayer();
          break;
        }
      }
    }

    // Diving/entering enemy bodies vs player.
    if (player.invuln <= 0) {
      for (const e of this.enemies.enemies) {
        if (!e.alive || e.state === 'formation' || e.state === 'waiting') continue;
        if (aabb(e, player)) {
          this.destroyEnemy(e, true);
          this.damagePlayer();
          break;
        }
      }
    }

    // Power-ups vs player.
    for (const p of this.powerups) {
      if (!p.alive) continue;
      if (aabb(p, player)) {
        p.alive = false;
        player.addPowerup(p.kind);
        this.audio.powerup();
        this.particles.explosion(p.x, p.y, COLORS.green, 0.7);
      }
    }
  }

  destroyEnemy(e, silentScore = false) {
    e.alive = false;
    this.score += e.value;
    this.particles.explosion(e.x, e.y, e.color, e.type === 'captain' ? 1.6 : 1);
    this.audio.explosion(e.type === 'captain' ? 1.3 : 1);
    this.addShake(e.type === 'captain' ? 6 : 2.5);
    // chance to drop a power-up
    const def = ENEMY_TYPES[e.type];
    if (Math.random() < def.dropChance) {
      this.powerups.push(new PowerUp(e.x, e.y, randomPowerupKind()));
    }
  }

  damagePlayer() {
    const took = this.player.hit();
    if (took) {
      this.particles.explosion(this.player.x, this.player.y, COLORS.red, 1.5);
      this.audio.hit();
      this.addShake(14);
      this.flash = 1;
      if (!this.player.alive) this.gameOver();
    } else {
      // shield absorb
      this.particles.burst(this.player.x, this.player.y, 12, { color: COLORS.neon, speed: rand(80, 200), life: 0.4 });
      this.audio.explosion(0.6);
      this.addShake(5);
    }
  }

  // ---- render ----
  render() {
    const ctx = this.ctx;
    // background
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.save();
    if (this.shake > 0) {
      ctx.translate(rand(-this.shake, this.shake), rand(-this.shake, this.shake));
    }

    this.starfield.draw(ctx);

    if (this.state !== STATE.TITLE) {
      this.enemies.draw(ctx);
      for (const p of this.powerups) p.draw(ctx);
      for (const b of this.bullets) b.draw(ctx);
      if (this.player.alive || this.state === STATE.PLAYING) this.player.draw(ctx);
    }
    this.particles.draw(ctx);

    ctx.restore();

    // damage flash
    if (this.flash > 0) {
      ctx.fillStyle = `rgba(255,40,80,${this.flash * 0.25})`;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
    }

    // HUD + overlays
    if (this.state === STATE.PLAYING || this.state === STATE.PAUSED) {
      drawHUD(ctx, this);
      if (this.waveBanner > 0) this.drawWaveBanner(ctx);
    }
    if (this.audio.muted) this.drawMutedTag(ctx);

    switch (this.state) {
      case STATE.TITLE: this.drawTitle(ctx); break;
      case STATE.PAUSED: this.drawPaused(ctx); break;
      case STATE.GAME_OVER: this.drawGameOver(ctx); break;
      case STATE.ENTER_SCORE: this.drawEnterScore(ctx); break;
    }
  }

  // ---- overlay drawing helpers ----
  _glowText(ctx, text, x, y, size, color, weight = '700') {
    ctx.font = `${weight} ${size}px ui-monospace, monospace`;
    ctx.textAlign = 'center';
    ctx.fillStyle = color;
    ctx.shadowBlur = 18;
    ctx.shadowColor = color;
    ctx.fillText(text, x, y);
    ctx.shadowBlur = 0;
  }

  drawWaveBanner(ctx) {
    const a = Math.min(1, this.waveBanner);
    ctx.save();
    ctx.globalAlpha = a;
    this._glowText(ctx, `WAVE ${this.wave}`, WIDTH / 2, HEIGHT / 2 - 10, 40, COLORS.neon2);
    ctx.restore();
  }

  drawMutedTag(ctx) {
    ctx.save();
    ctx.font = '700 11px ui-monospace, monospace';
    ctx.fillStyle = 'rgba(232,246,255,0.5)';
    ctx.textAlign = 'center';
    ctx.fillText('🔇 MUTED (M)', WIDTH / 2, HEIGHT - 40);
    ctx.restore();
  }

  _dim(ctx, a = 0.55) {
    ctx.fillStyle = `rgba(4,3,12,${a})`;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }

  drawScoreList(ctx, y) {
    ctx.save();
    ctx.font = '700 13px ui-monospace, monospace';
    this._glowText(ctx, 'HIGH SCORES', WIDTH / 2, y, 16, COLORS.gold);
    y += 28;
    const list = this.scores.slice(0, 6);
    for (let i = 0; i < list.length; i++) {
      const s = list[i];
      ctx.font = '600 15px ui-monospace, monospace';
      ctx.textAlign = 'left';
      ctx.fillStyle = i === 0 ? COLORS.gold : 'rgba(232,246,255,0.8)';
      ctx.fillText(`${i + 1}. ${s.name}`, WIDTH / 2 - 90, y);
      ctx.textAlign = 'right';
      ctx.fillText(String(s.score).padStart(6, '0'), WIDTH / 2 + 90, y);
      y += 24;
    }
    ctx.restore();
  }

  drawTitle(ctx) {
    const pulse = 0.5 + 0.5 * Math.sin(this.time * 2);
    this._glowText(ctx, 'COSMODRIFT', WIDTH / 2, 150, 46, COLORS.neon);
    ctx.save();
    ctx.font = '600 14px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = COLORS.neon2;
    ctx.fillText('▚ A NEON ARCADE SHOOTER ▞', WIDTH / 2, 182);
    ctx.restore();

    this.drawScoreList(ctx, 280);

    ctx.save();
    ctx.globalAlpha = pulse;
    this._glowText(ctx, 'PRESS ENTER / TAP TO PLAY', WIDTH / 2, HEIGHT - 150, 18, COLORS.ink);
    ctx.restore();

    ctx.save();
    ctx.font = '500 12px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(232,246,255,0.45)';
    ctx.fillText('Arrows / A·D move   •   Space fire   •   P pause   •   M mute', WIDTH / 2, HEIGHT - 110);
    ctx.restore();
  }

  drawPaused(ctx) {
    this._dim(ctx, 0.6);
    this._glowText(ctx, 'PAUSED', WIDTH / 2, HEIGHT / 2 - 10, 44, COLORS.neon);
    ctx.save();
    ctx.globalAlpha = 0.5 + 0.5 * Math.sin(this.time * 3);
    this._glowText(ctx, 'PRESS P TO RESUME', WIDTH / 2, HEIGHT / 2 + 36, 16, COLORS.ink);
    ctx.restore();
  }

  drawGameOver(ctx) {
    this._dim(ctx, 0.62);
    this._glowText(ctx, 'GAME OVER', WIDTH / 2, 130, 44, COLORS.neon2);
    this._glowText(ctx, `SCORE  ${String(this.score).padStart(6, '0')}`, WIDTH / 2, 180, 22, COLORS.gold);
    this.drawScoreList(ctx, 250);
    ctx.save();
    ctx.globalAlpha = 0.5 + 0.5 * Math.sin(this.time * 3);
    this._glowText(ctx, 'PRESS ENTER / TAP TO CONTINUE', WIDTH / 2, HEIGHT - 130, 16, COLORS.ink);
    ctx.restore();
  }

  drawEnterScore(ctx) {
    this._dim(ctx, 0.62);
    this._glowText(ctx, 'NEW HIGH SCORE!', WIDTH / 2, 150, 34, COLORS.gold);
    this._glowText(ctx, String(this.score).padStart(6, '0'), WIDTH / 2, 195, 26, COLORS.neon);

    ctx.save();
    ctx.font = '500 13px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(232,246,255,0.6)';
    ctx.fillText('TYPE YOUR INITIALS  (← → to change, Enter/Space to confirm)', WIDTH / 2, 245);
    ctx.restore();

    // Three letter boxes.
    const e = this.entry;
    const boxW = 56, gap = 18;
    const totalW = boxW * 3 + gap * 2;
    let x = WIDTH / 2 - totalW / 2;
    const y = 300;
    for (let i = 0; i < 3; i++) {
      const active = i === e.idx;
      ctx.save();
      ctx.strokeStyle = active ? COLORS.gold : 'rgba(56,240,255,0.4)';
      ctx.lineWidth = 2;
      if (active) { ctx.shadowBlur = 14; ctx.shadowColor = COLORS.gold; }
      ctx.strokeRect(x, y, boxW, boxW);
      ctx.shadowBlur = 0;
      ctx.font = '700 40px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = active ? COLORS.gold : COLORS.ink;
      ctx.fillText(e.letters[i], x + boxW / 2, y + boxW / 2 + 2);
      ctx.restore();
      x += boxW + gap;
    }
    ctx.textBaseline = 'alphabetic';
  }
}

Game.WIDTH = WIDTH;
Game.HEIGHT = HEIGHT;
