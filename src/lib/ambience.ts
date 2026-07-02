// Synthesized airport ambience — no audio assets. Two layers:
// 1. Room tone: a looped brown-noise buffer through a low-pass filter at
//    very low gain, with a slow LFO drifting the level so it breathes.
// 2. PA chime: the classic two-tone announcement (E5 then C5, soft attack,
//    long decay) every 90–180 seconds.
// Gain values are tuned by ear to sit well under the flap clacks.

export type AmbienceHandle = { stop: () => void };

function playChime(ctx: AudioContext, out: GainNode) {
  const t0 = ctx.currentTime + 0.05;
  const tones: Array<[number, number]> = [
    [659.25, 0],    // E5
    [523.25, 0.65], // C5
  ];
  for (const [freq, offset] of tones) {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, t0 + offset);
    gain.gain.linearRampToValueAtTime(0.045, t0 + offset + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + offset + 2.2);
    osc.connect(gain).connect(out);
    osc.start(t0 + offset);
    osc.stop(t0 + offset + 2.4);
  }
}

export function startAmbience(ctx: AudioContext): AmbienceHandle {
  const master = ctx.createGain();
  master.gain.setValueAtTime(0, ctx.currentTime);
  master.gain.linearRampToValueAtTime(1, ctx.currentTime + 2); // fade in
  master.connect(ctx.destination);

  // Room tone: 6s of brown noise (integrated white noise), looped.
  const seconds = 6;
  const buf = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
  const data = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < data.length; i++) {
    last = (last + (Math.random() * 2 - 1) * 0.02) * 0.998;
    data[i] = last;
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buf;
  noise.loop = true;

  const lowpass = ctx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = 320;

  const toneGain = ctx.createGain();
  toneGain.gain.value = 0.06;

  // Slow drift: ±0.02 around the base gain every ~20s.
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.05;
  const lfoDepth = ctx.createGain();
  lfoDepth.gain.value = 0.02;
  lfo.connect(lfoDepth).connect(toneGain.gain);

  noise.connect(lowpass).connect(toneGain).connect(master);
  noise.start();
  lfo.start();

  let chimeTimer = 0;
  const scheduleChime = () => {
    chimeTimer = window.setTimeout(() => {
      playChime(ctx, master);
      scheduleChime();
    }, 90_000 + Math.random() * 90_000);
  };
  scheduleChime();

  return {
    stop: () => {
      window.clearTimeout(chimeTimer);
      const t = ctx.currentTime;
      master.gain.cancelScheduledValues(t);
      master.gain.setValueAtTime(master.gain.value, t);
      master.gain.linearRampToValueAtTime(0, t + 0.6); // fade out
      window.setTimeout(() => {
        noise.stop();
        lfo.stop();
        master.disconnect();
      }, 700);
    },
  };
}
