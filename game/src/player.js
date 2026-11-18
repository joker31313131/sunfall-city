// The player: Mara Voss, on foot and behind the wheel. Movement,
// damage, weapon switching and the aim direction live here; shooting
// itself lives in combat.js.
import { PLAYER_WALK, PLAYER_RUN, PLAYER_RADIUS, WEAPONS } from './config.js';
import { G } from './state.js';
import { collideCircle } from './world.js';
import { keys } from './input.js';
import { sfxReload } from './audio.js';

export function updatePlayerOnFoot(dt) {
  const p = G.player;
  let mx = 0, my = 0;
  if (keys.up) my -= 1;
  if (keys.down) my += 1;
  if (keys.left) mx -= 1;
  if (keys.right) mx += 1;
  p.moving = mx !== 0 || my !== 0;
  p.running = !!keys.run && p.moving;
  if (p.moving) {
    const len = Math.hypot(mx, my);
    const speed = p.running ? PLAYER_RUN : PLAYER_WALK;
    const nx = p.x + (mx / len) * speed * dt;
    const ny = p.y + (my / len) * speed * dt;
    const fixed = collideCircle(nx, ny, PLAYER_RADIUS, G.world);
    p.x = fixed.x; p.y = fixed.y;
    p.angle = Math.atan2(my, mx);
  }
  if (p.invuln > 0) p.invuln -= dt;
  if (p.fireCooldown > 0) p.fireCooldown -= dt;
  if (p.reloadTimer > 0) {
    p.reloadTimer -= dt;
    if (p.reloadTimer <= 0) finishReload();
  }
}

export function damagePlayer(amount, fromX, fromY) {
  const p = G.player;
  if (!p || p.invuln > 0 || G.screen !== 'play') return;
  if (p.inCar) {
    // In a car the shell takes half the hit; the driver feels the rest.
    damageCar(p.inCar, amount * 0.8, fromX, fromY);
    amount *= 0.5;
  }
  p.health -= amount;
  p.invuln = 0.25;
  if (p.health <= 0) {
    p.health = 0;
    G.screen = 'wasted';
  }
}

export function healPlayer(amount) {
  const p = G.player;
  p.health = Math.min(p.maxHealth, p.health + amount);
}

export function giveWeapon(kind) {
  const p = G.player;
  const def = WEAPONS[kind];
  if (!def) return;
  if (!p.weapons[kind]) p.weapons[kind] = { ammo: def.mag, reserve: def.reserve };
  p.weapon = kind;
}

export function switchWeapon(slot) {
  const p = G.player;
  const order = ['pistol', 'smg', 'shotgun'];
  const kind = order[slot];
  if (kind && p.weapons[kind]) {
    p.weapon = kind;
    p.reloadTimer = 0;
  }
}

export function startReload() {
  const p = G.player;
  const w = p.weapons[p.weapon];
  const def = WEAPONS[p.weapon];
  if (!w || p.reloadTimer > 0) return;
  if (w.ammo >= def.mag) return;
  if (w.reserve !== Infinity && w.reserve <= 0) return;
  p.reloadTimer = def.reload;
  sfxReload();
}

export function finishReload() {
  const p = G.player;
  const w = p.weapons[p.weapon];
  const def = WEAPONS[p.weapon];
  if (!w) return;
  const need = def.mag - w.ammo;
  if (w.reserve === Infinity) {
    w.ammo = def.mag;
  } else {
    const take = Math.min(need, w.reserve);
    w.ammo += take;
    w.reserve -= take;
  }
}

export function currentWeapon() {
  return { def: WEAPONS[G.player.weapon], state: G.player.weapons[G.player.weapon] };
}

// Re-exported here so damagePlayer can hurt the car without a cycle:
// vehicles.js imports this module for nothing, and this module imports
// damageCar lazily through the vehicles module at call time.
import { damageCar } from './vehicles.js';
export { damageCar };
