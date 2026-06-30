// Central place for all tunable game constants. Balance the game from here.

export const WIDTH = 540;
export const HEIGHT = 720;

export const COLORS = {
  bg: '#04030c',
  neon: '#38f0ff',
  neon2: '#ff3ea5',
  gold: '#ffd24a',
  green: '#6cff9e',
  red: '#ff5a6e',
  ink: '#e8f6ff',
};

export const PLAYER = {
  width: 38,
  height: 34,
  speed: 360,          // px/s
  fireCooldown: 0.26,  // s between shots (base)
  bulletSpeed: 720,
  startLives: 3,
  maxLives: 6,
  invulnTime: 2.2,     // s of invulnerability after a hit
  y: HEIGHT - 70,      // resting vertical position
};

export const BULLET = {
  playerW: 4,
  playerH: 16,
  enemyW: 6,
  enemyH: 14,
  enemySpeed: 300,
};

// Enemy archetypes. value = score, hp = hits to kill.
export const ENEMY_TYPES = {
  drone:   { hp: 1, value: 100, color: COLORS.neon,  size: 26, fireChance: 0.15, dropChance: 0.10 },
  soldier: { hp: 1, value: 150, color: COLORS.neon2, size: 28, fireChance: 0.25, dropChance: 0.14 },
  captain: { hp: 3, value: 400, color: COLORS.gold,  size: 34, fireChance: 0.45, dropChance: 0.45 },
};

export const FORMATION = {
  cols: 8,
  cellW: 50,
  cellH: 44,
  top: 96,
  swayAmpBase: 14,     // px horizontal sway
  swaySpeed: 0.6,      // rad/s
};

export const WAVE = {
  // base values for wave 1; scaled up each wave
  diveIntervalBase: 2.4,   // s between dive launches
  diveIntervalMin: 0.55,
  diveSpeedBase: 200,
  diveSpeedGrow: 14,       // per wave
  enemyFireGrow: 0.04,     // additive fire-chance scaling per wave
};

export const POWERUP = {
  fallSpeed: 90,
  size: 22,
  duration: 9,             // s for timed power-ups (rapid, spread)
  // weighted spawn table
  table: [
    { kind: 'rapid',  weight: 3 },
    { kind: 'spread', weight: 3 },
    { kind: 'shield', weight: 2 },
    { kind: 'life',   weight: 1 },
  ],
};

export const SCORE = {
  waveClearBase: 500,      // * wave number
};
