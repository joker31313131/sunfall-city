// Screenshot staging: ?shot=<scene>&seed=<n> URL parameters deterministically
// arrange a scene for captures. Staging runs once at boot, only when the
// parameter is present, and never touches normal play state otherwise.
import { G, freshPlayer } from './state.js';
import { generateWorld } from './world.js';
import { spawnCityCars, makeCar, enterCar } from './vehicles.js';
import { spawnPeds, scarePeds } from './pedestrians.js';
import { spawnEnemy } from './combat.js';
import { makeRng } from './random.js';
import { setObjective, showBriefing, MISSIONS } from './missions.js';
import { giveWeapon } from './player.js';
import { addWanted } from './police.js';

export function shotParams() {
  const q = new URLSearchParams(location.search);
  return { shot: q.get('shot'), seed: parseInt(q.get('seed') || '1', 10) || 1 };
}

function baseScene(seed) {
  const rng = makeRng(seed);
  G.world = generateWorld(seed);
  G.barrels = G.world.barrels.map((b) => ({ ...b }));
  G.player = freshPlayer(G.world.anchors.start.x, G.world.anchors.start.y);
  spawnCityCars(rng);
  spawnPeds(rng, 34);
  G.camera.x = G.player.x - 640;
  G.camera.y = G.player.y - 360;
  G.screen = 'play';
}

function addChasers(count) {
  const p = G.player;
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + 0.6;
    const car = makeCar(p.x + Math.cos(a) * 300, p.y + Math.sin(a) * 300, 'cruiser', '#2c3e50', { angle: Math.atan2(p.y - (p.y + Math.sin(a) * 300), p.x - (p.x + Math.cos(a) * 300)) });
    car.isPolice = true;
    car.speed = 200;
    G.cars.push(car);
  }
}

function addRivalCrew(x, y, count) {
  for (let i = 0; i < count; i++) {
    spawnEnemy(x + (Math.random() - 0.5) * 200, y + (Math.random() - 0.5) * 200, { mission: true });
  }
}

// Stages one named scene. Returns true when a scene was staged.
export function stageShot(scene, seed) {
  if (!scene || scene === 'start') return false;
  baseScene(seed);
  const a = G.world.anchors;
  const p = G.player;
  if (scene === 'drive') {
    // Car chase: Mara in a coupe, 3 stars, cruisers closing, job live.
    const car = makeCar(a.start.x + 40, a.start.y, 'coupe', '#e84a4a', { angle: 0 });
    G.cars.push(car);
    enterCar(car);
    car.speed = 240;
    G.wanted = 3;
    addChasers(3);
    G.missionIndex = 1;
    G.mission = { index: 1, stage: 0, timer: 52, spawned: [], car: null };
    setObjective('Reach the warehouse — 52s left', { x: a.warehouse.x, y: a.warehouse.y, label: 'WAREHOUSE' });
    showBriefing('Heat Run', 'The package was hotter than Rook said. Cops are on you — get to the warehouse before the clock runs out.');
    p.money = 540;
    scarePeds(p.x, p.y, 400);
  } else if (scene === 'foot') {
    // On-foot city action: Mara aiming, rivals ahead, traffic and peds.
    p.x = a.yard.x - 160; p.y = a.yard.y;
    p.aimAngle = 0;
    giveWeapon('smg');
    p.money = 890;
    addRivalCrew(a.yard.x + 120, a.yard.y, 4);
    G.missionIndex = 2;
    G.mission = { index: 2, stage: 0, timer: 0, spawned: G.enemies.slice(), car: null };
    setObjective('Clear out the warehouse crew (4 left)', { x: a.yard.x, y: a.yard.y, label: 'FIGHT' });
    showBriefing('Clear the Warehouse', 'Rook\u2019s rivals moved in. Take them all down.');
    G.camera.x = p.x - 640;
    G.camera.y = p.y - 360;
  } else if (scene === 'chase') {
    // Police chase with combat: wanted 4, cruisers + officers, Mara shooting.
    p.x = a.downtownX || 1700; p.y = 1700;
    p.aimAngle = -0.6;
    giveWeapon('shotgun');
    p.money = 1250;
    G.wanted = 4;
    addChasers(3);
    for (let i = 0; i < 2; i++) {
      G.cops.push({
        x: p.x + 180 + i * 60, y: p.y - 120 + i * 80,
        angle: 0, health: 60, speed: 150, fireCooldown: 1, walkPhase: 0,
      });
    }
    addRivalCrew(p.x + 220, p.y - 60, 2);
    G.missionIndex = 4;
    G.mission = { index: 4, stage: 0, timer: 0, spawned: G.enemies.slice(), car: null };
    setObjective('Defeat the rival crew (2 left)', { x: p.x + 220, y: p.y - 60, label: 'FINALE' });
    showBriefing('Sunset Showdown', 'The rival crew is waiting in the Downtown yard. Finish it.');
    G.camera.x = p.x - 640;
    G.camera.y = p.y - 360;
  } else {
    return false;
  }
  G.shotMode = scene;
  return true;
}
