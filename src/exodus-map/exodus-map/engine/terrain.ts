import { Color } from 'three';
import { PAL } from '../config';
import type { GeoBuilder } from './GeoBuilder';
import { toColor } from './GeoBuilder';
import {
  catmull, HALF_W, LAKE, NILE_LEVEL, NILE_X0, OASIS, PATH_HALF_WIDTH, SEA, SINAI, SPRING, STATION_BOUNDS,
  TABERNACLE, WORLD, distToPath, pathSlope, pathX, riverDist, riverHalfW,
} from './layout';
import { ValueNoise, hash2, lerp, smoothstep as ss } from './rng';

const nA = new ValueNoise(11);
const nD = new ValueNoise(37);
const nR = new ValueNoise(51);

function flat(h: number, x: number, z: number, cx: number, cz: number, r0: number, r1: number, level: number, k = 1) {
  const d = Math.hypot(x - cx, z - cz);
  return lerp(h, level, ss(r1, r0, d) * k);
}

function smax(a: number, b: number, k: number) {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.max(a, b) + h * h * k * 0.25;
}
function coneH(x: number, z: number, cx: number, cz: number, r: number, h: number, p: number) {
  return h * Math.pow(Math.max(0, 1 - Math.hypot(x - cx, z - cz) / r), p);
}

/** Weiches Minimum (rundet die Kante des Gipfelplateaus). */
function smin(a: number, b: number, k: number) {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}

/** Gebirge Sinai: Hauptgipfel + zwei Schultern, breite Rippen, flaches Gipfelplateau. */
function mountain(x: number, z: number): number {
  const dx = x - SINAI.x;
  const dz = z - SINAI.z;
  const d = Math.hypot(dx, dz);
  if (d > SINAI.radius + 2) return 0;
  let m = coneH(x, z, SINAI.x, SINAI.z, SINAI.radius, SINAI.height, 1.12);
  m = smax(m, coneH(x, z, -5.4, -209.8, 6.2, 11.0, 1.1), 1.4);
  m = smax(m, coneH(x, z, 6.3, -209.0, 5.6, 8.6, 1.15), 1.4);
  const ang = Math.atan2(dz, dx);
  // wenige, breite Rippen (große Flächen statt Knitterfalten)
  const rib = Math.sin(ang * 4 + nR.at(d * 0.12, 3.7) * 2.4) * 0.55 + Math.sin(ang * 7 + 1.3) * 0.2;
  m *= 1 + 0.15 * rib * ss(0, 5, m) * ss(SINAI.top + 3, 9, m);
  m += (nR.fbm(x * 0.16 + 5.0, z * 0.16, 2) - 0.5) * m * 0.2;
  m = smin(m, SINAI.top, 1.3);
  return Math.max(0, m);
}

/**
 * Höhenfunktion der gesamten Welt (analytisch).
 * Reihenfolge: Grundrelief → Dünen → Stadtplateau → Pfadbett → Meeresbecken → Mulden/Plateaus →
 * Berg → Rand der Insel (immer y=0) → Flussbett (schneidet auch durch den Rand = Wasserfall).
 */
