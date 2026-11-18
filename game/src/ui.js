// Menu screens: title, pause, help, wasted and busted. All drawn on
// the canvas with big buttons; clicks are hit-tested against the button
// rects recorded during the last draw.
import { G } from './state.js';
import { MISSIONS } from './missions.js';
import { mouse } from './input.js';

let buttons = [];
let titleArt = null;

function button(ctx, id, label, cx, y, w, h) {
  const x = cx - w / 2;
  const hover = mouse.x >= x && mouse.x <= x + w && mouse.y >= y && mouse.y <= y + h;
  ctx.fillStyle = hover ? '#ffb84d' : '#ff8c42';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#1a0f2a';
  ctx.lineWidth = 3;
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = '#1a0f2a';
  ctx.font = 'bold 22px Verdana, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, cx, y + h / 2 + 8);
  buttons.push({ id, x, y, w, h });
}

export function clickMenu(x, y) {
  for (const b of buttons) {
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b.id;
  }
  return null;
}

function sunsetBackdrop(ctx, w, h) {
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#2a1a4a');
  grad.addColorStop(0.45, '#c94b6a');
  grad.addColorStop(0.7, '#ff8c42');
  grad.addColorStop(1, '#ffd76e');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  // Sun.
  ctx.fillStyle = '#fff3b0';
  ctx.beginPath();
  ctx.arc(w * 0.72, h * 0.52, 64, 0, Math.PI * 2);
  ctx.fill();
  // Skyline silhouette.
  ctx.fillStyle = '#241534';
  const base = h * 0.78;
  let x = 0;
  let i = 0;
  const heights = [0.30, 0.42, 0.24, 0.5, 0.34, 0.44, 0.28, 0.38, 0.48, 0.26, 0.36, 0.4];
  while (x < w) {
    const bw = 60 + (i % 3) * 26;
    const bh = h * heights[i % heights.length];
    ctx.fillRect(x, base - bh, bw - 6, bh + h);
    // Lit windows.
    ctx.fillStyle = '#ffe9a8';
    for (let wy = base - bh + 12; wy < base - 12; wy += 22) {
      for (let wx = x + 8; wx < x + bw - 14; wx += 18) {
        if ((wx + wy) % 3 === 0) ctx.fillRect(wx, wy, 8, 10);
      }
    }
    ctx.fillStyle = '#241534';
    x += bw;
    i++;
  }
  // Palms in front.
  ctx.strokeStyle = '#1a0f2a';
  ctx.lineWidth = 6;
  for (const px of [w * 0.08, w * 0.92]) {
    ctx.beginPath();
    ctx.moveTo(px, h);
    ctx.quadraticCurveTo(px + 14, h * 0.82, px + 30, h * 0.72);
    ctx.stroke();
    ctx.strokeStyle = '#1a0f2a';
    ctx.lineWidth = 4;
    for (let a = 0; a < 6; a++) {
      const ang = Math.PI * (0.9 + a * 0.22);
      ctx.beginPath();
      ctx.moveTo(px + 30, h * 0.72);
      ctx.lineTo(px + 30 + Math.cos(ang) * 34, h * 0.72 + Math.sin(ang) * 20);
      ctx.stroke();
    }
    ctx.strokeStyle = '#1a0f2a';
    ctx.lineWidth = 6;
  }
}

function bigTitle(ctx, w, y) {
  ctx.textAlign = 'center';
  ctx.font = 'bold 74px Verdana, sans-serif';
  ctx.lineWidth = 10;
  ctx.strokeStyle = '#1a0f2a';
  ctx.strokeText('SUNFALL CITY', w / 2, y);
  const grad = ctx.createLinearGradient(0, y - 60, 0, y);
  grad.addColorStop(0, '#fff3b0');
  grad.addColorStop(1, '#ff8c42');
  ctx.fillStyle = grad;
  ctx.fillText('SUNFALL CITY', w / 2, y);
  ctx.font = 'bold 24px Verdana, sans-serif';
  ctx.lineWidth = 6;
  ctx.strokeText('MARA VOSS TAKES THE SUNSET', w / 2, y + 40);
  ctx.fillStyle = '#ffffff';
  ctx.fillText('MARA VOSS TAKES THE SUNSET', w / 2, y + 40);
}

export function drawTitle(ctx, w, h, hasSaveGame) {
  buttons = [];
  sunsetBackdrop(ctx, w, h);
  bigTitle(ctx, w, h * 0.32);
  const cy = h * 0.52;
  button(ctx, 'new', 'NEW GAME', w / 2, cy, 300, 54);
  if (hasSaveGame) button(ctx, 'continue', 'CONTINUE', w / 2, cy + 68, 300, 54);
  button(ctx, 'help', 'HOW TO PLAY', w / 2, cy + (hasSaveGame ? 136 : 68), 300, 54);
  // Controls strip.
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(w / 2 - 430, h - 108, 860, 88);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 17px Verdana, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('WASD / ARROWS — move & drive      E — interact / steal car      MOUSE — aim, CLICK — shoot', w / 2, h - 76);
  ctx.fillText('SHIFT — run / handbrake      1 / 2 / 3 — weapons      R — reload      ESC — pause      M — mute', w / 2, h - 46);
  ctx.font = '15px Verdana, sans-serif';
  ctx.fillStyle = '#ffe9a8';
  ctx.fillText('An original open-world crime story. Steal cars, dodge the cops, run five jobs for Rook.', w / 2, h - 22);
}

