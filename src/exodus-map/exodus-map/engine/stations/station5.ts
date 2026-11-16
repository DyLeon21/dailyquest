import { PAL } from '../../config';
import type { GeoBuilder } from '../GeoBuilder';
import { OASIS, SPRING, STATION_Z, pathX } from '../layout';
import { emitPath, emitTrail } from '../terrain';
import {
  acacia, banner, basket, bedroll, bush, butte, campfire, crate, jar, palm, reeds, rockCluster, sack, sheep, spire,
  tentGable, tentRound,
} from '../props';
import { buildWaterfall, waterFromTerrain } from '../water';
import { Placer, addWater, platform } from './common';
import type { StationContext } from './common';

/** Manna: kleine, helle Plättchen wie Reif auf dem Sand (2. Mose 16). */
function manna(b: GeoBuilder) {
  b.frustum(0.07 + b.rand() * 0.04, 0.05, 0.015, 6, '#fffaf0', { ao: 0, jitter: 0.03, rot: b.rand() * 6, top: '#ffffff' });
}

/** Wachtel: kleiner, runder Vogel (ohne Gesicht). */
function quail(b: GeoBuilder) {
  b.push();
  b.translate(0, 0.1, 0);
  b.scale(1.15, 0.9, 0.9);
  b.blob(0.11, 0.1, 0.09, 0, '#b79a72', { ao: 0.15, jitter: 0.05, top: '#cdb38a' });
  b.pop();
  b.push();
  b.translate(0.12, 0.18, 0);
  b.blob(0.05, 0.05, 0.045, 0, '#a68863', { ao: 0, jitter: 0.04 });
  b.pop();
  b.tri([-0.1, 0.1, 0], [-0.22, 0.15, 0.03], [-0.2, 0.06, -0.03], '#8e7550', { ao: 0 });
}

/**
 * Station 5 – Die Reise durch die Wildnis (2. Mose 16–18)
 * Weite Wüste mit hohen Dünen und Felsen. Westlich des Weges eine Oase mit Teich, Palmen und Schilf;
 * östlich das Lager Israels mit Zelten um ein Feuer. Dazwischen die Station. Weiter nördlich schlägt
 * Wasser aus dem Felsen in ein kleines Becken (Quelle). Manna-Plättchen und Wachteln liegen im Sand.
 */
