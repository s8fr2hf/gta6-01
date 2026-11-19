// Entities: the player, traffic cars, pedestrians, police and pickups.
// Each update function takes the shared game state and advances one fixed step.
import { COLORS, CONFIG } from './config.js';
import { angleLerp, angleTo, clamp, dist, pick, range, rangeInt } from './random.js';
import { isBlocked, nearestRoadPoint, onRoad, ROAD_XS, ROAD_YS } from './world.js';

export function makePlayer(x, y) {
  return {
    x, y, angle: -Math.PI / 2, speed: 0, health: CONFIG.PLAYER_HEALTH, armor: 0,
    money: 120, ammo: 12, wanted: 0, inCar: null, onFoot: true, punchTimer: 0,
    shootTimer: 0, hurtTimer: 0, dead: false, lastSeen: 0,
  };
}

export function makeCar(x, y, angle, kind, color) {
  return { x, y, angle, speed: 0, kind: kind || 'sedan', color: color || '#d43a2a', police: kind === 'police', driver: null, targetAngle: angle, stuck: 0 };
}

export function spawnTraffic(rng, world, count, cx, cy) {
  const cars = [];
  for (let i = 0; i < count; i += 1) {
    const vertical = rng() < 0.5;
    const rx = pick(rng, ROAD_XS);
    const ry = pick(rng, ROAD_YS);
    const x = vertical ? rx + (rng() < 0.5 ? -22 : 22) : range(rng, 100, CONFIG.WORLD_W - 500);
    const y = vertical ? range(rng, 100, CONFIG.WORLD_H - 100) : ry + (rng() < 0.5 ? -22 : 22);
    const angle = vertical ? (rng() < 0.5 ? Math.PI / 2 : -Math.PI / 2) : (rng() < 0.5 ? 0 : Math.PI);
    const car = makeCar(x, y, angle, pick(rng, ['sedan', 'taxi', 'van', 'sport']), pick(rng, COLORS.carColors));
    car.speed = CONFIG.TRAFFIC_SPEED * range(rng, 0.7, 1.1);
    cars.push(car);
  }
  return cars;
}

export function spawnPedestrians(rng, world, count) {
  const peds = [];
  const names = ['Mara', 'Dee', 'Otis', 'Lena', 'Kip', 'Sana', 'Ruth', 'Theo'];
  for (let i = 0; i < count; i += 1) {
    const rx = pick(rng, ROAD_XS);
    const ry = pick(rng, ROAD_YS);
    peds.push({
      x: rx + range(rng, -70, 70), y: ry + range(rng, -70, 70),
      angle: range(rng, 0, Math.PI * 2), speed: range(rng, 30, 70),
      color: pick(rng, ['#e86a6a', '#6aa8e8', '#e8d06a', '#7ae86a', '#c06ae8', '#e8e8e8']),
      name: pick(rng, names), panic: 0, walkPhase: rng() * 10, alive: true,
    });
  }
  return peds;
}

export function spawnPickups(rng, world) {
  const kinds = ['health', 'armor', 'money', 'ammo'];
  const pickups = [];
  for (let i = 0; i < CONFIG.PICKUP_COUNT; i += 1) {
    const rx = pick(rng, ROAD_XS);
    const ry = pick(rng, ROAD_YS);
    pickups.push({ x: rx + range(rng, -120, 120), y: ry + range(rng, -120, 120), kind: kinds[i % kinds.length], taken: false, bob: rng() * 6 });
  }
  return pickups;
}

function moveWithCollision(world, e, nx, ny, r) {
  if (!isBlocked(world, nx, e.y, r)) e.x = nx;
  if (!isBlocked(world, e.x, ny, r)) e.y = ny;
  e.x = clamp(e.x, r, CONFIG.WORLD_W - r);
  e.y = clamp(e.y, r, CONFIG.WORLD_H - r);
}

