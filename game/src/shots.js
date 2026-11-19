// Deterministic screenshot scenes behind ?shot=<name>&seed=N.
// Each scene sets up a fixed, fully-rendered game state (real systems, no mock
// drawing) and main.js paints it twice, then sets window.__shotReady.
import { SCREEN_PLAY, SCREEN_TITLE } from './render.js';

export function stageShot(name, game) {
  const p = game.player;
  if (name === 'start') {
    game.screen = SCREEN_TITLE;
    return { screen: SCREEN_TITLE };
  }
  game.screen = SCREEN_PLAY;
  game.missionIndex = 2;
  game.mission = game.missions[2];
  game.dialogue = [{ who: 'MILO', text: 'Drive this package to the beachfront drop. Kings watch that road.' }];
  game.dialogueTimer = 99;
  if (name === 'chase') {
    // Cover: driving, 3 wanted stars, police chase, minimap, mission objective.
    p.x = 1550; p.y = 1100;
    const car = game.traffic[0];
    car.x = 1550; car.y = 1100; car.angle = 0; car.speed = 380; car.color = '#d43a2a';
    p.inCar = car; p.inCar.speed = 380;
    p.wanted = 3; p.money = 1450; p.health = 82; p.armor = 40; p.ammo = 18;
    game.policeCars.length = 0;
    game.policeCars.push(game.makePoliceCar(1380, 1100));
    game.policeCars.push(game.makePoliceCar(1720, 1100));
    game.policeCars.push(game.makePoliceCar(1550, 930));
    game.banner = { text: 'MISSION 3 — THE HARBOR RUN', t: 99 };
    game.clockHour = 17.5;
    game.camera.x = p.x - 640; game.camera.y = p.y - 360;
    game.skids.push({ x: 1450, y: 1100, angle: 0, life: 1.2 });
    game.skids.push({ x: 1400, y: 1100, angle: 0, life: 1.0 });
  } else if (name === 'street') {
    // On foot among traffic and pedestrians, near the park.
    p.x = 1200; p.y = 1650; p.inCar = null; p.wanted = 0;
    p.money = 320; p.health = 100; p.armor = 0; p.ammo = 12;
    game.missionIndex = 0; game.mission = game.missions[0];
    game.dialogue = [{ who: 'DANA', text: 'Rico! The crew needs a driver. Meet me at the park gate.' }];
    game.dialogueTimer = 99;
    game.camera.x = p.x - 640; game.camera.y = p.y - 360;
  } else if (name === 'mission') {
    // Mission 4 fight: enemies marked, player aiming with pistol.
    game.missionIndex = 3; game.mission = game.missions[3];
    p.x = 1900; p.y = 1000; p.inCar = null; p.wanted = 2;
    p.money = 890; p.health = 74; p.armor = 25; p.ammo = 20;
    game.spawnMissionEnemies(game.mission);
    game.enemies[0].x = 2050; game.enemies[0].y = 1080;
    game.enemies[1].x = 2120; game.enemies[1].y = 1150;
    game.dialogue = [{ who: 'DANA', text: 'Harbor Kings are shaking down the corner market. Clear them out.' }];
    game.dialogueTimer = 99;
    game.camera.x = p.x - 640; game.camera.y = p.y - 360;
  } else {
    // Default 'play': driving through the city centre.
    p.x = 1100; p.y = 650;
    const car = game.traffic[1];
    car.x = 1100; car.y = 650; car.angle = Math.PI / 2; car.speed = 300;
    p.inCar = car; p.wanted = 1; p.money = 640;
    game.camera.x = p.x - 640; game.camera.y = p.y - 360;
  }
  return { screen: SCREEN_PLAY };
}
