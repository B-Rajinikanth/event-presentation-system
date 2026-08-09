// Synthesized sound effects via the Web Audio API — no audio files to host
// or license, just short oscillator tones with a quick gain envelope.

let audioCtx = null;

function getContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  return audioCtx;
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

// A short tick for each second of the Poster Unveil countdown. Pitches up
// and gets louder inside the final few seconds to build tension.
export function playUnveilTick(urgent = false) {
  playTone(urgent ? 1046.5 : 784, { duration: 0.09, type: 'sine', gain: urgent ? 0.3 : 0.16 });
}

// A quick rising arpeggio for the moment the poster is revealed — a "ta-da"
// built from five notes fired in fast succession rather than one long tone.
export function playUnveilReveal() {
  const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51]; // C5 E5 G5 C6 E6
  notes.forEach((freq, i) => {
    playTone(freq, { duration: 0.35, type: 'triangle', gain: 0.22, startDelay: i * 0.09 });
  });
}
