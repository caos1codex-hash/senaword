/**
 * Sound Effects System — Web Audio API
 *
 * Lazy singleton AudioContext created on first user interaction.
 * All sounds are synthesised via OscillatorNode + GainNode (no external files).
 * Gracefully degrades to no-ops when AudioContext is unavailable (SSR, old browsers).
 */

// ─── Lazy singleton AudioContext ────────────────────────────────────────

let ctx: AudioContext | null = null;
let enabled = true;

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (ctx) return ctx;
  try {
    ctx = new AudioContext();
    return ctx;
  } catch {
    return null;
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────

function playTone(
  frequency: number,
  duration: number,
  opts: {
    wave?: OscillatorType;
    gain?: number;
    attack?: number;
  } = {},
): void {
  if (!enabled) return;
  const audioCtx = getContext();
  if (!audioCtx) return;

  const {
    wave = 'sine',
    gain = 0.2,
    attack = 0.01,
  } = opts;

  const now = audioCtx.currentTime;

  const osc = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();

  osc.type = wave;
  osc.frequency.setValueAtTime(frequency, now);

  gainNode.gain.setValueAtTime(0.001, now);
  gainNode.gain.exponentialRampToValueAtTime(gain, now + attack);
  gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

  osc.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  osc.start(now);
  osc.stop(now + duration);
}

function playArpeggio(
  frequencies: number[],
  noteDuration: number,
  opts: {
    wave?: OscillatorType;
    gain?: number;
    attack?: number;
  } = {},
): void {
  if (!enabled) return;
  const audioCtx = getContext();
  if (!audioCtx) return;

  const {
    wave = 'sine',
    gain = 0.2,
    attack = 0.01,
  } = opts;

  const now = audioCtx.currentTime;

  frequencies.forEach((freq, i) => {
    const start = now + i * noteDuration * 0.85; // slight overlap for legato feel
    const end = start + noteDuration;

    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    osc.type = wave;
    osc.frequency.setValueAtTime(freq, start);

    gainNode.gain.setValueAtTime(0.001, start);
    gainNode.gain.exponentialRampToValueAtTime(gain, start + attack);
    gainNode.gain.exponentialRampToValueAtTime(0.001, end);

    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    osc.start(start);
    osc.stop(end + 0.01);
  });
}

// ─── Note frequencies (Hz) ─────────────────────────────────────────────

const C5 = 523.25;
const E5 = 659.25;
const G5 = 783.99;
const C6 = 1046.5;

// ─── Public API ─────────────────────────────────────────────────────────

/** Initialise the AudioContext. Safe to call multiple times. */
export function initAudio(): void {
  getContext();
}

/** Pleasant ascending arpeggio: C5 → E5 → G5 (~200 ms each) */
export function playCorrect(): void {
  playArpeggio([C5, E5, G5], 0.2, { wave: 'sine', gain: 0.2, attack: 0.01 });
}

/** Soft low buzz — triangle wave, ~150 ms */
export function playWrong(): void {
  playTone(110, 0.15, { wave: 'triangle', gain: 0.15, attack: 0.005 });
}

/** Subtle click — short high-frequency sine, ~50 ms */
export function playClick(): void {
  playTone(1200, 0.05, { wave: 'sine', gain: 0.15, attack: 0.005 });
}

/** Celebratory ascending melody: C5 → E5 → G5 → C6 (~150 ms each) */
export function playSuccess(): void {
  playArpeggio([C5, E5, G5, C6], 0.15, { wave: 'sine', gain: 0.25, attack: 0.01 });
}

/** Short countdown tick — ~30 ms */
export function playCountdown(): void {
  playTone(880, 0.03, { wave: 'sine', gain: 0.12, attack: 0.005 });
}

/** Mute / unmute all sounds. */
export function setEnabled(value: boolean): void {
  enabled = value;
}

/** Whether sounds are currently enabled. */
export function isEnabled(): boolean {
  return enabled;
}