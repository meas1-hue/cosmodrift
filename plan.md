# CosmoDrift — Architecture Plan

## File Structure
```
cosmodrift.html (single file, all inline)
├── CSS (inline <style>)
│   ├── @import Orbitron font
│   ├── Canvas container + responsive scaling
│   ├── Menu/Game Over overlays (DOM, hidden during PLAYING)
│   └── Animations (pulse, scan-line wipe)
├── Game State Machine
│   ├── States: MENU → PLAYING → GAME_OVER → MENU
│   ├── PLAYING sub-states: PHASE_DRIFT (60s), PHASE_COMBAT (120s)
│   └── Transitions with 2s overlay + scan-line wipe
├── Canvas Rendering Pipeline
│   ├── renderBackground() — 3-layer parallax stars + nebula wash
│   ├── renderShip() — UFO saucer with glow + engine pulse
│   ├── renderAsteroids() — irregular polygons with rotation
│   ├── renderEnemies() — 3 enemy types (Drone, Striker, Commander)
│   ├── renderProjectiles() — cyan lasers + red plasma
│   ├── renderParticles() — thruster trail + explosions
│   ├── renderHUD() — score, phase timer, lives, combo multiplier
│   └── renderPhaseTransition() — full-canvas overlay + scan-line wipe
├── Game Loop
│   ├── requestAnimationFrame with delta-time
│   ├── update(dt) — physics, timers, collisions
│   ├── render() — all canvas drawing
│   └── Fixed timestep accumulator for deterministic physics
├── Input System
│   ├── Keyboard: Space (thrust/fire), Arrow keys / A-D (move)
│   ├── Touch: tap = thrust/fire, swipe = move (Combat)
│   └── State: maps raw input to game actions per current state
├── Collision Detection
│   ├── AABB with 15% hitbox shrink on player ship
│   ├── Separate collision sets per phase (asteroids in Drift, enemies in Combat)
│   └── Background asteroids in Combat (no collision, visual only)
├── Audio System (Web Audio API)
│   ├── Thrust blip (short noise burst, 80ms, 200→100 Hz)
│   ├── Laser fire (sine sweep, 1200→400 Hz, 100ms)
│   ├── Explosion (noise burst + low sine decay, 400ms)
│   ├── Phase chime (two-tone sine, 800→1200 Hz, 600ms)
│   └── Ambient drone (low oscillator, 60 Hz, very quiet, always on)
├── Persistence
│   ├── localStorage: high score, high score phase
│   └── Load on menu init, save on Game Over
├── Difficulty Scaling
│   ├── Speed multiplier increases per full cycle (drift+combat)
│   ├── Enemy spawn rate increases per cycle
│   └── Asteroid gap narrows slightly per cycle
├── Mobile Support
│   ├── Touch events: tap, swipe detection
│   ├── Canvas scales to viewport while maintaining 480×640 aspect ratio
│   └── Viewport meta tag prevents zoom/scroll
└── Responsive Scaling
    ├── Logical canvas: 480×640
    ├── CSS: canvas fills container, max-width 100vw, max-height 100vh
    ├── JavaScript: compute scale factor, apply via canvas.width/height
```

## State Machine Diagram

```
                    ┌──────────┐
                    │   MENU   │
                    └────┬─────┘
                         │ Space / Tap
                         ▼
                   ┌───────────┐
                   │  PLAYING  │
                   │           │
                   │  ┌──────┐ │
                   │  │DRIFT │ │ 60s → 120s → 60s → ...
                   │  │(60s) │ │
                   │  └──┬───┘ │
                   │     │     │
                   │  ┌──▼───┐ │
                   │  │COMBAT│ │ 120s → 60s → ...
                   │  │(120s)│ │
                   │  └──┬───┘ │
                   │     │     │
                   └─────┼─────┘
                         │ Player dies (lives = 0)
                         ▼
                  ┌─────────────┐
                  │  GAME_OVER  │
                  └──────┬──────┘
                         │ Tap / Button
                         ▼
                    (back to MENU)
```

## Delta-Time Physics

All movement uses `dt` (seconds) from `performance.now()` timestamps:
- Ship velocity: `vy += GRAVITY * dt` (Drift)
- Ship position: `y += vy * dt` (Drift)
- Obstacle scroll: `x -= SPEED * dt` (both phases)
- Projectile travel: `y += SPEED * dt` (Combat)
- Phase timers: `elapsed += dt`, check against phase duration

## Asteroid Generation

Irregular polygon: 8–12 vertices, each vertex at distance `radius + noise(-radius*0.3, radius*0.3)` from center, at random angles. Rotates at `angularVelocity * dt`.

## Enemy Formation Patterns

- Drone: straight vertical descent
- Striker: sine wave: `x += Math.sin(time * frequency) * amplitude * dt`
- Commander: spiral + shoots: `x += Math.cos(time * freq) * amp * dt`, `y += Math.sin(time * freq) * amp * dt`
