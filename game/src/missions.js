// Story missions for Port Meridian. Rico Vega, a driver fresh out of the docks,
// is pulled into the Meridian Crew's war with the Harbor Kings.
// Each mission: id, title, briefing dialogue, objective type and target.
// Types: goto (walk/drive to marker), steal (enter any car), drive (reach marker in a car),
// fight (defeat all marked enemies), escape (lose the wanted level), deliver (reach marker in a car).
export const MISSIONS = [
  {
    id: 'm1', title: '1. First Fare',
    briefing: ['DANA: Rico! The crew needs a driver. Meet me at the park gate.', 'RICO: On my way. Try not to get me killed on day one.'],
    type: 'goto', x: 1150, y: 1600, reward: 150,
    complete: 'DANA: You drive like you mean it. The crew can use you.',
  },
  {
    id: 'm2', title: '2. Borrowed Wheels',
    briefing: ['DANA: We need wheels, fast. Take any car on the street —', 'DANA: — and try not to do it in front of a cop.'],
    type: 'steal', x: 1550, y: 650, reward: 200,
    complete: 'DANA: Nice ride. It suits you. The Kings will not miss it.',
  },
  {
    id: 'm3', title: '3. The Harbor Run',
    briefing: ['MILO: Drive this package to the beachfront drop. Kings watch that road.', 'RICO: If they watch it, I will drive it faster.'],
    type: 'drive', x: 3050, y: 1550, reward: 300,
    complete: 'MILO: Package delivered. The Kings never saw you coming.',
  },
  {
    id: 'm4', title: '4. Kings on the Corner',
    briefing: ['DANA: Harbor Kings are shaking down the corner market. Clear them out.', 'RICO: Pistols talk. Let me do the talking.'],
    type: 'fight', x: 2000, y: 1100, reward: 400, enemies: 4,
    complete: 'DANA: The market is free again. Word travels fast, Rico.',
  },
  {
    id: 'm5', title: '5. Heat Wave',
    briefing: ['MILO: The police are all over you after that. Lose them — stay out of sight!', 'RICO: Out of sight, out of cuffs.'],
    type: 'escape', x: 650, y: 2000, reward: 350,
    complete: 'MILO: Heat is off. You are a ghost, Rico.',
  },
  {
    id: 'm6', title: '6. The Meridian Score',
    briefing: ['DANA: Last job. Drive the crew van to the bridge and bring the score home.', 'RICO: One last drive. Then Port Meridian is ours.'],
    type: 'deliver', x: 1550, y: 200, reward: 800,
    complete: 'DANA: We did it. Port Meridian belongs to the crew now. — THE END —',
  },
];

export function missionObjectiveText(m) {
  if (!m) return 'All missions complete — free roam Port Meridian!';
  switch (m.type) {
    case 'goto': return `Go to the yellow marker — ${m.title}`;
    case 'steal': return 'Steal a car (press E near one)';
    case 'drive': return 'Drive to the beachfront drop-off';
    case 'fight': return 'Defeat the Harbor Kings on the corner';
    case 'escape': return 'Lose the police — stay out of sight!';
    case 'deliver': return 'Drive to the bridge — bring the score home';
    default: return m.title;
  }
}

// Advance the current mission; returns 'complete' when it finishes, else null.
export function updateMission(game, dt) {
  const m = game.mission;
  if (!m) return null;
  const p = game.player;
  const d = Math.hypot(p.x - m.x, p.y - m.y);
  if (m.type === 'goto' && d < 70) return finishMission(game);
  if (m.type === 'steal' && p.inCar) return finishMission(game);
  if ((m.type === 'drive' || m.type === 'deliver') && p.inCar && d < 80) return finishMission(game);
  if (m.type === 'fight') {
    if (game.enemies.length === 0) spawnMissionEnemies(game, m);
    if (game.enemies.every((e) => !e.alive)) return finishMission(game);
  }
  if (m.type === 'escape' && p.wanted === 0) return finishMission(game);
  return null;
}

function finishMission(game) {
  const m = game.mission;
  game.player.money += m.reward;
  game.banner = { text: `MISSION COMPLETE — ${m.title}  +$${m.reward}`, t: 3.5 };
  game.dialogue = [{ who: 'CREW', text: m.complete }];
  game.dialogueTimer = 4;
  game.missionIndex += 1;
  game.mission = MISSIONS[game.missionIndex] || null;
  if (game.mission) {
    game.dialogue = game.mission.briefing.map((line) => {
      const [who, text] = line.split(': ');
      return { who, text };
    });
    game.dialogueTimer = 5;
    if (game.mission.type === 'fight') spawnMissionEnemies(game, game.mission);
    if (game.mission.type === 'escape') game.addWanted(3, game.player.x, game.player.y);
  }
  game.audio.mission();
  game.save();
  return 'complete';
}

export function spawnMissionEnemies(game, m) {
  game.enemies = [];
  for (let i = 0; i < (m.enemies || 3); i += 1) {
    const a = (i / (m.enemies || 3)) * Math.PI * 2;
    game.enemies.push({
      x: m.x + Math.cos(a) * 120, y: m.y + Math.sin(a) * 120,
      angle: 0, health: 60, alive: true, shootTimer: 1, speed: 120, name: 'Harbor King',
    });
  }
}
