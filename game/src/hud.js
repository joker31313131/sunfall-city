// HUD and minimap: money, health, wanted stars, weapon and ammo,
// speed, the objective banner, the briefing card and the full-city
// minimap. Text is big and high-contrast so it stays readable when a
// screenshot is shrunk to a contact sheet.
import { WANTED_MAX, WORLD_SIZE, WEAPONS } from './config.js';
import { G } from './state.js';
import { districtAt } from './config.js';
import { nearestShop, shopPrompt } from './shops.js';
import { nearestCar } from './vehicles.js';
import { missionStartMarker, MISSIONS } from './missions.js';

const FONT_BIG = 'bold 26px Verdana, sans-serif';
const FONT_MED = 'bold 20px Verdana, sans-serif';
const FONT_SMALL = 'bold 15px Verdana, sans-serif';

function outlinedText(ctx, text, x, y, fill, font, align) {
  ctx.font = font || FONT_MED;
  ctx.textAlign = align || 'left';
  ctx.lineWidth = 5;
  ctx.strokeStyle = 'rgba(0,0,0,0.85)';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
}

function drawStars(ctx, x, y, wanted) {
  for (let i = 0; i < WANTED_MAX; i++) {
    const sx = x + i * 34;
    ctx.font = '30px Verdana, sans-serif';
    ctx.textAlign = 'left';
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(0,0,0,0.85)';
    ctx.strokeText('★', sx, y);
    ctx.fillStyle = i < wanted ? '#ffd700' : 'rgba(255,255,255,0.35)';
    ctx.fillText('★', sx, y);
  }
}

export function drawHUD(ctx, canvasW, canvasH) {
  const p = G.player;
  // Top-left: money + health.
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(10, 10, 260, 84);
  outlinedText(ctx, `$${p.money}`, 22, 44, '#7dff8a', FONT_BIG);
  outlinedText(ctx, 'HP', 22, 78, '#ffffff', FONT_MED);
  ctx.fillStyle = '#333';
  ctx.fillRect(62, 60, 190, 18);
  const hpFrac = Math.max(0, p.health / p.maxHealth);
  ctx.fillStyle = hpFrac > 0.5 ? '#2ecc71' : hpFrac > 0.25 ? '#f1c40f' : '#e74c3c';
  ctx.fillRect(62, 60, 190 * hpFrac, 18);
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.lineWidth = 2;
  ctx.strokeRect(62, 60, 190, 18);

  // Top-right: wanted stars + district.
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(canvasW - 200, 10, 190, 84);
  drawStars(ctx, canvasW - 188, 44, G.wanted);
  outlinedText(ctx, districtAt(p.x, p.y), canvasW - 188, 78, '#ffffff', FONT_MED);
  if (G.wanted > 0 && G.bustTimer > 0) {
    outlinedText(ctx, 'BUSTED SOON… RUN!', canvasW - 12, 124, '#ff5555', FONT_MED, 'right');
  }

  // Objective banner, top centre.
  if (G.objective) {
    ctx.font = FONT_MED;
    const tw = ctx.measureText(G.objective).width + 36;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(canvasW / 2 - tw / 2, 12, tw, 38);
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 2;
    ctx.strokeRect(canvasW / 2 - tw / 2, 12, tw, 38);
    outlinedText(ctx, '◆ ' + G.objective, canvasW / 2, 39, '#ffe9a8', FONT_MED, 'center');
  }

  // Bottom-left: weapon + ammo + speed.
  const def = WEAPONS[p.weapon];
  const w = p.weapons[p.weapon];
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(10, canvasH - 92, 300, 82);
  const ammoText = p.reloadTimer > 0 ? 'RELOADING…' : (w.reserve === Infinity ? `${w.ammo} / ∞` : `${w.ammo} / ${w.reserve}`);
  outlinedText(ctx, `${def.name}  ${ammoText}`, 22, canvasH - 58, '#ffffff', FONT_MED);
  const speed = p.inCar ? Math.round(Math.abs(p.inCar.speed) * 0.36) : 0;
  const carName = p.inCar ? p.inCar.def.name : 'On foot';
  outlinedText(ctx, `${carName}  ${speed} km/h`, 22, canvasH - 26, '#7fd4ff', FONT_MED);
  if (p.inCar) {
    // Car health bar.
    ctx.fillStyle = '#333';
    ctx.fillRect(22, canvasH - 20, 180, 8);
    ctx.fillStyle = '#f39c12';
    ctx.fillRect(22, canvasH - 20, 180 * Math.max(0, p.inCar.hp / p.inCar.maxHp), 8);
  }

  // Interaction prompt, bottom centre.
  const prompt = interactionPrompt();
  if (prompt) {
    ctx.font = FONT_MED;
    const tw = ctx.measureText(prompt).width + 32;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(canvasW / 2 - tw / 2, canvasH - 138, tw, 36);
    outlinedText(ctx, prompt, canvasW / 2, canvasH - 112, '#ffffff', FONT_MED, 'center');
  }

  // Briefing card.
  if (G.briefing && G.time < G.briefing.until) {
    const bw = Math.min(620, canvasW - 60);
    const bx = canvasW / 2 - bw / 2;
    const by = 64;
    ctx.fillStyle = 'rgba(20,14,30,0.88)';
    ctx.fillRect(bx, by, bw, 96);
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 3;
    ctx.strokeRect(bx, by, bw, 96);
    outlinedText(ctx, G.briefing.title, bx + 20, by + 34, '#ffd700', FONT_BIG);
    ctx.font = '16px Verdana, sans-serif';
    wrapText(ctx, G.briefing.text, bx + 20, by + 60, bw - 40, 20, '#ffffff');
  }

  // Transient centre message.
  if (G.message && G.time < G.message.until) {
    outlinedText(ctx, G.message.text, canvasW / 2, canvasH / 2 - 120, '#ffffff', FONT_BIG, 'center');
  }

  drawMinimap(ctx, canvasW, canvasH);
  if (G.muted) outlinedText(ctx, 'MUTED (M)', canvasW - 130, canvasH - 210, '#ffffff', FONT_SMALL);
}

