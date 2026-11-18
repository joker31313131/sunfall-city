// Combat: the player's shots, enemy thugs, explosive barrels and the
// bullet simulation. Shooting near police earns heat; barrels chain.
import { WEAPONS } from './config.js';
import { G } from './state.js';
import { pointBlocked } from './world.js';
import { mouse } from './input.js';
import { spawnMuzzle, spawnBlood, spawnExplosion, addFloater, spawnParticles } from './effects.js';
import { sfxShoot, sfxExplosion } from './audio.js';
import { addWanted, damageOfficer } from './police.js';
import { scarePeds } from './pedestrians.js';
import { damageCar } from './vehicles.js';
import { damagePlayer } from './player.js';

export function spawnEnemy(x, y, opts) {
  const e = {
    x, y, angle: 0, health: (opts && opts.hp) || 60,
    speed: 120, fireCooldown: 0.8 + Math.random(),
    walkPhase: Math.random() * 6,
    shirt: (opts && opts.shirt) || '#8e44ad',
    mission: !!(opts && opts.mission),
  };
  G.enemies.push(e);
  return e;
}

export function playerShoot() {
  const p = G.player;
  if (p.inCar || p.reloadTimer > 0 || p.fireCooldown > 0) return;
  const def = WEAPONS[p.weapon];
  const w = p.weapons[p.weapon];
  if (w.ammo <= 0) {
    // Dry fire: auto reload if there is anything to load.
    if (w.reserve === Infinity || w.reserve > 0) {
      p.reloadTimer = def.reload;
    }
    p.fireCooldown = 0.25;
    return;
  }
  w.ammo--;
  p.fireCooldown = def.rate;
  G.stats.shotsFired++;
  const aim = p.aimAngle;
  for (let i = 0; i < def.pellets; i++) {
    const spread = (Math.random() - 0.5) * 2 * def.spread;
    G.bullets.push({
      x: p.x + Math.cos(aim) * 22, y: p.y + Math.sin(aim) * 22,
      angle: aim + spread, speed: 900, damage: def.damage,
      from: 'player', life: def.range / 900,
    });
  }
  spawnMuzzle(p.x, p.y, aim);
  sfxShoot(p.weapon);
  scarePeds(p.x, p.y, 420);
  // Gunfire in front of the law earns heat.
  const copNear = G.cops.some((c) => Math.hypot(c.x - p.x, c.y - p.y) < 420)
    || G.cars.some((c) => c.isPolice && Math.hypot(c.x - p.x, c.y - p.y) < 500);
  if (copNear && Math.random() < 0.5) addWanted(1, 'Shots fired');
  if (w.ammo === 0 && (w.reserve === Infinity || w.reserve > 0)) {
    p.reloadTimer = def.reload;
  }
}

function hitBarrel(b) {
  b.alive = false;
  spawnExplosion(b.x, b.y);
  sfxExplosion();
  const p = G.player;
  if (Math.hypot(p.x - b.x, p.y - b.y) < 130) damagePlayer(30, b.x, b.y);
  for (const e of G.enemies) {
    if (Math.hypot(e.x - b.x, e.y - b.y) < 140) e.health -= 90;
  }
  for (const cop of G.cops) {
    if (Math.hypot(cop.x - b.x, cop.y - b.y) < 140) damageOfficer(cop, 90);
  }
  for (const car of G.cars) {
    if (!car.dead && Math.hypot(car.x - b.x, car.y - b.y) < 130) damageCar(car, 70);
  }
  for (const other of G.barrels) {
    if (other.alive && other !== b && Math.hypot(other.x - b.x, other.y - b.y) < 110) {
      hitBarrel(other); // chain reaction
    }
  }
  scarePeds(b.x, b.y, 500);
}

