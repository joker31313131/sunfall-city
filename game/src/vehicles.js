// Vehicles: parked cars to steal, road traffic, the player's ride and
// police cruisers. Driving is simple arcade physics — accelerate, steer
// with speed, drift with the handbrake — with damage, smoke and fire.
import { CAR_TYPES, CAR_COLORS, WORLD_SIZE, ROAD_WIDTH } from './config.js';
import { G } from './state.js';
import { roadCenters, collideCircle, onRoad } from './world.js';
import { keys } from './input.js';
import { spawnParticles, spawnExplosion, spawnSparks, addSkid, addShake } from './effects.js';
import { sfxCrash, sfxExplosion } from './audio.js';
import { addWanted } from './police.js';

let carId = 0;

export function makeCar(x, y, type, color, opts) {
  const def = CAR_TYPES[type];
  const car = {
    id: ++carId,
    x, y, angle: (opts && opts.angle) || 0,
    speed: 0, type, def, color: color || '#e84a4a',
    hp: def.hp, maxHp: def.hp,
    dead: false, burning: 0, smoke: 0,
    isPolice: type === 'cruiser',
    isTraffic: !!(opts && opts.traffic),
    isParked: !!(opts && opts.parked),
    driver: !!(opts && opts.traffic),
    // Traffic state: drive along one road, turn at intersections.
    axis: (opts && opts.axis) || 'h',
    dir: (opts && opts.dir) || 1,
    cruise: 120 + Math.random() * 60,
    targetSpeed: 0,
    missionCar: !!(opts && opts.missionCar),
    label: (opts && opts.label) || null,
    stuckTimer: 0,
  };
  return car;
}

export function spawnCityCars(rng) {
  const centers = roadCenters();
  // Parked cars along road edges.
  for (let i = 0; i < 26; i++) {
    const vertical = rng() < 0.5;
    const c = centers[Math.floor(rng() * centers.length)];
    const along = 250 + rng() * (WORLD_SIZE - 500);
    const side = rng() < 0.5 ? 1 : -1;
    const off = ROAD_WIDTH / 2 + 18;
    const x = vertical ? c + side * off : along;
    const y = vertical ? along : c + side * off;
    const type = ['sedan', 'coupe', 'van', 'taxi', 'muscle'][Math.floor(rng() * 5)];
    const car = makeCar(x, y, type, CAR_COLORS[Math.floor(rng() * CAR_COLORS.length)],
      { parked: true, angle: vertical ? (side > 0 ? Math.PI / 2 : -Math.PI / 2) : (side > 0 ? 0 : Math.PI) });
    G.cars.push(car);
  }
  // Moving traffic on the roads.
  for (let i = 0; i < 16; i++) spawnTrafficCar(rng);
}

