// City generation for Port Meridian: a road grid, building blocks, a central park,
// a beach and waterfront on the east edge, and a canal with a bridge on the west.
// Pure data — no drawing, no browser — so shots and the live game share one city.
import { COLORS, CONFIG } from './config.js';
import { makeRng, pick, range, rangeInt } from './random.js';

export const ROAD_XS = [200, 650, 1100, 1550, 2000, 2450, 2900];
export const ROAD_YS = [200, 650, 1100, 1550, 2000, 2350];
export const CANAL = { x0: 2620, x1: 2720, y0: 0, y1: 2600 }; // crossed by the bridge road y=1100
export const BEACH_X = 3150; // sand east of here, water east of 3420
export const WATER_X = 3420;

export function buildWorld(seed) {
  const rng = makeRng(seed);
  const buildings = [];
  const trees = [];
  const lamps = [];
  // Park block: between roads x 1100-1550, y 1550-2000
  const park = { x: 1100 + 48, y: 1550 + 48, w: 450 - 96, h: 450 - 96 };
  for (let i = 0; i < 26; i += 1) {
    trees.push({ x: park.x + rng() * park.w, y: park.y + rng() * park.h, r: 12 + rng() * 10 });
  }
  for (let xi = 0; xi < ROAD_XS.length - 1; xi += 1) {
    for (let yi = 0; yi < ROAD_YS.length - 1; yi += 1) {
      const bx = ROAD_XS[xi] + CONFIG.ROAD_W / 2;
      const by = ROAD_YS[yi] + CONFIG.ROAD_W / 2;
      const bw = ROAD_XS[xi + 1] - ROAD_XS[xi] - CONFIG.ROAD_W;
      const bh = ROAD_YS[yi] - ROAD_YS[yi] - CONFIG.ROAD_W + (ROAD_YS[yi + 1] - ROAD_YS[yi] - CONFIG.ROAD_W);
      // Park block: no buildings, just trees and a pond.
      if (ROAD_XS[xi] === 1100 && ROAD_YS[yi] === 1550) continue;
      // Canal block: skip buildings overlapping the canal.
      if (bx + bw > CANAL.x0 && bx < CANAL.x1) continue;
      // Beach blocks east of the last road: no buildings.
      if (bx > 2900) continue;
      const n = rangeInt(rng, 2, 4);
      for (let k = 0; k < n; k += 1) {
        const w = range(rng, 90, 150);
        const h = range(rng, 80, 140);
        const x = bx + 14 + rng() * Math.max(1, bw - w - 28);
        const y = by + 14 + rng() * Math.max(1, bh - h - 28);
        buildings.push({ x, y, w, h, color: pick(rng, COLORS.buildingRoof), hgt: rangeInt(rng, 1, 4) });
      }
      if (rng() < 0.7) trees.push({ x: bx + range(rng, 20, bw - 20), y: by + range(rng, 20, bh - 20), r: 10 + rng() * 8 });
    }
  }
  for (const x of ROAD_XS) for (const y of ROAD_YS) lamps.push({ x: x + 58, y: y - 58 });
  return { buildings, trees, lamps, park, seed };
}

// True when point (x,y) is inside a building (inflated by r) or in deep water.
export function isBlocked(world, x, y, r) {
  if (x < r || y < r || x > CONFIG.WORLD_W - r || y > CONFIG.WORLD_H - r) return true;
  if (x > WATER_X) return true; // the sea
  if (x > CANAL.x0 && x < CANAL.x1) {
    // Canal: only the bridge road (y near 1100) is crossable.
    if (Math.abs(y - 1100) > CONFIG.ROAD_W / 2) return true;
  }
  for (const b of world.buildings) {
    if (x > b.x - r && x < b.x + b.w + r && y > b.y - r && y < b.y + b.h + r) return true;
  }
  return false;
}

// Nearest road point: used to snap spawned cars and to keep traffic on roads.
export function nearestRoadPoint(x, y) {
  let bestX = ROAD_XS[0]; let bestD = Infinity;
  for (const rx of ROAD_XS) { const d = Math.abs(x - rx); if (d < bestD) { bestD = d; bestX = rx; } }
  let bestY = ROAD_YS[0]; bestD = Infinity;
  for (const ry of ROAD_YS) { const d = Math.abs(y - ry); if (d < bestD) { bestD = d; bestY = ry; } }
  if (Math.abs(x - bestX) < Math.abs(y - bestY)) return { x: bestX, y, vertical: true };
  return { x, y: bestY, vertical: false };
}

export function onRoad(x, y) {
  for (const rx of ROAD_XS) if (Math.abs(x - rx) < CONFIG.ROAD_W / 2) return true;
  for (const ry of ROAD_YS) if (Math.abs(y - ry) < CONFIG.ROAD_W / 2) return true;
  return false;
}