export function drawPause(ctx, w, h) {
  buttons = [];
  ctx.fillStyle = 'rgba(10,5,20,0.72)';
  ctx.fillRect(0, 0, w, h);
  ctx.textAlign = 'center';
  ctx.font = 'bold 56px Verdana, sans-serif';
  ctx.lineWidth = 8;
  ctx.strokeStyle = '#000';
  ctx.strokeText('PAUSED', w / 2, h * 0.28);
  ctx.fillStyle = '#ffffff';
  ctx.fillText('PAUSED', w / 2, h * 0.28);
  const p = G.player;
  ctx.font = 'bold 20px Verdana, sans-serif';
  ctx.fillText(`$${p.money}   •   Job ${Math.min(G.missionIndex + 1, 5)} of 5   •   Cars stolen: ${G.stats.carsStolen}`, w / 2, h * 0.28 + 44);
  const cy = h * 0.44;
  button(ctx, 'resume', 'RESUME', w / 2, cy, 300, 54);
  button(ctx, 'help', 'HOW TO PLAY', w / 2, cy + 68, 300, 54);
  button(ctx, 'save', 'SAVE GAME', w / 2, cy + 136, 300, 54);
  button(ctx, 'quit', 'QUIT TO TITLE', w / 2, cy + 204, 300, 54);
}

const HELP_LINES = [
  ['Move / drive', 'WASD or arrow keys. SHIFT runs on foot and is the handbrake in a car.'],
  ['Steal a car', 'Walk up to any parked or stopped car and press E. Enter and exit with E.'],
  ['Fight', 'Aim with the mouse, click to shoot. 1 / 2 / 3 switch weapons, R reloads.'],
  ['Wanted level', 'Crimes earn stars. Police chase harder as stars rise. Break line of sight to cool off,'],
  ['', 'or pay $100 at Mango Respray to clear your heat. If the cops corner you, you get busted.'],
  ['Jobs', 'Follow the gold marker. Press E at the marker to start each job for Rook. Five jobs, one story.'],
  ['Shops', 'Gun stores sell weapons and ammo, hospitals heal you, respray clears heat and fixes your car.'],
  ['Explosives', 'Red barrels explode when shot — and set off their neighbours. Cars explode too.'],
  ['Save', 'The game autosaves after every job. Pause and SAVE GAME any time.'],
];

export function drawHelp(ctx, w, h) {
  buttons = [];
  ctx.fillStyle = '#1a0f2a';
  ctx.fillRect(0, 0, w, h);
  ctx.textAlign = 'center';
  ctx.font = 'bold 44px Verdana, sans-serif';
  ctx.fillStyle = '#ffd700';
  ctx.fillText('HOW TO PLAY', w / 2, 70);
  ctx.textAlign = 'left';
  let y = 120;
  for (const [head, body] of HELP_LINES) {
    if (head) {
      ctx.font = 'bold 20px Verdana, sans-serif';
      ctx.fillStyle = '#ff8c42';
      ctx.fillText(head, 90, y);
    }
    ctx.font = '18px Verdana, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(body, 300, y);
    y += 34;
  }
  ctx.textAlign = 'center';
  ctx.font = 'bold 19px Verdana, sans-serif';
  ctx.fillStyle = '#7fd4ff';
  ctx.fillText('M — mute sound      ESC / P — pause', w / 2, y + 16);
  button(ctx, 'back', 'BACK', w / 2, h - 84, 260, 52);
}

export function drawWasted(ctx, w, h) {
  buttons = [];
  ctx.fillStyle = 'rgba(60,0,0,0.75)';
  ctx.fillRect(0, 0, w, h);
  ctx.textAlign = 'center';
  ctx.font = 'bold 72px Verdana, sans-serif';
  ctx.lineWidth = 10;
  ctx.strokeStyle = '#000';
  ctx.strokeText('WASTED', w / 2, h * 0.4);
  ctx.fillStyle = '#e74c3c';
  ctx.fillText('WASTED', w / 2, h * 0.4);
  ctx.font = 'bold 22px Verdana, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('Mara wakes up at Sunfall General, lighter in the pocket.', w / 2, h * 0.4 + 44);
  button(ctx, 'respawn', 'GET UP — RESPAWN AT HOSPITAL', w / 2, h * 0.56, 440, 56);
  button(ctx, 'quit', 'QUIT TO TITLE', w / 2, h * 0.56 + 70, 300, 54);
}

export function drawBusted(ctx, w, h) {
  buttons = [];
  ctx.fillStyle = 'rgba(0,20,60,0.75)';
  ctx.fillRect(0, 0, w, h);
  ctx.textAlign = 'center';
  ctx.font = 'bold 72px Verdana, sans-serif';
  ctx.lineWidth = 10;
  ctx.strokeStyle = '#000';
  ctx.strokeText('BUSTED', w / 2, h * 0.4);
  ctx.fillStyle = '#3388ff';
  ctx.fillText('BUSTED', w / 2, h * 0.4);
  ctx.font = 'bold 22px Verdana, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`The cops took $${G.bustFine || 0} and let Mara walk. The jobs wait.`, w / 2, h * 0.4 + 44);
  button(ctx, 'respawn', 'WALK FREE — RESPAWN', w / 2, h * 0.56, 400, 56);
  button(ctx, 'quit', 'QUIT TO TITLE', w / 2, h * 0.56 + 70, 300, 54);
}

export function drawStoryCompleteBanner(ctx, w) {
  // Small persistent ribbon once all five jobs are done.
  if (G.missionIndex < MISSIONS.length) return;
  ctx.font = 'bold 16px Verdana, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd700';
  ctx.fillText('★ STORY COMPLETE — FREE ROAM ★', w / 2, 108);
}