export function updatePlayer(game, dt, input) {
  const p = game.player;
  if (p.dead) return;
  if (p.hurtTimer > 0) p.hurtTimer -= dt;
  if (p.punchTimer > 0) p.punchTimer -= dt;
  if (p.shootTimer > 0) p.shootTimer -= dt;
  const mx = input.moveX();
  const my = input.moveY();
  if (p.inCar) {
    updateDrivenCar(game, dt, input);
    return;
  }
  const sprint = input.sprint() ? CONFIG.SPRINT_SPEED : CONFIG.WALK_SPEED;
  const len = Math.hypot(mx, my);
  if (len > 0) {
    p.angle = Math.atan2(my, mx);
    moveWithCollision(game.world, p, p.x + (mx / len) * sprint * dt, p.y + (my / len) * sprint * dt, CONFIG.PLAYER_RADIUS);
  }
  // Aim follows the mouse (screen -> world via camera stored on game).
  if (input.mouseActive) p.angle = Math.atan2(input.mouseWorldY - p.y, input.mouseWorldX - p.x);
  // Punch
  if (input.punchPressed) {
    p.punchTimer = 0.35;
    for (const ped of game.peds) {
      if (ped.alive && dist(p.x, p.y, ped.x, ped.y) < CONFIG.PUNCH_RANGE + 14) {
        ped.alive = false; game.moneyPop(ped.x, ped.y, 25); p.money += 25;
        game.addWanted(1, ped.x, ped.y); game.particles.push(...game.burst(ped.x, ped.y, '#ffdd55', 8));
      }
    }
    for (const e of game.enemies) {
      if (e.alive && dist(p.x, p.y, e.x, e.y) < CONFIG.PUNCH_RANGE + 14) {
        e.health -= CONFIG.PUNCH_DAMAGE; game.particles.push(...game.burst(e.x, e.y, '#ff5555', 8));
        if (e.health <= 0) { e.alive = false; game.onEnemyDown(e); }
      }
    }
  }
  // Shoot
  if (input.shooting && p.ammo > 0 && p.shootTimer <= 0) {
    p.ammo -= 1; p.shootTimer = 0.22;
    game.fireBullet(p.x, p.y, p.angle, true);
    game.addWanted(1, p.x, p.y);
  }
  // Pickups
  for (const pk of game.pickups) {
    if (pk.taken) continue;
    if (dist(p.x, p.y, pk.x, pk.y) < 30) {
      pk.taken = true; game.applyPickup(pk); game.audio.pickup();
    }
  }
}

function updateDrivenCar(game, dt, input) {
  const p = game.player;
  const car = p.inCar;
  const fwd = input.moveY() < 0 ? 1 : input.moveY() > 0 ? -1 : 0; // W = forward
  const steer = input.moveX();
  if (fwd > 0) car.speed = Math.min(CONFIG.CAR_MAX_SPEED, car.speed + CONFIG.CAR_ACCEL * dt);
  else if (fwd < 0) car.speed = Math.max(-CONFIG.CAR_REVERSE_SPEED, car.speed - CONFIG.CAR_ACCEL * dt);
  else car.speed *= Math.max(0, 1 - 1.6 * dt);
  if (Math.abs(car.speed) > 20) {
    car.angle += steer * CONFIG.CAR_TURN * dt * Math.sign(car.speed) * Math.min(1, Math.abs(car.speed) / 200);
  }
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  if (!isBlocked(game.world, nx, ny, 26)) { car.x = nx; car.y = ny; }
  else { car.speed *= -0.25; game.audio.thud(); }
  p.x = car.x; p.y = car.y; p.angle = car.angle;
  if (Math.abs(car.speed) > 300 && Math.abs(steer) > 0.3) {
    game.skids.push({ x: car.x, y: car.y, angle: car.angle, life: 1.4 });
    if (Math.random() < 0.3) game.audio.skid();
  }
  // Running over pedestrians / enemies while driving
  for (const ped of game.peds) {
    if (ped.alive && dist(car.x, car.y, ped.x, ped.y) < 40) {
      ped.alive = false; game.addWanted(1, ped.x, ped.y);
      game.particles.push(...game.burst(ped.x, ped.y, '#ffdd55', 10));
    }
  }
  for (const e of game.enemies) {
    if (e.alive && dist(car.x, car.y, e.x, e.y) < 42) {
      e.health -= 80; if (e.health <= 0) { e.alive = false; game.onEnemyDown(e); }
    }
  }
  for (const pk of game.pickups) {
    if (!pk.taken && dist(car.x, car.y, pk.x, pk.y) < 34) { pk.taken = true; game.applyPickup(pk); game.audio.pickup(); }
  }
}