function baseHeight(x: number, z: number): number {
  // 1. Grundrelief
  let h = 0.32 + (nA.fbm(x * 0.085 + 3.1, z * 0.085 + 1.7, 3) - 0.5) * 0.85;

  // 2. Dünen
  const wDune = Math.max(ss(-86, -95, z) * ss(-117, -111, z) * 0.55, ss(-146, -153, z) * ss(-196, -189, z));
  if (wDune > 0.001) {
    const a = nD.fbm(x * 0.12 + z * 0.045, z * 0.105 - x * 0.04, 3);
    const r = 1 - Math.abs(a * 2 - 1);
    h += (r * r * 2.7 + (nD.fbm(x * 0.05, z * 0.05, 2) - 0.5) * 1.1) * wDune;
  }

  // 3. Stadt (flaches, gepflastertes Plateau)
  h = lerp(h, 0.42, ss(-46, -50, z) * ss(-90, -86, z) * 0.92);

  // 4. Pfadbett: Weg wird sanft eingeebnet
  const dp = distToPath(x, z);
  h = lerp(h, 0.3 + (nA.at(z * 0.07, 9.1) - 0.5) * 0.18, ss(3.6, 1.0, dp) * 0.92);

  // 5. Rotes Meer: Becken mit trockenem Sandweg in der Mitte
  {
    const zS = SEA.zS + 0.9 * Math.sin(x * 0.55 + 1.0);
    const zN = SEA.zN + 0.9 * Math.sin(x * 0.5 + 2.0);
    const m = ss(zS + 1.2, zS - 2.0, z) * ss(zN - 1.2, zN + 2.0, z);
    if (m > 0) {
      const c = ss(SEA.corridorHalf + 1.5, SEA.corridorHalf - 0.2, Math.abs(x));
      const basin = lerp(SEA.floor + (nA.at(x * 0.4, z * 0.4) - 0.5) * 0.3, -0.26 + (nA.at(x * 0.9, z * 0.35) - 0.5) * 0.06, c);
      h = lerp(h, basin, m);
    }
  }

  // 6. Lager-Plateaus & Mulden
  h = flat(h, x, z, 6.0, -170.6, 3.9, 6.6, 0.5);
  h = flat(h, x, z, TABERNACLE.x, TABERNACLE.z, 4, 7, 0.42, 0.95);
  h = flat(h, x, z, 5.8, -190.6, 3.6, 6.6, 0.42, 0.85); // Lager Station 6 (Ost)
  h = flat(h, x, z, -5.2, -188.4, 2.8, 5.6, 0.42, 0.75); // Lager Station 6 (West)
  h = flat(h, x, z, -0.8, -98.6, 4.6, 8.6, 0.34, 0.86); // Karawane
  h = flat(h, x, z, -5.2, -10.5, 3, 7, 0.36, 0.7); // Dorf
  h = flat(h, x, z, -4.6, -44, 4, 8, 0.35, 0.9); // große Pyramide
  h = flat(h, x, z, 5.8, -41.5, 3, 5.5, 0.35, 0.9);
  // Quell-Becken und Oase
  h = lerp(h, -0.6, ss(OASIS.r + 1.4, OASIS.r - 0.3, Math.hypot(x - OASIS.x, z - OASIS.z)));
  h = lerp(h, -0.4, ss(SPRING.r + 0.9, SPRING.r - 0.2, Math.hypot(x - SPRING.x, z - SPRING.z)));

  // 7. Sinai
  h += mountain(x, z);
  return h;
}

// ── Sinai: Serpentinenpfad ─────────────────────────────────────────────────────────────────────
const TRAIL_FLAT = 0.42; // Halbbreite des ebenen Pfadbetts
const TRAIL_REACH = 1.2; // Auslauf des Bettes ins Gelände

/** Gleichmäßig abgetastete Mittellinie einer Polylinie (Catmull-Rom). Gelände und Pfadband nutzen dieselben Punkte. */
export function trailSamples(pts: ReadonlyArray<readonly [number, number]>, step = 0.45): [number, number][] {
  const n = pts.length;
  const out: [number, number][] = [];
  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n - 1, i + 2)];
    const len = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
    const steps = Math.max(2, Math.ceil(len / step));
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      out.push([catmull(p0[0], p1[0], p2[0], p3[0], t), catmull(p0[1], p1[1], p2[1], p3[1], t)]);
    }
  }
  out.push([pts[n - 1][0], pts[n - 1][1]]);
  return out;
}

/**
 * Wegpunkte des Gipfelpfades. Er windet sich in vier Kehren über die Südflanke. Jede Etappe läuft in x von
 * `xa` nach `xb` und steigt dabei von Höhe `ha` nach `hb`; die z-Position liefert die Geländeform selbst
 * (Höhenlinie). An den Enden schwingt der Weg in einem weiten Bogen nach außen, damit die Kehren rund werden.
 */
const TRAIL_LEGS: ReadonlyArray<{ xa: number; xb: number; ha: number; hb: number }> = [
  { xa: 0.5, xb: 6.0, ha: 0.9, hb: 2.4 },
  { xa: 6.0, xb: -5.6, ha: 4.7, hb: 7.3 },
  { xa: -5.6, xb: 4.0, ha: 9.5, hb: 12.0 },
  { xa: 4.0, xb: -3.2, ha: 13.9, hb: 15.9 },
  { xa: -3.2, xb: 0.6, ha: 17.3, hb: 19.25 },
];

let trailPts: [number, number][] | null = null;
let trailBedCache: { x: number; z: number; y: number }[] | null = null;

