"use client";

const SOUND_KEY = "wsa_sound_enabled";

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function isSoundEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(SOUND_KEY) === "1";
}

export function setSoundEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SOUND_KEY, enabled ? "1" : "0");
}

function playTone(
  freq: number,
  durationMs: number,
  type: OscillatorType = "sine",
  gainPeak = 0.06,
  delayMs = 0
) {
  if (!isSoundEnabled()) return;
  const ctx = getCtx();
  if (!ctx) return;

  const now = ctx.currentTime + delayMs / 1000;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(gainPeak, now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + durationMs / 1000 + 0.02);
}

export const soundFx = {
  click() {
    playTone(540, 45, "triangle", 0.04);
  },
  tick() {
    playTone(680, 60, "sine", 0.045);
  },
  go() {
    playTone(880, 120, "sine", 0.06);
  },
  correct() {
    playTone(587.33, 90, "sine", 0.06, 0);
    playTone(880, 130, "sine", 0.06, 70);
  },
  wrong() {
    playTone(260, 140, "triangle", 0.06, 0);
    playTone(195, 180, "triangle", 0.05, 90);
  },
  win() {
    playTone(523.25, 110, "sine", 0.06, 0);
    playTone(659.25, 110, "sine", 0.06, 90);
    playTone(783.99, 130, "sine", 0.06, 180);
    playTone(1046.5, 240, "sine", 0.07, 270);
  },
};
