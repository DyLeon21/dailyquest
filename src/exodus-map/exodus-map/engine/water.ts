import { BufferGeometry, Float32BufferAttribute } from 'three';
import { SEA } from './layout';
import { ValueNoise, hash2, smoothstep as ss } from './rng';
import type { Terrain } from './terrain';

const noise = new ValueNoise(77);

function makeGeometry(pos: number[], depth: number[], flow: number[], shade: number[]): BufferGeometry {
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('aDepth', new Float32BufferAttribute(depth, 1));
  g.setAttribute('aFlow', new Float32BufferAttribute(flow, 2));
  g.setAttribute('aShade', new Float32BufferAttribute(shade, 1));
  g.computeVertexNormals();
  g.computeBoundingSphere();
  g.computeBoundingBox();
  return g;
}

/**
 * Wasseroberfläche aus dem Terrain-Gitter ableiten (gleiche Dreiecke, gleiche Diagonalen).
 * Dadurch ist die "Tiefe" an jedem Eckpunkt exakt Wasserspiegel – Gelände: der Uferschaum sitzt
 * auf der Kante, und flaches Wasser wird heller – ohne Tiefentextur.
 */
export function waterFromTerrain(
  t: Terrain,
  level: number,
  filter: (x: number, z: number) => boolean,
  flow?: (x: number, z: number) => [number, number],
): BufferGeometry {
  const pos: number[] = [];
  const depth: number[] = [];
  const fl: number[] = [];
  const shade: number[] = [];
  for (let j = 0; j < t.nz; j++) {
    for (let i = 0; i < t.nx; i++) {
      const v = [t.idx(i, j), t.idx(i + 1, j), t.idx(i, j + 1), t.idx(i + 1, j + 1)];
      let minH = Infinity;
      let cx = 0;
      let cz = 0;
      for (const k of v) {
        minH = Math.min(minH, t.H[k]);
        cx += t.X[k] / 4;
        cz += t.Z[k] / 4;
      }
      if (minH > level + 0.35 || !filter(cx, cz)) continue;
      for (const tri of t.cellTris(i, j)) {
        for (const k of tri) {
          const x = t.X[k];
          const z = t.Z[k];
          pos.push(x, level, z);
          depth.push(Math.max(level - t.H[k], -0.6));
          const f = flow ? flow(x, z) : [0, 0];
          fl.push(f[0], f[1]);
          shade.push(0);
        }
      }
    }
  }
  return makeGeometry(pos, depth, fl, shade);
}

// ── Wasserwände ────────────────────────────────────────────────────────────────────────────────
/** Profil einer Wasserwand: (Abstand von der Wegmitte, Höhe, Schattierung 0..1). */
const WH = SEA.wallH;
const WALL_PROFILE: ReadonlyArray<readonly [number, number, number]> = [
  [3.55, -1.8, 0.0],
  [3.4, 0.0, 0.14],
  [3.2, WH * 0.3, 0.36],
  [2.98, WH * 0.6, 0.64],
  [2.9, WH * 0.86, 0.88],
  [3.55, WH, 1.0],
  [4.7, WH - 0.3, 0.95],
  [5.8, WH * 0.64, 0.7],
  [6.5, WH * 0.27, 0.36],
  [7.1, -0.3, 0.1],
  [7.7, -1.8, 0.0],
];

/** Position der Wellenkrone einer Wasserwand bei z (für Schaumkronen aus normalen Meshes). */
export function wallCrest(side: 1 | -1, z: number, zSouth: number, zNorth: number, phase = 0) {
  const d = Math.min(zSouth - z, z - zNorth);
  const taper = 0.2 + 0.8 * ss(0, 4.2, d);
  const hs = taper * (0.9 + 0.1 * Math.sin(z * 0.8 + phase));
  const wob = (noise.at(z * 0.35 + phase, side * 3.1) - 0.5) * 0.35;
  return { x: side * (4.1 + wob), y: SEA.wallH * hs - 0.04, hs };
}

/**
 * Eine hohe, leicht überhängende Wasserwand. `side` = +1 (Osten) oder -1 (Westen).
 * zSouth/zNorth: Anfang/Ende entlang des Weges. Die Enden laufen flach aus.
 */