export function buildStation5(ctx: StationContext) {
  const { b, terrain: T } = ctx;
  const P = new Placer(ctx, 5);
  const R = P.rand;

  T.emitRange(b, ctx.zNorth, ctx.zSouth);
  emitPath(b, T, ctx.zNorth, ctx.zSouth);

  const markerZ = STATION_Z[4];
  platform(ctx, markerZ);
  P.reserve(pathX(markerZ), markerZ, 2.6);

  // ── Wüstenspuren ──────────────────────────────────────────────────────────
  emitTrail(b, T, [[1.7, -160.2], [-0.2, -160.9], [-2.2, -160.0]], 0.3);
  emitTrail(b, T, [[0.9, -176.4], [-1.2, -177.4], [-3.2, -177.2]], 0.3);
  emitTrail(b, T, [[3.9, -168.2], [4.4, -170.2], [5.0, -171.0]], 0.28);

  // ── Oase mit Teich ────────────────────────────────────────────────────────
  const pond = waterFromTerrain(T, OASIS.level, (x, z) => Math.hypot(x - OASIS.x, z - OASIS.z) < OASIS.r + 2.0);
  addWater(ctx, 'pond', pond, 1);
  P.reserve(OASIS.x, OASIS.z, OASIS.r + 0.6);
  // Palmen und Schilf rund um den Teich
  for (let i = 0; i < 11; i++) {
    const a = (i / 11) * Math.PI * 2 + R() * 0.4;
    const r = OASIS.r + 0.9 + R() * 1.3;
    const x = OASIS.x + Math.cos(a) * r;
    const z = OASIS.z + Math.sin(a) * r * 0.85;
    if (Math.abs(x) > 9.1 || Math.hypot(x - pathX(z), 0) < 2.1) continue;
    if (!P.free(x, z, 0.55)) continue;
    P.reserve(x, z, 0.55);
    b.place(x, z, 0, () => palm(b, 0.85 + R() * 0.5), 0.1);
  }
  for (let i = 0; i < 12; i++) {
    const a = R() * Math.PI * 2;
    const r = OASIS.r + 0.35 + R() * 0.45;
    const x = OASIS.x + Math.cos(a) * r;
    const z = OASIS.z + Math.sin(a) * r;
    if (Math.abs(x) > 9.2 || T.surfaceAt(x, z) < OASIS.level - 0.05) continue;
    b.place(x, z, R() * 6, () => reeds(b, 4 + Math.floor(R() * 3), 1.2 + R() * 0.6), 0.1);
  }
  // Büsche im Grün der Oase
  for (const [dx, dz] of [[3.6, 1.8], [-3.2, 2.8], [2.0, -4.4], [-4.0, -1.5]] as const) {
    const x = OASIS.x + dx, z = OASIS.z + dz;
    if (Math.abs(x) > 9.0 || !P.free(x, z, 0.5)) continue;
    P.reserve(x, z, 0.5);
    b.place(x, z, R() * 6, () => bush(b, 0.8, '#7fae4c'), 0.05);
  }
  // ein paar Schafe am Wasser
  for (const [dx, dz, rot] of [[2.9, 2.3, 0.6], [3.3, 3.0, 2.2], [-2.4, 3.8, 1.2]] as const) {
    const x = OASIS.x + dx, z = OASIS.z + dz;
    if (!P.free(x, z, 0.6)) continue;
    P.reserve(x, z, 0.6);
    b.place(x, z, rot, () => {
      b.scale(1.45);
      sheep(b);
    }, 0.02);
  }

  // ── Lager Israels (östlich des Weges) ─────────────────────────────────────
  const CX = 6.0;
  const CZ = -170.5;
  b.place(CX, CZ, 0, () => {
    b.scale(1.3);
    campfire(b);
  }, 0.04);
  ctx.fires.push([CX, ctx.ground(CX, CZ) + 0.6, CZ]);
  P.reserve(CX, CZ, 1.4);
  for (const a of [0.4, 1.6, 2.9, 4.2, 5.4]) {
    b.place(CX + Math.cos(a) * 1.5, CZ + Math.sin(a) * 1.5, a + 1.5, () => b.box(0.75, 0.22, 0.22, PAL.woodDark, { top: '#7e5530', ao: 0.1 }), 0.02);
  }
  const tents: [number, number, number, 'g' | 'r', string, string][] = [
    [9.0, -170.4, 1.7, 'g', PAL.tentCream, PAL.cloth[0]],
    [8.0, -167.0, 0.9, 'r', PAL.tentTan, PAL.tentBrown],
    [6.2, -165.6, 0.2, 'g', PAL.tentTan, PAL.cloth[1]],
    [8.0, -174.0, 2.3, 'r', PAL.tentCream, PAL.tentBrown],
    [5.9, -175.4, 3.0, 'g', PAL.tentCream, PAL.cloth[2]],
    [8.8, -178.0, 2.0, 'g', PAL.tentTan, PAL.cloth[0]],
    [8.7, -162.8, 1.0, 'r', PAL.tentCream, PAL.tentBrown],
    [4.2, -179.6, 2.6, 'r', PAL.tentTan, PAL.tentBrown],
  ];
  for (const [x, z, rot, kind, col, accent] of tents) {
    P.reserve(x, z, kind === 'g' ? 2.0 : 1.8);
    if (kind === 'g') b.place(x, z, rot, () => tentGable(b, 2.5, 1.5, 2.2, col, accent), 0.1);
    else b.place(x, z, rot, () => tentRound(b, 1.4, 1.8, col, accent), 0.1);
  }
  b.place(CX - 0.2, CZ - 2.5, 0, () => banner(b, 3.0, PAL.cloth[2]), 0.05);
  // Vorräte & Schlafrollen
  for (const [x, z] of [[7.4, -168.9], [4.7, -172.6], [7.0, -172.3], [9.1, -166.3], [6.5, -178.3]] as const) {
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
  for (const [x, z, rot] of [[5.0, -168.5, 0.5], [7.1, -171.8, 1.6], [4.9, -173.6, 2.4]] as const) {
    b.place(x, z, rot, () => bedroll(b, PAL.cloth[Math.floor(R() * 4)]), 0.02);
  }

  // Manna und Wachteln rund um das Lager
  for (let i = 0; i < 70; i++) {
    const a = R() * Math.PI * 2;
    const r = 1.2 + R() * 4.6;
    const x = CX + Math.cos(a) * r * 0.9;
    const z = CZ + Math.sin(a) * r * 1.2;
    if (Math.abs(x) > 9.2 || !P.free(x, z, 0.12) || Math.abs(x - pathX(z)) < 1.4) continue;
    b.place(x, z, 0, () => manna(b), 0.0);
  }
  for (let i = 0; i < 9; i++) {
    const x = 3.8 + R() * 5.2;
    const z = -163.0 - R() * 17;
    if (!P.free(x, z, 0.45) || Math.abs(x - pathX(z)) < 1.6) continue;
    P.reserve(x, z, 0.35);
    b.place(x, z, R() * 6.28, () => {
      b.scale(1.5);
      quail(b);
    }, 0.0);
  }

  // ── Quelle: Wasser aus dem Felsen (2. Mose 17) ────────────────────────────
  const spring = waterFromTerrain(T, SPRING.level, (x, z) => Math.hypot(x - SPRING.x, z - SPRING.z) < SPRING.r + 1.6);
  addWater(ctx, 'pond', spring, 1);
  P.reserve(SPRING.x, SPRING.z, SPRING.r + 0.6);
  const RX = SPRING.x - 2.5;
  const RZ = SPRING.z - 0.2;
  P.reserve(RX, RZ, 2.1);
  b.place(RX, RZ, 0.3, () => {
    // großer, runder Felsen mit hellem Sandstein oben
    b.push();
    b.translate(0, 1.0, 0);
    b.rock(1.7, 2.3, 1.5, 1, 0.12, PAL.rock, { top: PAL.rockPale, jitter: 0.07 });
    b.pop();
    b.push();
    b.translate(-0.9, 0.7, -0.6);
    b.rock(0.9, 1.3, 0.9, 1, 0.14, PAL.rockDark, { top: PAL.rockLight, jitter: 0.07 });
    b.pop();
    b.push();
    b.translate(0.5, 0.35, 1.0);
    b.rock(0.8, 0.6, 0.7, 1, 0.16, PAL.rockLight, { top: PAL.rockPale, jitter: 0.07 });
    b.pop();
  }, 0.1, SPRING.level - 0.3);
  // Wasserschleier, der aus einer Spalte des Felsens rinnt
  const fallTop = SPRING.level + 2.3;
  addWater(ctx, 'fall', buildWaterfall(RX + 1.25, SPRING.z + 0.4, 0.34, fallTop, fallTop - SPRING.level), 2);
  for (const [dx, dz] of [[-1.2, 2.2], [-1.0, -2.0], [0.4, 2.6]] as const) {
    b.place(SPRING.x + dx + 2.0, SPRING.z + dz, R() * 6, () => reeds(b, 4, 1.1), 0.05);
  }
  b.place(SPRING.x + 0.5, SPRING.z + 2.2, 0.0, () => palm(b, 0.9), 0.1);
  b.place(SPRING.x - 1.2, SPRING.z - 2.4, 0.0, () => palm(b, 0.8), 0.1);

  // ── Gebetshügel (Rafidim): Stab auf dem Felsen ────────────────────────────
  b.place(-7.2, -183.0, 0.4, () => {
    butte(b, 2.2, 1.9, 2.4, 3);
    b.translate(0, 2.35, 0);
    b.frustum(0.05, 0.04, 1.6, 5, PAL.wood, { cap: false, ao: 0 });
    b.translate(0, 1.6, 0);
    b.blob(0.07, 0.07, 0.07, 0, PAL.gold, { ao: 0 });
  }, 0.2);
  P.reserve(-7.2, -183.0, 1.9);

  // ── Dünenlandschaft: Felsen, Tafelberge, Akazien, Büsche, einzelne Palmen ──
  for (const [x, z, w, h] of [[-8.3, -150.6, 2.6, 3.4], [8.4, -151.0, 2.2, 2.6], [-8.6, -167.5, 2.4, 3.0], [8.2, -182.4, 2.0, 2.6]] as const) {
    P.reserve(x, z, w * 0.8);
    b.place(x, z, R() * 6, () => butte(b, w, w * 0.85, h, 4), 0.25);
  }
  for (const [x, z, h] of [[-9.0, -158.6, 3.2], [9.0, -157.0, 2.8], [-8.6, -176.0, 2.6], [9.0, -183.5, 3.0]] as const) {
    if (!P.free(x, z, 0.9)) continue;
    P.reserve(x, z, 0.9);
    b.place(x, z, R() * 6, () => spire(b, 0.8 + R() * 0.3, h, PAL.rock), 0.2);
  }
  P.many(8, { x0: -9.3, x1: 9.3, z0: -149, z1: -184 }, 0.8, { tries: 70, maxSlope: 0.55 }, (x, z) => b.place(x, z, R() * 6, () => rockCluster(b, 0.55 + R() * 0.55), 0.05));
  P.many(6, { x0: -9.3, x1: 9.3, z0: -149, z1: -184 }, 1.0, { tries: 70, maxSlope: 0.45 }, (x, z) => b.place(x, z, R() * 6, () => acacia(b, 0.85 + R() * 0.35), 0.05));
  P.many(6, { x0: -9.3, x1: 9.3, z0: -149, z1: -184 }, 0.45, { tries: 50, maxSlope: 0.5 }, (x, z) => b.place(x, z, R() * 6, () => bush(b, 0.6 + R() * 0.35, '#8aa94a'), 0.05));
  P.many(5, { x0: -9.3, x1: 9.3, z0: -149, z1: -184 }, 0.7, { tries: 70, maxSlope: 0.45 }, (x, z) => b.place(x, z, 0, () => palm(b, 0.8 + R() * 0.4), 0.1));
}
