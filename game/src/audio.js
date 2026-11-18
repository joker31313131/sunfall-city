// All sound is synthesised live with WebAudio: oscillators and filtered
// noise, no audio files. The context is created lazily on the first user
// gesture so browsers never block it.
let ctx = null;
let master = null;
let engineOsc = null;
let engineGain = null;
let sirenOsc = null;
let sirenGain = null;
let musicTimer = null;
let musicStep = 0;
let muted = false;

function ensure() {
  if (ctx) return true;
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
    return true;
  } catch { return false; }
}

export function initAudio() {
  if (!ensure()) return;
  if (ctx.state === 'suspended') ctx.resume();
}

export function setMuted(m) {
  muted = m;
  if (master) master.gain.value = m ? 0 : 0.5;
}
export function isMuted() { return muted; }

function noiseBuffer(seconds) {
  const buf = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

function blip(freq, dur, type, vol, slideTo) {
  if (!ctx || muted) return;
  const t = ctx.currentTime;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type || 'sine';
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g); g.connect(master);
  o.start(t); o.stop(t + dur);
}

function noiseHit(dur, vol, filterFreq) {
  if (!ctx || muted) return;
  const t = ctx.currentTime;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(dur);
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass'; f.frequency.value = filterFreq || 1200;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(f); f.connect(g); g.connect(master);
  src.start(t);
}

export function sfxShoot(kind) {
  if (kind === 'shotgun') { noiseHit(0.25, 0.7, 900); blip(90, 0.18, 'square', 0.3, 40); }
  else if (kind === 'smg') { noiseHit(0.08, 0.35, 1800); }
  else { noiseHit(0.12, 0.5, 1500); blip(220, 0.08, 'square', 0.2, 60); }
}
export function sfxExplosion() { noiseHit(0.9, 0.9, 400); blip(60, 0.7, 'sine', 0.6, 25); }
export function sfxPickup() { blip(660, 0.1, 'sine', 0.35); setTimeout(() => blip(990, 0.14, 'sine', 0.35), 70); }
export function sfxCrash() { noiseHit(0.3, 0.6, 700); }
export function sfxSirenBlip() { blip(880, 0.12, 'triangle', 0.25, 660); }
export function sfxMission() {
  [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => blip(f, 0.22, 'triangle', 0.4), i * 110));
}
export function sfxBusted() { [392, 330, 262, 196].forEach((f, i) => setTimeout(() => blip(f, 0.3, 'sawtooth', 0.25), i * 160)); }
export function sfxClick() { blip(440, 0.06, 'square', 0.15); }
export function sfxHorn() { blip(370, 0.25, 'square', 0.2); blip(466, 0.25, 'square', 0.2); }
export function sfxReload() { blip(300, 0.07, 'square', 0.2); setTimeout(() => blip(500, 0.07, 'square', 0.2), 120); }

export function startEngine() {
  if (!ensure() || engineOsc) return;
  engineOsc = ctx.createOscillator();
  engineOsc.type = 'sawtooth';
  engineGain = ctx.createGain();
  engineGain.gain.value = 0;
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass'; f.frequency.value = 500;
  engineOsc.connect(f); f.connect(engineGain); engineGain.connect(master);
  engineOsc.start();
}

export function setEngine(running, speedNorm) {
  if (!engineOsc) return;
  const t = ctx.currentTime;
  engineGain.gain.setTargetAtTime(muted ? 0 : (running ? 0.05 + speedNorm * 0.09 : 0), t, 0.1);
  engineOsc.frequency.setTargetAtTime(55 + speedNorm * 130, t, 0.1);
}

export function startSiren() {
  if (!ensure() || sirenOsc) return;
  sirenOsc = ctx.createOscillator();
  sirenOsc.type = 'triangle';
  sirenGain = ctx.createGain();
  sirenGain.gain.value = 0;
  sirenOsc.connect(sirenGain); sirenGain.connect(master);
  sirenOsc.start();
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 1.1;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 220;
  lfo.connect(lfoGain); lfoGain.connect(sirenOsc.frequency);
  sirenOsc.frequency.value = 750;
  lfo.start();
  sirenOsc._lfo = lfo;
}

export function setSiren(active) {
  if (!sirenGain) return;
  sirenGain.gain.setTargetAtTime(muted ? 0 : (active ? 0.045 : 0), ctx.currentTime, 0.2);
}

// A slow sunset groove: a I–vi–IV–V walk in A minor, one chord per bar,
// plucked notes scheduled ahead so the loop never drifts.
const CHORDS = [[220, 261.6, 329.6], [174.6, 220, 261.6], [196, 246.9, 293.7], [246.9, 293.7, 370]];
export function startMusic() {
  if (!ensure() || musicTimer) return;
  musicTimer = setInterval(() => {
    if (muted || !ctx) return;
    const chord = CHORDS[musicStep % CHORDS.length];
    const note = chord[musicStep % chord.length];
    blip(note * 2, 0.4, 'triangle', 0.07);
    if (musicStep % 2 === 0) blip(chord[0], 0.8, 'sine', 0.08);
    musicStep++;
  }, 420);
}
export function stopMusic() {
  if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
}
