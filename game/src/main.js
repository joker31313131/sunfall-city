// Sunfall City — boot, main loop and the single interaction dispatcher.
// This file owns the screen state machine and wires every system together;
// each system lives in its own module.
import { G, freshPlayer, resetRunState } from './state.js';
import { generateWorld } from './world.js';
import { makeRng } from './random.js';
import { bindInput, keys, pressed, mouse, endFrameInput } from './input.js';
import { spawnCityCars, updateVehicles, nearestCar, enterCar, exitCar } from './vehicles.js';
import { spawnPeds, updatePeds } from './pedestrians.js';
import { updatePolice, clearWanted } from './police.js';
import { updateBullets, updateEnemies, playerShoot, aimAngleFromMouse } from './combat.js';
import { updatePlayerOnFoot, switchWeapon, startReload } from './player.js';
import { updateMissions, missionInteract, setObjective, showBriefing, MISSIONS } from './missions.js';
import { shopInteract } from './shops.js';
import { updateEffects } from './effects.js';
import { drawWorld, updateCamera } from './render.js';
import { drawHUD } from './hud.js';
import { drawTitle, drawPause, drawHelp, drawWasted, drawBusted, clickMenu, drawStoryCompleteBanner } from './ui.js';
import { hasSave, saveGame, loadSaveData, applySave, clearSave } from './save.js';
import { initAudio, setMuted, isMuted, startEngine, setEngine, startSiren, startMusic, sfxClick, sfxHorn } from './audio.js';
import { shotParams, stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();
bindInput(canvas);

let saveAvailable = hasSave();

function newWorld(seed) {
  resetRunState(seed);
  G.world = generateWorld(seed);
  G.barrels = G.world.barrels.map((b) => ({ ...b }));
  const rng = makeRng(seed);
  spawnCityCars(rng);
  spawnPeds(rng, 34);
}

function startNewGame() {
  const seed = (Date.now() % 100000) + 1;
  newWorld(seed);
  const a = G.world.anchors;
  G.player = freshPlayer(a.start.x, a.start.y);
  G.camera.x = G.player.x - canvas.width / 2;
  G.camera.y = G.player.y - canvas.height / 2;
  G.screen = 'play';
  setObjective(`Next job: ${MISSIONS[0].title} — go to the gold marker`, { x: a.lookout.x, y: a.lookout.y, label: 'JOB' });
  showBriefing('Welcome to Sunfall City', 'Mara Voss is new in town and Rook has work. Follow the gold marker to the lookout and press E to start the first job.');
  beginAudio();
  saveGame();
}

function continueGame() {
  const data = loadSaveData();
  if (!data) { startNewGame(); return; }
  newWorld(data.seed || 1);
  applySave(data);
  setMuted(G.muted);
  G.camera.x = G.player.x - canvas.width / 2;
  G.camera.y = G.player.y - canvas.height / 2;
  G.screen = 'play';
  const a = G.world.anchors;
  if (G.missionIndex < MISSIONS.length) {
    const spots = [a.lookout, a.garage, a.warehouse, a.garage, a.yard];
    const m = spots[G.missionIndex];
    setObjective(`Next job: ${MISSIONS[G.missionIndex].title} — go to the gold marker`, { x: m.x, y: m.y, label: 'JOB' });
  } else {
    setObjective('All jobs done — Sunfall City is yours. Free roam!', null);
  }
  showBriefing('Welcome back', 'Your save is loaded. The city kept your parking spot warm.');
  beginAudio();
}

function beginAudio() {
  initAudio();
  startEngine();
  startSiren();
  startMusic();
}

function respawn() {
  const p = G.player;
  const hospital = G.world.shops.find((s) => s.kind === 'hospital');
  p.x = hospital.x; p.y = hospital.y + 60;
  p.inCar = null;
  p.health = p.maxHealth;
  p.invuln = 1;
  clearWanted();
  G.screen = 'play';
  showBriefing('Back on your feet', 'Mara is patched up and back in the city. The jobs are still waiting.');
  saveGame();
}

function quitToTitle() {
  saveGame();
  saveAvailable = hasSave();
  G.screen = 'title';
}

// THE interaction dispatcher: one E keypress, one action, in priority
// order — mission trigger, then shop, then enter/exit car. Nothing else
// in the game reads the interact key.
function handleInteract() {
  if (missionInteract()) return;
  if (shopInteract()) return;
  const p = G.player;
  if (p.inCar) { exitCar(); return; }
  const car = nearestCar(p.x, p.y, 60);
  if (car) enterCar(car);
}

function handleMenuAction(action) {
  if (!action) return;
  sfxClick();
  if (action === 'new') { clearSave(); startNewGame(); }
  else if (action === 'continue') continueGame();
  else if (action === 'help') { G.prevScreen = G.screen; G.screen = 'help'; }
  else if (action === 'back') { G.screen = G.prevScreen === 'help' ? 'title' : G.prevScreen; }
  else if (action === 'resume') G.screen = 'play';
  else if (action === 'save') { saveGame(); G.message = { text: 'Game saved!', until: G.time + 2 }; G.screen = 'play'; }
  else if (action === 'quit') quitToTitle();
  else if (action === 'respawn') respawn();
}

function updatePlay(dt) {
  const p = G.player;
  // Aim follows the mouse.
  p.aimAngle = aimAngleFromMouse(G.camera, canvas.width, canvas.height);

  if (pressed.interact) handleInteract();
  if (pressed.slot1) switchWeapon(0);
  if (pressed.slot2) switchWeapon(1);
  if (pressed.slot3) switchWeapon(2);
  if (pressed.reload) startReload();
  if (pressed.horn && p.inCar) sfxHorn();

  // Shooting: hold for automatic weapons, click for the rest.
  if (!p.inCar) {
    const auto = p.weapon === 'smg';
    if (auto ? mouse.down : mouse.clicked) playerShoot();
  }

  if (!p.inCar) updatePlayerOnFoot(dt);
  else {
    if (p.fireCooldown > 0) p.fireCooldown -= dt;
    if (p.invuln > 0) p.invuln -= dt;
  }
  updateVehicles(dt);
  updatePeds(dt);
  updatePolice(dt);
  updateBullets(dt);
  updateEnemies(dt);
  updateMissions(dt);
  updateEffects(dt);
  updateCamera(canvas.width, canvas.height);

  // Engine sound follows the ride.
  setEngine(!!p.inCar, p.inCar ? Math.min(1, Math.abs(p.inCar.speed) / p.inCar.def.maxSpeed) : 0);

  // Autosave on a slow timer.
  G.autosaveTimer += dt;
  if (G.autosaveTimer > 30) {
    G.autosaveTimer = 0;
    saveGame();
  }
}

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - lastNow) / 1000 || 0.016);
  lastNow = now;
  G.time += dt;

  // Global keys.
  if (pressed.mute) {
    setMuted(!isMuted());
    G.muted = isMuted();
  }
  if (pressed.pause) {
    if (G.screen === 'play') { G.screen = 'pause'; saveGame(); }
    else if (G.screen === 'pause') G.screen = 'play';
    else if (G.screen === 'help') G.screen = G.prevScreen;
  }

  // First gesture unlocks audio.
  if (mouse.clicked || pressed.interact) initAudio();

  if (G.screen === 'play') {
    updatePlay(dt);
    // A wasted/busted switch mid-update still draws the world behind it.
    drawWorld(ctx, canvas.width, canvas.height);
    drawHUD(ctx, canvas.width, canvas.height);
    drawStoryCompleteBanner(ctx, canvas.width);
    if (G.screen === 'wasted') drawWasted(ctx, canvas.width, canvas.height);
    else if (G.screen === 'busted') drawBusted(ctx, canvas.width, canvas.height);
    else if (G.screen === 'pause') drawPause(ctx, canvas.width, canvas.height);
  } else if (G.screen === 'pause') {
    drawWorld(ctx, canvas.width, canvas.height);
    drawHUD(ctx, canvas.width, canvas.height);
    drawPause(ctx, canvas.width, canvas.height);
  } else if (G.screen === 'title') {
    drawTitle(ctx, canvas.width, canvas.height, saveAvailable);
  } else if (G.screen === 'help') {
    drawHelp(ctx, canvas.width, canvas.height);
  } else if (G.screen === 'wasted') {
    drawWorld(ctx, canvas.width, canvas.height);
    drawWasted(ctx, canvas.width, canvas.height);
  } else if (G.screen === 'busted') {
    drawWorld(ctx, canvas.width, canvas.height);
    drawBusted(ctx, canvas.width, canvas.height);
  }

  // Menu clicks.
  if (mouse.clicked && G.screen !== 'play') {
    handleMenuAction(clickMenu(mouse.x, mouse.y));
  }
  endFrameInput();
}

let lastNow = performance.now();

// Boot: a ?shot= scene stages itself; otherwise show the title.
(function boot() {
  const { shot, seed } = shotParams();
  if (shot && shot !== 'start') {
    G.shotMode = shot;
    stageShot(shot, seed);
    beginAudio();
  } else {
    // Build a quiet world behind the title screen so it never sits empty.
    newWorld(1);
    const a = G.world.anchors;
    G.player = freshPlayer(a.start.x, a.start.y);
    G.camera.x = G.player.x - canvas.width / 2;
    G.camera.y = G.player.y - canvas.height / 2;
  }
  requestAnimationFrame(frame);
})();

// Expose a tiny debug handle for automated playtests.
window.__sunfall = { G, startNewGame, continueGame, handleInteract, playerShoot };