export function updateBullets(dt) {
  const p = G.player;
  for (const b of G.bullets) {
    b.life -= dt;
    const step = b.speed * dt;
    const nx = b.x + Math.cos(b.angle) * step;
    const ny = b.y + Math.sin(b.angle) * step;
    b.x = nx; b.y = ny;
    if (pointBlocked(nx, ny, G.world)) {
      b.life = 0;
      spawnParticles(nx, ny, { count: 3, speed: 80, life: 0.25, size: 3, color: '#ffe9a8' });
      continue;
    }
    // Barrels explode when shot.
    for (const barrel of G.barrels) {
      if (barrel.alive && Math.hypot(barrel.x - nx, barrel.y - ny) < barrel.r + 4) {
        hitBarrel(barrel);
        b.life = 0;
        break;
      }
    }
    if (b.life <= 0) continue;
    if (b.from === 'player') {
      for (const e of G.enemies) {
        if (e.health > 0 && Math.hypot(e.x - nx, e.y - ny) < 16) {
          e.health -= b.damage;
          b.life = 0;
          spawnBlood(nx, ny);
          break;
        }
      }
      if (b.life <= 0) continue;
      for (const cop of G.cops) {
        if (cop.health > 0 && Math.hypot(cop.x - nx, cop.y - ny) < 15) {
          damageOfficer(cop, b.damage);
          b.life = 0;
          spawnBlood(nx, ny);
          break;
        }
      }
      if (b.life <= 0) continue;
      for (const car of G.cars) {
        if (!car.dead && Math.hypot(car.x - nx, car.y - ny) < 30) {
          damageCar(car, b.damage * 0.6, nx, ny);
          b.life = 0;
          break;
        }
      }
      if (b.life <= 0) continue;
      for (const ped of G.peds) {
        if (ped.health > 0 && Math.hypot(ped.x - nx, ped.y - ny) < 13) {
          ped.health = 0;
          b.life = 0;
          spawnBlood(nx, ny);
          addWanted(2, 'Pedestrian shot');
          break;
        }
      }
    } else {
      // Enemy and cop bullets hit the player.
      if (Math.hypot(p.x - nx, p.y - ny) < (p.inCar ? 30 : 15)) {
        damagePlayer(b.damage, b.x, b.y);
        b.life = 0;
        spawnBlood(nx, ny);
      }
    }
  }
  G.bullets = G.bullets.filter((b) => b.life > 0);
}

export function updateEnemies(dt) {
  const p = G.player;
  for (const e of G.enemies) {
    if (e.health <= 0) continue;
    e.walkPhase += dt * 7;
    if (e.fireCooldown > 0) e.fireCooldown -= dt;
    const d = Math.hypot(p.x - e.x, p.y - e.y);
    e.angle = Math.atan2(p.y - e.y, p.x - e.x);
    if (d > 240) {
      // Close the distance.
      e.x += Math.cos(e.angle) * e.speed * dt;
      e.y += Math.sin(e.angle) * e.speed * dt;
    } else if (d < 120) {
      // Back off a little to keep a firing lane.
      e.x -= Math.cos(e.angle) * e.speed * 0.5 * dt;
      e.y -= Math.sin(e.angle) * e.speed * 0.5 * dt;
    }
    if (d < 420 && e.fireCooldown <= 0 && !pointBlocked(e.x, e.y, G.world)) {
      e.fireCooldown = 1.3 + Math.random() * 0.7;
      G.bullets.push({
        x: e.x, y: e.y, angle: e.angle + (Math.random() - 0.5) * 0.18,
        speed: 650, damage: 7, from: 'enemy', life: 0.8,
      });
      spawnMuzzle(e.x, e.y, e.angle);
      sfxShoot('pistol');
    }
  }
  const before = G.enemies.length;
  G.enemies = G.enemies.filter((e) => e.health > 0 || Math.hypot(e.x - p.x, p.y - p.y) < 600);
  if (G.enemies.length < before && G.mission) {
    // Mission code watches the enemy count each frame; nothing to do here.
  }
  G.barrels = G.barrels.filter((b) => b.alive);
}

export function aimAngleFromMouse(cam, canvasW, canvasH) {
  const p = G.player;
  const wx = mouse.x + cam.x;
  const wy = mouse.y + cam.y;
  return Math.atan2(wy - p.y, wx - p.x);
}
