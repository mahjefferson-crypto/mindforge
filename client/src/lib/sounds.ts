/**
 * Mind Forge — Synthesized Sound Effects
 *
 * All sounds are generated via the Web Audio API at runtime.
 * Zero file downloads, instant playback, tiny footprint.
 */

let audioCtx: AudioContext | null = null;
let muted = false;

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  // Resume if suspended (browsers require user gesture)
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

export function isMuted(): boolean {
  return muted;
}

export function toggleMute(): boolean {
  muted = !muted;
  return muted;
}

export function setMuted(val: boolean) {
  muted = val;
}

// ─── Helper: play a tone ─────────────────────────────────────────
function playTone(
  freq: number,
  duration: number,
  type: OscillatorType = "sine",
  volume = 0.3,
  detune = 0,
  delay = 0
) {
  if (muted) return;
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.value = freq;
  osc.detune.value = detune;
  osc.connect(gain);
  gain.connect(ctx.destination);

  const t = ctx.currentTime + delay;
  gain.gain.setValueAtTime(volume, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

  osc.start(t);
  osc.stop(t + duration);
}

// ─── Helper: noise burst (for percussive clicks) ─────────────────
function playNoise(duration: number, volume = 0.1, delay = 0) {
  if (muted) return;
  const ctx = getCtx();
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 3);
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = 2000;

  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  const t = ctx.currentTime + delay;
  gain.gain.setValueAtTime(volume, t);

  source.start(t);
}

// ─── SOUND EFFECTS ───────────────────────────────────────────────

/** Soft tap — for navigation, button presses */
export function playTap() {
  if (muted) return;
  playTone(800, 0.08, "sine", 0.12);
  playNoise(0.03, 0.04);
}

/** Habit completed — satisfying "ding" with rising tone */
export function playHabitComplete() {
  if (muted) return;
  playTone(523, 0.15, "sine", 0.25);       // C5
  playTone(659, 0.15, "sine", 0.25, 0, 0.08); // E5
  playTone(784, 0.25, "sine", 0.3, 0, 0.16);  // G5
  playNoise(0.04, 0.06, 0.16);
}

/** XP earned — quick sparkle pop */
export function playXpEarn() {
  if (muted) return;
  playTone(1047, 0.1, "sine", 0.2);        // C6
  playTone(1319, 0.12, "sine", 0.15, 0, 0.05); // E6
  playNoise(0.03, 0.05);
}

/** Level up — epic ascending fanfare */
export function playLevelUp() {
  if (muted) return;
  // Chord 1: C major
  playTone(523, 0.2, "sine", 0.2);       // C5
  playTone(659, 0.2, "sine", 0.15);      // E5
  playTone(784, 0.2, "sine", 0.15);      // G5

  // Chord 2: higher, brighter
  playTone(698, 0.25, "sine", 0.25, 0, 0.2);  // F5
  playTone(880, 0.25, "sine", 0.2, 0, 0.2);   // A5
  playTone(1047, 0.25, "sine", 0.2, 0, 0.2);  // C6

  // Final sparkle
  playTone(1319, 0.35, "sine", 0.3, 0, 0.4);  // E6
  playTone(1568, 0.4, "triangle", 0.15, 0, 0.45); // G6
  playNoise(0.06, 0.08, 0.4);
}

/** Check-in complete — warm confirmation */
export function playCheckIn() {
  if (muted) return;
  playTone(440, 0.15, "sine", 0.2);        // A4
  playTone(554, 0.15, "sine", 0.2, 0, 0.1); // C#5
  playTone(659, 0.2, "sine", 0.25, 0, 0.2); // E5
}

/** Streak milestone — punchy celebration */
export function playStreak() {
  if (muted) return;
  playTone(587, 0.1, "square", 0.1);       // D5
  playTone(784, 0.1, "square", 0.1, 0, 0.07);  // G5
  playTone(988, 0.15, "square", 0.12, 0, 0.14); // B5
  playTone(1175, 0.2, "sine", 0.15, 0, 0.2);    // D6
  playNoise(0.05, 0.06, 0.2);
}

/** Message sent — subtle whoosh */
export function playMessageSend() {
  if (muted) return;
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(400, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.12);
  osc.connect(gain);
  gain.connect(ctx.destination);
  gain.gain.setValueAtTime(0.1, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
  osc.start();
  osc.stop(ctx.currentTime + 0.15);
}

/** Reaction — quick pop */
export function playReaction() {
  if (muted) return;
  playTone(1200, 0.06, "sine", 0.15);
  playNoise(0.02, 0.04);
}

/** Error / negative — low buzz */
export function playError() {
  if (muted) return;
  playTone(200, 0.2, "sawtooth", 0.08);
  playTone(180, 0.2, "sawtooth", 0.06, 0, 0.05);
}

/** Journal saved — gentle chime */
export function playJournalSave() {
  if (muted) return;
  playTone(659, 0.2, "sine", 0.2);         // E5
  playTone(784, 0.2, "sine", 0.2, 0, 0.12); // G5
  playTone(988, 0.3, "sine", 0.15, 0, 0.24); // B5
}

/**
 * Initialize audio context on first user interaction.
 * Call this once from a click/tap handler to unlock audio on mobile.
 */
export function initAudio() {
  getCtx();
}
