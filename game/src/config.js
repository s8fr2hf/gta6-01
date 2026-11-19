// Port Meridian — tuning constants for the open-world crime game.
// All numbers here are the single source of truth for speeds, sizes and timers.
export const CONFIG = {
  WORLD_W: 3600,
  WORLD_H: 2600,
  ROAD_W: 96,
  WALK_SPEED: 210,
  SPRINT_SPEED: 330,
  PLAYER_RADIUS: 14,
  PLAYER_HEALTH: 100,
  CAR_W: 46,
  CAR_H: 84,
  CAR_ACCEL: 520,
  CAR_MAX_SPEED: 540,
  CAR_REVERSE_SPEED: 190,
  CAR_TURN: 2.9,
  TRAFFIC_SPEED: 135,
  POLICE_SPEED: 440,
  PISTOL_DAMAGE: 34,
  PISTOL_AMMO_MAX: 24,
  PISTOL_RANGE: 430,
  PUNCH_DAMAGE: 18,
  PUNCH_RANGE: 48,
  ENEMY_HEALTH: 60,
  WANTED_MAX: 5,
  WANTED_DECAY_SECONDS: 9,
  TRAFFIC_COUNT: 26,
  PED_COUNT: 44,
  PICKUP_COUNT: 14,
  CLOCK_START_HOUR: 17,
  CLOCK_SECONDS_PER_HOUR: 60,
  SAVE_KEY: 'port-meridian-save-v1',
  CITY_NAME: 'Port Meridian',
  PLAYER_NAME: 'Rico Vega',
};

export const COLORS = {
  grass: '#5d8a4a',
  parkGrass: '#47803c',
  sand: '#e0c98f',
  water: '#2e7fa8',
  road: '#3a3f46',
  roadLine: '#e8d44d',
  sidewalk: '#9aa0a3',
  buildingRoof: ['#b0563a', '#7a6a8a', '#4a7a8a', '#8a7a4a', '#6a8a5a', '#a05a6a'],
  carColors: ['#d43a2a', '#2a6ad4', '#e8b62a', '#e8e8e8', '#222831', '#3aa86a', '#8a3ad4', '#d47a2a'],
};

export const STEP = 1 / 60;
export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