export function sinaiTrailPoints(): [number, number][] {
  if (trailPts) return trailPts;
  // z auf der Südflanke bei gegebenem x und gegebener Höhe (Höhe nimmt nach Süden ab)
  const zAt = (x: number, h: number) => {
    let lo = SINAI.z; // Gipfelseite (hoch)
    let hi = SINAI.z + SINAI.radius + 2; // Fuß (niedrig)
    if (baseHeight(x, lo) < h) return lo;
    for (let i = 0; i < 26; i++) {
      const mid = (lo + hi) / 2;
      if (baseHeight(x, mid) > h) lo = mid;
      else hi = mid;
    }
    return (lo + hi) / 2;
  };
  const out: [number, number][] = [];
  const legs = TRAIL_LEGS;
  legs.forEach((leg, k) => {
    const n = Math.max(3, Math.ceil(Math.abs(leg.xb - leg.xa) / 1.6));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const x = leg.xa + (leg.xb - leg.xa) * t;
      const h = leg.ha + (leg.hb - leg.ha) * t;
      out.push([x, zAt(x, h)]);
    }
    const next = legs[k + 1];
    if (next) {
      // Kehre: Bogen nach außen, z in der Mitte zwischen Etappenende und nächstem Anfang
      const dir = Math.sign(leg.xb - leg.xa);
      const zEnd = zAt(leg.xb, leg.hb);
      const zNext = zAt(next.xa, next.ha);
      out.push([leg.xb + dir * 1.05, (zEnd + zNext) / 2]);
    }
  });
  trailPts = out;
  return out;
}

function trailBed() {
  if (trailBedCache) return trailBedCache;
  const smp = trailSamples(sinaiTrailPoints());
  const raw = smp.map(([x, z]) => baseHeight(x, z));
  const W = 3;
  trailBedCache = smp.map(([x, z], i) => {
    let sum = 0;
    let c = 0;
    for (let k = -W; k <= W; k++) {
      const j = i + k;
      if (j < 0 || j >= raw.length) continue;
      sum += raw[j];
      c++;
    }
    return { x, z, y: sum / c };
  });
  return trailBedCache;
}

/** Ebnet das Gelände entlang des Gipfelpfades (Bett über die Pfadbreite, weicher Auslauf). */
function carveTrail(h: number, x: number, z: number): number {
  if (z > -198 || z < -226) return h;
  const bed = trailBed();
  const R = TRAIL_FLAT + TRAIL_REACH;
  let sw = 0;
  let sy = 0;
  let best = 0;
  for (let i = 0; i < bed.length; i++) {
    const p = bed[i];
    const dx = x - p.x;
    if (dx > R || dx < -R) continue;
    const dz = z - p.z;
    if (dz > R || dz < -R) continue;
    const d = Math.hypot(dx, dz);
    if (d >= R) continue;
    const w = ss(R, TRAIL_FLAT, d);
    sw += w;
    sy += w * p.y;
    if (w > best) best = w;
  }
  return sw > 0 ? lerp(h, sy / sw, best) : h;
}

/** Höhe der gesamten Welt (analytisch): Grundform → Pfadbett am Berg → Inselrand → Gewässer. */
export function heightAt(x: number, z: number): number {
  let h = baseHeight(x, z);
  h = carveTrail(h, x, z);

  // 8. Inselrand: immer auf y = 0 → saubere Kante für die Erdschichten
  const edge = ss(0, 1.9, Math.min(x + HALF_W, HALF_W - x, -z, z + WORLD.length));
  h = lerp(0, h, edge);

  // 9. Nil + See (schneiden durch den Rand → Wasserfall an der Ostkante)
  {
    const lk = Math.hypot((x - LAKE.x) / LAKE.rx, (z - LAKE.z) / LAKE.rz);
    const lm = ss(1.3, 0.72, lk);
    const rw = riverHalfW(x);
    const rm = ss(rw + 1.5, rw - 0.4, riverDist(x, z)) * ss(NILE_X0 - 1.5, NILE_X0 + 0.5, x);
    const m = Math.max(lm, rm);
    if (m > 0) h = lerp(h, -1.05 + (nA.at(x * 0.5, z * 0.5) - 0.5) * 0.12, m);
  }
  return h;
}

// ── Farben ─────────────────────────────────────────────────────────────────────────────────────

const _b = new Color();

