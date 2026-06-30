// Procedural audio: all SFX and music synthesized with the Web Audio API.
// No asset files. Music uses a lookahead scheduler; SFX are one-shot voices.

const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12); // MIDI note -> Hz

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.muted = false;
    this.intensity = 0; // 0..1, ramps music energy with the wave count

    // Music scheduler state.
    this._nextNoteTime = 0;
    this._step = 0;
    this._timer = null;
    this._bpm = 112;
  }

  // Must be called from a user gesture (autoplay policy).
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.9;
    this.master.connect(this.ctx.destination);

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.34;
    this.musicGain.connect(this.master);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 0.9;
    this.sfxGain.connect(this.master);
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) {
      const t = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(t);
      this.master.gain.linearRampToValueAtTime(this.muted ? 0 : 0.9, t + 0.08);
    }
    return this.muted;
  }

  setIntensity(v) { this.intensity = Math.max(0, Math.min(1, v)); }

  // ---- Low-level voice helpers ----
  _tone({ type = 'square', freq = 440, dur = 0.15, vol = 0.3, attack = 0.005,
          release = 0.08, glideTo = null, dest = null }) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (glideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, glideTo), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + release);
    osc.connect(g);
    g.connect(dest || this.sfxGain);
    osc.start(t);
    osc.stop(t + dur + release + 0.02);
  }

  _noise({ dur = 0.2, vol = 0.4, type = 'lowpass', freq = 1200, dest = null }) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.setValueAtTime(freq, t);
    filter.frequency.exponentialRampToValueAtTime(Math.max(60, freq * 0.25), t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter); filter.connect(g); g.connect(dest || this.sfxGain);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  // ---- SFX ----
  shoot() {
    this._tone({ type: 'square', freq: 880, glideTo: 1700, dur: 0.08, vol: 0.16, release: 0.04 });
    this._tone({ type: 'sawtooth', freq: 440, glideTo: 900, dur: 0.06, vol: 0.06 });
  }
  enemyShoot() {
    this._tone({ type: 'sawtooth', freq: 320, glideTo: 120, dur: 0.16, vol: 0.1 });
  }
  explosion(scale = 1) {
    this._noise({ dur: 0.32 * scale, vol: 0.5, freq: 1600 });
    this._tone({ type: 'triangle', freq: 180, glideTo: 40, dur: 0.3, vol: 0.25 });
  }
  hit() {
    this._noise({ dur: 0.5, vol: 0.6, freq: 800 });
    this._tone({ type: 'sawtooth', freq: 200, glideTo: 30, dur: 0.5, vol: 0.3 });
  }
  powerup() {
    [0, 4, 7, 12].forEach((semi, i) => {
      setTimeout(() => this._tone({ type: 'square', freq: NOTE(72 + semi), dur: 0.1, vol: 0.18 }), i * 55);
    });
  }
  waveClear() {
    [60, 64, 67, 72, 76].forEach((n, i) => {
      setTimeout(() => this._tone({ type: 'triangle', freq: NOTE(n), dur: 0.16, vol: 0.2 }), i * 90);
    });
  }
  gameOver() {
    [72, 68, 64, 59, 55].forEach((n, i) => {
      setTimeout(() => this._tone({ type: 'sawtooth', freq: NOTE(n), dur: 0.4, vol: 0.22, release: 0.2 }), i * 160);
    });
  }
  uiBlip() { this._tone({ type: 'square', freq: NOTE(76), dur: 0.06, vol: 0.12 }); }

  // ---- Music: 16-step looping bassline + arpeggio in A minor ----
  startMusic() {
    if (!this.ctx || this._timer) return;
    this._step = 0;
    this._nextNoteTime = this.ctx.currentTime + 0.1;
    this._timer = setInterval(() => this._scheduler(), 25);
  }
  stopMusic() {
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
  }

  _scheduler() {
    if (!this.ctx) return;
    const secPerStep = 60 / this._bpm / 4; // 16th notes
    while (this._nextNoteTime < this.ctx.currentTime + 0.12) {
      this._playStep(this._step, this._nextNoteTime);
      this._nextNoteTime += secPerStep;
      this._step = (this._step + 1) % 16;
    }
  }

  _playStep(step, time) {
    // A minor pentatonic-ish patterns.
    const bass = [45, 45, 52, 45, 48, 45, 50, 45, 45, 45, 52, 45, 53, 52, 50, 48];
    const arp  = [69, 72, 76, 72, 69, 72, 77, 76, 69, 74, 77, 74, 72, 76, 79, 76];

    // Bassline (always present).
    this._scheduledTone('triangle', NOTE(bass[step]), time, 0.18, 0.22, this.musicGain);

    // Kick on the quarter notes for groove.
    if (step % 4 === 0) this._scheduledNoiseKick(time);

    // Arpeggio lead — denser as intensity rises.
    const playArp = step % 2 === 0 || this.intensity > 0.5;
    if (playArp) {
      const vol = 0.06 + 0.10 * this.intensity;
      this._scheduledTone('square', NOTE(arp[step]), time, 0.12, vol, this.musicGain);
    }
    // Sparkle high octave at high intensity.
    if (this.intensity > 0.7 && step % 4 === 2) {
      this._scheduledTone('square', NOTE(arp[step] + 12), time, 0.08, 0.05, this.musicGain);
    }
  }

  _scheduledTone(type, freq, time, dur, vol, dest) {
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, time);
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(vol, time + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    osc.connect(g); g.connect(dest);
    osc.start(time); osc.stop(time + dur + 0.02);
  }

  _scheduledNoiseKick(time) {
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, time);
    osc.frequency.exponentialRampToValueAtTime(45, time + 0.12);
    g.gain.setValueAtTime(0.3, time);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.14);
    osc.connect(g); g.connect(this.musicGain);
    osc.start(time); osc.stop(time + 0.16);
  }
}
