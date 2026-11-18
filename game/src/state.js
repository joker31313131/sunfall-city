// The single shared game state. Every system reads and writes this one
// object, so there is never a second copy of the truth to drift.
import { START_MONEY, START_HEALTH } from './config.js';

export const G = {
  screen: 'title', // title | play | pause | help | wasted | busted
  prevScreen: 'title',
  time: 0,
  seed: 1,
  shotMode: null,
  muted: false,
  showHelpHint: true,

  player: null,
  cars: [],       // traffic + parked + police cars
  peds: [],
  cops: [],       // foot officers
  enemies: [],
  bullets: [],
  barrels: [],
  pickups: [],
  particles: [],
  skidMarks: [],
  floaters: [],

  world: null,
  wanted: 0,
  heatTimer: 0,
  bustTimer: 0,
  camera: { x: 0, y: 0, shake: 0 },
  missionIndex: 0,
  mission: null,  // active mission runtime state
  missionDone: [false, false, false, false, false],
  briefing: null, // {title, text, until}
  objective: '',
  objectiveMarker: null, // {x, y, label}
  message: null,  // transient centre message {text, until}
  stats: { carsStolen: 0, pedsHit: 0, copsEvaded: 0, shotsFired: 0 },
  autosaveTimer: 0,
  newGamePlus: false,
};

export function freshPlayer(x, y) {
  return {
    x, y, angle: -Math.PI / 2, speed: 0,
    health: START_HEALTH, maxHealth: START_HEALTH,
    money: START_MONEY,
    inCar: null,
    weapons: { pistol: { ammo: 12, reserve: Infinity }, smg: null, shotgun: null },
    weapon: 'pistol',
    fireCooldown: 0, reloadTimer: 0,
    moving: false, running: false,
    invuln: 0,
    aimAngle: 0,
  };
}

export function resetRunState(seed) {
  G.time = 0;
  G.cars = []; G.peds = []; G.cops = []; G.enemies = [];
  G.bullets = []; G.barrels = []; G.pickups = [];
  G.particles = []; G.skidMarks = []; G.floaters = [];
  G.wanted = 0; G.heatTimer = 0; G.bustTimer = 0;
  G.mission = null; G.briefing = null; G.objective = '';
  G.objectiveMarker = null; G.message = null;
  G.seed = seed;
  G.stats = { carsStolen: 0, pedsHit: 0, copsEvaded: 0, shotsFired: 0 };
}
