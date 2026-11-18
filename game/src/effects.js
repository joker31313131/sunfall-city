// Particles, skid marks, muzzle flashes, floating pickup text and
// screen shake. All effects are data in G; this module spawns, updates
// and draws them.
import { G } from './state.js';

export function spawnParticles(x, y, opts) {
  const n = opts.count || 10;
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = (opts.speed || 120) * (0.3 + Math.random() * 0.9);
    G.particles.push({
      x, y,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      life: (opts.life || 0.6) * (0.5 + Math.random() * 0.8),
      maxLife: opts.life || 0.6,
      size: (opts.size || 4) * (0.6 + Math.random() * 0.8),
      color: Array.isArray(opts.color) ? opts.color[i % opts.color.length] : opts.color,
      gravity: opts.gravity || 0,
      drag: opts.drag || 2,
    });
  }
  if (G.particles.length > 500) G.particles.splice(0, G.particles.length - 500);
}

export function spawnExplosion(x, y) {
  spawnParticles(x, y, { count: 34, speed: 260, life: 0.8, size: 9, color: ['#ffdd55', '#ff9933', '#ff5522', '#555555'], gravity: -40 });
  spawnParticles(x, y, { count: 16, speed: 120, life: 1.4, size: 14, color: '#888888', gravity: -60 });
  addShake(14);
}

export function spawnBlood(x, y) {
  spawnParticles(x, y, { count: 8, speed: 130, life: 0.5, size: 4, color: '#c0392b', gravity: 300 });
}

export function spawnMuzzle(x, y, angle) {
  spawnParticles(x + Math.cos(angle) * 20, y + Math.sin(angle) * 20, { count: 3, speed: 60, life: 0.08, size: 6, color: '#ffdd55' });
}

export function spawnSparks(x, y) {
  spawnParticles(x, y, { count: 6, speed: 180, life: 0.3, size: 3, color: '#ffe9a8', gravity: 200 });
}

export function addSkid(x, y, angle) {
  G.skidMarks.push({ x, y, angle, life: 6 });
  if (G.skidMarks.length > 300) G.skidMarks.splice(0, G.skidMarks.length - 300);
}

export function addFloater(x, y, text, color) {
  G.floaters.push({ x, y, text, color: color || '#ffffff', life: 1.4 });
}

export function addShake(amount) {
  G.camera.shake = Math.min(24, G.camera.shake + amount);
}

export function updateEffects(dt) {
  for (const p of G.particles) {
    p.life -= dt;
    p.vy += p.gravity * dt;
    const drag = Math.max(0, 1 - p.drag * dt);
    p.vx *= drag; p.vy *= drag;
    p.x += p.vx * dt; p.y += p.vy * dt;
  }
  G.particles = G.particles.filter((p) => p.life > 0);
  for (const s of G.skidMarks) s.life -= dt;
  G.skidMarks = G.skidMarks.filter((s) => s.life > 0);
  for (const f of G.floaters) { f.life -= dt; f.y -= 34 * dt; }
  G.floaters = G.floaters.filter((f) => f.life > 0);
  G.camera.shake = Math.max(0, G.camera.shake - 40 * dt);
}

export function drawSkidMarks(ctx, cam) {
  ctx.save();
  ctx.strokeStyle = 'rgba(20,20,25,0.55)';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  for (const s of G.skidMarks) {
    const dx = Math.cos(s.angle) * 9, dy = Math.sin(s.angle) * 9;
    ctx.globalAlpha = Math.min(0.6, s.life / 6);
    ctx.beginPath();
    ctx.moveTo(s.x - dx - cam.x, s.y - dy - cam.y);
    ctx.lineTo(s.x + dx - cam.x, s.y + dy - cam.y);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawParticles(ctx, cam) {
  for (const p of G.particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x - cam.x, p.y - cam.y, p.size * (0.5 + 0.5 * (p.life / p.maxLife)), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

export function drawFloaters(ctx, cam) {
  ctx.save();
  ctx.font = 'bold 20px Verdana, sans-serif';
  ctx.textAlign = 'center';
  for (const f of G.floaters) {
    ctx.globalAlpha = Math.min(1, f.life);
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(0,0,0,0.7)';
    ctx.strokeText(f.text, f.x - cam.x, f.y - cam.y);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x - cam.x, f.y - cam.y);
  }
  ctx.restore();
}
