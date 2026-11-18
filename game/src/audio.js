// audio.js — every sound is synthesized with WebAudio; the game ships no audio
// files. The context is created on the first user gesture (start button), so
// browsers never block it. Music is a slow pad + sparse pluck loop.

const CHORDS = [
  [110.0, 164.81, 220.0], // Am
  [87.31, 130.81, 174.61], // F
  [130.81, 164.81, 196.0], // C
  [98.0, 146.83, 196.0], // G
];
const PENTATONIC = [220.0, 261.63, 293.66, 329.63, 392.0, 440.0];

export function createAudio() {
  let ctx = null;
  let master = null;
  let muted = false;
  let musicTimer = null;
  let nextChordAt = 0;
  let chordIndex = 0;
  let melodyIndex = 2;
  let nextMelodyAt = 0;

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return true;
  }

  function tone(freq, dur, type, vol, slideTo, when = 0) {
    if (!ctx) return;
    const t0 = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t0 + dur);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(vol, t0 + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  function noiseBurst(dur, vol, filterFreq) {
    if (!ctx) return;
    const t0 = ctx.currentTime;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start(t0);
  }

  function scheduleMusic() {
    if (!ctx) return;
    const ahead = ctx.currentTime + 0.6;
    while (nextChordAt < ahead) {
      const chord = CHORDS[chordIndex % CHORDS.length];
      const when = Math.max(0, nextChordAt - ctx.currentTime);
      for (const f of chord) tone(f, 4.2, 'triangle', 0.035, null, when);
      tone(chord[0] / 2, 4.2, 'sine', 0.05, null, when);
      chordIndex++;
      nextChordAt += 4.0;
    }
    while (nextMelodyAt < ahead) {
      const when = Math.max(0, nextMelodyAt - ctx.currentTime);
      if (Math.random() < 0.55) {
        melodyIndex += Math.floor(Math.random() * 3) - 1;
        melodyIndex = Math.max(0, Math.min(PENTATONIC.length - 1, melodyIndex));
        tone(PENTATONIC[melodyIndex], 0.5, 'sine', 0.045, null, when);
      }
      nextMelodyAt += 0.45;
    }
  }

  return {
    // Call from a click/key gesture so the browser allows sound.
    unlock() {
      ensure();
    },
    setMuted(m) {
      muted = m;
      if (master) master.gain.value = m ? 0 : 0.5;
    },
    isMuted() {
      return muted;
    },
    shoot() {
      if (!ctx || muted) return;
      tone(720, 0.07, 'square', 0.1, 180);
    },
    hit() {
      if (!ctx || muted) return;
      noiseBurst(0.06, 0.12, 2400);
    },
    hurt() {
      if (!ctx || muted) return;
      tone(140, 0.22, 'sawtooth', 0.16, 60);
      noiseBurst(0.15, 0.14, 900);
    },
    pickup() {
      if (!ctx || muted) return;
      tone(880, 0.09, 'sine', 0.1, 1320);
    },
    levelup() {
      if (!ctx || muted) return;
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, 0.22, 'triangle', 0.12, null, i * 0.07));
    },
    explosion() {
      if (!ctx || muted) return;
      noiseBurst(0.35, 0.25, 700);
      tone(90, 0.3, 'sine', 0.2, 40);
    },
    dash() {
      if (!ctx || muted) return;
      noiseBurst(0.16, 0.12, 3200);
    },
    click() {
      if (!ctx || muted) return;
      tone(660, 0.05, 'sine', 0.08, 880);
    },
    bossRoar() {
      if (!ctx || muted) return;
      tone(70, 0.7, 'sawtooth', 0.2, 45);
      noiseBurst(0.6, 0.18, 500);
    },
    startMusic() {
      if (!ensure()) return;
      if (musicTimer) return;
      nextChordAt = ctx.currentTime + 0.1;
      nextMelodyAt = ctx.currentTime + 0.5;
      musicTimer = setInterval(scheduleMusic, 200);
    },
    stopMusic() {
      if (musicTimer) {
        clearInterval(musicTimer);
        musicTimer = null;
      }
    },
  };
}
