// The wanted system: five stars of heat, police cruisers that chase and
// ram, foot officers who close in, a bust timer when they catch the
// player, and heat that cools when the player breaks line of sight.
import { WANTED_MAX, BUST_RADIUS, BUST_TIME, HEAT_DECAY_TIME, WORLD_SIZE } from './config.js';
import { G } from './state.js';
import { lineOfSight, collideCircle } from './world.js';
import { makeCar, damageCar } from './vehicles.js';
import { addFloater, addShake } from './effects.js';
import { sfxSirenBlip, sfxBusted, setSiren } from './audio.js';

export function addWanted(stars, reason) {
  if (G.wanted >= WANTED_MAX) return;
  const before = G.wanted;
  G.wanted = Math.min(WANTED_MAX, G.wanted + stars);
  G.heatTimer = 0;
  if (G.wanted > before) {
    addFloater(G.player.x, G.player.y - 40, reason || 'Wanted level up!', '#ff5555');
    sfxSirenBlip();
  }
}

export function clearWanted() {
  const had = G.wanted;
  G.wanted = 0;
  G.heatTimer = 0;
  G.bustTimer = 0;
  if (had > 0) G.stats.copsEvaded++;
  // Cruisers give up and drive off.
  for (const car of G.cars) {
    if (car.isPolice) { car.isPolice = false; car.isTraffic = true; car.driver = true; }
  }
  G.cops = [];
}

function spawnCopCar() {
  const p = G.player;
  // Spawn on a road just off-screen from the player.
  const angle = Math.random() * Math.PI * 2;
  const dist = 620 + Math.random() * 200;
  let x = p.x + Math.cos(angle) * dist;
  let y = p.y + Math.sin(angle) * dist;
  x = Math.max(200, Math.min(WORLD_SIZE - 200, x));
  y = Math.max(200, Math.min(WORLD_SIZE - 200, y));
  const car = makeCar(x, y, 'cruiser', '#2c3e50', { angle: Math.atan2(p.y - y, p.x - x) });
  car.isPolice = true;
  G.cars.push(car);
  return car;
}

function spawnOfficer() {
  const p = G.player;
  const angle = Math.random() * Math.PI * 2;
  const dist = 420 + Math.random() * 150;
  G.cops.push({
    x: Math.max(40, Math.min(WORLD_SIZE - 40, p.x + Math.cos(angle) * dist)),
    y: Math.max(40, Math.min(WORLD_SIZE - 40, p.y + Math.sin(angle) * dist)),
    angle: 0, health: 60, speed: 150,
    fireCooldown: 1 + Math.random(),
    walkPhase: 0,
  });
}

function desiredCruisers() {
  return [0, 1, 2, 3, 4, 5][G.wanted] || 0;
}
function desiredOfficers() {
  return [0, 0, 1, 2, 3, 4][G.wanted] || 0;
}

function updateCruiser(car, dt) {
  const p = G.player;
  const def = car.def;
  const targetAngle = Math.atan2(p.y - car.y, p.x - car.x);
  let diff = targetAngle - car.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  const wantSpeed = Math.abs(diff) > 1.2 ? def.maxSpeed * 0.45 : def.maxSpeed * (0.75 + G.wanted * 0.05);
  car.speed += Math.sign(wantSpeed - car.speed) * Math.min(Math.abs(wantSpeed - car.speed), def.accel * dt);
  car.angle += Math.max(-def.turn * dt, Math.min(def.turn * dt, diff));
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  car.x = Math.max(24, Math.min(WORLD_SIZE - 24, car.x));
  car.y = Math.max(24, Math.min(WORLD_SIZE - 24, car.y));
  // Ramming the player's car hurts both.
  if (p.inCar && Math.hypot(car.x - p.x, car.y - p.y) < 52 && car.speed > 100) {
    damageCar(p.inCar, 8);
    damageCar(car, 5);
    addShake(4);
    car.speed *= 0.5;
  }
  // A cruiser far away despawns so the chase stays tight.
  if (Math.hypot(car.x - p.x, car.y - p.y) > 1600) {
    car.hp = 0; car.dead = true; car.burning = 0;
    G.cars = G.cars.filter((c) => c !== car);
  }
}