export function updateTraffic(game, dt) {
  for (const car of game.traffic) {
    if (car === game.player.inCar) continue;
    // Slow down if a car is ahead on the same road.
    let slow = false;
    for (const other of game.traffic) {
      if (other === car) continue;
      const d = dist(car.x, car.y, other.x, other.y);
      if (d < 70 && Math.abs(angleTo(car.x, car.y, other.x, other.y) - car.angle) < 0.6) slow = true;
    }
    const target = slow ? 0 : CONFIG.TRAFFIC_SPEED;
    car.speed += clamp(target - car.speed, -300 * dt, 300 * dt);
    const nx = car.x + Math.cos(car.angle) * car.speed * dt;
    const ny = car.y + Math.sin(car.angle) * car.speed * dt;
    if (isBlocked(game.world, nx, ny, 24) || !onRoad(nx, ny)) {
      // Reached an intersection or a block: turn onto the other axis.
      const rp = nearestRoadPoint(car.x, car.y);
      car.angle = angleLerp(car.angle, rp.vertical ? (car.angle > 0 ? Math.PI / 2 : -Math.PI / 2) : (Math.abs(car.angle) < Math.PI / 2 ? 0 : Math.PI), 0.12);
      // At intersections, sometimes pick a new direction.
      if (Math.abs(car.x - rp.x) < 60 && Math.abs(car.y - rp.y) < 60 && Math.random() < 0.02) {
        car.angle = pick(Math, [0, Math.PI / 2, Math.PI, -Math.PI / 2]);
      }
    } else { car.x = nx; car.y = ny; }
    car.x = clamp(car.x, 60, CONFIG.WORLD_W - 500);
    car.y = clamp(car.y, 60, CONFIG.WORLD_H - 60);
  }
}

export function updatePeds(game, dt) {
  for (const ped of game.peds) {
    if (!ped.alive) continue;
    ped.walkPhase += dt * 6;
    const danger = game.player.wanted > 0 && dist(ped.x, ped.y, game.player.x, game.player.y) < 260;
    if (danger || ped.panic > 0) {
      ped.panic = Math.max(ped.panic, 0.5);
      const a = angleTo(game.player.x, game.player.y, ped.x, ped.y);
      moveWithCollision(game.world, ped, ped.x + Math.cos(a) * 150 * dt, ped.y + Math.sin(a) * 150 * dt, 10);
      ped.angle = a;
      ped.panic -= dt;
    } else {
      if (Math.random() < 0.004) ped.angle = range(Math, 0, Math.PI * 2);
      const nx = ped.x + Math.cos(ped.angle) * ped.speed * dt;
      const ny = ped.y + Math.sin(ped.angle) * ped.speed * dt;
      if (!isBlocked(game.world, nx, ny, 10) && !onRoad(nx, ny)) { ped.x = nx; ped.y = ny; }
      else ped.angle += Math.PI / 2;
    }
  }
}

