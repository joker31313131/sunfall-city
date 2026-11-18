// Procedural city generation: a seeded road grid, district-flavoured
// blocks, buildings, trees, shops and explosive barrels. Collision is
// circle-vs-rectangle against building footprints and props.
import { WORLD_SIZE, ROAD_STEP, ROAD_WIDTH, ROAD_COUNT, PALETTE } from './config.js';
import { makeRng, range, rangeInt, pick, chance } from './random.js';

export function roadCenters() {
  const list = [];
  for (let i = 0; i < ROAD_COUNT; i++) list.push(200 + i * ROAD_STEP);
  return list;
}

export function onRoad(x, y) {
  const half = ROAD_WIDTH / 2;
  for (const c of roadCenters()) {
    if (Math.abs(x - c) < half || Math.abs(y - c) < half) return true;
  }
  return false;
}

export function generateWorld(seed) {
  const rng = makeRng(seed);
  const buildings = [];
  const trees = [];
  const centers = roadCenters();
  const half = ROAD_WIDTH / 2;

  // Blocks are the squares between neighbouring roads.
  for (let bx = 0; bx < centers.length - 1; bx++) {
    for (let by = 0; by < centers.length - 1; by++) {
      const x0 = centers[bx] + half + 14;
      const x1 = centers[bx + 1] - half - 14;
      const y0 = centers[by] + half + 14;
      const y1 = centers[by + 1] - half - 14;
      const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
      const downtown = cx > 1100 && cx < 2300 && cy > 1100 && cy < 2300;
      const park = cx < 1250 && cy < 1250;
      const harbour = cy > 2450;
      if (park && chance(rng, 0.75)) {
        // Palm Park: open green with scattered palms, no buildings.
        const n = rangeInt(rng, 6, 11);
        for (let i = 0; i < n; i++) trees.push({ x: range(rng, x0, x1), y: range(rng, y0, y1), r: range(rng, 10, 16), palm: true });
        continue;
      }
      if (harbour && chance(rng, 0.4)) {
        // Dockside crates and palms instead of a full block.
        const n = rangeInt(rng, 3, 6);
        for (let i = 0; i < n; i++) trees.push({ x: range(rng, x0, x1), y: range(rng, y0, y1), r: range(rng, 9, 13), palm: true });
      }
      const cols = downtown ? rangeInt(rng, 1, 2) : rangeInt(rng, 1, 2);
      const rows = downtown ? rangeInt(rng, 1, 2) : rangeInt(rng, 1, 2);
      const bw = (x1 - x0) / cols, bh = (y1 - y0) / rows;
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          if (!downtown && chance(rng, 0.18)) {
            trees.push({ x: x0 + bw * (i + 0.5), y: y0 + bh * (j + 0.5), r: range(rng, 11, 17), palm: chance(rng, 0.6) });
            continue;
          }
          const pad = downtown ? 10 : 16;
          const w = bw - pad * 2 - range(rng, 0, 30);
          const h = bh - pad * 2 - range(rng, 0, 30);
          const palette = downtown ? PALETTE.downtown : PALETTE.building;
          buildings.push({
            x: x0 + bw * i + pad, y: y0 + bh * j + pad, w, h,
            color: pick(rng, palette),
            height: downtown ? rangeInt(rng, 3, 6) : rangeInt(rng, 1, 3),
            windows: rangeInt(rng, 2, 4),
            litSeed: rng(),
          });
        }
      }
    }
  }

  // Fixed points of interest, snapped beside roads so they are reachable.
  const shops = [
    { kind: 'gun', name: 'Iron & Ivory Guns', x: 640, y: 200, color: '#c0392b' },
    { kind: 'hospital', name: 'Sunfall General', x: 2200, y: 1000, color: '#ecf0f1' },
    { kind: 'respray', name: 'Mango Respray', x: 1400, y: 2600, color: '#f39c12' },
    { kind: 'gun', name: 'Harbour Arms', x: 2600, y: 2200, color: '#c0392b' },
    { kind: 'hospital', name: 'Marina Clinic', x: 200, y: 2600, color: '#ecf0f1' },
  ];
  // Mission anchors: warehouse, garage, lookout, finale yard.
  const anchors = {
    warehouse: { x: 2600, y: 600 },
    garage: { x: 1000, y: 2600 },
    lookout: { x: 600, y: 1400 },
    yard: { x: 2200, y: 1800 },
    start: { x: 1000, y: 1000 },
  };
  // Explosive barrels clustered near the warehouse and the yard.
  const barrels = [];
  for (const [ax, ay] of [[2600, 600], [2200, 1800], [1400, 2600], [600, 2200]]) {
    const n = rangeInt(rng, 3, 5);
    for (let i = 0; i < n; i++) {
      barrels.push({ x: ax + range(rng, -70, 70), y: ay + range(rng, -70, 70), r: 12, alive: true });
    }
  }
  return { buildings, trees, shops, anchors, barrels, seed };
}

export function collideCircle(x, y, r, world) {
  // Returns a corrected position after pushing out of buildings/props.
  let nx = x, ny = y;
  for (const b of world.buildings) {
    const cx = Math.max(b.x, Math.min(nx, b.x + b.w));
    const cy = Math.max(b.y, Math.min(ny, b.y + b.h));
    const dx = nx - cx, dy = ny - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 < r * r) {
      if (d2 === 0) { ny = b.y - r; continue; }
      const d = Math.sqrt(d2);
      nx = cx + (dx / d) * r;
      ny = cy + (dy / d) * r;
    }
  }
  for (const t of world.trees) {
    const dx = nx - t.x, dy = ny - t.y;
    const d2 = dx * dx + dy * dy, rr = r + 6;
    if (d2 < rr * rr && d2 > 0) {
      const d = Math.sqrt(d2);
      nx = t.x + (dx / d) * rr;
      ny = t.y + (dy / d) * rr;
    }
  }
  nx = Math.max(r, Math.min(WORLD_SIZE - r, nx));
  ny = Math.max(r, Math.min(WORLD_SIZE - r, ny));
  return { x: nx, y: ny };
}

export function pointBlocked(x, y, world) {
  for (const b of world.buildings) {
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return true;
  }
  return false;
}

// Line of sight for cops and enemies: blocked by buildings only.
export function lineOfSight(x0, y0, x1, y1, world) {
  const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 40);
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (pointBlocked(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, world)) return false;
  }
  return true;
}