/** Wasserspiegel am Ort (oder -Infinity). Für nasse Sandränder. */
function waterLevelAt(x: number, z: number): number {
  if (z < SEA.zS + 3 && z > SEA.zN - 3) return SEA.level;
  if (Math.hypot(x - OASIS.x, z - OASIS.z) < OASIS.r + 3) return OASIS.level;
  if (Math.hypot(x - SPRING.x, z - SPRING.z) < SPRING.r + 2) return SPRING.level;
  if (z > -42 && z < -14 && x > NILE_X0 - 6) return NILE_LEVEL;
  return -Infinity;
}

const STRATA = [PAL.rock, PAL.rockDark, PAL.rockLight, '#a8683f', PAL.rockPale];

export function terrainColor(cx: number, cz: number, cy: number, ny: number, out: Color): Color {
  const sand = toColor(PAL.sand);
  // Höhe: Täler satter, Kämme heller
  out.copy(toColor(PAL.sandDeep)).lerp(sand, ss(-0.9, 0.55, cy)).lerp(toColor(PAL.sandLight), ss(0.7, 2.4, cy) * 0.85);

  // Dünenwildnis: warme Täler
  const wDune = Math.max(ss(-146, -153, cz) * ss(-196, -189, cz), 0);
  if (wDune > 0) out.lerp(toColor(PAL.sandDark), (1 - ss(0.2, 1.4, cy)) * 0.25 * wDune);

  // Fruchtland am Nil
  if (cz > -52 && cz < 0) {
    const d = Math.min(riverDist(cx, cz) - riverHalfW(cx), Math.hypot((cx - LAKE.x) / LAKE.rx, (cz - LAKE.z) / LAKE.rz) * 2.8 - 2.8);
    const near = 1 - ss(0.4, 5.5, d);
    const patch = nA.fbm(cx * 0.35 + 8, cz * 0.35, 2);
    const green = near * ss(0.35, 0.6, patch);
    if (green > 0) {
      out.lerp(toColor(PAL.fertile), near * 0.55);
      out.lerp(toColor(PAL.grass), green * 0.8 * ss(4.2, 0.6, d));
    }
  }

  // Stadt: gepflasterter Platz
  const wCity = ss(-46, -50, cz) * ss(-90, -86, cz);
  if (wCity > 0) {
    const chk = (Math.floor(cx / 1.6) + Math.floor(cz / 1.6)) & 1;
    out.lerp(toColor(PAL.stone), wCity * 0.8);
    if (chk) out.lerp(toColor(PAL.stoneLight), wCity * 0.5);
  }

  // Sinai: geschichteter Fels, Sand am Fuß
  if (cz < -198) {
    const wm = ss(0.8, 3.2, cy);
    const band = Math.floor(cy / 1.5 + nR.at(cx * 0.3, cz * 0.3) * 1.6);
    _b.copy(toColor(STRATA[((band % STRATA.length) + STRATA.length) % STRATA.length]));
    _b.lerp(toColor(PAL.rockLight), ss(14, 22, cy) * 0.55);
    out.lerp(_b, wm * (0.65 + 0.35 * (1 - ny)));
  }

  // nasser Sand am Wasser
  const wl = waterLevelAt(cx, cz);
  if (wl > -100) out.lerp(toColor(PAL.wet), ss(0.5, -0.05, cy - wl) * 0.75);

  // Pfad-Schimmer
  out.lerp(toColor(PAL.path), ss(2.2, 0.8, distToPath(cx, cz)) * 0.16);
  return out;
}

// ── Gitter ─────────────────────────────────────────────────────────────────────────────────────
export class Terrain {
  readonly nx = Math.round(WORLD.width / WORLD.cell);
  readonly nz = Math.round(WORLD.length / WORLD.cell);
  readonly cellX = WORLD.width / this.nx;
  readonly cellZ = WORLD.length / this.nz;
  readonly X: Float32Array;
  readonly Z: Float32Array;
  readonly H: Float32Array;
  readonly diag: Uint8Array;

