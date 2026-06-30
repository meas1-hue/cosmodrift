// Heads-up display: score, high score, wave, lives, and active power-up timers.

import { WIDTH, HEIGHT, COLORS } from './config.js';

function drawLifeIcon(ctx, x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = COLORS.neon;
  ctx.shadowBlur = 8;
  ctx.shadowColor = COLORS.neon;
  ctx.beginPath();
  ctx.moveTo(0, -s);
  ctx.lineTo(s * 0.8, s * 0.7);
  ctx.lineTo(0, s * 0.35);
  ctx.lineTo(-s * 0.8, s * 0.7);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

const PU_LABEL = { rapid: 'RAPID', spread: 'SPREAD', shield: 'SHIELD' };
const PU_COLOR = { rapid: COLORS.gold, spread: COLORS.green, shield: COLORS.neon };

export function drawHUD(ctx, game) {
  ctx.save();
  ctx.textBaseline = 'top';

  // Score (top-left)
  ctx.font = '600 13px ui-monospace, monospace';
  ctx.fillStyle = 'rgba(232,246,255,0.55)';
  ctx.fillText('SCORE', 16, 12);
  ctx.font = '700 24px ui-monospace, monospace';
  ctx.fillStyle = COLORS.ink;
  ctx.shadowBlur = 10; ctx.shadowColor = COLORS.neon;
  ctx.fillText(String(game.score).padStart(6, '0'), 16, 28);
  ctx.shadowBlur = 0;

  // High score (top-center)
  ctx.textAlign = 'center';
  ctx.font = '600 13px ui-monospace, monospace';
  ctx.fillStyle = 'rgba(232,246,255,0.55)';
  ctx.fillText('HI-SCORE', WIDTH / 2, 12);
  ctx.font = '700 18px ui-monospace, monospace';
  ctx.fillStyle = COLORS.gold;
  ctx.shadowBlur = 8; ctx.shadowColor = COLORS.gold;
  ctx.fillText(String(Math.max(game.score, game.highScore)).padStart(6, '0'), WIDTH / 2, 30);
  ctx.shadowBlur = 0;

  // Wave (top-right)
  ctx.textAlign = 'right';
  ctx.font = '600 13px ui-monospace, monospace';
  ctx.fillStyle = 'rgba(232,246,255,0.55)';
  ctx.fillText('WAVE', WIDTH - 16, 12);
  ctx.font = '700 24px ui-monospace, monospace';
  ctx.fillStyle = COLORS.neon2;
  ctx.shadowBlur = 10; ctx.shadowColor = COLORS.neon2;
  ctx.fillText(String(game.wave), WIDTH - 16, 28);
  ctx.shadowBlur = 0;

  ctx.restore();

  // Lives (bottom-left, as ship icons)
  ctx.save();
  const by = HEIGHT - 22;
  for (let i = 0; i < game.player.lives; i++) {
    drawLifeIcon(ctx, 22 + i * 24, by, 9);
  }
  ctx.restore();

  // Active power-up timers (bottom-right)
  ctx.save();
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  let oy = HEIGHT - 22;
  const timers = game.player.activeTimers(); // [{kind, remain, total}]
  for (const t of timers) {
    const label = PU_LABEL[t.kind] || t.kind.toUpperCase();
    const color = PU_COLOR[t.kind] || COLORS.ink;
    const frac = t.total ? t.remain / t.total : 1;
    // bar
    const barW = 54, barH = 6, bx = WIDTH - 16 - barW, bb = oy + 6;
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(bx, bb, barW, barH);
    ctx.fillStyle = color;
    ctx.shadowBlur = 8; ctx.shadowColor = color;
    ctx.fillRect(bx, bb, barW * frac, barH);
    ctx.shadowBlur = 0;
    // label
    ctx.font = '700 11px ui-monospace, monospace';
    ctx.fillStyle = color;
    ctx.fillText(label, WIDTH - 16, oy - 2);
    oy -= 22;
  }
  ctx.restore();
}
