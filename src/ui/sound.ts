// Звуки синтезируются на лету через WebAudio: никаких аудиофайлов и вопросов с лицензиями.

let ctx: AudioContext | null = null;
let enabled = true;

export function setSound(on: boolean): void {
  enabled = on;
}

function tone(freq: number, at: number, dur: number, type: OscillatorType, vol: number): void {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const t = ctx.currentTime + at;
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(vol, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

const SOUNDS = {
  tap: () => tone(520, 0, 0.06, 'triangle', 0.08),
  ok: () => [523, 659, 784].forEach((f, i) => tone(f, i * 0.07, 0.18, 'triangle', 0.12)),
  big: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.08, 0.25, 'triangle', 0.14)),
  bad: () => tone(170, 0, 0.16, 'sine', 0.12),
  star: () => [784, 988, 1175, 1568].forEach((f, i) => tone(f, i * 0.09, 0.3, 'sine', 0.12)),
  tick: () => tone(880, 0, 0.04, 'square', 0.03),
};

export function play(name: keyof typeof SOUNDS): void {
  if (!enabled || document.hidden) return;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    SOUNDS[name]();
  } catch {
    // звук не критичен
  }
}