export function interactionPrompt() {
  const p = G.player;
  if (p.inCar) return 'E — Exit car';
  const shop = nearestShop(110);
  if (shop) return shopPrompt(shop);
  if (!G.mission && G.missionIndex < MISSIONS.length) {
    const marker = missionStartMarker();
    if (marker && Math.hypot(p.x - marker.x, p.y - marker.y) < 90) return 'E — Start job: ' + MISSIONS[G.missionIndex].title;
  }
  if (G.mission && G.mission.index === 0 && G.mission.stage === 0) {
    const a = G.world.anchors;
    if (Math.hypot(p.x - a.lookout.x, p.y - a.lookout.y) < 80) return 'E — Pick up the package';
  }
  const car = nearestCar(p.x, p.y, 60);
  if (car) return 'E — Steal ' + car.def.name;
  return null;
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight, color) {
  const words = text.split(' ');
  let line = '';
  let yy = y;
  ctx.fillStyle = color;
  ctx.textAlign = 'left';
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, yy);
      line = word;
      yy += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, yy);
}

function drawMinimap(ctx, canvasW, canvasH) {
  const size = 190;
  const mx = canvasW - size - 12;
  const my = canvasH - size - 12;
  const scale = size / WORLD_SIZE;
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(mx - 4, my - 4, size + 8, size + 8);
  ctx.fillStyle = '#c9a06a';
  ctx.fillRect(mx, my, size, size);
  // Water + park on the minimap.
  ctx.fillStyle = '#3f7f9e';
  ctx.fillRect(mx, my + 2960 * scale, size, 240 * scale);
  ctx.fillStyle = '#6fae52';
  ctx.fillRect(mx, my, 1200 * scale, 1200 * scale);
  // Roads.
  ctx.fillStyle = '#4a4a55';
  for (let i = 0; i < 8; i++) {
    const c = (200 + i * 400) * scale;
    ctx.fillRect(mx + c - 2, my, 4, size);
    ctx.fillRect(mx, my + c - 2, size, 4);
  }
  // Shops.
  for (const s of G.world.shops) {
    ctx.fillStyle = s.kind === 'gun' ? '#c0392b' : s.kind === 'hospital' ? '#ffffff' : '#f39c12';
    ctx.fillRect(mx + s.x * scale - 3, my + s.y * scale - 3, 6, 6);
  }
  // Mission marker: big pulsing gold dot.
  if (G.objectiveMarker) {
    const m = G.objectiveMarker;
    const r = 7 + Math.sin(G.time * 4) * 2;
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.arc(mx + m.x * scale, my + m.y * scale, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  // Enemies red, police blue.
  for (const e of G.enemies) {
    if (e.health <= 0) continue;
    ctx.fillStyle = '#ff2222';
    ctx.fillRect(mx + e.x * scale - 3, my + e.y * scale - 3, 6, 6);
  }
  for (const car of G.cars) {
    if (car.isPolice && !car.dead) {
      ctx.fillStyle = '#3388ff';
      ctx.fillRect(mx + car.x * scale - 3, my + car.y * scale - 3, 6, 6);
    }
  }
  for (const cop of G.cops) {
    ctx.fillStyle = '#3388ff';
    ctx.fillRect(mx + cop.x * scale - 2, my + cop.y * scale - 2, 5, 5);
  }
  // Player: white arrow pointing the way they face.
  const p = G.player;
  ctx.save();
  ctx.translate(mx + p.x * scale, my + p.y * scale);
  ctx.rotate(p.angle);
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(9, 0);
  ctx.lineTo(-6, -6);
  ctx.lineTo(-3, 0);
  ctx.lineTo(-6, 6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 3;
  ctx.strokeRect(mx - 4, my - 4, size + 8, size + 8);
  // North label.
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 14px Verdana, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('N', mx + size / 2, my - 8);
}