  constructor() {
    const w = this.nx + 1;
    const n = w * (this.nz + 1);
    this.X = new Float32Array(n);
    this.Z = new Float32Array(n);
    this.H = new Float32Array(n);
    this.diag = new Uint8Array(this.nx * this.nz);
    // Gitterpunkt (mit Jitter); Randpunkte bleiben exakt auf dem Rand
    const pt = (i: number, j: number): [number, number] => {
      let x = -HALF_W + i * this.cellX;
      let z = -j * this.cellZ;
      if (i > 0 && i < this.nx && j > 0 && j < this.nz) {
        x += (hash2(i, j, 1) - 0.5) * this.cellX * 0.62;
        z += (hash2(i, j, 2) - 0.5) * this.cellZ * 0.62;
      }
      return [x, z];
    };
    for (let j = 0; j <= this.nz; j++) {
      for (let i = 0; i <= this.nx; i++) {
        let [x, z] = pt(i, j);
        // Am Sinai wird das Gitter fließend vergröbert: Nachbarpunkte rücken paarweise zusammen (Dreiecke mit
        // doppelter Kantenlänge, die Zwischenzellen werden flächenlos) → große, klare Felsflächen statt Knitterfalten.
        if (i > 0 && i < this.nx && j > 0 && j < this.nz) {
          const wc = ss(-197, -205, -j * this.cellZ);
          if (wc > 0) {
            const [xc, zc] = pt(Math.round(i / 2) * 2, Math.round(j / 2) * 2);
            x = lerp(x, xc, wc);
            z = lerp(z, zc, wc);
          }
        }
        const k = j * w + i;
        this.X[k] = x;
        this.Z[k] = z;
        this.H[k] = heightAt(x, z);
      }
    }
    for (let j = 0; j < this.nz; j++) for (let i = 0; i < this.nx; i++) this.diag[j * this.nx + i] = hash2(i, j, 5) > 0.5 ? 1 : 0;
  }

  idx(i: number, j: number) {
    return j * (this.nx + 1) + i;
  }

  /** Dreiecke einer Zelle (aufwärts gewickelt). */
  cellTris(i: number, j: number): [number, number, number][] {
    const v00 = this.idx(i, j), v10 = this.idx(i + 1, j), v01 = this.idx(i, j + 1), v11 = this.idx(i + 1, j + 1);
    return this.diag[j * this.nx + i]
      ? [[v00, v10, v01], [v10, v11, v01]]
      : [[v00, v10, v11], [v00, v11, v01]];
  }

  /** Exakte Höhe der Gitteroberfläche (nicht der analytischen Funktion) – damit Objekte nicht schweben. */
  surfaceAt(x: number, z: number): number {
    const i0 = Math.floor((x + HALF_W) / this.cellX);
    const j0 = Math.floor(-z / this.cellZ);
    for (let dj = -1; dj <= 1; dj++) {
      for (let di = -1; di <= 1; di++) {
        const i = i0 + di, j = j0 + dj;
        if (i < 0 || j < 0 || i >= this.nx || j >= this.nz) continue;
        for (const [a, b, c] of this.cellTris(i, j)) {
          const ax = this.X[a], az = this.Z[a], bx = this.X[b], bz = this.Z[b], cx = this.X[c], cz = this.Z[c];
          const d = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz);
          const l1 = ((bz - cz) * (x - cx) + (cx - bx) * (z - cz)) / d;
          const l2 = ((cz - az) * (x - cx) + (ax - cx) * (z - cz)) / d;
          const l3 = 1 - l1 - l2;
          if (l1 >= -1e-4 && l2 >= -1e-4 && l3 >= -1e-4) return l1 * this.H[a] + l2 * this.H[b] + l3 * this.H[c];
        }
      }
    }
    return heightAt(x, z);
  }

  /** Terrain-Dreiecke eines z-Bereichs (Stationszone) in den Builder schreiben. */
  emitRange(b: GeoBuilder, zNorth: number, zSouth: number) {
    const c = new Color();
    const prev = b.jitter;
    b.jitter = 0.03;
    for (let j = 0; j < this.nz; j++) {
      const zc = -(j + 0.5) * this.cellZ;
      if (zc > zSouth || zc <= zNorth) continue;
      for (let i = 0; i < this.nx; i++) {
        for (const [a, bb, cc] of this.cellTris(i, j)) {
          const pa = [this.X[a], this.H[a], this.Z[a]] as const;
          const pb = [this.X[bb], this.H[bb], this.Z[bb]] as const;
          const pc = [this.X[cc], this.H[cc], this.Z[cc]] as const;
          const ux = pb[0] - pa[0], uy = pb[1] - pa[1], uz = pb[2] - pa[2];
          const vx = pc[0] - pa[0], vy = pc[1] - pa[1], vz = pc[2] - pa[2];
          const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
          const area2 = Math.hypot(nx, ny, nz);
          if (area2 < 1e-5) continue; // flächenlos (Gitter am Berg ist gröber)
          const ny1 = ny / area2;
          terrainColor((pa[0] + pb[0] + pc[0]) / 3, (pa[2] + pb[2] + pc[2]) / 3, (pa[1] + pb[1] + pc[1]) / 3, ny1, c);
          b.rawTri(pa, pb, pc, c);
        }
      }
    }
    b.jitter = prev;
  }
}

