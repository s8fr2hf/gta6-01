// Boot and the one loop for Port Meridian.
// Fixed 1/60 s steps; the renderer paints what is there. Screens: title, play,
// paused, game over. ?seed=N fixes the world; ?shot=<name>&seed=N stages a
// deterministic screenshot scene and sets window.__shotReady.
import { CONFIG, STEP } from './config.js';
import { makeRng, clamp } from './random.js';
import { buildWorld } from './world.js';
import { MISSIONS, updateMission, spawnMissionEnemies } from './missions.js';
import { makePlayer, makeCar, spawnTraffic, spawnPedestrians, spawnPickups, updatePlayer, updateTraffic, updatePeds, updatePolice, updateEnemies, updateBullets } from './entities.js';
import { createAudio } from './audio.js';
import { ACTION_CONFIRM, ACTION_ENTER, ACTION_MUTE, ACTION_PAUSE, createInput } from './input.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 1;

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const rng = makeRng(seed);

export function createGame() {
  const world = buildWorld(seed);
  const game = {
    seed, world, rng,
    player: makePlayer(1150, 1550),
    traffic: [], peds: [], pickups: [], policeCars: [], footPolice: [],
    enemies: [], bullets: [], particles: [], skids: [],
    missions: MISSIONS,
    missionIndex: 0, mission: MISSIONS[0],
    time: 0, clockHour: CONFIG.CLOCK_START_HOUR,
    camera: { x: 0, y: 0 },
    viewScale: 1,
    banner: null, dialogue: null, dialogueTimer: 0,
    screen: SCREEN_TITLE,
    audio: createAudio(),
  };
  game.traffic = spawnTraffic(rng, world, CONFIG.TRAFFIC_COUNT);
  game.peds = spawnPedestrians(rng, world, CONFIG.PED_COUNT);
  game.pickups = spawnPickups(rng, world);
  game.makePoliceCar = (x, y) => {
    const c = makeCar(x, y, 0, 'police', '#1a2a4a');
    c.speed = 380;
    return c;
  };
  game.spawnMissionEnemies = (m) => spawnMissionEnemies(game, m);
  game.burst = (x, y, color, n) => {
    const out = [];
    for (let i = 0; i < n; i += 1) {
      const a = rng() * Math.PI * 2;
      out.push({ x, y, vx: Math.cos(a) * 120, vy: Math.sin(a) * 120, life: 0.6, max: 0.6, size: 3 + rng() * 4, color });
    }
    return out;
  };
  game.moneyPop = (x, y, amount) => {
    game.particles.push(...game.burst(x, y, '#7be36a', 6));
  };
  game.fireBullet = (x, y, angle, friendly) => {
    game.bullets.push({ x: x + Math.cos(angle) * 24, y: y + Math.sin(angle) * 24, angle, friendly, life: 1.2, alive: true });
    game.audio.shoot();
    game.particles.push(...game.burst(x + Math.cos(angle) * 30, y + Math.sin(angle) * 30, '#ffe95a', 3));
  };
  game.addWanted = (stars, x, y) => {
    const p = game.player;
    // Witnesses nearby (police or pedestrians) raise the wanted level.
    const seen = game.policeCars.some((c) => Math.hypot(c.x - x, c.y - y) < 500)
      || game.peds.some((pd) => pd.alive && Math.hypot(pd.x - x, pd.y - y) < 300);
    if (seen || stars >= 3) p.wanted = clamp(p.wanted + stars, 0, CONFIG.WANTED_MAX);
    p.lastSeen = game.time;
  };
  game.applyPickup = (pk) => {
    const p = game.player;
    if (pk.kind === 'health') p.health = clamp(p.health + 30, 0, 100);
    else if (pk.kind === 'armor') p.armor = clamp(p.armor + 40, 0, 100);
    else if (pk.kind === 'money') { p.money += 50; }
    else if (pk.kind === 'ammo') p.ammo = clamp(p.ammo + 12, 0, CONFIG.PISTOL_AMMO_MAX);
  };
  game.onEnemyDown = (e) => {
    game.player.money += 60;
    game.particles.push(...game.burst(e.x, e.y, '#ff5555', 12));
  };
  game.save = () => {
    try {
      window.localStorage.setItem(CONFIG.SAVE_KEY, JSON.stringify({
        missionIndex: game.missionIndex, money: game.player.money,
        health: game.player.health, x: game.player.x, y: game.player.y,
      }));
    } catch { /* storage off: progress lasts this visit only */ }
  };
  game.load = () => {
    try {
      const raw = window.localStorage.getItem(CONFIG.SAVE_KEY);
      if (!raw) return false;
      const s = JSON.parse(raw);
      game.missionIndex = clamp(s.missionIndex || 0, 0, MISSIONS.length - 1);
      game.mission = MISSIONS[game.missionIndex] || null;
      game.player.money = s.money || 120;
      game.player.health = s.health || 100;
      game.player.x = s.x || 1150; game.player.y = s.y || 1550;
      return true;
    } catch { return false; }
  };
  return game;
}

const game = createGame();
const renderer = createRenderer(canvas);
const input = createInput(canvas, game);

function fitView() {
  game.viewScale = Math.min(canvas.width / 1280, canvas.height / 720);
  if (game.viewScale < 0.5) game.viewScale = 0.5;
}
fitView();
window.addEventListener('resize', fitView);

