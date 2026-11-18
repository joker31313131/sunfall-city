// Rendering: the camera, the city, and every actor drawn procedurally
// on the canvas. Sunset lighting is baked into the palette — warm
// ground, long shadows to the east, lit windows.
import { WORLD_SIZE, ROAD_WIDTH, PALETTE } from './config.js';
import { G } from './state.js';
import { roadCenters } from './world.js';
import { drawSkidMarks, drawParticles, drawFloaters } from './effects.js';
import { shopLabel } from './shops.js';

export function updateCamera(canvasW, canvasH) {
  const p = G.player;
  const cam = G.camera;
  cam.x += (p.x - canvasW / 2 - cam.x) * 0.12;
  cam.y += (p.y - canvasH / 2 - cam.y) * 0.12;
  cam.x = Math.max(0, Math.min(WORLD_SIZE - canvasW, cam.x));
  cam.y = Math.max(0, Math.min(WORLD_SIZE - canvasH, cam.y));
  if (cam.shake > 0) {
    cam.sx = (Math.random() - 0.5) * cam.shake;
    cam.sy = (Math.random() - 0.5) * cam.shake;
  } else { cam.sx = 0; cam.sy = 0; }
}

function viewCam() {
  return { x: G.camera.x - (G.camera.sx || 0), y: G.camera.y - (G.camera.sy || 0) };
}

