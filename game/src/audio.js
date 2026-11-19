// WebAudio synth sounds: engine hum, siren, gunshots, pickups, mission jingle.
// No audio files — everything is generated, so the game needs no network.
export function createAudio() {
  let ctx = null;
  let muted = false;
  let engineOsc = null;
  let engineGain = null;
  let sirenTimer = 0;

  function ensure() {
    if (!ctx) {
      try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; }
    }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function beep(freq, dur, type, vol, slideTo) {
    if (muted) return;
    const c = ensure(); if (!c) return;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, c.currentTime);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, c.currentTime + dur);
    g.gain.setValueAtTime(vol || 0.15, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
    o.connect(g); g.connect(c.destination);
    o.start(); o.stop(c.currentTime + dur);
  }

  function noise(dur, vol) {
    if (muted) return;
    const c = ensure(); if (!c) return;
    const len = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource(); src.buffer = buf;
    const g = c.createGain(); g.gain.value = vol || 0.25;
    src.connect(g); g.connect(c.destination); src.start();
  }

  return {
    unlock() { ensure(); },
    toggleMute() { muted = !muted; return muted; },
    get muted() { return muted; },
    shoot() { noise(0.12, 0.3); beep(220, 0.08, 'square', 0.12, 60); },
    hit() { beep(140, 0.15, 'sawtooth', 0.15, 70); },
    pickup() { beep(660, 0.09, 'sine', 0.18); setTimeout(() => beep(880, 0.12, 'sine', 0.18), 70); },
    thud() { noise(0.15, 0.2); beep(90, 0.15, 'sine', 0.2, 45); },
    skid() { noise(0.1, 0.06); },
    mission() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => beep(f, 0.22, 'sine', 0.2), i * 110)); },
    siren() {
      if (muted) return;
      const now = performance.now();
      if (now - sirenTimer < 900) return;
      sirenTimer = now;
      beep(700, 0.4, 'sine', 0.05, 950);
      setTimeout(() => beep(950, 0.4, 'sine', 0.05, 700), 420);
    },
    engine(on, speed) {
      if (muted || !on) {
        if (engineOsc) { try { engineOsc.stop(); } catch { /* already stopped */ } engineOsc = null; }
        return;
      }
      const c = ensure(); if (!c) return;
      if (!engineOsc) {
        engineOsc = c.createOscillator();
        engineGain = c.createGain();
        engineOsc.type = 'sawtooth';
        engineGain.gain.value = 0.03;
        engineOsc.connect(engineGain); engineGain.connect(c.destination);
        engineOsc.start();
      }
      engineOsc.frequency.value = 55 + (speed || 0) * 0.12;
      engineGain.gain.value = 0.02 + Math.min(0.05, (speed || 0) * 0.00006);
    },
  };
}
