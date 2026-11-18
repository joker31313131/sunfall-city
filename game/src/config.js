// Sunfall City — tuning constants and the sunset palette.
// Every number that shapes how the game feels lives here so balance
// tweaks never require hunting through gameplay code.
export const WORLD_SIZE = 3200;
export const ROAD_STEP = 400;
export const ROAD_WIDTH = 96;
export const ROAD_COUNT = 8;

export const PLAYER_WALK = 190;
export const PLAYER_RUN = 310;
export const PLAYER_RADIUS = 14;

export const WANTED_MAX = 5;
export const BUST_RADIUS = 70;
export const BUST_TIME = 3.0;
export const HEAT_DECAY_TIME = 14;

export const RESPRAY_COST = 100;
export const HOSPITAL_COST = 80;
export const START_MONEY = 250;
export const START_HEALTH = 100;

export const SAVE_KEY = 'sunfall-city-save-v1';

export const PALETTE = {
  sky: '#ff9a5c',
  ground: '#c9a06a',
  grass: '#7fae5a',
  parkGrass: '#6fae52',
  road: '#4a4a55',
  roadEdge: '#3a3a44',
  sidewalk: '#b8a88e',
  laneDash: '#f5d76e',
  water: '#3f7f9e',
  sand: '#e0c48f',
  building: ['#e8b48c', '#d99a7a', '#c98a6e', '#eec39a', '#b98a7e', '#f0d0a0'],
  downtown: ['#8a7a9e', '#7a6a8e', '#9a8aae', '#6a5a7e'],
  roof: '#7a5a4a',
  windowLit: '#ffe9a8',
  windowDark: '#5a4a5e',
  tree: '#4e8a3e',
  trunk: '#6a4a30',
};

// Car handling archetypes. Each parked or traffic car picks one of these.
export const CAR_TYPES = {
  sedan:  { name: 'Coral Sedan',  maxSpeed: 330, accel: 240, reverse: 120, turn: 2.6, grip: 3.2, hp: 100, w: 46, h: 22 },
  coupe:  { name: 'Sunset Coupe', maxSpeed: 430, accel: 330, reverse: 140, turn: 3.1, grip: 3.6, hp: 80,  w: 44, h: 20 },
  van:    { name: 'Harbour Van',  maxSpeed: 260, accel: 180, reverse: 100, turn: 2.1, grip: 2.8, hp: 160, w: 52, h: 24 },
  taxi:   { name: 'Marina Taxi',  maxSpeed: 350, accel: 260, reverse: 120, turn: 2.8, grip: 3.3, hp: 100, w: 46, h: 22 },
  muscle: { name: 'Dune Muscle',  maxSpeed: 400, accel: 360, reverse: 130, turn: 2.4, grip: 2.9, hp: 120, w: 48, h: 22 },
  cruiser:{ name: 'Police Cruiser', maxSpeed: 390, accel: 300, reverse: 130, turn: 3.0, grip: 3.5, hp: 140, w: 48, h: 22 },
};

export const CAR_COLORS = ['#e84a4a', '#4a7ae8', '#e8c84a', '#4ae88a', '#e88a4a', '#9a4ae8', '#e8e8e8', '#3a3a3a', '#4ac8e8', '#e84a9a'];

export const WEAPONS = {
  pistol:  { name: 'Pistol',   damage: 22, rate: 0.28, spread: 0.03, pellets: 1, range: 520, mag: 12, reserve: Infinity, reload: 0.9,  auto: false, kick: 1.5 },
  smg:     { name: 'Riptide SMG', damage: 13, rate: 0.09, spread: 0.09, pellets: 1, range: 460, mag: 30, reserve: 120, reload: 1.2, auto: true,  kick: 0.8 },
  shotgun: { name: 'Breaker Shotgun', damage: 12, rate: 0.75, spread: 0.22, pellets: 6, range: 300, mag: 6,  reserve: 24, reload: 1.6, auto: false, kick: 4.0 },
};

export const DISTRICTS = [
  { name: 'Old Marina', x0: 0, y0: 2400, x1: 3200, y1: 3200 },
  { name: 'Palm Park', x0: 0, y0: 0, x1: 1200, y1: 1200 },
  { name: 'Downtown', x0: 1200, y0: 1200, x1: 2200, y1: 2200 },
  { name: 'Sunfall North', x0: 0, y0: 0, x1: 3200, y1: 1200 },
  { name: 'Sunfall South', x0: 0, y0: 2200, x1: 3200, y1: 3200 },
];

export function districtAt(x, y) {
  if (y >= 2400) return 'Old Marina';
  if (x < 1200 && y < 1200) return 'Palm Park';
  if (x >= 1200 && x < 2200 && y >= 1200 && y < 2200) return 'Downtown';
  return y < 1200 ? 'Sunfall North' : 'Sunfall South';
}
