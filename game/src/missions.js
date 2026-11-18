// The story: five linked jobs for Mara Voss and her fixer, Rook. Each
// mission is a small state machine — reach a marker, fetch, fight or
// steal — with a briefing card, a HUD objective, a minimap marker and a
// reward. Completing one unlocks the next.
import { G } from './state.js';
import { addFloater } from './effects.js';
import { sfxMission, sfxPickup } from './audio.js';
import { addWanted, clearWanted } from './police.js';
import { spawnEnemy } from './combat.js';
import { makeCar } from './vehicles.js';
import { giveWeapon } from './player.js';
import { saveGame } from './save.js';

export const MISSIONS = [
  {
    title: 'A Package for Rook',
    brief: 'Rook needs a package picked up at the old lookout and delivered to the garage on Marina Row. No trouble. Just drive.',
    reward: 200,
  },
  {
    title: 'Heat Run',
    brief: 'The package was hotter than Rook said. Cops are on you — get to the warehouse on Coral Street before the clock runs out.',
    reward: 300,
  },
  {
    title: 'Clear the Warehouse',
    brief: 'Rook\u2019s rivals moved into the warehouse. Take them all down. Rook left you a Riptide SMG for the trouble.',
    reward: 350,
  },
  {
    title: 'The Getaway',
    brief: 'Steal the Dune Muscle parked by the marina garage and bring it back in one piece. The owner will not be pleased.',
    reward: 400,
  },
  {
    title: 'Sunset Showdown',
    brief: 'The rival crew is waiting in the Downtown yard. Finish it, then get back to the lookout. Sunfall is yours tonight.',
    reward: 800,
  },
];

export function missionStartMarker() {
  const a = G.world.anchors;
  const spots = [a.lookout, a.garage, a.warehouse, a.garage, a.yard];
  return spots[G.missionIndex] || null;
}

export function showBriefing(title, text) {
  G.briefing = { title, text, until: G.time + 6 };
}

export function setObjective(text, marker) {
  G.objective = text;
  G.objectiveMarker = marker || null;
}

export function startMission() {
  const idx = G.missionIndex;
  const def = MISSIONS[idx];
  if (!def || G.mission) return;
  const a = G.world.anchors;
  const m = { index: idx, stage: 0, timer: 0, spawned: [], car: null, kills: 0 };
  G.mission = m;
  showBriefing(def.title, def.brief);
  if (idx === 0) {
    m.stage = 0;
    setObjective('Pick up the package at the lookout', { x: a.lookout.x, y: a.lookout.y, label: 'PICKUP' });
    G.pickups.push({ x: a.lookout.x, y: a.lookout.y, kind: 'package', label: 'PACKAGE' });
  } else if (idx === 1) {
    addWanted(2, 'The cops are onto you!');
    m.timer = 75;
    setObjective('Reach the warehouse before time runs out', { x: a.warehouse.x, y: a.warehouse.y, label: 'WAREHOUSE' });
  } else if (idx === 2) {
    giveWeapon('smg');
    for (let i = 0; i < 5; i++) {
      m.spawned.push(spawnEnemy(a.warehouse.x + (Math.random() - 0.5) * 220, a.warehouse.y + (Math.random() - 0.5) * 220, { mission: true }));
    }
    setObjective('Clear out the warehouse crew (5 left)', { x: a.warehouse.x, y: a.warehouse.y, label: 'FIGHT' });
  } else if (idx === 3) {
    const car = makeCar(a.garage.x + 120, a.garage.y - 60, 'muscle', '#e84a9a', { parked: true, missionCar: true, label: 'GETAWAY CAR', angle: 0 });
    G.cars.push(car);
    m.car = car;
    setObjective('Steal the marked Dune Muscle', { x: car.x, y: car.y, label: 'STEAL' });
  } else if (idx === 4) {
    for (let i = 0; i < 8; i++) {
      m.spawned.push(spawnEnemy(a.yard.x + (Math.random() - 0.5) * 280, a.yard.y + (Math.random() - 0.5) * 280, { mission: true, hp: 80 }));
    }
    setObjective('Defeat the rival crew (8 left)', { x: a.yard.x, y: a.yard.y, label: 'FINALE' });
  }
}

function completeMission() {
  const idx = G.missionIndex;
  const def = MISSIONS[idx];
  const p = G.player;
  p.money += def.reward;
  G.missionDone[idx] = true;
  G.missionIndex = Math.min(MISSIONS.length, idx + 1);
  G.mission = null;
  sfxMission();
  addFloater(p.x, p.y - 50, `+$${def.reward}`, '#7dff8a');
  if (idx === 3) {
    p.maxHealth += 25;
    p.health = p.maxHealth;
    addFloater(p.x, p.y - 80, 'Max health +25!', '#7fd4ff');
  }
  if (G.missionIndex >= MISSIONS.length) {
    setObjective('All jobs done — Sunfall City is yours. Free roam!', null);
    showBriefing('Story Complete', 'Every job done. Mara Voss owns the sunset. Keep exploring, cause chaos, or chase a clean getaway.');
  } else {
    const next = MISSIONS[G.missionIndex];
    const marker = missionStartMarker();
    setObjective(`Next job: ${next.title} — go to the gold marker`, marker ? { x: marker.x, y: marker.y, label: 'JOB' } : null);
    showBriefing('Job Complete', `${def.title} done. +$${def.reward}. Next: ${next.title}.`);
  }
  saveGame();
}

