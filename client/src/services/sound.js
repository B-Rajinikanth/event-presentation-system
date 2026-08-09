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

function playTone(freq, { duration = 0.12, type = 'sine', gain = 0.2, startDelay = 0, hardCutoff = false } = {}) {
  const ctx = getContext();
  if (ctx.state === 'suspended') return; // not unlocked yet — skip rather than throw

  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;

  const startAt = ctx.currentTime + startDelay;
  gainNode.gain.setValueAtTime(0, startAt);
  gainNode.gain.linearRampToValueAtTime(gain, startAt + 0.008);
  if (hardCutoff) {
    // An abrupt cutoff instead of a smooth decay — reads as a crisp
    // chiptune-style blip rather than a tone trailing off.
    gainNode.gain.setValueAtTime(gain, startAt + duration * 0.7);
    gainNode.gain.linearRampToValueAtTime(0.0001, startAt + duration);
  } else {
    gainNode.gain.exponentialRampToValueAtTime(0.001, startAt + duration);
  }

  osc.connect(gainNode);
  gainNode.connect(ctx.destination);
  osc.start(startAt);
  osc.stop(startAt + duration + 0.02);
}

// "Retro Blip" — picked from a set of candidates the user auditioned: a
// short square-wave blip with a hard-edged cutoff, arcade-style. Pitches up
// and gets louder inside the final few seconds.
export function playUnveilTick(urgent = false) {
  playTone(urgent ? 1568 : 1176, {
    duration: 0.045,
    type: 'square',
    gain: urgent ? 0.32 : 0.22,
    hardCutoff: true,
  });
}

// "Fanfare Only" — picked from a set of reveal-sound candidates the user
// auditioned: a clean triumphant ascending arpeggio landing on a bright
// three-note chord. No crowd noise or whoosh — just the musical "ta-da".
export function playUnveilReveal() {
  const arpeggio = [523.25, 659.25, 783.99]; // C5 E5 G5
  arpeggio.forEach((freq, i) => {
    playTone(freq, { duration: 0.22, type: 'triangle', gain: 0.28, startDelay: i * 0.09 });
  });
  const chordDelay = arpeggio.length * 0.09;
  [1046.5, 1318.51, 1567.98].forEach((freq) => {
    // C6 E6 G6
    playTone(freq, { duration: 0.75, type: 'triangle', gain: 0.24, startDelay: chordDelay });
  });
}