export function spawnTrafficCar(rng) {
  const centers = roadCenters();
  const vertical = (rng ? rng() : Math.random()) < 0.5;
  const c = centers[Math.floor((rng ? rng() : Math.random()) * centers.length)];
  const along = 250 + (rng ? rng() : Math.random()) * (WORLD_SIZE - 500);
  const dir = (rng ? rng() : Math.random()) < 0.5 ? 1 : -1;
  const type = ['sedan', 'coupe', 'van', 'taxi'][Math.floor((rng ? rng() : Math.random()) * 4)];
  const car = makeCar(
    vertical ? c + dir * 22 : along,
    vertical ? along : c + dir * 22,
    type, CAR_COLORS[Math.floor((rng ? rng() : Math.random()) * CAR_COLORS.length)],
    { traffic: true, axis: vertical ? 'v' : 'h', dir, angle: vertical ? (dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (dir > 0 ? 0 : Math.PI) });
  G.cars.push(car);
  return car;
}

export function nearestCar(x, y, maxDist, predicate) {
  let best = null, bestD = maxDist;
  for (const car of G.cars) {
    if (car.dead || car.burning > 0) continue;
    if (predicate && !predicate(car)) continue;
    const d = Math.hypot(car.x - x, car.y - y);
    if (d < bestD) { bestD = d; best = car; }
  }
  return best;
}

export function enterCar(car) {
  const p = G.player;
  p.inCar = car;
  car.isParked = false;
  car.driver = false;
  car.isTraffic = false;
  car.isPolice = false; // a stolen cruiser stops being a pursuer
  car.speed = 0;
  p.x = car.x; p.y = car.y;
  G.stats.carsStolen++;
  if (car.driver === false && !car.wasPlayerCar) {
    // Stealing a car with a witness nearby earns heat.
    const witness = G.peds.some((ped) => Math.hypot(ped.x - car.x, ped.y - car.y) < 260)
      || G.cars.some((c) => c.isPolice && Math.hypot(c.x - car.x, c.y - car.y) < 500);
    if (witness) addWanted(1, 'Car stolen in plain sight');
  }
  car.wasPlayerCar = true;
}

export function exitCar() {
  const p = G.player;
  const car = p.inCar;
  if (!car) return;
  p.inCar = null;
  const side = car.angle + Math.PI / 2;
  p.x = car.x + Math.cos(side) * 34;
  p.y = car.y + Math.sin(side) * 34;
  const fixed = collideCircle(p.x, p.y, 14, G.world);
  p.x = fixed.x; p.y = fixed.y;
  p.angle = car.angle;
  car.speed = 0;
}

export function damageCar(car, amount, fromX, fromY) {
  if (car.dead) return;
  car.hp -= amount;
  if (fromX !== undefined) spawnSparks(car.x, car.y);
  if (car.hp <= 30 && car.hp > 0) car.smoke = 1;
  if (car.hp <= 0 && !car.dead) {
    car.dead = true;
    car.burning = 2.2;
    explodeCar(car);
  }
}

export function explodeCar(car) {
  spawnExplosion(car.x, car.y);
  sfxExplosion();
  addShake(10);
  // Splash damage to the player, peds and nearby cars.
  const p = G.player;
  if (p && Math.hypot(p.x - car.x, p.y - car.y) < 130) {
    p.health -= 35;
    if (p.health <= 0) { p.health = 0; G.screen = 'wasted'; }
  }
  for (const ped of G.peds) {
    if (Math.hypot(ped.x - car.x, ped.y - car.y) < 120) ped.health = 0;
  }
  for (const other of G.cars) {
    if (other !== car && !other.dead && Math.hypot(other.x - car.x, other.y - car.y) < 120) {
      damageCar(other, 60);
    }
  }
}

function carHitsBuilding(car) {
  const hw = car.def.w / 2, hh = car.def.h / 2;
  const cos = Math.cos(car.angle), sin = Math.sin(car.angle);
  const corners = [
    [hw, hh], [hw, -hh], [-hw, hh], [-hw, -hh],
  ];
  for (const [lx, ly] of corners) {
    const wx = car.x + lx * cos - ly * sin;
    const wy = car.y + lx * sin + ly * cos;
    for (const b of G.world.buildings) {
      if (wx >= b.x && wx <= b.x + b.w && wy >= b.y && wy <= b.y + b.h) return true;
    }
  }
  return false;
}

function updatePlayerCar(dt) {
  const p = G.player;
  const car = p.inCar;
  const def = car.def;
  if (keys.up) car.speed += def.accel * dt;
  else if (keys.down) car.speed -= (car.speed > 0 ? def.accel * 1.4 : def.accel * 0.7) * dt;
  else {
    // Coast down.
    car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 90 * dt);
  }
  car.speed = Math.max(-def.reverse, Math.min(def.maxSpeed, car.speed));
  const handbrake = keys.run;
  const steerInput = (keys.left ? -1 : 0) + (keys.right ? 1 : 0);
  const speedNorm = Math.min(1, Math.abs(car.speed) / def.maxSpeed);
  const steerRate = def.turn * (0.55 + 0.45 * (1 - speedNorm)) * (handbrake ? 1.6 : 1);
  if (steerInput !== 0 && Math.abs(car.speed) > 20) {
    car.angle += steerInput * steerRate * dt * Math.sign(car.speed);
    if (handbrake && Math.abs(car.speed) > 150) {
      car.speed *= Math.max(0, 1 - 0.9 * dt);
      addSkid(car.x - Math.cos(car.angle) * 18, car.y - Math.sin(car.angle) * 18, car.angle);
      if (Math.random() < 0.4) spawnParticles(car.x, car.y, { count: 1, speed: 40, life: 0.4, size: 5, color: '#dddddd' });
    }
  }
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  const oldX = car.x, oldY = car.y;
  car.x = nx; car.y = ny;
  if (carHitsBuilding(car)) {
    car.x = oldX; car.y = oldY;
    if (Math.abs(car.speed) > 120) {
      damageCar(car, Math.abs(car.speed) * 0.12);
      sfxCrash();
      addShake(Math.min(10, Math.abs(car.speed) * 0.02));
      spawnSparks(car.x + Math.cos(car.angle) * 20, car.y + Math.sin(car.angle) * 20);
    }
    car.speed *= -0.25;
  }
  car.x = Math.max(24, Math.min(WORLD_SIZE - 24, car.x));
  car.y = Math.max(24, Math.min(WORLD_SIZE - 24, car.y));
  p.x = car.x; p.y = car.y; p.angle = car.angle;
  // Running over pedestrians is a crime.
  for (const ped of G.peds) {
    if (ped.health <= 0 || ped.hitCooldown > 0) continue;
    if (Math.hypot(ped.x - car.x, ped.y - car.y) < 30 && Math.abs(car.speed) > 60) {
      ped.health = 0;
      ped.hitCooldown = 1;
      G.stats.pedsHit++;
      addWanted(2, 'Pedestrian hit');
      spawnParticles(ped.x, ped.y, { count: 10, speed: 140, life: 0.5, size: 4, color: '#c0392b', gravity: 300 });
      addShake(6);
    }
  }
}

