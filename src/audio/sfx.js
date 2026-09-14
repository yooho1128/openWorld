let ctx = null;

function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function beep({ freq = 440, duration = 0.12, type = 'sine', gain = 0.15, sweepTo } = {}) {
  const audioCtx = getCtx();
  const osc = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
  if (sweepTo) {
    osc.frequency.exponentialRampToValueAtTime(sweepTo, audioCtx.currentTime + duration);
  }

  gainNode.gain.setValueAtTime(gain, audioCtx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

  osc.connect(gainNode).connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}

export function playCoffee() {
  beep({ freq: 700, duration: 0.1, type: 'square', gain: 0.12 });
}

export function playCaught() {
  beep({ freq: 220, sweepTo: 80, duration: 0.35, type: 'sawtooth', gain: 0.2 });
}

export function playJump() {
  beep({ freq: 500, sweepTo: 780, duration: 0.14, type: 'triangle', gain: 0.13 });
}

export function playDuck() {
  beep({ freq: 400, sweepTo: 220, duration: 0.14, type: 'triangle', gain: 0.13 });
}

export function playMilestone() {
  beep({ freq: 660, duration: 0.09, gain: 0.16 });
  setTimeout(() => beep({ freq: 990, duration: 0.14, gain: 0.16 }), 90);
}

export function playGameOver() {
  beep({ freq: 300, sweepTo: 60, duration: 0.8, type: 'sawtooth', gain: 0.2 });
}

export function playClear() {
  beep({ freq: 523, duration: 0.12, gain: 0.15 });
  setTimeout(() => beep({ freq: 659, duration: 0.12, gain: 0.15 }), 120);
  setTimeout(() => beep({ freq: 784, duration: 0.2, gain: 0.15 }), 240);
}
