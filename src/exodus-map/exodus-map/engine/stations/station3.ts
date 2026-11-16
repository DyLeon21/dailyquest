import { PAL } from '../../config';
import { STATION_Z, pathX } from '../layout';
import { emitPath, emitTrail } from '../terrain';
import {
  acacia, banner, basket, bedroll, bush, butte, camel, campfire, cart, crate, jar, rockCluster, sack, sheep, tentGable,
  tentRound,
} from '../props';
import { Placer, platform } from './common';
import type { StationContext } from './common';

/**
 * Station 3 – Der Auszug aus Ägypten (2. Mose 12–13)
 * Hinter dem Nordtor der Stadt beginnt die Wüste. Rund um die Station lagert die Karawane:
 * Zelte, Feuerstellen, Gepäck, Wagen, Kamele und Schafe, die nach Norden aufbrechen.
 * Vor dem Volk steht die Wolkensäule (siehe effects.ts → cloudPillar). Helle Nebenspuren führen zu den Zelten.
 */
export function buildStation3(ctx: StationContext) {
  const { b, terrain: T } = ctx;
  const P = new Placer(ctx, 3);
  const R = P.rand;

  T.emitRange(b, ctx.zNorth, ctx.zSouth);
  emitPath(b, T, ctx.zNorth, ctx.zSouth);

  const markerZ = STATION_Z[2];
  platform(ctx, markerZ);
  P.reserve(pathX(markerZ), markerZ, 2.6);

  // ── Wüstenspuren ──────────────────────────────────────────────────────────
  emitTrail(b, T, [[1.4, -90.6], [3.0, -92.4], [3.9, -94.6]], 0.3);
  emitTrail(b, T, [[2.0, -99.6], [2.6, -102.8], [3.0, -106.4], [2.8, -110.4], [2.6, -113.6]], 0.3);
  emitTrail(b, T, [[-3.7, -98.0], [-5.0, -98.6], [-5.8, -100.2]], 0.28);
  emitTrail(b, T, [[-1.4, -105.4], [-2.6, -107.0], [-3.2, -109.4], [-4.0, -112.6]], 0.28);

  // ── Zelte ─────────────────────────────────────────────────────────────────
  const C = PAL;
  const tents: [number, number, number, 'g' | 'r', string, string][] = [
    [2.9, -94.6, 0.5, 'g', C.tentCream, C.cloth[0]],
    [4.9, -98.8, 2.2, 'r', C.tentTan, C.tentBrown],
    [1.7, -102.3, -0.4, 'g', C.tentTan, C.cloth[1]],
    [-6.4, -94.2, 0.4, 'r', C.tentCream, C.tentBrown],
    [-6.8, -99.4, 0.9, 'g', C.tentCream, C.cloth[2]],
    [-5.8, -104.4, 0.1, 'r', C.tentTan, C.tentBrown],
    [7.2, -93.2, -0.3, 'g', C.tentTan, C.cloth[0]],
  ];
  for (const [x, z, rot, kind, col, accent] of tents) {
    P.reserve(x, z, kind === 'g' ? 2.2 : 1.9);
    if (kind === 'g') b.place(x, z, rot, () => tentGable(b, 2.5, 1.5, 2.2, col, accent), 0.1);
    else b.place(x, z, rot, () => tentRound(b, 1.4, 1.8, col, accent), 0.1);
  }

  // ── Feuerstellen ──────────────────────────────────────────────────────────
  for (const [x, z] of [[0.7, -98.0], [-5.0, -100.8]] as const) {
    b.place(x, z, 0, () => {
      b.scale(1.25);
      campfire(b);
    }, 0.04);
    P.reserve(x, z, 1.0);
    ctx.fires.push([x, ctx.ground(x, z) + 0.5, z]);
    // Sitzbaumstämme
    for (const a of [0.8, 2.6, 4.4]) {
      b.place(x + Math.cos(a) * 1.15, z + Math.sin(a) * 1.15, a + 1.57, () => b.box(0.7, 0.2, 0.2, PAL.woodDark, { top: '#7e5530', ao: 0.1 }), 0.02);
    }
  }

  // ── Gepäck, Vorräte ───────────────────────────────────────────────────────
  const luggage: [number, number][] = [[3.9, -96.4], [0.6, -102.6], [-4.9, -93.2], [-7.6, -97.2], [-4.4, -105.4], [6.3, -95.6], [2.0, -92.6]];
  for (const [x, z] of luggage) {
    b.place(x, z, R() * 6, () => {
      b.scale(1.3);
      sack(b, 1.1);
      b.translate(0.42, 0, 0.1);
      jar(b, 1.2);
      b.translate(-0.8, 0, 0.36);
      if (R() > 0.5) crate(b, 1);
      else basket(b, 1.1);
    }, 0.02);
    P.reserve(x, z, 0.9);
  }
  // Schlafrollen neben den Zelten
  for (const [x, z, rot] of [[1.7, -100.4, 0.5], [4.6, -96.9, 1.2], [-6.5, -97.6, 2.1], [-6.0, -102.4, 0.3]] as const) {
    b.place(x, z, rot, () => bedroll(b, PAL.cloth[Math.floor(R() * 4)]), 0.02);
  }
  // Brotkorb mit ungesäuertem Brot (Passah)
  b.place(0.0, -96.4, 0.3, () => {
    basket(b, 1.2);
    b.translate(0, 0.2, 0);
    for (let i = 0; i < 3; i++) {
      b.push();
      b.translate((i - 1) * 0.05, i * 0.03, 0);
      b.frustum(0.2, 0.2, 0.03, 8, '#f0d49a', { top: '#f7e2b0', ao: 0, jitter: 0.03 });
      b.pop();
    }
  }, 0.02);

  // ── Wagen mit Gepäck ──────────────────────────────────────────────────────
  for (const [x, z, rot] of [[4.2, -91.4, 1.7], [-7.4, -90.8, 1.4]] as const) {
    b.place(x, z, rot, () => {
      b.scale(1.25);
      cart(b);
    }, 0.04);
    P.reserve(x, z, 1.7);
  }

  // ── Karawane bricht nach Norden auf ───────────────────────────────────────
  const camels: [number, number, number, boolean][] = [
    [-3.6, -107.6, Math.PI / 2 + 0.1, true],
    [-4.5, -110.4, Math.PI / 2 - 0.06, true],
    [-5.3, -113.2, Math.PI / 2 + 0.12, false],
  ];
  for (const [x, z, rot, loaded] of camels) {
    b.place(x, z, rot, () => {
      b.scale(1.25);
      camel(b, loaded);
    }, 0.04);
    P.reserve(x, z, 1.5);
  }
  // Schafherde
  let sheepCount = 0;
  for (let i = 0; i < 80 && sheepCount < 13; i++) {
    const x = -8.4 + R() * 3.0;
    const z = -106.0 - R() * 8.6;
    if (!P.free(x, z, 0.7) || x < -9.0) continue;
    P.reserve(x, z, 0.7);
    b.place(x, z, Math.PI / 2 + (R() - 0.5) * 1.1, () => {
      b.scale(1.45);
      sheep(b);
    }, 0.02);
    sheepCount++;
  }

  // ── Fahnen am Lagereingang ────────────────────────────────────────────────
  b.place(pathX(-91.6) + 2.1, -91.6, 0, () => banner(b, 2.5, PAL.cloth[0]), 0.05);
  b.place(pathX(-91.6) - 2.1, -91.6, 0, () => banner(b, 2.5, PAL.cloth[1]), 0.05);

  // ── Wüste: Felsen, Akazien, Büsche, kleine Tafelberge ─────────────────────
  P.many(6, { x0: -9.3, x1: 9.3, z0: -90, z1: -114 }, 0.8, { tries: 60, maxSlope: 0.6 }, (x, z) => b.place(x, z, R() * 6, () => rockCluster(b, 0.55 + R() * 0.5), 0.05));
  P.many(5, { x0: -9.3, x1: 9.3, z0: -91, z1: -114 }, 1.1, { tries: 60, maxSlope: 0.45 }, (x, z) => b.place(x, z, R() * 6, () => acacia(b, 0.85 + R() * 0.35), 0.05));
  P.many(5, { x0: -9.3, x1: 9.3, z0: -90, z1: -114 }, 0.5, { tries: 40, maxSlope: 0.5 }, (x, z) => b.place(x, z, R() * 6, () => bush(b, 0.65 + R() * 0.35, '#8aa94a'), 0.05));
  for (const [x, z, w, h] of [[-8.2, -115.0, 2.4, 2.6], [8.2, -89.4, 2.0, 2.0]] as const) {
    P.reserve(x, z, w * 0.8);
    b.place(x, z, R() * 6, () => butte(b, w, w * 0.8, h, 4), 0.2);
  }

  // Steinhaufen (Wegzeichen) am Pfadrand
  for (const z of [-108.4, -112.6]) {
    const x = pathX(z) - 1.9;
    b.place(x, z, 0, () => {
      for (let i = 0; i < 3; i++) {
        b.push();
        b.translate(0, i * 0.2, 0);
        b.rock(0.34 - i * 0.08, 0.14, 0.32 - i * 0.07, 0, 0.18, PAL.rockLight, { top: PAL.rockPale });
        b.pop();
      }
    }, 0.05);
  }
}