export function failMission(reason) {
  const idx = G.missionIndex;
  G.mission = null;
  showBriefing('Job Failed', reason + ' Head back to the gold marker to try again.');
  const marker = missionStartMarker();
  setObjective(`Job failed — retry: ${MISSIONS[idx].title}`, marker ? { x: marker.x, y: marker.y, label: 'JOB' } : null);
  // Clean up mission leftovers.
  G.enemies = G.enemies.filter((e) => !e.mission);
  G.pickups = G.pickups.filter((pk) => pk.kind !== 'package');
  if (G.missionCarCleanup) G.missionCarCleanup();
}

export function missionInteract() {
  // Returns true if the mission consumed the E press.
  const m = G.mission;
  const p = G.player;
  if (!m) {
    // Standing at a job marker starts the next mission.
    if (G.missionIndex >= MISSIONS.length) return false;
    const marker = missionStartMarker();
    if (marker && Math.hypot(p.x - marker.x, p.y - marker.y) < 90) {
      startMission();
      return true;
    }
    return false;
  }
  if (m.index === 0 && m.stage === 0) {
    const a = G.world.anchors;
    if (Math.hypot(p.x - a.lookout.x, p.y - a.lookout.y) < 80 && !p.inCar) {
      m.stage = 1;
      G.pickups = G.pickups.filter((pk) => pk.kind !== 'package');
      sfxPickup();
      setObjective('Deliver the package to the garage', { x: a.garage.x, y: a.garage.y, label: 'DELIVER' });
      return true;
    }
  }
  return false;
}

export function updateMissions(dt) {
  const m = G.mission;
  const p = G.player;
  const a = G.world.anchors;
  if (!m) {
    // Idle prompt toward the next job marker.
    if (G.missionIndex < MISSIONS.length && !G.objective) {
      const marker = missionStartMarker();
      setObjective(`Next job: ${MISSIONS[G.missionIndex].title} — go to the gold marker`,
        marker ? { x: marker.x, y: marker.y, label: 'JOB' } : null);
    }
    return;
  }
  if (m.index === 0 && m.stage === 1) {
    if (Math.hypot(p.x - a.garage.x, p.y - a.garage.y) < 110) completeMission();
  } else if (m.index === 1) {
    m.timer -= dt;
    if (Math.hypot(p.x - a.warehouse.x, p.y - a.warehouse.y) < 120) {
      clearWanted();
      completeMission();
    } else if (m.timer <= 0) {
      failMission('Out of time.');
    } else {
      setObjective(`Reach the warehouse — ${Math.ceil(m.timer)}s left`, { x: a.warehouse.x, y: a.warehouse.y, label: 'WAREHOUSE' });
    }
  } else if (m.index === 2) {
    const left = m.spawned.filter((e) => e.health > 0).length;
    setObjective(`Clear out the warehouse crew (${left} left)`, { x: a.warehouse.x, y: a.warehouse.y, label: 'FIGHT' });
    if (left === 0) completeMission();
  } else if (m.index === 3) {
    const car = m.car;
    if (!car) { failMission('The getaway car is gone.'); return; }
    if (car.dead) { failMission('The getaway car was wrecked.'); return; }
    if (m.stage === 0) {
      if (p.inCar === car) {
        m.stage = 1;
        setObjective('Deliver the Dune Muscle to the garage', { x: a.garage.x, y: a.garage.y, label: 'DELIVER' });
      } else {
        setObjective('Steal the marked Dune Muscle', { x: car.x, y: car.y, label: 'STEAL' });
      }
    } else if (m.stage === 1) {
      if (p.inCar === car && Math.hypot(p.x - a.garage.x, p.y - a.garage.y) < 110) completeMission();
      else if (p.inCar !== car) {
        setObjective('Get back in the Dune Muscle', { x: car.x, y: car.y, label: 'CAR' });
      }
    }
  } else if (m.index === 4) {
    if (m.stage === 0) {
      const left = m.spawned.filter((e) => e.health > 0).length;
      setObjective(`Defeat the rival crew (${left} left)`, { x: a.yard.x, y: a.yard.y, label: 'FINALE' });
      if (left === 0) {
        m.stage = 1;
        addWanted(2, 'The cops heard the shootout!');
        setObjective('Escape to the lookout', { x: a.lookout.x, y: a.lookout.y, label: 'ESCAPE' });
      }
    } else if (m.stage === 1) {
      if (Math.hypot(p.x - a.lookout.x, p.y - a.lookout.y) < 110) {
        clearWanted();
        completeMission();
      }
    }
  }
}