/** Liegt (x,z) im oder knapp am Wasser (Nil, See, Meer, Oase, Quelle)? Für die Objektplatzierung. */
export function nearWater(x: number, z: number, m: number): boolean {
  if (z > -46 && z < -14 && x > NILE_X0 - 1 && riverDist(x, z) < riverHalfW(x) + m) return true;
  if (Math.hypot((x - LAKE.x) / (LAKE.rx + m), (z - LAKE.z) / (LAKE.rz + m)) < 1) return true;
  if (z < SEA.zS + m && z > SEA.zN - m) return true;
  if (Math.hypot(x - OASIS.x, z - OASIS.z) < OASIS.r + m) return true;
  if (Math.hypot(x - SPRING.x, z - SPRING.z) < SPRING.r + m) return true;
  return false;
}

/** Zone → Index der Station (0–5). */
export function stationIndexAtZ(z: number): number {
  for (let i = 0; i < 6; i++) if (z <= STATION_BOUNDS[i] && z > STATION_BOUNDS[i + 1]) return i;
  return z > 0 ? 0 : 5;
}

// ── Pfadband ───────────────────────────────────────────────────────────────────────────────────
/**
 * Heller, geschwungener Abenteuerpfad: dunklerer Rand + heller Kern + Tupfenreihe in der Mitte.
 * Folgt exakt der Geländeoberfläche. `skips` sind z-Intervalle (z.B. Brücken), die ausgelassen werden.
 */
export function emitPath(b: GeoBuilder, terrain: Terrain, zNorth: number, zSouth: number, skips: [number, number][] = []) {
  // Zeilen exakt von Süd- bis Nordgrenze verteilen, damit Pfadstücke benachbarter Stationen ohne Lücke anschließen.
  const n = Math.max(1, Math.ceil((zSouth - zNorth) / 0.55));
  const rows: { z: number }[] = [];
  for (let i = 0; i <= n; i++) rows.push({ z: zSouth - (i / n) * (zSouth - zNorth) });
  const inSkip = (z: number) => skips.some(([a, c]) => z <= a && z >= c);
  const prevJ = b.jitter;
  b.jitter = 0.012;

  const layer = (half: number, lift: number, color: string) => {
    for (let r = 0; r < rows.length - 1; r++) {
      const z0 = rows[r].z, z1 = rows[r + 1].z;
      if (inSkip(z0) && inSkip(z1)) continue;
      const pts = [z0, z1].map((z) => {
        const s = pathSlope(z);
        const k = 1 / Math.sqrt(1 + s * s);
        const cx = pathX(z);
        // leichte Verengung an den Enden
        const w = half;
        const L: [number, number, number] = [cx - w * k, 0, z + w * s * k];
        const R: [number, number, number] = [cx + w * k, 0, z - w * s * k];
        L[1] = terrain.surfaceAt(L[0], L[2]) + lift;
        R[1] = terrain.surfaceAt(R[0], R[2]) + lift;
        return { L, R };
      });
      const [p0, p1] = pts;
      b.rawTri(p0.L, p0.R, p1.R, color);
      b.rawTri(p0.L, p1.R, p1.L, color);
    }
  };
  layer(PATH_HALF_WIDTH + 0.3, 0.05, PAL.pathEdge);
  layer(PATH_HALF_WIDTH, 0.085, PAL.path);

  // Tupfen in der Mitte
  for (let z = zSouth - 0.8; z > zNorth; z -= 1.45) {
    if (inSkip(z) || inSkip(z - 0.5)) continue;
    const mk = (zz: number, side: number) => {
      const s = pathSlope(zz);
      const k = 1 / Math.sqrt(1 + s * s);
      const x = pathX(zz) + side * 0.1 * k;
      return [x, terrain.surfaceAt(x, zz) + 0.115, zz - side * 0 + 0] as [number, number, number];
    };
    const a = mk(z, -1), bb = mk(z, 1), c = mk(z - 0.48, 1), d = mk(z - 0.48, -1);
    b.rawTri(a, bb, c, PAL.pathDash);
    b.rawTri(a, c, d, PAL.pathDash);
  }
  b.jitter = prevJ;
}