function updateTrafficCar(car, dt) {
  // Drive along the current road; at intersections sometimes turn.
  const centers = roadCenters();
  car.targetSpeed = car.cruise;
  // Slow for the car ahead.
  for (const other of G.cars) {
    if (other === car || other.dead) continue;
    const dx = other.x - car.x, dy = other.y - car.y;
    const ahead = dx * Math.cos(car.angle) + dy * Math.sin(car.angle);
    const side = Math.abs(-dx * Math.sin(car.angle) + dy * Math.cos(car.angle));
    if (ahead > 0 && ahead < 90 && side < 26) { car.targetSpeed = 0; break; }
  }
  // Slow for pedestrians crossing.
  for (const ped of G.peds) {
    if (ped.health <= 0) continue;
    const dx = ped.x - car.x, dy = ped.y - car.y;
    const ahead = dx * Math.cos(car.angle) + dy * Math.sin(car.angle);
    if (ahead > 0 && ahead < 70 && Math.abs(-dx * Math.sin(car.angle) + dy * Math.cos(car.angle)) < 24) {
      car.targetSpeed = 0; break;
    }
  }
  car.speed += Math.sign(car.targetSpeed - car.speed) * Math.min(Math.abs(car.targetSpeed - car.speed), 140 * dt);
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  car.x = nx; car.y = ny;
  // Near an intersection centre, maybe turn onto the crossing road.
  const nearX = centers.find((c) => Math.abs(car.x - c) < 6);
  const nearY = centers.find((c) => Math.abs(car.y - c) < 6);
  if (nearX !== undefined && nearY !== undefined && Math.random() < 0.25) {
    const turnLeft = Math.random() < 0.5;
    if (car.axis === 'h') {
      car.axis = 'v';
      car.dir = turnLeft ? (car.dir > 0 ? -1 : 1) : (car.dir > 0 ? 1 : -1);
      car.angle = car.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      car.x = nearX + car.dir * 22;
    } else {
      car.axis = 'h';
      car.dir = turnLeft ? (car.dir > 0 ? 1 : -1) : (car.dir > 0 ? -1 : 1);
      car.angle = car.dir > 0 ? 0 : Math.PI;
      car.y = nearY + car.dir * 22;
    }
  }
  // Wrap around the city edge instead of vanishing.
  if (car.x < 150) { car.x = WORLD_SIZE - 160; }
  if (car.x > WORLD_SIZE - 150) { car.x = 160; }
  if (car.y < 150) { car.y = WORLD_SIZE - 160; }
  if (car.y > WORLD_SIZE - 150) { car.y = 160; }
  // Keep on the road: nudge back onto the lane centre.
  if (car.axis === 'h') {
    const c = centers.reduce((a, b) => Math.abs(b - car.y) < Math.abs(a - car.y) ? b : a);
    car.y += (c + car.dir * 22 - car.y) * Math.min(1, 2 * dt);
  } else {
    const c = centers.reduce((a, b) => Math.abs(b - car.x) < Math.abs(a - car.x) ? b : a);
    car.x += (c + car.dir * 22 - car.x) * Math.min(1, 2 * dt);
  }
}

export function updateVehicles(dt) {
  const p = G.player;
  if (p && p.inCar && !p.inCar.dead) updatePlayerCar(dt);
  else if (p && p.inCar && p.inCar.dead) {
    // A wrecked ride ejects the driver.
    const wreck = p.inCar;
    p.inCar = null;
    p.x = wreck.x + 40; p.y = wreck.y + 40;
  }
  for (const car of G.cars) {
    if (car.dead) {
      if (car.burning > 0) {
        car.burning -= dt;
        if (Math.random() < 0.3) spawnParticles(car.x, car.y, { count: 2, speed: 50, life: 0.7, size: 8, color: ['#ff9933', '#555555'], gravity: -80 });
      }
      car.speed = 0;
      continue;
    }
    if (car === (p && p.inCar)) continue;
    if (car.isPolice) continue; // police.js drives cruisers
    if (car.isTraffic) updateTrafficCar(car, dt);
    else if (car.smoke && Math.random() < 0.2) {
      spawnParticles(car.x, car.y, { count: 1, speed: 30, life: 0.8, size: 6, color: '#999999', gravity: -50 });
    }
  }
  // Keep traffic topped up near the player.
  const traffic = G.cars.filter((c) => c.isTraffic && !c.dead).length;
  if (traffic < 12 && Math.random() < 0.01) spawnTrafficCar(null);
  // Prune far-away wrecks so the list stays small.
  G.cars = G.cars.filter((c) => {
    if (!c.dead) return true;
    if (c === (p && p.inCar)) return true;
    return Math.hypot(c.x - p.x, c.y - p.y) < 1200;
  });
}