function updateOfficer(cop, dt) {
  const p = G.player;
  cop.walkPhase += dt * 7;
  if (cop.fireCooldown > 0) cop.fireCooldown -= dt;
  const d = Math.hypot(p.x - cop.x, p.y - cop.y);
  cop.angle = Math.atan2(p.y - cop.y, p.x - cop.x);
  const sees = lineOfSight(cop.x, cop.y, p.x, p.y, G.world);
  if (d > 60) {
    const step = cop.speed * dt * (p.inCar ? 1 : 1);
    const nx = cop.x + Math.cos(cop.angle) * step;
    const ny = cop.y + Math.sin(cop.angle) * step;
    const fixed = collideCircle(nx, ny, 11, G.world);
    cop.x = fixed.x; cop.y = fixed.y;
  }
  // Officers shoot when close, in sight, and the heat is high.
  if (G.wanted >= 3 && sees && d < 420 && cop.fireCooldown <= 0 && !p.inCar) {
    cop.fireCooldown = 1.1 + Math.random() * 0.6;
    G.bullets.push({
      x: cop.x, y: cop.y, angle: cop.angle + (Math.random() - 0.5) * 0.14,
      speed: 700, damage: 8, from: 'cop', life: 0.8,
    });
  }
}

export function updatePolice(dt) {
  const p = G.player;
  setSiren(G.wanted > 0);
  if (G.wanted <= 0) {
    G.bustTimer = 0;
    return;
  }
  // Keep the pursuit at the right strength.
  const cruisers = G.cars.filter((c) => c.isPolice && !c.dead);
  if (cruisers.length < desiredCruisers() && Math.random() < 0.02) spawnCopCar();
  const alive = G.cops.filter((c) => c.health > 0);
  if (alive.length < desiredOfficers() && Math.random() < 0.02) spawnOfficer();
  for (const car of cruisers) updateCruiser(car, dt);
  for (const cop of G.cops) if (cop.health > 0) updateOfficer(cop, dt);
  G.cops = G.cops.filter((c) => c.health > 0);

  // Bust: an officer or cruiser sits on a slow player.
  const playerSpeed = p.inCar ? Math.abs(p.inCar.speed) : 0;
  const onFoot = !p.inCar;
  let catcher = null;
  for (const cop of G.cops) {
    if (Math.hypot(cop.x - p.x, cop.y - p.y) < BUST_RADIUS) { catcher = cop; break; }
  }
  if (!catcher) {
    for (const car of cruisers) {
      if (Math.hypot(car.x - p.x, car.y - p.y) < BUST_RADIUS + 20 && car.speed < 60) { catcher = car; break; }
    }
  }
  const catchable = catcher && (onFoot || playerSpeed < 40);
  if (catchable) {
    G.bustTimer += dt;
    if (G.bustTimer >= BUST_TIME) {
      bustPlayer();
      return;
    }
  } else {
    G.bustTimer = Math.max(0, G.bustTimer - dt * 2);
  }

  // Heat decay: nobody can see the player for a while, one star cools off.
  let seen = false;
  for (const car of cruisers) {
    if (Math.hypot(car.x - p.x, car.y - p.y) < 500 && lineOfSight(car.x, car.y, p.x, p.y, G.world)) { seen = true; break; }
  }
  if (!seen) {
    for (const cop of G.cops) {
      if (Math.hypot(cop.x - p.x, cop.y - p.y) < 420 && lineOfSight(cop.x, cop.y, p.x, p.y, G.world)) { seen = true; break; }
    }
  }
  if (!seen) {
    G.heatTimer += dt;
    if (G.heatTimer >= HEAT_DECAY_TIME) {
      G.heatTimer = 0;
      G.wanted = Math.max(0, G.wanted - 1);
      if (G.wanted === 0) clearWanted();
      else addFloater(p.x, p.y - 40, 'Heat cooling off…', '#7fd4ff');
    }
  } else {
    G.heatTimer = 0;
  }
}

function bustPlayer() {
  const p = G.player;
  sfxBusted();
  const fine = Math.min(p.money, 150);
  p.money -= fine;
  clearWanted();
  G.screen = 'busted';
  G.bustFine = fine;
}

export function damageOfficer(cop, amount) {
  cop.health -= amount;
  if (cop.health <= 0) addWanted(1, 'Officer down');
}
