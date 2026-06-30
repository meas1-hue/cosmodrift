# 🚀 COSMODRIFT

A neon, Galaga-style arcade space shooter — built entirely from scratch with
**vanilla JavaScript + HTML5 Canvas**. No frameworks, no build step, no asset
files. Every pixel is drawn procedurally and every sound is synthesized live
with the Web Audio API.

![play in your browser](https://img.shields.io/badge/play-in%20your%20browser-38f0ff)

## ✨ Features

- **Classic fixed-shooter gameplay** — enemies sweep in along curved paths to
  form a swaying battle formation, then peel off to dive-bomb and shoot at you.
- **Three enemy types** — fast Drones, standard Soldiers, and tanky gold
  Captains (worth the most points and most likely to drop loot).
- **Escalating waves** — each wave brings more enemies, faster dives, and
  heavier fire.
- **Power-ups** dropped by destroyed enemies:
  - ⚡ **Rapid Fire** (R) — much faster shooting (timed)
  - ↔ **Spread Shot** (W) — three-way fire (timed)
  - 🛡 **Shield** (S) — absorbs one hit
  - ➕ **Extra Life** (+)
- **Juicy visuals** — parallax starfield + drifting nebulae, particle
  explosions, engine trails, neon glow, screen shake, and damage flashes.
- **Synthesized sound & music** — retro SFX and a looping arpeggio/bassline
  that intensifies as you climb the waves.
- **Persistent high scores** — top runs are saved locally with arcade-style
  initials entry.
- **Touch support** — on-screen controls appear automatically on touch devices.

## 🎮 Controls

| Action | Keys |
| --- | --- |
| Move | `←` `→` or `A` `D` |
| Fire | `Space` |
| Pause | `P` / `Esc` |
| Mute | `M` |
| Start / Confirm | `Enter` or tap |

On the high-score screen, type your initials directly, or use `←` `→` to change
a letter and `Space` to advance, then `Enter` to confirm.

## ▶️ Run it

Because the game uses native ES modules, it needs to be served over HTTP
(opening `index.html` directly via `file://` will be blocked by the browser).
Any static file server works:

```bash
# Option A — Python (no install needed)
python3 -m http.server 8000
# then open http://localhost:8000

# Option B — npm convenience script (same thing)
npm start

# Option C — Node's "serve"
npx serve .
```

## 🗂 Project structure

```
index.html        # Canvas + touch controls, loads src/main.js as a module
styles.css        # Neon arcade page/HUD styling
src/
  main.js         # Entry: HiDPI canvas setup + the delta-time game loop
  config.js       # All tunable constants (balance the game here)
  game.js         # State machine, collisions, waves, scoring, overlays
  input.js        # Keyboard + touch input
  player.js       # Player ship, firing, power-ups, shield, lives
  enemy.js        # Enemy types, formation grid, dive AI, wave spawner
  bullet.js       # Player & enemy projectiles
  powerup.js      # Falling power-up pickups
  particles.js    # Pooled particle system
  starfield.js    # Parallax starfield + nebula glow
  audio.js        # Web Audio SFX + music synthesis
  hud.js          # Score / lives / wave / power-up HUD
  storage.js      # localStorage high-score table
  utils.js        # Math, RNG, easing, collision helpers
```

Tweak `src/config.js` to rebalance speeds, spawn rates, enemy stats, and
power-up odds.

## 📄 License

MIT — have fun and remix it.
