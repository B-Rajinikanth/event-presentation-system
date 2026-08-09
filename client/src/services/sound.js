// Synthesized sound effects via the Web Audio API — no audio files to host
// or license, just oscillators and filtered noise bursts with a quick gain
// envelope.

let audioCtx = null;
let noiseBuffer = null;

function getContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  return audioCtx;
}

// A shared buffer of white noise, generated once and reused (via a fresh
// AudioBufferSourceNode each time) for every noise-burst sound — a clap or a
// click is fundamentally a short burst of noise shaped by a filter, not a
// pitched tone.
function getNoiseBuffer(ctx) {
  if (!noiseBuffer) {
    const length = Math.floor(ctx.sampleRate * 0.5);
    noiseBuffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
  }
  return noiseBuffer;
}

// Browsers block audio until a user gesture unlocks it. Call this from an
// existing click handler (the display screen's "Enter Full Screen" /
// "Tap to enable" buttons) so later, programmatic sounds — like the
// countdown ticks — aren't silently dropped.
export function unlockAudio() {
  const ctx = getContext();
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
}

function playTone(freq, { duration = 0.12, type = 'sine', gain = 0.2, startDelay = 0 } = {}) {
  const ctx = getContext();
  if (ctx.state === 'suspended') return; // not unlocked yet — skip rather than throw

  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;

  const startAt = ctx.currentTime + startDelay;
  gainNode.gain.setValueAtTime(0, startAt);
  gainNode.gain.linearRampToValueAtTime(gain, startAt + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.001, startAt + duration);

  osc.connect(gainNode);
  gainNode.connect(ctx.destination);
  osc.start(startAt);
  osc.stop(startAt + duration + 0.02);
}

function playNoiseBurst(ctx, { startAt, duration, gain, filterFreq, filterQ = 1, filterType = 'bandpass' }) {
  const source = ctx.createBufferSource();
  source.buffer = getNoiseBuffer(ctx);
  source.loop = false;

  const filter = ctx.createBiquadFilter();
  filter.type = filterType;
  filter.frequency.value = filterFreq;
  filter.Q.value = filterQ;

  const gainNode = ctx.createGain();
  gainNode.gain.setValueAtTime(0, startAt);
  gainNode.gain.linearRampToValueAtTime(gain, startAt + 0.003);
  gainNode.gain.exponentialRampToValueAtTime(0.001, startAt + duration);

  source.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(ctx.destination);
  source.start(startAt);
  source.stop(startAt + duration + 0.02);
}

// A proper clock tick, not a soft beep: a sharp high click (filtered noise)
// layered with a low "tock" thump (a short square-wave burst) for weight,
// the way a real mechanical clock tick has both a click transient and body.
// Pitches up and gets noticeably louder inside the final few seconds.
export function playUnveilTick(urgent = false) {
  const ctx = getContext();
  if (ctx.state === 'suspended') return;
  const now = ctx.currentTime;

  playNoiseBurst(ctx, {
    startAt: now,
    duration: urgent ? 0.06 : 0.045,
    gain: urgent ? 0.6 : 0.42,
    filterFreq: urgent ? 3400 : 2600,
    filterQ: 1.4,
  });

  playTone(urgent ? 240 : 170, {
    duration: 0.09,
    type: 'square',
    gain: urgent ? 0.4 : 0.26,
  });
}

// Applause for the poster reveal: dozens of short, randomly-timed filtered
// noise bursts (individual "claps") layered over ~1.8s, plus a broad low
// burst underneath for body — this is the standard way to procedurally fake
// a crowd clapping, since a real clap is itself just a noise transient.
export function playUnveilReveal() {
  const ctx = getContext();
  if (ctx.state === 'suspended') return;
  const now = ctx.currentTime;
  const spread = 1.8;

  playNoiseBurst(ctx, {
    startAt: now,
    duration: spread,
    gain: 0.16,
    filterFreq: 1100,
    filterQ: 0.5,
    filterType: 'bandpass',
  });

  const clapCount = 65;
  for (let i = 0; i < clapCount; i++) {
    const startAt = now + Math.random() * spread;
    playNoiseBurst(ctx, {
      startAt,
      duration: 0.03 + Math.random() * 0.05,
      gain: 0.22 + Math.random() * 0.28,
      filterFreq: 1500 + Math.random() * 2200,
      filterQ: 0.9,
    });
  }
}