function updateCamera(dt) {
  const p = game.player;
  const vw = canvas.width / game.viewScale;
  const vh = canvas.height / game.viewScale;
  const tx = clamp(p.x - vw / 2, 0, Math.max(0, CONFIG.WORLD_W - vw));
  const ty = clamp(p.y - vh / 2, 0, Math.max(0, CONFIG.WORLD_H - vh));
  const k = 1 - Math.pow(0.001, dt);
  game.camera.x += (tx - game.camera.x) * k;
  game.camera.y += (ty - game.camera.y) * k;
}

function step(dt) {
  game.time += dt;
  game.clockHour = (CONFIG.CLOCK_START_HOUR + game.time / CONFIG.CLOCK_SECONDS_PER_HOUR) % 24;
  if (game.banner && game.banner.t > 0) game.banner.t -= dt;
  if (game.dialogueTimer > 0) game.dialogueTimer -= dt;
  updatePlayer(game, dt, input);
  updateTraffic(game, dt);
  updatePeds(game, dt);
  updatePolice(game, dt);
  updateEnemies(game, dt);
  updateBullets(game, dt);
  // Wanted decay when out of sight of police.
  const p = game.player;
  const seen = game.policeCars.some((c) => Math.hypot(c.x - p.x, c.y - p.y) < 420);
  if (p.wanted > 0 && !seen && game.time - p.lastSeen > CONFIG.WANTED_DECAY_SECONDS) {
    p.wanted -= 1; p.lastSeen = game.time;
    if (p.wanted === 0) game.footPolice.length = 0;
  }
  // Enter / exit car
  // (handled in handleActions via ACTION_ENTER; exit also drops the player beside the car)
  updateMission(game, dt);
  // Particles + skids age
  for (const pt of game.particles) { pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.life -= dt; }
  game.particles = game.particles.filter((pt) => pt.life > 0);
  for (const s of game.skids) s.life -= dt;
  game.skids = game.skids.filter((s) => s.life > 0);
  // Armor absorbs damage first
  if (p.armor > 0 && p.hurtTimer > 0) { /* damage already applied; armor handled in hit paths */ }
  if (p.health <= 0 && !p.dead) {
    p.dead = true;
    game.screen = SCREEN_OVER;
    status.textContent = 'Game over. Rico is down.';
  }
  game.audio.engine(!!p.inCar, p.inCar ? Math.abs(p.inCar.speed) : 0);
  updateCamera(dt);
}

function tryEnterCar() {
  const p = game.player;
  if (p.inCar) {
    const car = p.inCar;
    p.inCar = null;
    p.x = car.x + 50; p.y = car.y + 50;
    return;
  }
  let best = null; let bestD = 90;
  for (const car of [...game.traffic, ...game.policeCars]) {
    const d = Math.hypot(car.x - p.x, car.y - p.y);
    if (d < bestD) { bestD = d; best = car; }
  }
  if (best) {
    const wasPolice = best.police;
    const witnessed = game.peds.some((pd) => pd.alive && Math.hypot(pd.x - p.x, pd.y - p.y) < 320)
      || game.policeCars.some((c) => Math.hypot(c.x - p.x, c.y - p.y) < 450);
    p.inCar = best;
    game.traffic = game.traffic.filter((c) => c !== best);
    if (witnessed || wasPolice) game.addWanted(wasPolice ? 2 : 1, p.x, p.y);
    game.audio.thud();
  }
}

function runShot(name) {
  stageShot(name, game);
  updateCamera(1);
  let painted = 0;
  function paint() {
    fitView();
    renderer.draw(game, game.screen);
    painted += 1;
    if (painted < 3) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  let accumulator = 0;
  let last = performance.now();
  const hadSave = game.load();
  if (hadSave) game.dialogue = [{ who: 'CREW', text: 'Welcome back, Rico. Your save is loaded — the city missed you.' }];
  if (hadSave) game.dialogueTimer = 4;

  function announce(message) { status.textContent = message; }

  function startGame() {
    game.audio.unlock();
    game.screen = SCREEN_PLAY;
    game.player.dead = false;
    game.player.health = CONFIG.PLAYER_HEALTH;
    game.dialogue = game.mission ? game.mission.briefing.map((line) => {
      const [who, text] = line.split(': ');
      return { who, text };
    }) : null;
    game.dialogueTimer = 5;
    announce('Playing. Port Meridian is yours.');
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) {
      const m = game.audio.toggleMute();
      announce(m ? 'Muted.' : 'Sound on.');
    }
    if (actions & ACTION_ENTER && game.screen === SCREEN_PLAY) tryEnterCar();
    if (actions & ACTION_CONFIRM && (game.screen === SCREEN_TITLE || game.screen === SCREEN_OVER)) {
      if (game.screen === SCREEN_OVER) { const g2 = createGame(); Object.assign(game, g2); game.screen = SCREEN_PLAY; }
      startGame();
    } else if (actions & ACTION_PAUSE && game.screen === SCREEN_PLAY) {
      game.screen = SCREEN_PAUSED; game.save(); announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && game.screen === SCREEN_PAUSED) {
      game.screen = SCREEN_PLAY; announce('Playing.');
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (game.screen === SCREEN_PLAY) {
      while (accumulator >= STEP) { step(STEP); accumulator -= STEP; }
    } else accumulator = 0;
    fitView();
    renderer.draw(game, game.screen);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && game.screen === SCREEN_PLAY) { game.screen = SCREEN_PAUSED; game.save(); }
  });

  announce('Port Meridian. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
