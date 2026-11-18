// Save / load through localStorage: money, mission progress, position,
// health, weapons and settings. Autosave runs on mission completion and
// on a slow timer while playing.
import { SAVE_KEY } from './config.js';
import { G, freshPlayer } from './state.js';

export function hasSave() {
  try { return !!localStorage.getItem(SAVE_KEY); } catch { return false; }
}

export function saveGame() {
  if (!G.player || !G.world) return false;
  const p = G.player;
  const data = {
    version: 1,
    seed: G.seed,
    x: p.x, y: p.y,
    money: p.money,
    health: p.health, maxHealth: p.maxHealth,
    missionIndex: G.missionIndex,
    missionDone: G.missionDone,
    weapons: {
      smg: !!p.weapons.smg,
      shotgun: !!p.weapons.shotgun,
      smgAmmo: p.weapons.smg ? p.weapons.smg.reserve : 0,
      shotgunAmmo: p.weapons.shotgun ? p.weapons.shotgun.reserve : 0,
    },
    weapon: p.weapon,
    muted: G.muted,
    stats: G.stats,
    savedAt: Date.now(),
  };
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch { return false; }
}

export function loadSaveData() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function applySave(data) {
  const p = freshPlayer(data.x, data.y);
  p.money = data.money;
  p.health = data.health;
  p.maxHealth = data.maxHealth;
  if (data.weapons) {
    if (data.weapons.smg) p.weapons.smg = { ammo: 30, reserve: data.weapons.smgAmmo || 120 };
    if (data.weapons.shotgun) p.weapons.shotgun = { ammo: 6, reserve: data.weapons.shotgunAmmo || 24 };
    if (data.weapons.smg && data.weapon === 'smg') p.weapon = 'smg';
    if (data.weapons.shotgun && data.weapon === 'shotgun') p.weapon = 'shotgun';
  }
  G.player = p;
  G.missionIndex = data.missionIndex || 0;
  G.missionDone = data.missionDone || [false, false, false, false, false];
  G.stats = data.stats || G.stats;
  G.muted = !!data.muted;
  return p;
}

export function clearSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch { /* private mode */ }
}
