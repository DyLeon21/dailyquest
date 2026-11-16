import { clamp } from './rng';

/**
 * Layout der Welt (Einheiten ≈ Meter der Spielwelt).
 *
 * Die Insel ist ein langer, schmaler Streifen:
 *   x: -10 … +10   (links → rechts)
 *   z:   0 … -228  (Start unten/Süden → Sinai oben/Norden)
 * Der Pfad ist als Funktion x = pathX(z) definiert (er läuft immer nach Norden) – das macht
 * Abstandsberechnungen und das Platzieren von Objekten einfach und stabil.
 */

export const WORLD = { width: 20, length: 228, cell: 0.8 } as const;
export const HALF_W = WORLD.width / 2;

/** z-Grenzen der sechs Stationsgruppen (Süden → Norden). */
export const STATION_BOUNDS = [0, -39, -78, -114, -148, -184, -WORLD.length] as const;
/** z-Position des Stationsmarkers (liegt immer auf dem Pfad). */
export const STATION_Z = [-18, -58.5, -97, -131, -166, -191] as const;

// ── Pfad ───────────────────────────────────────────────────────────────────────────────────────
const PATH_KNOTS: ReadonlyArray<readonly [number, number]> = [
  [4, 0.2],
  [1, 0.2],
  [-2, 1.4],
  [-8, 2.9],
  [-14, -0.4],
  [-18, -2.2],
  [-23, -1.0],
  [-28, 0.3],
  [-34, 1.2],
  [-41, 1.4],
  [-48, 1.2],
  [-54, 2.2],
  [-58.5, 3.2],
  [-65, 6.6],
  [-74, 7.4],
  [-82, 5.0],
  [-90, 0.8],
  [-97, -3.0],
  [-104, -1.2],
  [-111, 0.0],
  [-118, 0.0],
  [-131, 0.0],
  [-146, 0.0],
  [-152, 1.8],
  [-159, 3.6],
  [-166, 3.0],
  [-173, 0.6],
  [-180, -2.2],
  [-186, -1.4],
  [-191, 0.0],
  [-199, 0.6],
  // Verlängerung bis zum Gipfel (nur für Kamera-Vorausschau und Platzfreihaltung; der sichtbare Pfad endet am Berg)
  [-205, 0.2],
  [-212, -0.6],
  [-219, -1.4],
  [-228, -1.4],
];

export function catmull(p0: number, p1: number, p2: number, p3: number, t: number) {
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}

/** x-Position der Pfadmitte bei gegebenem z. */
export function pathX(z: number): number {
  const k = PATH_KNOTS;
  if (z >= k[0][0]) return k[0][1];
  if (z <= k[k.length - 1][0]) return k[k.length - 1][1];
  let i = 0;
  while (i < k.length - 2 && z < k[i + 1][0]) i++;
  const t = (k[i][0] - z) / (k[i][0] - k[i + 1][0]);
  const p0 = k[Math.max(0, i - 1)][1];
  const p3 = k[Math.min(k.length - 1, i + 2)][1];
  return catmull(p0, k[i][1], k[i + 1][1], p3, t);
}

export function pathSlope(z: number): number {
  return (pathX(z - 0.25) - pathX(z + 0.25)) / -0.5;
}

/** Seitlicher Abstand zur Pfadmitte (senkrecht gemessen). */
export function distToPath(x: number, z: number): number {
  const s = pathSlope(z);
  return Math.abs(x - pathX(z)) / Math.sqrt(1 + s * s);
}

export const PATH_HALF_WIDTH = 0.95;

