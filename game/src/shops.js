// Shops: gun stores, hospitals and the respray garage. Each shop is a
// zone around a fixed point; the interaction dispatcher calls
// shopInteract() for the nearest one in range.
import { RESPRAY_COST, HOSPITAL_COST, WEAPONS } from './config.js';
import { G } from './state.js';
import { addFloater } from './effects.js';
import { sfxPickup } from './audio.js';
import { clearWanted } from './police.js';
import { giveWeapon, healPlayer } from './player.js';

export function nearestShop(maxDist) {
  const p = G.player;
  let best = null, bestD = maxDist;
  for (const s of G.world.shops) {
    const d = Math.hypot(p.x - s.x, p.y - s.y);
    if (d < bestD) { bestD = d; best = s; }
  }
  return best;
}

export function shopPrompt(shop) {
  const p = G.player;
  if (!shop) return null;
  if (shop.kind === 'gun') {
    if (!p.weapons.shotgun) return 'E — Buy Breaker Shotgun ($150)';
    return 'E — Buy shotgun shells ($40)';
  }
  if (shop.kind === 'hospital') return `E — Get patched up ($${HOSPITAL_COST})`;
  if (shop.kind === 'respray') return `E — Respray & clear wanted ($${RESPRAY_COST})`;
  return null;
}

export function shopInteract() {
  const shop = nearestShop(110);
  if (!shop) return false;
  const p = G.player;
  if (shop.kind === 'gun') {
    if (!p.weapons.shotgun) {
      if (p.money < 150) { addFloater(p.x, p.y - 40, 'Need $150', '#ff5555'); return true; }
      p.money -= 150;
      giveWeapon('shotgun');
      addFloater(p.x, p.y - 40, 'Breaker Shotgun!', '#7dff8a');
    } else {
      if (p.money < 40) { addFloater(p.x, p.y - 40, 'Need $40', '#ff5555'); return true; }
      p.money -= 40;
      p.weapons.shotgun.reserve += 12;
      if (p.weapons.smg) p.weapons.smg.reserve += 30;
      addFloater(p.x, p.y - 40, 'Ammo restocked', '#7dff8a');
    }
    sfxPickup();
    return true;
  }
  if (shop.kind === 'hospital') {
    if (p.health >= p.maxHealth) { addFloater(p.x, p.y - 40, 'Already healthy', '#7fd4ff'); return true; }
    if (p.money < HOSPITAL_COST) { addFloater(p.x, p.y - 40, `Need $${HOSPITAL_COST}`, '#ff5555'); return true; }
    p.money -= HOSPITAL_COST;
    healPlayer(p.maxHealth);
    addFloater(p.x, p.y - 40, 'Patched up!', '#7dff8a');
    sfxPickup();
    return true;
  }
  if (shop.kind === 'respray') {
    if (G.wanted === 0 && !(p.inCar && p.inCar.hp < p.inCar.maxHp)) {
      addFloater(p.x, p.y - 40, 'No heat, no damage', '#7fd4ff');
      return true;
    }
    if (p.money < RESPRAY_COST) { addFloater(p.x, p.y - 40, `Need $${RESPRAY_COST}`, '#ff5555'); return true; }
    p.money -= RESPRAY_COST;
    clearWanted();
    if (p.inCar) {
      p.inCar.hp = p.inCar.maxHp;
      p.inCar.smoke = 0;
      p.inCar.color = ['#e84a4a', '#4a7ae8', '#e8c84a', '#4ae88a', '#e88a4a', '#9a4ae8'][Math.floor(Math.random() * 6)];
    }
    addFloater(p.x, p.y - 40, 'Fresh paint — heat gone!', '#7dff8a');
    sfxPickup();
    return true;
  }
  return false;
}

export function shopLabel(shop) {
  if (shop.kind === 'gun') return 'GUNS';
  if (shop.kind === 'hospital') return 'HOSPITAL';
  return 'RESPRAY';
}
