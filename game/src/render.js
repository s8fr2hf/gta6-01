// Drawing only: the city, cars, people, HUD, minimap and menus, pixels out.
// Camera follows the player smoothly; HUD text is large for screenshot legibility.
import { COLORS, CONFIG, FONT } from './config.js';
import { BEACH_X, CANAL, ROAD_XS, ROAD_YS, WATER_X } from './world.js';
import { missionObjectiveText } from './missions.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(window.innerWidth * ratio);
    canvas.height = Math.round(window.innerHeight * ratio);
  }
  resize();
  window.addEventListener('resize', resize);

  function text(value, x, y, size, color, align, bold) {
    ctx.font = `${bold ? '700 ' : ''}${size}px ${FONT}`;
    ctx.fillStyle = color;
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(value, x, y);
  }

  function drawCarShape(x, y, angle, color, police, kind) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    const w = CONFIG.CAR_W;
    const h = kind === 'van' ? 100 : CONFIG.CAR_H;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(-w / 2 + 3, -h / 2 + 4, w, h);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2, w, h, 10);
    ctx.fill();
    // windshield + roof
    ctx.fillStyle = '#bfe3f0';
    ctx.fillRect(-w / 2 + 6, -h / 2 + 14, w - 12, 16);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(-w / 2 + 8, -h / 2 + 38, w - 16, 22);
    ctx.fillStyle = '#ffe9a8';
    ctx.fillRect(w / 2 - 4, -h / 2 + 6, 4, 10);
    ctx.fillRect(w / 2 - 4, h / 2 - 16, 4, 10);
    if (police) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-w / 2 + 4, -6, w - 8, 12);
      ctx.fillStyle = '#222';
      text('POLICE', 0, 4, 9, '#111', 'center', true);
      ctx.fillStyle = '#ff2222';
      ctx.beginPath(); ctx.arc(-6, -h / 2 + 2, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2244ff';
      ctx.beginPath(); ctx.arc(6, -h / 2 + 2, 5, 0, Math.PI * 2); ctx.fill();
    }
    if (kind === 'taxi') {
      ctx.fillStyle = '#111';
      text('TAXI', 0, h / 2 - 8, 10, '#111', 'center', true);
    }
    ctx.restore();
  }

  function drawPerson(x, y, angle, color, label) {
    ctx.save();
    ctx.translate(x, y);
    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(0, 6, 12, 5, 0, 0, Math.PI * 2); ctx.fill();
    // body facing angle
    ctx.rotate(angle);
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f0c8a0';
    ctx.beginPath(); ctx.arc(8, 0, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#222';
    ctx.fillRect(10, -4, 6, 8);
    ctx.restore();
    if (label) text(label, x, y - 20, 11, '#fff', 'center', true);
  }

  function drawWorld(game) {
    const cam = game.camera;
    const vw = canvas.width / game.viewScale;
    const vh = canvas.height / game.viewScale;
    const x0 = Math.max(0, cam.x - 100); const y0 = Math.max(0, cam.y - 100);
    const x1 = Math.min(CONFIG.WORLD_W, cam.x + vw + 100); const y1 = Math.min(CONFIG.WORLD_H, cam.y + vh + 100);
    // Ground
    ctx.fillStyle = COLORS.grass;
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    // Park
    const pk = game.world.park;
    ctx.fillStyle = COLORS.parkGrass;
    ctx.fillRect(pk.x, pk.y, pk.w, pk.h);
    ctx.fillStyle = '#3a6ea8';
    ctx.beginPath(); ctx.arc(pk.x + pk.w / 2, pk.y + pk.h / 2, 42, 0, Math.PI * 2); ctx.fill();
    text('MERIDIAN PARK', pk.x + pk.w / 2, pk.y + 30, 20, '#e8f0d8', 'center', true);
    // Beach + sea
    ctx.fillStyle = COLORS.sand;
    ctx.fillRect(BEACH_X, 0, WATER_X - BEACH_X, CONFIG.WORLD_H);
    ctx.fillStyle = COLORS.water;
    ctx.fillRect(WATER_X, 0, CONFIG.WORLD_W - WATER_X, CONFIG.WORLD_H);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    for (let y = 120; y < CONFIG.WORLD_H; y += 260) ctx.fillRect(WATER_X + 8, y, 60, 6);
    text('MERIDIAN BAY', WATER_X + 90, 120, 22, '#dff2ff', 'left', true);
    // Canal
    ctx.fillStyle = COLORS.water;
    ctx.fillRect(CANAL.x0, 0, CANAL.x1 - CANAL.x0, CONFIG.WORLD_H);
    // Sidewalks + roads
    for (const rx of ROAD_XS) { ctx.fillStyle = COLORS.sidewalk; ctx.fillRect(rx - CONFIG.ROAD_W / 2 - 14, 0, CONFIG.ROAD_W + 28, CONFIG.WORLD_H); }
    for (const ry of ROAD_YS) { ctx.fillStyle = COLORS.sidewalk; ctx.fillRect(0, ry - CONFIG.ROAD_W / 2 - 14, CONFIG.WORLD_W, CONFIG.ROAD_W + 28); }
    for (const rx of ROAD_XS) { ctx.fillStyle = COLORS.road; ctx.fillRect(rx - CONFIG.ROAD_W / 2, 0, CONFIG.ROAD_W, CONFIG.WORLD_H); }
    for (const ry of ROAD_YS) { ctx.fillStyle = COLORS.road; ctx.fillRect(0, ry - CONFIG.ROAD_W / 2, CONFIG.WORLD_W, CONFIG.ROAD_W); }
    // Bridge over canal (road y=1100)
    ctx.fillStyle = '#8a7a5a';
    ctx.fillRect(CANAL.x0 - 10, 1100 - CONFIG.ROAD_W / 2 - 8, CANAL.x1 - CANAL.x0 + 20, CONFIG.ROAD_W + 16);
    ctx.fillStyle = COLORS.road;
    ctx.fillRect(CANAL.x0 - 10, 1100 - CONFIG.ROAD_W / 2, CANAL.x1 - CANAL.x0 + 20, CONFIG.ROAD_W);
    // Centre dashes
    ctx.fillStyle = COLORS.roadLine;
    for (const rx of ROAD_XS) for (let y = 0; y < CONFIG.WORLD_H; y += 80) ctx.fillRect(rx - 3, y, 6, 40);
    for (const ry of ROAD_YS) for (let x = 0; x < CONFIG.WORLD_W; x += 80) ctx.fillRect(x, ry - 3, 40, 6);
    // Buildings
    for (const b of game.world.buildings) {
      if (b.x > x1 || b.x + b.w < x0 || b.y > y1 || b.y + b.h < y0) continue;
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(b.x + 5, b.y + 6, b.w, b.h);
      ctx.fillStyle = '#d8d2c2';
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x + 6, b.y + 6, b.w - 12, b.h - 12);
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      for (let wy = b.y + 16; wy < b.y + b.h - 10; wy += 24) {
        for (let wx = b.x + 14; wx < b.x + b.w - 10; wx += 26) ctx.fillRect(wx, wy, 12, 10);
      }
    }
    // Trees
    for (const t of game.world.trees) {
      if (t.x < x0 || t.x > x1 || t.y < y0 || t.y > y1) continue;
      ctx.fillStyle = '#2f6a2a';
      ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#4c8a3a';
      ctx.beginPath(); ctx.arc(t.x - 3, t.y - 3, t.r * 0.7, 0, Math.PI * 2); ctx.fill();
    }
    // Skid marks
    for (const s of game.skids) {
      ctx.save(); ctx.globalAlpha = Math.max(0, s.life / 1.4) * 0.5;
      ctx.fillStyle = '#111'; ctx.translate(s.x, s.y); ctx.rotate(s.angle);
      ctx.fillRect(-20, -16, 34, 5); ctx.fillRect(-20, 11, 34, 5); ctx.restore();
    }
    // Pickups
    for (const p of game.pickups) {
      if (p.taken) continue;
      const bob = Math.sin((game.time + p.bob) * 3) * 3;
      ctx.save(); ctx.translate(p.x, p.y + bob);
      if (p.kind === 'health') { ctx.fillStyle = '#fff'; ctx.fillRect(-12, -12, 24, 24); ctx.fillStyle = '#e33'; ctx.fillRect(-3, -9, 6, 18); ctx.fillRect(-9, -3, 18, 6); }
      else if (p.kind === 'armor') { ctx.fillStyle = '#3a6ad4'; ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#fff'; text('A', 0, 5, 14, '#fff', 'center', true); }
      else if (p.kind === 'money') { ctx.fillStyle = '#2a9a4a'; ctx.fillRect(-13, -8, 26, 16); ctx.fillStyle = '#fff'; text('$', 0, 6, 15, '#fff', 'center', true); }
      else { ctx.fillStyle = '#d4a017'; ctx.fillRect(-11, -11, 22, 22); ctx.fillStyle = '#111'; text('AMMO', 0, 4, 8, '#111', 'center', true); }
      ctx.restore();
    }
    // Mission marker
    if (game.mission) {
      const m = game.mission;
      const pulse = 1 + Math.sin(game.time * 4) * 0.12;
      ctx.save(); ctx.translate(m.x, m.y);
      ctx.strokeStyle = '#ffd21f'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.arc(0, 0, 34 * pulse, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = 'rgba(255,210,31,0.35)';
      ctx.beginPath(); ctx.arc(0, 0, 30 * pulse, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffd21f';
      ctx.beginPath(); ctx.moveTo(0, -58); ctx.lineTo(-14, -28); ctx.lineTo(14, -28); ctx.closePath(); ctx.fill();
      ctx.restore();
      text(m.title, m.x, m.y - 70, 18, '#ffd21f', 'center', true);
    }
    // Traffic + police cars
    for (const c of game.traffic) drawCarShape(c.x, c.y, c.angle, c.color, false, c.kind);
    for (const c of game.policeCars) drawCarShape(c.x, c.y, c.angle, c.color, true, 'police');
    // Pedestrians, enemies, foot police
    for (const ped of game.peds) if (ped.alive) drawPerson(ped.x, ped.y + Math.sin(ped.walkPhase) * 2, ped.angle, ped.color, null);
    for (const e of game.enemies) if (e.alive) drawPerson(e.x, e.y, e.angle, '#c22a2a', 'KING');
    for (const cop of game.footPolice) if (cop.alive) drawPerson(cop.x, cop.y, cop.angle, '#1a2a5a', 'POLICE');
    // Player
    const p = game.player;
    if (!p.inCar && !p.dead) {
      drawPerson(p.x, p.y, p.angle, '#ff8c1a', 'RICO');
      // Aim line + pistol
      ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(p.x + Math.cos(p.angle) * 18, p.y + Math.sin(p.angle) * 18);
      ctx.lineTo(p.x + Math.cos(p.angle) * 60, p.y + Math.sin(p.angle) * 60); ctx.stroke();
    }
    if (p.inCar) drawCarShape(p.inCar.x, p.inCar.y, p.inCar.angle, p.inCar.color, p.inCar.police, p.inCar.kind);
    // Bullets
    ctx.fillStyle = '#ffe95a';
    for (const b of game.bullets) { ctx.beginPath(); ctx.arc(b.x, b.y, 4, 0, Math.PI * 2); ctx.fill(); }
    // Particles
    for (const pt of game.particles) {
      ctx.globalAlpha = Math.max(0, pt.life / pt.max);
      ctx.fillStyle = pt.color;
      ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Day tint
    const hour = game.clockHour;
    let tint = null;
    if (hour >= 18 || hour < 6) tint = 'rgba(20,30,80,0.22)';
    else if (hour >= 17) tint = 'rgba(255,150,50,0.10)';
    if (tint) { ctx.fillStyle = tint; ctx.fillRect(x0, y0, x1 - x0, y1 - y0); }
  }

  function drawMinimap(game) {
    const mw = 260; const mh = 188;
    const x = canvas.width / game.viewScale - mw - 16;
    const y = 16;
    const sx = mw / CONFIG.WORLD_W; const sy = mh / CONFIG.WORLD_H;
    ctx.save();
    ctx.fillStyle = 'rgba(10,14,20,0.85)';
    ctx.fillRect(x - 6, y - 6, mw + 12, mh + 12);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(x - 6, y - 6, mw + 12, mh + 12);
    ctx.fillStyle = '#4c7a3d'; ctx.fillRect(x, y, mw, mh);
    ctx.fillStyle = '#2e7fa8'; ctx.fillRect(x + WATER_X * sx, y, mw - WATER_X * sx, mh);
    ctx.fillStyle = '#e0c98f'; ctx.fillRect(x + BEACH_X * sx, y, (WATER_X - BEACH_X) * sx, mh);
    ctx.fillStyle = '#3a3f46';
    for (const rx of ROAD_XS) ctx.fillRect(x + rx * sx - 2, y, 4, mh);
    for (const ry of ROAD_YS) ctx.fillRect(x, y + ry * sy - 2, mw, 4);
    ctx.fillStyle = '#47803c';
    const pk = game.world.park; ctx.fillRect(x + pk.x * sx, y + pk.y * sy, pk.w * sx, pk.h * sy);
    if (game.mission) {
      ctx.fillStyle = '#ffd21f';
      ctx.beginPath(); ctx.arc(x + game.mission.x * sx, y + game.mission.y * sy, 7, 0, Math.PI * 2); ctx.fill();
    }
    for (const c of game.policeCars) {
      ctx.fillStyle = '#3a7bff';
      ctx.beginPath(); ctx.arc(x + c.x * sx, y + c.y * sy, 5, 0, Math.PI * 2); ctx.fill();
    }
    const p = game.player;
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(x + p.x * sx, y + p.y * sy, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ff8c1a';
    ctx.beginPath(); ctx.arc(x + p.x * sx, y + p.y * sy, 4, 0, Math.PI * 2); ctx.fill();
    // Viewport box
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1;
    ctx.strokeRect(x + game.camera.x * sx, y + game.camera.y * sy, (canvas.width / game.viewScale) * sx, (canvas.height / game.viewScale) * sy);
    text('PORT MERIDIAN', x + mw / 2, y + mh + 22, 13, '#fff', 'center', true);
    ctx.restore();
  }

  function drawHud(game) {
    const p = game.player;
    const W = canvas.width / game.viewScale;
    // Top-left: money, health, armor, ammo
    ctx.fillStyle = 'rgba(10,14,20,0.72)';
    ctx.fillRect(12, 12, 330, 118);
    text(`$${p.money}`, 26, 48, 34, '#7be36a', 'left', true);
    text(`HEALTH ${Math.max(0, Math.ceil(p.health))}`, 26, 82, 22, p.health > 30 ? '#fff' : '#ff5555', 'left', true);
    ctx.fillStyle = '#333'; ctx.fillRect(26, 92, 200, 12);
    ctx.fillStyle = p.health > 30 ? '#4caf50' : '#e33'; ctx.fillRect(26, 92, 200 * Math.max(0, p.health) / 100, 12);
    text(`ARMOR ${Math.ceil(p.armor)}   AMMO ${p.ammo}`, 26, 122, 20, '#cfe3ff', 'left', true);
    // Wanted stars top-centre
    const stars = '★'.repeat(p.wanted) + '☆'.repeat(CONFIG.WANTED_MAX - p.wanted);
    text(stars, W / 2, 52, 40, p.wanted ? '#ffd21f' : '#888', 'center', true);
    if (p.wanted > 0) text('WANTED', W / 2, 82, 18, '#ff5555', 'center', true);
    // Clock
    const hh = Math.floor(game.clockHour); const mm = Math.floor((game.clockHour - hh) * 60);
    text(`${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`, W - 300, 240, 26, '#fff', 'right', true);
    // Speed bottom-right
    const speed = p.inCar ? Math.abs(Math.round(p.inCar.speed * 0.18)) : 0;
    text(p.inCar ? `${speed} km/h` : 'ON FOOT', W - 24, canvas.height / game.viewScale - 24, 30, '#fff', 'right', true);
    // Mission objective bar (large, readable when shrunk)
    const obj = missionObjectiveText(game.mission);
    ctx.fillStyle = 'rgba(10,14,20,0.78)';
    const bw = Math.min(W - 40, ctx.measureText(obj).width + 400);
    ctx.fillRect(20, canvas.height / game.viewScale - 92, 760, 56);
    ctx.fillStyle = '#ffd21f'; ctx.fillRect(20, canvas.height / game.viewScale - 92, 8, 56);
    text(`MISSION: ${obj}`, 44, canvas.height / game.viewScale - 56, 24, '#fff', 'left', true);
    // Banner
    if (game.banner && game.banner.t > 0) {
      ctx.fillStyle = 'rgba(20,60,20,0.9)';
      ctx.fillRect(W / 2 - 380, 130, 760, 64);
      text(game.banner.text, W / 2, 172, 28, '#8dff7a', 'center', true);
    }
    // Dialogue box
    if (game.dialogue && game.dialogueTimer > 0) {
      const d = game.dialogue[0];
      ctx.fillStyle = 'rgba(8,10,18,0.88)';
      ctx.fillRect(W / 2 - 420, canvas.height / game.viewScale - 210, 840, 100);
      ctx.strokeStyle = '#ffd21f'; ctx.lineWidth = 2; ctx.strokeRect(W / 2 - 420, canvas.height / game.viewScale - 210, 840, 100);
      text(`${d.who}:`, W / 2 - 396, canvas.height / game.viewScale - 172, 22, '#ffd21f', 'left', true);
      text(d.text, W / 2 - 396, canvas.height / game.viewScale - 140, 22, '#fff', 'left', false);
      if (game.dialogue.length > 1) text('(dialogue continues…)', W / 2 + 396, canvas.height / game.viewScale - 128, 16, '#aaa', 'right', false);
    }
    // Controls hint
    text('WASD move/drive · E enter car · Click shoot · F punch · P pause · M mute', 24, canvas.height / game.viewScale - 110, 16, 'rgba(255,255,255,0.75)', 'left', false);
    drawMinimap(game);
  }

  function drawPanel(title, lines, prompt, accent, scale) {
    const W = canvas.width / scale; const H = canvas.height / scale;
    ctx.fillStyle = 'rgba(8,10,16,0.72)'; ctx.fillRect(0, 0, W, H);
    const pw = 720; const ph = 150 + lines.length * 36;
    const x = (W - pw) / 2; const y = (H - ph) / 2;
    ctx.fillStyle = '#141a26'; ctx.fillRect(x, y, pw, ph);
    ctx.strokeStyle = accent || '#ffd21f'; ctx.lineWidth = 3; ctx.strokeRect(x, y, pw, ph);
    text(title, W / 2, y + 70, 52, accent || '#ffd21f', 'center', true);
    lines.forEach((line, i) => text(line, W / 2, y + 118 + i * 36, 22, '#e8ecf2', 'center', false));
    text(prompt, W / 2, y + ph - 28, 22, '#7be36a', 'center', true);
  }

  function draw(game, screen) {
    const scale = game.viewScale;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#0c0f14';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // World in camera space
    ctx.setTransform(scale, 0, 0, scale, -game.camera.x * scale, -game.camera.y * scale);
    drawWorld(game);
    // HUD in screen space
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    if (screen === SCREEN_TITLE) {
      drawPanel('PORT MERIDIAN', [
        'An original open-world crime game — Rico Vega takes on the Harbor Kings.',
        'Explore the city on foot or by car. Steal cars, lose the police,',
        'run 6 story missions, and take back the city.',
        '',
        'WASD move / drive · E enter a car · Mouse aim, Click shoot · F punch',
        'P pause · M mute · Progress saves automatically',
      ], 'Press SPACE or CLICK to start — New Game', '#ff8c1a', scale);
      text('PORT MERIDIAN — a sun-soaked city of your own. No Rockstar content.', canvas.width / scale / 2, canvas.height / scale - 40, 16, '#aaa', 'center', false);
      return;
    }
    drawHud(game);
    if (screen === SCREEN_PAUSED) {
      drawPanel('PAUSED', ['The city waits for you.', `Mission ${game.missionIndex + 1} of 6 · $${game.player.money} · Wanted ${game.player.wanted}★`], 'Press P to resume', '#cfe3ff', scale);
    } else if (screen === SCREEN_OVER) {
      drawPanel('BUSTED / WASTED', ['Rico Vega is down. The Harbor Kings laugh — for now.', `You earned $${game.player.money} across ${game.missionIndex} missions.`], 'Press SPACE to play again', '#ff5555', scale);
    }
  }

  return { draw, resize };
}
