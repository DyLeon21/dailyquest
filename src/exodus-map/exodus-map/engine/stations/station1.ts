import { PAL } from '../../config';
import {
  HALF_W, LAKE, NILE_LEVEL, NILE_X0, STATION_Z, distToPath, pathX, riverDist, riverHalfW, riverU, riverZ,
} from '../layout';
import { buildWaterfall, waterFromTerrain } from '../water';
import { emitPath } from '../terrain';
import {
  acacia, banner, basket, brickStack, bush, bedroll, crate, jar, mudHouse, obelisk, palm, pyramid, reeds, rockCluster, sack,
} from '../props';
import { Placer, addWater, platform } from './common';
import type { StationContext } from './common';

/**
 * Station 1 – Israel in Ägypten (2. Mose 1–4)
 * Nil mit See und Wasserfall, Brücke, Dorf aus Lehmziegelhäusern, Ziegelei, brennender Dornbusch,
 * Moses' Körbchen im Schilf, Palmen, Obelisken und Pyramiden im Hintergrund.
 */
export function buildStation1(ctx: StationContext) {
  const { b, terrain: T } = ctx;
  const P = new Placer(ctx, 1);
  const R = P.rand;

  T.emitRange(b, ctx.zNorth, ctx.zSouth);

  // Brückenspanne bestimmen (wo der Pfad den Nil kreuzt)
  let bz0 = 0;
  let bz1 = 0;
  for (let z = -18; z > -38; z -= 0.05) {
    const x = pathX(z);
    const inside = riverDist(x, z) < riverHalfW(x) + 0.55;
    if (inside && bz0 === 0) bz0 = z;
    if (inside) bz1 = z;
  }
  emitPath(b, T, ctx.zNorth, ctx.zSouth, [[bz0 + 0.35, bz1 - 0.35]]);

  // Marker-Plattform
  platform(ctx, STATION_Z[0]);
  P.reserve(pathX(STATION_Z[0]), STATION_Z[0], 2.4);

  // ── Brücke ────────────────────────────────────────────────────────────────
  {
    const xa = pathX(bz0 + 0.35), za = bz0 + 0.35;
    const xb = pathX(bz1 - 0.35), zb = bz1 - 0.35;
    const len = Math.hypot(xa - xb, za - zb);
    const ang = Math.atan2(xa - xb, za - zb);
    const mx = (xa + xb) / 2, mz = (za + zb) / 2;
    const deckY = 0.46;
    b.place(mx, mz, ang, () => {
      // Pfeiler / Auflager
      for (const s of [-1, 1]) {
        b.push();
        b.translate(0, 0, s * (len / 2 - 0.15));
        b.box(2.1, 0.7, 0.9, PAL.stoneDark, { top: PAL.stone, ao: 0.15 });
        b.pop();
      }
      b.push();
      b.translate(0, deckY - 0.12, 0);
      // Bohlen
      const planks = Math.round(len / 0.34);
      for (let i = 0; i < planks; i++) {
        b.push();
        b.translate(0, 0, -len / 2 + (i + 0.5) * (len / planks));
        b.box(1.9, 0.12, len / planks - 0.03, i % 2 ? PAL.wood : '#9a6a3c', { top: '#b07a46', ao: 0, jitter: 0.05 });
        b.pop();
      }
      // Geländer
      for (const sx of [-1, 1]) {
        b.push();
        b.translate(sx * 0.92, 0.12, 0);
        b.box(0.07, 0.07, len, PAL.woodDark, { ao: 0 });
        b.translate(0, 0.28, 0);
        b.box(0.08, 0.08, len, PAL.wood, { ao: 0 });
        for (let k = 0; k <= 4; k++) {
          b.push();
          b.translate(0, -0.28, -len / 2 + 0.2 + (k / 4) * (len - 0.4));
          b.box(0.09, 0.42, 0.09, PAL.woodDark, { ao: 0 });
          b.pop();
        }
        b.pop();
      }
      b.pop();
    }, 0, 0);
  }

  // ── Nil: Wasser + Wasserfall ──────────────────────────────────────────────
  const river = waterFromTerrain(
    T,
    NILE_LEVEL,
    (x, z) => z < -12 && z > -47 && x > -11.5,
    (x, z) => [x < NILE_X0 ? x - NILE_X0 : riverU(x), z - riverZ(x)],
  );
  addWater(ctx, 'river', river, 1);
  addWater(ctx, 'fall', buildWaterfall(HALF_W, riverZ(HALF_W - 0.1), riverHalfW(HALF_W) * 0.95, NILE_LEVEL, 11), 2);

  // ── Dorf: Lehmziegelhäuser ────────────────────────────────────────────────
  const houses: [number, number, number, number, number, number, Partial<Parameters<typeof mudHouse>[1]>][] = [
    [-7.4, -6.2, 0.3, 2.2, 1.8, 1.3, { stair: true }],
    [-4.9, -10.8, -0.25, 1.8, 1.6, 1.1, { second: true }],
    [-8.0, -12.8, 0.45, 2.4, 2.0, 1.4, {}],
    [-5.6, -16.4, 0.15, 1.9, 1.7, 1.2, { dome: true }],
    [-8.4, -19.2, -0.35, 2.0, 1.8, 1.2, { second: true }],
    [6.6, -4.6, -0.4, 2.2, 1.8, 1.3, {}],
    [7.9, -10.2, 0.2, 2.0, 1.8, 1.2, { stair: true }],
    [5.7, -13.6, -0.1, 1.9, 1.6, 1.1, { dome: true }],
    [8.0, -16.6, 0.4, 2.3, 2.0, 1.4, { second: true }],
  ];
  for (const [x, z, rot, w, d, h, o] of houses) {
    P.reserve(x, z, Math.max(w, d) * 0.75);
    b.place(x, z, rot, () => mudHouse(b, { w, d, h, ...o }), 0.12);
  }
  // Höfe: Krüge, Säcke, Körbe, Matten
  for (const [x, z] of [[-6.2, -8.6], [-6.8, -14.6], [7.0, -7.6], [6.9, -14.6], [-3.9, -13.6]] as const) {
    b.place(x, z, R() * 6, () => {
      jar(b, 1.1);
      b.translate(0.4, 0, 0.15);
      sack(b, 1);
      b.translate(-0.8, 0, 0.3);
      basket(b, 1);
    });
    P.reserve(x, z, 1.1);
  }
  b.place(-4.1, -21.8, 0, () => {
    b.frustum(0.55, 0.55, 0.45, 8, PAL.stoneDark, { alt: PAL.stone, ao: 0.2 }); // Brunnen
    b.translate(0, 0.45, 0);
    b.frustum(0.38, 0.38, 0.02, 8, '#2fa6b3', { ao: 0 });
    for (const s of [-1, 1]) {
      b.push();
      b.translate(s * 0.5, 0, 0);
      b.box(0.07, 1.0, 0.07, PAL.woodDark, { ao: 0 });
      b.pop();
    }
    b.translate(0, 1.0, 0);
    b.box(1.3, 0.07, 0.1, PAL.wood, { ao: 0 });
  });
  P.reserve(-4.1, -21.8, 1.2);

  // ── Ziegelei (Fronarbeit): Stapel, Lehmgrube, Stroh ───────────────────────
  for (const [x, z, rot, rows] of [[4.9, -20.0, 0.15, 5], [6.3, -20.4, -0.1, 4], [7.6, -19.8, 0.2, 5], [5.4, -18.1, 0.0, 3], [3.7, -18.8, 0.3, 4]] as const) {
    b.place(x, z, rot, () => brickStack(b, rows, 4), 0.04);
    P.reserve(x, z, 1.0);
  }
  b.place(8.4, -19.2, 0, () => {
    b.scale(1, 0.5, 1);
    b.blob(0.6, 0.5, 0.6, 1, '#e3c25c', { jitter: 0.08, ao: 0.2 }); // Strohhaufen
  });
  b.place(3.4, -15.6, 0, () => b.frustum(0.8, 0.8, 0.04, 8, '#8b6338', { ao: 0, jitter: 0.04 }), -0.02); // Lehmgrube

  // ── Brennender Dornbusch (2. Mose 3) ──────────────────────────────────────
  b.place(-1.6, -5.6, 0.5, () => {
    bush(b, 0.9, '#7a9e46');
    for (const [h, r, col, ox, oz] of [[0.95, 0.28, '#f2862f', 0, 0], [0.7, 0.2, '#f7b53a', 0.18, 0.1], [0.55, 0.15, '#fbe07a', -0.16, -0.08], [0.8, 0.2, '#f26a2a', -0.05, 0.2]] as const) {
      b.push();
      b.translate(ox, 0.25, oz);
      b.frustum(r, 0, h, 5, col, { ao: 0, jitter: 0.03, sway: (_x, y) => 2.4 * (y / h) });
      b.pop();
    }
  });
  P.reserve(-1.6, -5.6, 1.4);

  // ── Moses' Körbchen im Schilf ─────────────────────────────────────────────
  {
    const x = 6.6;
    const z = riverZ(x) + riverHalfW(x) - 0.55;
    b.place(x, z, 0.4, () => {
      basket(b, 1.0);
    }, 0, NILE_LEVEL + 0.02);
    for (const dx of [-0.5, 0.5, 0.9]) b.place(x + dx, z + 0.45, R() * 6, () => reeds(b, 4, 1.5), 0.05);
  }

  // ── Schilf entlang der Ufer ───────────────────────────────────────────────
  for (let x = -6; x < 9.5; x += 1.15) {
    for (const side of [-1, 1]) {
      if (R() > 0.55) continue;
      const hw = riverHalfW(x);
      const z = riverZ(x) + side * (hw + 0.3 + R() * 0.5);
      if (T.surfaceAt(x, z) < NILE_LEVEL + 0.1) continue;
      b.place(x, z, R() * 6, () => reeds(b, 4 + Math.floor(R() * 3), 1.3 + R() * 0.6), 0.1);
    }
  }
  // Schilf am See
  for (let a = 0; a < 6.28; a += 0.5) {
    if (R() > 0.7) continue;
    const x = LAKE.x + Math.cos(a) * (LAKE.rx + 0.2);
    const z = LAKE.z + Math.sin(a) * (LAKE.rz + 0.2);
    if (Math.abs(x) > 9.2 || T.surfaceAt(x, z) < NILE_LEVEL + 0.1) continue;
    b.place(x, z, R() * 6, () => reeds(b, 4, 1.5), 0.1);
  }

  // ── Pyramiden & Obelisken im Hintergrund ──────────────────────────────────
  P.reserve(-5.4, -44.5, 6);
  b.place(-5.4, -44.5, 0.04, () => pyramid(b, 9.6, 9.4), 0.35);
  P.reserve(6.4, -41.5, 4);
  b.place(6.4, -41.6, -0.05, () => pyramid(b, 6.2, 5.8), 0.3);
  P.reserve(8.3, -49, 2);
  b.place(8.3, -48.8, 0.1, () => pyramid(b, 3.0, 2.8, { slabs: 6 }), 0.2);
  b.place(-9.0, -34.5, 0.3, () => pyramid(b, 2.2, 2.0, { slabs: 4 }), 0.2);
  for (const [x, z] of [[-0.7, -36.6], [3.4, -36.2]] as const) {
    b.place(x, z, 0, () => obelisk(b, 3.5, 0.62), 0.1);
    P.reserve(x, z, 1.2);
  }
  // Ruinenblöcke
  for (let i = 0; i < 10; i++) {
    const p = P.find({ x0: -9, x1: 9, z0: -36, z1: -48 }, 0.7, { maxSlope: 0.4 });
    if (!p) continue;
    b.place(p[0], p[1], R() * 6, () => {
      const w = 0.4 + R() * 0.6;
      b.box(w, 0.3 + R() * 0.5, w * (0.7 + R() * 0.6), pick3(R), { top: PAL.stoneLight, jitter: 0.06 });
      if (R() > 0.5) {
        b.translate(0.45, 0, 0.2);
        b.rotateY(R());
        b.box(0.35, 0.25, 0.4, PAL.stone, { top: PAL.stoneLight });
      }
    }, 0.06);
  }

  // ── Palmen: dicht am Wasser, locker im Dorf ───────────────────────────────
  const nearRiver = { x0: -9.5, x1: 9.5, z0: -14, z1: -42 };
  P.many(26, nearRiver, 0.7, { waterGap: 0.5, tries: 50 }, (x, z) => {
    const d = riverDist(x, z) - riverHalfW(x);
    if (d > 6.5 && R() > 0.25) return; // meist am Ufer
    b.place(x, z, 0, () => palm(b, 0.85 + R() * 0.5), 0.1);
  });
  P.many(14, { x0: -9.5, x1: 9.5, z0: -1, z1: -22 }, 0.7, { waterGap: 0.8, tries: 40 }, (x, z) => {
    b.place(x, z, 0, () => palm(b, 0.8 + R() * 0.45), 0.1);
  });
  P.many(7, { x0: -9.5, x1: 9.5, z0: -1, z1: -36 }, 0.5, {}, (x, z) => b.place(x, z, R() * 6, () => bush(b, 0.7 + R() * 0.5, pick2(R)), 0.05));
  P.many(5, { x0: -9.5, x1: 9.5, z0: -1, z1: -24 }, 0.9, {}, (x, z) => b.place(x, z, R() * 6, () => rockCluster(b, 0.6 + R() * 0.4), 0.05));
  P.many(2, { x0: -9.5, x1: 9.5, z0: -22, z1: -34 }, 0.9, {}, (x, z) => b.place(x, z, R() * 6, () => acacia(b, 0.9), 0.05));

  // Start: kleine Fahne am Anfang des Pfades
  b.place(pathX(-3.2) + 1.8, -3.2, 0, () => banner(b, 2.2, PAL.cloth[1]), 0.05);
  b.place(pathX(-3.2) - 1.8, -3.2, 0, () => banner(b, 2.2, PAL.cloth[2]), 0.05);
  void crate;
  void bedroll;
  void distToPath;
}

const pick3 = (R: () => number) => [PAL.stone, '#dcc08c', PAL.stoneDark][Math.floor(R() * 3)];
const pick2 = (R: () => number) => [PAL.bush, PAL.grassDark, '#86b552'][Math.floor(R() * 3)];