// ── Nil ────────────────────────────────────────────────────────────────────────────────────────
const RIVER_KNOTS: ReadonlyArray<readonly [number, number, number]> = [
  [-8, -37.2, 1.8],
  [-7, -36.4, 1.9],
  [-4.5, -33.6, 2.0],
  [-2, -30.2, 2.0],
  [0.5, -27.6, 2.1],
  [3.2, -25.8, 2.2],
  [6, -24.0, 2.3],
  [8.5, -22.8, 2.4],
  [11.5, -22.6, 2.5],
  [15, -23.4, 2.5],
];
export const NILE_LEVEL = -0.42;
export const NILE_X0 = -7; // hier beginnt der Fluss (See davor)
export const NILE_OUTLET_X = HALF_W;
export const LAKE = { x: -7.8, z: -37.0, rx: 3.9, rz: 3.0 };

function riverSeg(x: number) {
  const k = RIVER_KNOTS;
  if (x <= k[0][0]) return { i: 0, t: 0 };
  if (x >= k[k.length - 1][0]) return { i: k.length - 2, t: 1 };
  let i = 0;
  while (i < k.length - 2 && x > k[i + 1][0]) i++;
  return { i, t: (x - k[i][0]) / (k[i + 1][0] - k[i][0]) };
}
export function riverZ(x: number): number {
  const k = RIVER_KNOTS;
  const { i, t } = riverSeg(x);
  return catmull(k[Math.max(0, i - 1)][1], k[i][1], k[i + 1][1], k[Math.min(k.length - 1, i + 2)][1], t);
}
export function riverHalfW(x: number): number {
  const k = RIVER_KNOTS;
  const { i, t } = riverSeg(x);
  return k[i][2] + (k[i + 1][2] - k[i][2]) * t;
}
export function riverDist(x: number, z: number): number {
  const s = (riverZ(x + 0.2) - riverZ(x - 0.2)) / 0.4;
  return Math.abs(z - riverZ(x)) / Math.sqrt(1 + s * s);
}
/** Bogenlänge entlang des Flusses ab NILE_X0 (für die Strömungsanimation). */
const U_STEP = 0.25;
const U_TABLE: number[] = (() => {
  const t: number[] = [0];
  let u = 0;
  for (let x = NILE_X0; x < 16; x += U_STEP) {
    const dz = riverZ(x + U_STEP) - riverZ(x);
    u += Math.hypot(U_STEP, dz);
    t.push(u);
  }
  return t;
})();
export function riverU(x: number): number {
  const f = clamp((x - NILE_X0) / U_STEP, 0, U_TABLE.length - 1.001);
  const i = Math.floor(f);
  return U_TABLE[i] + (U_TABLE[i + 1] - U_TABLE[i]) * (f - i);
}

// ── Rotes Meer ─────────────────────────────────────────────────────────────────────────────────
export const SEA = {
  zS: -119.5, // Südufer
  zN: -142.5, // Nordufer
  level: -0.62,
  floor: -1.8,
  corridorHalf: 3.3, // halbe Breite des trockenen Weges
  wallInner: 3.35, // Innenkante der Wasserwände
  wallOuter: 7.0,
  wallH: 6.3,
} as const;

// ── Oase, Quelle, Sinai ────────────────────────────────────────────────────────────────────────
export const OASIS = { x: -5.2, z: -158.5, r: 3.4, level: -0.12 };
export const SPRING = { x: -5.4, z: -176.8, r: 1.5, level: 0.08 };
/** Sinai: Kegel (height = rechnerische Spitze), oben auf `top` zu einem Gipfelplateau gekappt. */
export const SINAI = { x: 0.4, z: -214.5, height: 24.5, radius: 11.5, top: 19.2 };
/** Gipfelplateau (Mitte der ebenen Fläche, hier stehen die Gesetzestafeln). */
export const SUMMIT = { x: 0.9, z: -214.9 };
/** Mitte des Vorhofs der Stiftshütte; das Zelt steht im Norden des Hofs, der Eingang liegt im Süden. */
export const TABERNACLE = { x: -4.6, z: -196.5, court: { w: 3.8, d: 6.6 }, tentDz: -1.85 };

export function inSeaBasin(z: number): boolean {
  return z < SEA.zS + 2 && z > SEA.zN - 2;
}