export function drawWorld(ctx, canvasW, canvasH) {
  const cam = viewCam();
  const w = G.world;
  // Ground.
  ctx.fillStyle = PALETTE.ground;
  ctx.fillRect(0, 0, canvasW, canvasH);
  // Park lawn.
  ctx.fillStyle = PALETTE.parkGrass;
  ctx.fillRect(0 - cam.x, 0 - cam.y, 1200, 1200);
  // Harbour water along the south edge.
  ctx.fillStyle = PALETTE.water;
  ctx.fillRect(0 - cam.x, 2960 - cam.y, WORLD_SIZE, 240);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  for (let i = 0; i < 24; i++) {
    const wx = (i * 137) % WORLD_SIZE;
    const wy = 3000 + (i * 53) % 160;
    ctx.fillRect(wx - cam.x, wy - cam.y, 46, 3);
  }
  // Sand strip above the water.
  ctx.fillStyle = PALETTE.sand;
  ctx.fillRect(0 - cam.x, 2900 - cam.y, WORLD_SIZE, 60);

  // Roads.
  const centers = roadCenters();
  ctx.fillStyle = PALETTE.road;
  for (const c of centers) {
    ctx.fillRect(c - ROAD_WIDTH / 2 - cam.x, 0 - cam.y, ROAD_WIDTH, WORLD_SIZE);
    ctx.fillRect(0 - cam.x, c - ROAD_WIDTH / 2 - cam.y, WORLD_SIZE, ROAD_WIDTH);
  }
  // Lane dashes.
  ctx.fillStyle = PALETTE.laneDash;
  for (const c of centers) {
    for (let d = 40; d < WORLD_SIZE; d += 80) {
      ctx.fillRect(c - 3 - cam.x, d - cam.y, 6, 34);
      ctx.fillRect(d - cam.x, c - 3 - cam.y, 34, 6);
    }
  }
  // Sidewalk frames around blocks.
  ctx.strokeStyle = PALETTE.sidewalk;
  ctx.lineWidth = 10;
  for (let i = 0; i < centers.length - 1; i++) {
    for (let j = 0; j < centers.length - 1; j++) {
      ctx.strokeRect(centers[i] + ROAD_WIDTH / 2 - cam.x, centers[j] + ROAD_WIDTH / 2 - cam.y,
        ROAD_WIDTH * 0 + (centers[i + 1] - centers[i] - ROAD_WIDTH), centers[j + 1] - centers[j] - ROAD_WIDTH);
    }
  }

  drawSkidMarks(ctx, cam);

  // Objective marker ring on the ground.
  if (G.objectiveMarker) {
    const m = G.objectiveMarker;
    const pulse = 1 + Math.sin(G.time * 4) * 0.15;
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(m.x - cam.x, m.y - cam.y, 46 * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,215,0,0.15)';
    ctx.beginPath();
    ctx.arc(m.x - cam.x, m.y - cam.y, 46 * pulse, 0, Math.PI * 2);
    ctx.fill();
    // Bouncing arrow.
    const ay = m.y - 90 - Math.sin(G.time * 4) * 8;
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.moveTo(m.x - cam.x, ay + 26 - cam.y);
    ctx.lineTo(m.x - 14 - cam.x, ay - cam.y);
    ctx.lineTo(m.x + 14 - cam.x, ay - cam.y);
    ctx.closePath();
    ctx.fill();
  }

  // Shops: coloured pads with signs.
  for (const s of w.shops) {
    ctx.fillStyle = s.color;
    ctx.globalAlpha = 0.9;
    ctx.fillRect(s.x - 46 - cam.x, s.y - 30 - cam.y, 92, 60);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 3;
    ctx.strokeRect(s.x - 46 - cam.x, s.y - 30 - cam.y, 92, 60);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px Verdana, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(shopLabel(s), s.x - cam.x, s.y + 5 - cam.y);
  }

  // Buildings, sorted by y so nearer ones overlap correctly, with
  // sunset shadows cast east.
  const sorted = [...w.buildings].sort((a, b) => a.y - b.y);
  for (const b of sorted) {
    const bx = b.x - cam.x, by = b.y - cam.y;
    if (bx > canvasW + 60 || bx + b.w < -60 || by > canvasH + 60 || by + b.h < -60) continue;
    const hgt = b.height * 9;
    ctx.fillStyle = 'rgba(60,30,20,0.25)';
    ctx.fillRect(bx + 14, by + 10, b.w, b.h);
    ctx.fillStyle = b.color;
    ctx.fillRect(bx, by, b.w, b.h);
    // Roof face: the top strip reads as height.
    ctx.fillStyle = PALETTE.roof;
    ctx.fillRect(bx, by, b.w, Math.min(14, hgt));
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 2;
    ctx.strokeRect(bx, by, b.w, b.h);
    // Windows.
    const cols = Math.max(2, Math.floor(b.w / 34));
    const rows = Math.max(1, Math.min(3, b.height));
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const wx = bx + 10 + i * ((b.w - 20) / cols);
        const wy = by + 20 + j * ((b.h - 28) / Math.max(1, rows));
        const lit = ((i * 7 + j * 3 + Math.floor(b.litSeed * 10)) % 3) === 0;
        ctx.fillStyle = lit ? PALETTE.windowLit : PALETTE.windowDark;
        ctx.fillRect(wx, wy, 14, 12);
      }
    }
  }

  // Trees and palms.
  for (const t of w.trees) {
    const tx = t.x - cam.x, ty = t.y - cam.y;
    if (tx < -40 || tx > canvasW + 40 || ty < -40 || ty > canvasH + 40) continue;
    ctx.fillStyle = PALETTE.trunk;
    ctx.fillRect(tx - 3, ty - 4, 6, 12);
    ctx.fillStyle = PALETTE.tree;
    ctx.beginPath();
    ctx.arc(tx, ty - 8, t.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.beginPath();
    ctx.arc(tx - t.r * 0.3, ty - 8 - t.r * 0.3, t.r * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Barrels.
  for (const b of G.barrels) {
    ctx.fillStyle = '#c0392b';
    ctx.beginPath();
    ctx.arc(b.x - cam.x, b.y - cam.y, b.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f1c40f';
    ctx.font = 'bold 13px Verdana, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('!', b.x - cam.x, b.y + 5 - cam.y);
  }

  // Pickups.
  for (const pk of G.pickups) {
    const bob = Math.sin(G.time * 3) * 4;
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(pk.x - 14 - cam.x, pk.y - 14 + bob - cam.y, 28, 28);
    ctx.strokeStyle = '#7a5a00';
    ctx.lineWidth = 2;
    ctx.strokeRect(pk.x - 14 - cam.x, pk.y - 14 + bob - cam.y, 28, 28);
    ctx.fillStyle = '#7a5a00';
    ctx.font = 'bold 12px Verdana, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(pk.label, pk.x - cam.x, pk.y - 22 + bob - cam.y);
  }

  // Actors, y-sorted for overlap.
  const actors = [];
  for (const car of G.cars) actors.push({ y: car.y, draw: () => drawCar(ctx, cam, car) });
  for (const ped of G.peds) if (ped.health > 0) actors.push({ y: ped.y, draw: () => drawPerson(ctx, cam, ped, false) });
  for (const cop of G.cops) actors.push({ y: cop.y, draw: () => drawOfficer(ctx, cam, cop) });
  for (const e of G.enemies) if (e.health > 0) actors.push({ y: e.y, draw: () => drawPerson(ctx, cam, e, true) });
  const p = G.player;
  if (p && !p.inCar) actors.push({ y: p.y, draw: () => drawPlayer(ctx, cam) });
  actors.sort((a, b) => a.y - b.y);
  for (const a of actors) a.draw();

  // Bullets as bright tracers.
  ctx.strokeStyle = '#fff2a8';
  ctx.lineWidth = 3;
  for (const b of G.bullets) {
    ctx.beginPath();
    ctx.moveTo(b.x - cam.x, b.y - cam.y);
    ctx.lineTo(b.x - Math.cos(b.angle) * 16 - cam.x, b.y - Math.sin(b.angle) * 16 - cam.y);
    ctx.stroke();
  }

  drawParticles(ctx, cam);
  drawFloaters(ctx, cam);
}

export function drawCar(ctx, cam, car) {
  ctx.save();
  ctx.translate(car.x - cam.x, car.y - cam.y);
  ctx.rotate(car.angle);
  const w = car.def.w, h = car.def.h;
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(-w / 2 + 3, -h / 2 + 4, w, h);
  // Body.
  ctx.fillStyle = car.dead ? '#3a3a3a' : car.color;
  roundRect(ctx, -w / 2, -h / 2, w, h, 7);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.lineWidth = 2;
  ctx.stroke();
  // Cabin / windshield.
  ctx.fillStyle = car.dead ? '#222' : '#bfe8ff';
  roundRect(ctx, -w * 0.12, -h / 2 + 3, w * 0.3, h - 6, 4);
  ctx.fill();
  // Headlights and taillights.
  ctx.fillStyle = '#fff9c4';
  ctx.fillRect(w / 2 - 4, -h / 2 + 3, 4, 5);
  ctx.fillRect(w / 2 - 4, h / 2 - 8, 4, 5);
  ctx.fillStyle = '#ff4444';
  ctx.fillRect(-w / 2, -h / 2 + 3, 4, 5);
  ctx.fillRect(-w / 2, h / 2 - 8, 4, 5);
  if (car.isPolice) {
    // Light bar, flashing with time.
    const phase = Math.floor(G.time * 6) % 2 === 0;
    ctx.fillStyle = phase ? '#ff3333' : '#3388ff';
    ctx.fillRect(-6, -h / 2 - 3, 12, 5);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9px Verdana, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('POLICE', 0, -h / 2 - 6);
  }
  if (car.label) {
    ctx.rotate(-car.angle);
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 13px Verdana, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(car.label, 0, -h / 2 - 12);
  }
  // Damage smoke marker.
  if (car.smoke && !car.dead) {
    ctx.fillStyle = 'rgba(120,120,120,0.5)';
    ctx.beginPath();
    ctx.arc(w / 2 - 6, 0, 6 + Math.sin(G.time * 8) * 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawPerson(ctx, cam, ped, isEnemy) {
  const bob = Math.sin(ped.walkPhase) * 1.5;
  const x = ped.x - cam.x, y = ped.y - cam.y;
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(x + 2, y + 12, 9, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  // Legs.
  ctx.strokeStyle = ped.pants || '#2c3e50';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x - 3, y + 4);
  ctx.lineTo(x - 4, y + 12 + bob);
  ctx.moveTo(x + 3, y + 4);
  ctx.lineTo(x + 4, y + 12 - bob);
  ctx.stroke();
  // Body.
  ctx.fillStyle = ped.shirt || '#e74c3c';
  ctx.fillRect(x - 7, y - 8, 14, 13);
  // Head.
  ctx.fillStyle = ped.skin || '#e0ac69';
  ctx.beginPath();
  ctx.arc(x, y - 13, 7, 0, Math.PI * 2);
  ctx.fill();
  // Facing arm / gun for enemies.
  if (isEnemy) {
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, y - 2);
    ctx.lineTo(x + Math.cos(ped.angle) * 14, y - 2 + Math.sin(ped.angle) * 14);
    ctx.stroke();
    // Health pip.
    ctx.fillStyle = '#222';
    ctx.fillRect(x - 12, y - 26, 24, 4);
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(x - 12, y - 26, 24 * Math.max(0, ped.health / 80), 4);
  }
}

function drawOfficer(ctx, cam, cop) {
  const bob = Math.sin(cop.walkPhase) * 1.5;
  const x = cop.x - cam.x, y = cop.y - cam.y;
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(x + 2, y + 12, 9, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#1a2a4a';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x - 3, y + 4); ctx.lineTo(x - 4, y + 12 + bob);
  ctx.moveTo(x + 3, y + 4); ctx.lineTo(x + 4, y + 12 - bob);
  ctx.stroke();
  ctx.fillStyle = '#2c4a7a';
  ctx.fillRect(x - 7, y - 8, 14, 13);
  ctx.fillStyle = '#e0ac69';
  ctx.beginPath();
  ctx.arc(x, y - 13, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1a2a4a';
  ctx.fillRect(x - 7, y - 20, 14, 5);
  ctx.fillStyle = '#ffd700';
  ctx.fillRect(x - 2, y - 6, 4, 4);
}

function drawPlayer(ctx, cam) {
  const p = G.player;
  const bob = p.moving ? Math.sin(G.time * 10) * 1.5 : 0;
  const x = p.x - cam.x, y = p.y - cam.y;
  if (p.invuln > 0 && Math.floor(G.time * 12) % 2 === 0) ctx.globalAlpha = 0.5;
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(x + 2, y + 12, 9, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#3a2a4a';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x - 3, y + 4); ctx.lineTo(x - 4, y + 12 + bob);
  ctx.moveTo(x + 3, y + 4); ctx.lineTo(x + 4, y + 12 - bob);
  ctx.stroke();
  // Mara's coral jacket.
  ctx.fillStyle = '#ff6a5c';
  ctx.fillRect(x - 7, y - 8, 14, 13);
  ctx.fillStyle = '#ffd9b3';
  ctx.beginPath();
  ctx.arc(x, y - 13, 7, 0, Math.PI * 2);
  ctx.fill();
  // Dark hair.
  ctx.fillStyle = '#2a1a2a';
  ctx.beginPath();
  ctx.arc(x, y - 15, 7, Math.PI, Math.PI * 2);
  ctx.fill();
  // Aim arm + gun.
  ctx.strokeStyle = '#222';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x, y - 2);
  ctx.lineTo(x + Math.cos(p.aimAngle) * 16, y - 2 + Math.sin(p.aimAngle) * 16);
  ctx.stroke();
  // Aim reticle.
  const rx = x + Math.cos(p.aimAngle) * 60;
  const ry = y - 2 + Math.sin(p.aimAngle) * 60;
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(rx, ry, 8, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(rx - 12, ry); ctx.lineTo(rx - 5, ry);
  ctx.moveTo(rx + 5, ry); ctx.lineTo(rx + 12, ry);
  ctx.moveTo(rx, ry - 12); ctx.lineTo(rx, ry - 5);
  ctx.moveTo(rx, ry + 5); ctx.lineTo(rx, ry + 12);
  ctx.stroke();
  ctx.globalAlpha = 1;
}