export function updatePolice(game, dt) {
  const p = game.player;
  const want = p.wanted;
  // Spawn police cars to match wanted level (cap 4 cars + foot police).
  const wantCars = want === 0 ? 0 : Math.min(4, 1 + Math.floor(want / 2));
  while (game.policeCars.length < wantCars) {
    const a = range(Math, 0, Math.PI * 2);
    const x = clamp(p.x + Math.cos(a) * 700, 100, CONFIG.WORLD_W - 600);
    const y = clamp(p.y + Math.sin(a) * 700, 100, CONFIG.WORLD_H - 100);
    const rp = nearestRoadPoint(x, y);
    const car = makeCar(rp.x, rp.y, 0, 'police', '#1a2a4a');
    car.speed = CONFIG.POLICE_SPEED * 0.7;
    game.policeCars.push(car);
  }
  while (game.policeCars.length > wantCars) game.policeCars.pop();
  for (const car of game.policeCars) {
    const a = angleTo(car.x, car.y, p.x, p.y);
    car.angle = angleLerp(car.angle, a, 2.2 * dt);
    car.speed = Math.min(CONFIG.POLICE_SPEED, car.speed + 300 * dt);
    const nx = car.x + Math.cos(car.angle) * car.speed * dt;
    const ny = car.y + Math.sin(car.angle) * car.speed * dt;
    if (!isBlocked(game.world, nx, ny, 24)) { car.x = nx; car.y = ny; } else car.speed *= 0.5;
    const d = dist(car.x, car.y, p.x, p.y);
    if (d < 46) { // ram / arrest
      if (p.inCar) { p.inCar.speed *= 0.6; game.audio.thud(); }
      else { p.health -= 22 * dt * 3; p.hurtTimer = 0.4; }
    }
    if (d < 500) game.audio.siren();
  }
  // Foot police chase on foot when wanted and player is on foot.
  if (want > 0 && !p.inCar) {
    if (game.footPolice.length < Math.min(3, want)) {
      const a = range(Math, 0, Math.PI * 2);
      game.footPolice.push({ x: p.x + Math.cos(a) * 320, y: p.y + Math.sin(a) * 320, angle: 0, health: 40, alive: true, speed: 190 });
    }
  } else if (want === 0) game.footPolice.length = 0;
  for (const cop of game.footPolice) {
    if (!cop.alive) continue;
    const a = angleTo(cop.x, cop.y, p.x, p.y);
    cop.angle = a;
    const nx = cop.x + Math.cos(a) * cop.speed * dt;
    const ny = cop.y + Math.sin(a) * cop.speed * dt;
    if (!isBlocked(game.world, nx, ny, 10)) { cop.x = nx; cop.y = ny; }
    if (dist(cop.x, cop.y, p.x, p.y) < 30) { p.health -= 14 * dt * 3; p.hurtTimer = 0.4; }
  }
}

export function updateEnemies(game, dt) {
  for (const e of game.enemies) {
    if (!e.alive) continue;
    const p = game.player;
    const d = dist(e.x, e.y, p.x, p.y);
    if (d < 420) {
      const a = angleTo(e.x, e.y, p.x, p.y);
      e.angle = a;
      if (d > 160) {
        const nx = e.x + Math.cos(a) * 120 * dt;
        const ny = e.y + Math.sin(a) * 120 * dt;
        if (!isBlocked(game.world, nx, ny, 10)) { e.x = nx; e.y = ny; }
      } else if (e.shootTimer <= 0) {
        e.shootTimer = 1.1;
        game.fireBullet(e.x, e.y, a, false);
      }
    }
    if (e.shootTimer > 0) e.shootTimer -= dt;
  }
}

export function updateBullets(game, dt) {
  for (const b of game.bullets) {
    if (!b.alive) continue;
    b.x += Math.cos(b.angle) * 900 * dt;
    b.y += Math.sin(b.angle) * 900 * dt;
    b.life -= dt;
    if (b.life <= 0 || isBlocked(game.world, b.x, b.y, 2)) { b.alive = false; game.particles.push(...game.burst(b.x, b.y, '#cccccc', 4)); continue; }
    const p = game.player;
    if (!b.friendly && !p.inCar && dist(b.x, b.y, p.x, p.y) < 18) {
      b.alive = false; p.health -= 9; p.hurtTimer = 0.4; game.audio.hit();
    }
    if (b.friendly) {
      for (const e of game.enemies) {
        if (e.alive && dist(b.x, b.y, e.x, e.y) < 20) {
          b.alive = false; e.health -= CONFIG.PISTOL_DAMAGE;
          game.particles.push(...game.burst(e.x, e.y, '#ff5555', 8));
          if (e.health <= 0) { e.alive = false; game.onEnemyDown(e); }
          break;
        }
      }
      for (const cop of game.footPolice) {
        if (cop.alive && dist(b.x, b.y, cop.x, cop.y) < 18) {
          b.alive = false; cop.health -= CONFIG.PISTOL_DAMAGE;
          if (cop.health <= 0) { cop.alive = false; game.addWanted(1, cop.x, cop.y); }
          break;
        }
      }
    }
  }
  game.bullets = game.bullets.filter((b) => b.alive);
}