export function buildWaterWall(side: 1 | -1, zSouth: number, zNorth: number, phase = 0): BufferGeometry {
  const pos: number[] = [];
  const shade: number[] = [];
  const flow: number[] = [];
  const steps = Math.round((zSouth - zNorth) / 1.0);
  const len = zSouth - zNorth;

  const slice = (k: number) => {
    const z = zSouth - (k / steps) * len;
    const d = Math.min(zSouth - z, z - zNorth);
    const taper = 0.2 + 0.8 * ss(0, 4.2, d);
    const hs = taper * (0.9 + 0.1 * Math.sin(z * 0.8 + phase));
    const wob = (noise.at(z * 0.35 + phase, side * 3.1) - 0.5) * 0.35;
    return WALL_PROFILE.map(([s, y, sh]) => {
      const yy = y > 0 ? y * hs : y;
      const ss2 = s + wob * (y > 0 ? 1 : 0.3);
      return { p: [side * ss2, yy, z] as [number, number, number], sh };
    });
  };

  const ref = (z: number): [number, number, number] => [side * 5.3, 1.0, z];
  const emit = (a: number[], b: number[], c: number[], sa: number, sb: number, sc: number, out: [number, number, number]) => {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
    const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const dir = [(a[0] + b[0] + c[0]) / 3 - out[0], (a[1] + b[1] + c[1]) / 3 - out[1], (a[2] + b[2] + c[2]) / 3 - out[2]];
    const flip = nx * dir[0] + ny * dir[1] + nz * dir[2] < 0;
    const order = flip ? [a, c, b] : [a, b, c];
    const sh = flip ? [sa, sc, sb] : [sa, sb, sc];
    order.forEach((p, i) => {
      pos.push(p[0], p[1], p[2]);
      shade.push(sh[i]);
      flow.push(side, 0);
    });
  };

  let prev = slice(0);
  for (let k = 1; k <= steps; k++) {
    const cur = slice(k);
    for (let i = 0; i < WALL_PROFILE.length - 1; i++) {
      const a = prev[i], b = prev[i + 1], c = cur[i + 1], d = cur[i];
      const o = ref((a.p[2] + c.p[2]) / 2);
      emit(a.p, b.p, c.p, a.sh, b.sh, c.sh, o);
      emit(a.p, c.p, d.p, a.sh, c.sh, d.sh, o);
    }
    prev = cur;
  }
  // Abschlusskappen (Süd/Nord)
  for (const [k, zDir] of [[0, 1], [steps, -1]] as const) {
    const s = slice(k);
    const cen: [number, number, number] = [side * 5.3, 0.2, s[0].p[2]];
    const out: [number, number, number] = [cen[0], cen[1], cen[2] - zDir * 6];
    for (let i = 0; i < s.length - 1; i++) emit(cen, s[i].p, s[i + 1].p, 0.2, s[i].sh, s[i + 1].sh, out);
    emit(cen, s[s.length - 1].p, s[0].p, 0.2, 0, 0, out);
  }
  return makeGeometry(pos, new Array(pos.length / 3).fill(0), flow, shade);
}

// ── Wasserfall ─────────────────────────────────────────────────────────────────────────────────
/** Senkrechtes Wasserband, das an der Ostkante ins Leere stürzt. */
export function buildWaterfall(xLip: number, zCenter: number, halfWidth: number, topY: number, length: number): BufferGeometry {
  const pos: number[] = [];
  const flow: number[] = [];
  const cols = 6;
  const rows = 12;
  const P = (c: number, r: number) => {
    const d = (r / rows) * length;
    const across = (c / cols) * 2 - 1; // -1 … 1
    const hw = halfWidth * (1 + 0.28 * (d / length));
    const wobble = (hash2(c, r, 3) - 0.5) * 0.12;
    const x = xLip + 0.55 * (1 - Math.exp(-d / 1.8)) + wobble;
    return { p: [x, topY - d, zCenter + across * hw] as [number, number, number], f: [across, d] as [number, number] };
  };
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const a = P(c, r), b = P(c + 1, r), cc = P(c + 1, r + 1), d = P(c, r + 1);
      // Normale zeigt nach +x
      for (const q of [[a, d, cc], [a, cc, b]]) {
        for (const v of q) {
          pos.push(...v.p);
          flow.push(...v.f);
        }
      }
    }
  }
  return makeGeometry(pos, new Array(pos.length / 3).fill(0), flow, new Array(pos.length / 3).fill(0));
}
