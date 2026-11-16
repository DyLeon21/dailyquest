import { BufferGeometry, Color } from 'three';
import { GeoBuilder, toColor } from './GeoBuilder';
import { HALF_W, WORLD } from './layout';
import { ValueNoise, hash2, lerp } from './rng';
import type { Terrain } from './terrain';

/**
 * Der schwebende Erdkörper unter der Karte: kantige, geschichtete Erdschichten, die sich nach unten
 * zu einem gezackten Kiel verjüngen. Oben schließt er exakt an die Terrain-Randpunkte an.
 *
 * Aufbau (Ring = geschlossene Schleife um den Rand, gegen den Uhrzeigersinn von oben):
 *  Reihe 0  Terrainkante (fein)         – Sandkante
 *  Reihe 1  Lippe darunter (fein)
 *  Reihe 2… grobe Ringe (jeder 4. Punkt), nach innen versetzt und tiefer → große, kantige Facetten
 */

const noise = new ValueNoise(91);

// Schichten von oben nach unten: [Tiefe bis, Farbe]
const LAYERS: ReadonlyArray<readonly [number, string]> = [
  [0.5, '#f1d594'], // Sandkante
  [2.0, '#e1aa60'], // Sandstein
  [3.7, '#c98046'], // oranger Ton
  [5.5, '#a7623c'], // Rotbraun
  [7.4, '#85503a'], // Braun
  [9.2, '#6c544a'], // Graubraun
  [99, '#4e3f3d'], // dunkler Kern
];

function strataColor(x: number, y: number, z: number, out: Color): Color {
  const d = -y + (noise.at(x * 0.35 + z * 0.12, z * 0.35 - x * 0.2) - 0.5) * 1.5;
  let i = 0;
  while (i < LAYERS.length - 1 && d > LAYERS[i][0]) i++;
  out.copy(toColor(LAYERS[i][1]));
  // dünne helle Bänder
  const f = (d * 1.25) % 1;
  if (i > 0 && (f < 0.14 || (f > 0.5 && f < 0.56))) out.multiplyScalar(1.09);
  return out;
}

const ROWS_INSET = [0, 0, 0.12, 0.75, 1.7, 2.9, 4.0, 4.9];
const ROWS_DEPTH = [0, 0.45, 1.55, 3.1, 4.9, 6.7, 8.5, 10.3];

export function buildDioramaBody(terrain: Terrain): BufferGeometry {
  const b = new GeoBuilder(5);
  b.jitter = 0.035;
  const { nx, nz } = terrain;

  // geschlossene Randschleife
  const loop: number[] = [];
  for (let i = 0; i < nx; i++) loop.push(terrain.idx(i, 0));
  for (let j = 0; j < nz; j++) loop.push(terrain.idx(nx, j));
  for (let i = nx; i > 0; i--) loop.push(terrain.idx(i, nz));
  for (let j = nz; j > 0; j--) loop.push(terrain.idx(0, j));
  const N = loop.length;

  const cz = -WORLD.length / 2;
  const topX = (k: number) => terrain.X[loop[k % N]];
  const topZ = (k: number) => terrain.Z[loop[k % N]];
  const topY = (k: number) => terrain.H[loop[k % N]];

  type P = [number, number, number];
  const fine = (k: number, row: number): P => {
    const x = topX(k), z = topZ(k), y = topY(k) - ROWS_DEPTH[row];
    return [x, y, z];
  };
  /** Grobe Ringpunkte: nach innen versetzt, tiefer, mit kräftigem Zufall → kantiger Fels. */
  const coarseCache = new Map<string, P>();
  const coarse = (k: number, row: number): P => {
    const kk = k % N;
    const key = `${kk}_${row}`;
    const hit = coarseCache.get(key);
    if (hit) return hit;
    const ins = ROWS_INSET[row] * (1 + (hash2(kk, row, 11) - 0.5) * 0.55);
    const fx = (HALF_W - ins) / HALF_W;
    const fz = (WORLD.length / 2 - ins) / (WORLD.length / 2);
    const x = topX(kk) * fx;
    const z = cz + (topZ(kk) - cz) * fz;
    const amp = 0.15 + row * 0.1;
    let y = topY(kk) - ROWS_DEPTH[row] + (hash2(kk, row, 12) - 0.5) * amp * 2.4;
    // letzter Ring: gezackte Zapfen
    if (row === ROWS_DEPTH.length - 1) y -= hash2(kk, row, 13) > 0.45 ? hash2(kk, row, 14) * 3.2 : 0;
    const p: P = [x + (hash2(kk, row, 15) - 0.5) * amp, y, z + (hash2(kk, row, 16) - 0.5) * amp];
    coarseCache.set(key, p);
    return p;
  };

  const c = new Color();
  const paint = (a: P, bb: P, cc: P) => {
    strataColor((a[0] + bb[0] + cc[0]) / 3, (a[1] + bb[1] + cc[1]) / 3, (a[2] + bb[2] + cc[2]) / 3, c);
    return c;
  };
  const tri = (a: P, bb: P, cc: P) => b.rawTri(a, bb, cc, paint(a, bb, cc));
  const quad = (a: P, bb: P, cc: P, d: P) => {
    tri(a, bb, cc);
    tri(a, cc, d);
  };

  // Reihe 0 → 1 (feine Lippe)
  for (let k = 0; k < N; k++) {
    const t0 = fine(k, 0), t1 = fine(k + 1, 0), l0 = fine(k, 1), l1 = fine(k + 1, 1);
    quad(l0, l1, t1, t0);
  }

  // Reihe 1 → 2 (Reißverschluss fein → grob)
  const STEP = 4;
  const starts: number[] = [];
  for (let s = 0; s < N; s += STEP) starts.push(s);
  const nextOf = (g: number) => (g + 1 < starts.length ? starts[g + 1] : N);
  for (let g = 0; g < starts.length; g++) {
    const s = starts[g];
    const e = nextOf(g);
    const m = e - s;
    const A = coarse(s, 2), B = coarse(e, 2);
    const F: P[] = [];
    for (let t = 0; t <= m; t++) F.push(fine(s + t, 1));
    const h = Math.ceil(m / 2);
    for (let t = 0; t < h; t++) tri(A, F[t + 1], F[t]);
    tri(A, B, F[h]);
    for (let t = h; t < m; t++) tri(B, F[t + 1], F[t]);
  }

  // grobe Ringe
  for (let row = 2; row < ROWS_DEPTH.length - 1; row++) {
    for (let g = 0; g < starts.length; g++) {
      const s = starts[g], e = nextOf(g);
      quad(coarse(s, row + 1), coarse(e, row + 1), coarse(e, row), coarse(s, row));
    }
  }

  // Boden schließen (nur für Schatten/Randfälle) – grober Fächer zur Mittelachse
  const last = ROWS_DEPTH.length - 1;
  const midY = Math.min(...starts.map((s) => coarse(s, last)[1])) - 0.5;
  for (let g = 0; g < starts.length; g++) {
    const s = starts[g], e = nextOf(g);
    const a = coarse(s, last), bb = coarse(e, last);
    const mid = (p: P): P => [p[0] * 0.2, midY, cz + (p[2] - cz) * 0.98];
    b.rawTri(a, mid(a), bb, '#4e3f3d');
    b.rawTri(bb, mid(a), mid(bb), '#4e3f3d');
  }
  void lerp;
  return b.toGeometry();
}