/**
 * Schmaler, heller Nebenpfad (Wüstenspur) entlang einer Polylinie, glatt interpoliert und an der
 * Geländeoberfläche. Enden laufen spitz aus.
 */
export function emitTrail(
  b: GeoBuilder,
  terrain: Terrain,
  pts: ReadonlyArray<readonly [number, number]>,
  width = 0.34,
  o: { color?: string; edge?: string; lift?: number; taperStart?: boolean; taperEnd?: boolean } = {},
) {
  const n = pts.length;
  if (n < 2) return;
  const samples = trailSamples(pts);
  const cum: number[] = [0];
  for (let i = 1; i < samples.length; i++) cum.push(cum[i - 1] + Math.hypot(samples[i][0] - samples[i - 1][0], samples[i][1] - samples[i - 1][1]));
  const L = cum[cum.length - 1];
  const prevJ = b.jitter;
  b.jitter = 0.012;
  const layer = (half: number, lift: number, color: string) => {
    const rows = samples.map((s, i) => {
      const a = samples[Math.max(0, i - 1)], c = samples[Math.min(samples.length - 1, i + 1)];
      let tx = c[0] - a[0], tz = c[1] - a[1];
      const tl = Math.hypot(tx, tz) || 1;
      tx /= tl;
      tz /= tl;
      const dStart = o.taperStart === false ? 99 : cum[i];
      const dEnd = o.taperEnd === false ? 99 : L - cum[i];
      const w = half * (0.25 + 0.75 * ss(0, 1.4, Math.min(dStart, dEnd)));
      const L1: [number, number, number] = [s[0] - tz * w, 0, s[1] + tx * w];
      const R1: [number, number, number] = [s[0] + tz * w, 0, s[1] - tx * w];
      L1[1] = terrain.surfaceAt(L1[0], L1[2]) + lift;
      R1[1] = terrain.surfaceAt(R1[0], R1[2]) + lift;
      return { L: L1, R: R1 };
    });
    // Gelände ist facettiert: Das Band hebt sich dort, wo eine Geländekante zwischen zwei Zeilen darüber hinausragt.
    const need = new Array<number>(rows.length).fill(0);
    for (let i = 0; i < rows.length - 1; i++) {
      const p = rows[i], q = rows[i + 1];
      let worst = 0;
      for (const u of [0.25, 0.5, 0.75]) {
        for (const v of [0.2, 0.5, 0.8]) {
          const lx = p.L[0] + (p.R[0] - p.L[0]) * u, lz = p.L[2] + (p.R[2] - p.L[2]) * u, ly = p.L[1] + (p.R[1] - p.L[1]) * u;
          const mx = q.L[0] + (q.R[0] - q.L[0]) * u, mz = q.L[2] + (q.R[2] - q.L[2]) * u, my = q.L[1] + (q.R[1] - q.L[1]) * u;
          const x = lx + (mx - lx) * v, z = lz + (mz - lz) * v, y = ly + (my - ly) * v;
          worst = Math.max(worst, terrain.surfaceAt(x, z) + lift * 0.5 - y);
        }
      }
      need[i] = Math.max(need[i], worst);
      need[i + 1] = Math.max(need[i + 1], worst);
    }
    // Anhebung glätten (Maximum im Fenster, dann Tiefpass) → ruhige Kanten statt Zacken
    const mx = need.map((_, i) => Math.max(...need.slice(Math.max(0, i - 2), i + 3)));
    rows.forEach((r, i) => {
      const k = (mx[Math.max(0, i - 1)] + 2 * mx[i] + mx[Math.min(mx.length - 1, i + 1)]) / 4;
      r.L[1] += k;
      r.R[1] += k;
    });
    for (let i = 0; i < rows.length - 1; i++) {
      const p = rows[i], q = rows[i + 1];
      b.rawTri(p.L, q.R, p.R, color);
      b.rawTri(p.L, q.L, q.R, color);
    }
  };
  layer(width + 0.12, o.lift ?? 0.04, o.edge ?? PAL.pathEdge);
  layer(width, (o.lift ?? 0.04) + 0.02, o.color ?? '#f6e6bd');
  b.jitter = prevJ;
}
