// Pedestrians: city folk strolling the sidewalks. They wander between
// waypoints, pause, and flee when guns fire, cars explode or a car bears
// down on them.
import { WORLD_SIZE, ROAD_WIDTH } from './config.js';
import { G } from './state.js';
import { roadCenters, collideCircle } from './world.js';

const SHIRTS = ['#e74c3c', '#3498db', '#f1c40f', '#2ecc71', '#9b59b6', '#e67e22', '#1abc9c', '#ecf0f1'];
const PANTS = ['#2c3e50', '#34495e', '#5d4037', '#37474f', '#4e342e'];

export function spawnPeds(rng, count) {
  const centers = roadCenters();
  for (let i = 0; i < count; i++) {
    const vertical = rng() < 0.5;
    const c = centers[Math.floor(rng() * centers.length)];
    const along = 150 + rng() * (WORLD_SIZE - 300);
    const side = rng() < 0.5 ? 1 : -1;
    const off = ROAD_WIDTH / 2 + 12 + rng() * 10;
    G.peds.push({
      x: vertical ? c + side * off : along,
      y: vertical ? along : c + side * off,
      angle: rng() * Math.PI * 2,
      speed: 40 + rng() * 30,
      shirt: SHIRTS[Math.floor(rng() * SHIRTS.length)],
      pants: PANTS[Math.floor(rng() * PANTS.length)],
      skin: ['#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#ffdbac'][Math.floor(rng() * 5)],
      health: 100,
      fleeing: 0,
      fleeX: 0, fleeY: 0,
      pause: rng() * 2,
      target: null,
      hitCooldown: 0,
      walkPhase: rng() * Math.PI * 2,
    });
  }
}

export function scarePeds(x, y, radius) {
  for (const ped of G.peds) {
    if (ped.health <= 0) continue;
    const d = Math.hypot(ped.x - x, ped.y - y);
    if (d < radius) {
      ped.fleeing = 3 + Math.random() * 2;
      ped.fleeX = x; ped.fleeY = y;
    }
  }
}

export function updatePeds(dt) {
  const p = G.player;
  for (const ped of G.peds) {
    if (ped.health <= 0) continue;
    if (ped.hitCooldown > 0) ped.hitCooldown -= dt;
    ped.walkPhase += dt * 6;
    // A speeding car nearby is terrifying.
    if (p && p.inCar && Math.abs(p.inCar.speed) > 150 && Math.hypot(ped.x - p.x, ped.y - p.y) < 130) {
      ped.fleeing = 2;
      ped.fleeX = p.x; ped.fleeY = p.y;
    }
    if (ped.fleeing > 0) {
      ped.fleeing -= dt;
      const a = Math.atan2(ped.y - ped.fleeY, ped.x - ped.fleeX);
      ped.angle = a;
      const nx = ped.x + Math.cos(a) * 190 * dt;
      const ny = ped.y + Math.sin(a) * 190 * dt;
      const fixed = collideCircle(nx, ny, 10, G.world);
      ped.x = fixed.x; ped.y = fixed.y;
      continue;
    }
    if (ped.pause > 0) { ped.pause -= dt; continue; }
    if (!ped.target || Math.hypot(ped.target.x - ped.x, ped.target.y - ped.y) < 20) {
      // Pick a new stroll target along a nearby road.
      const centers = roadCenters();
      const vertical = Math.random() < 0.5;
      const c = centers[Math.floor(Math.random() * centers.length)];
      const along = 150 + Math.random() * (WORLD_SIZE - 300);
      const side = Math.random() < 0.5 ? 1 : -1;
      const off = ROAD_WIDTH / 2 + 12 + Math.random() * 10;
      ped.target = vertical
        ? { x: c + side * off, y: along }
        : { x: along, y: c + side * off };
      if (Math.random() < 0.3) ped.pause = 1 + Math.random() * 3;
    }
    const a = Math.atan2(ped.target.y - ped.y, ped.target.x - ped.x);
    ped.angle = a;
    const nx = ped.x + Math.cos(a) * ped.speed * dt;
    const ny = ped.y + Math.sin(a) * ped.speed * dt;
    const fixed = collideCircle(nx, ny, 10, G.world);
    ped.x = fixed.x; ped.y = fixed.y;
  }
  // The dead fade away; fresh faces wander in near the player.
  G.peds = G.peds.filter((ped) => ped.health > 0 || Math.hypot(ped.x - p.x, ped.y - p.y) < 900);
  if (G.peds.length < 30 && Math.random() < 0.02) {
    spawnPeds(Math.random, 1);
  }
}
