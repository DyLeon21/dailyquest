import { PAL } from '../../config';
import { SINAI, STATION_Z, SUMMIT, TABERNACLE, pathX } from '../layout';
import { emitPath, emitTrail, sinaiTrailPoints, trailSamples } from '../terrain';
import {
  acacia, banner, basket, bedroll, bush, campfire, crate, jar, rockCluster, sack, sheep, tentGable, tentRound,
} from '../props';
import {
  bronzeAltar, courtFence, courtFloor, laver, standingStone, stoneAltar, summitTablets, tabernacleTent,
} from '../sanctuary';
import { Placer, platform } from './common';
import type { StationContext } from './common';

/**
 * Station 6 – Der Berg Sinai (2. Mose 19–40)
 * Am Fuß des Berges lagert das Volk rund um die Stiftshütte (Vorhof, Bronzealtar, Waschbecken, Zelt mit
 * Lichtsäule). Ein Steinaltar mit zwölf Pfeilern erinnert an den Bundesschluss. Ein Serpentinenpfad führt über
 * die Südflanke zum Gipfelplateau, wo die beiden Gesetzestafeln stehen; Wolken ziehen um den Gipfel.
 */
export function buildStation6(ctx: StationContext) {
  const { b, terrain: T } = ctx;
  const P = new Placer(ctx, 6);
  const R = P.rand;

  T.emitRange(b, ctx.zNorth, ctx.zSouth);

  // ── Wege: breite Straße bis zum Berg, dann schmaler Serpentinenpfad ───────────
  const trail = sinaiTrailPoints();
  const roadEnd = trail[0][1];
  emitPath(b, T, roadEnd, ctx.zSouth);
  emitTrail(b, T, trail, 0.34, { taperStart: false });

  const markerZ = STATION_Z[5];
  platform(ctx, markerZ);
  P.reserve(pathX(markerZ), markerZ, 2.6);

  // ── Stiftshütte: Vorhof, Altar, Waschbecken, Zelt ────────────────────────
  const TX = TABERNACLE.x;
  const TZ = TABERNACLE.z;
  const { w: CW, d: CD } = TABERNACLE.court;
  P.reserve(TX, TZ, 4.1);
  b.place(TX, TZ, 0, () => {
    courtFloor(b, CW, CD);
    courtFence(b, CW, CD, 1.5);
    // Brandopferaltar
    b.push();
    b.translate(0, 0.04, 2.15);
    bronzeAltar(b);
    const f = b.toWorld(0, 0.9, 0);
    ctx.fires.push([f[0], f[1], f[2]]);
    b.pop();
    // Waschbecken
    b.push();
    b.translate(0, 0.04, 0.45);
    laver(b);
    b.pop();
    // Zelt
    b.push();
    b.translate(0, 0.04, TABERNACLE.tentDz);
    tabernacleTent(b);
    b.pop();
    // Krüge & Körbe vor dem Zaun
    for (const [x, z] of [[1.5, 1.0], [-1.45, -0.2]] as const) {
      b.push();
      b.translate(x, 0.04, z);
      jar(b, 0.9, '#c8793a');
      b.pop();
    }
  }, 0.08);

  // Akazien (Schittimholz!) neben dem Vorhof
  for (const [x, z, s] of [[-8.0, -194.6, 1.0], [-1.7, -200.8, 0.9], [-8.2, -199.6, 0.85]] as const) {
    P.reserve(x, z, 1.0);
    b.place(x, z, R() * 6, () => acacia(b, s), 0.05);
  }

  // ── Lager Israels rund um die Stiftshütte ────────────────────────────────
  type Tent = [number, number, number, 'g' | 'r', string, string];
  const tents: Tent[] = [
    // Ost (jenseits der Straße)
    [3.7, -186.4, 0.4, 'g', PAL.tentCream, PAL.cloth[0]],
    [7.6, -186.9, 1.2, 'r', PAL.tentTan, PAL.tentBrown],
    [8.2, -191.9, 1.9, 'g', PAL.tentTan, PAL.cloth[1]],
    [3.8, -194.6, 0.5, 'r', PAL.tentCream, PAL.tentBrown],
    [7.3, -196.7, 1.6, 'g', PAL.tentCream, PAL.cloth[2]],
    [3.6, -199.2, 2.6, 'g', PAL.tentTan, PAL.cloth[0]],
    [7.3, -200.9, 0.9, 'r', PAL.tentCream, PAL.tentBrown],
    // West / Süd
    [-7.9, -187.8, -0.5, 'g', PAL.tentCream, PAL.cloth[1]],
    [-7.6, -192.4, 0.6, 'r', PAL.tentTan, PAL.tentBrown],
    [-5.6, -185.6, 0.2, 'r', PAL.tentCream, PAL.tentBrown],
    [-7.9, -197.6, 1.0, 'g', PAL.tentTan, PAL.cloth[2]],
    [-7.5, -202.0, 0.3, 'r', PAL.tentCream, PAL.tentBrown],
    [-3.2, -202.4, 2.2, 'g', PAL.tentCream, PAL.cloth[0]],
  ];
  for (const [x, z, rot, kind, col, accent] of tents) {
    P.reserve(x, z, kind === 'g' ? 2.0 : 1.75);
    if (kind === 'g') b.place(x, z, rot, () => tentGable(b, 2.5, 1.5, 2.2, col, accent), 0.1);
    else b.place(x, z, rot, () => tentRound(b, 1.4, 1.8, col, accent), 0.1);
  }

  // Feuerstellen
  for (const [x, z] of [[5.9, -191.2], [-4.6, -189.6]] as const) {
    b.place(x, z, 0, () => {
      b.scale(1.25);
      campfire(b);
    }, 0.04);
    P.reserve(x, z, 1.3);
    ctx.fires.push([x, ctx.ground(x, z) + 0.55, z]);
    for (const a of [0.7, 2.2, 3.7, 5.2]) {
      b.place(x + Math.cos(a) * 1.3, z + Math.sin(a) * 1.3, a + 1.57, () => b.box(0.72, 0.2, 0.2, PAL.woodDark, { top: '#7e5530', ao: 0.1 }), 0.02);
    }
  }

  // Gepäck & Schlafrollen
  for (const [x, z] of [[5.4, -187.6], [9.0, -189.6], [5.6, -196.0], [4.6, -190.6], [-6.6, -189.9], [-3.0, -190.8], [-6.1, -194.8], [5.4, -201.0]] as const) {
    if (!P.free(x, z, 0.5)) continue;
    P.reserve(x, z, 0.6);
    b.place(x, z, R() * 6, () => {
      b.scale(1.3);
      sack(b, 1.1);
      b.translate(0.42, 0, 0.1);
      jar(b, 1.2);
      b.translate(-0.8, 0, 0.36);
      if (R() > 0.5) crate(b, 1);
      else basket(b, 1.1);
    }, 0.02);
  }
  for (const [x, z, rot] of [[4.7, -192.2, 0.5], [7.2, -193.0, 1.6], [-3.4, -188.3, 2.4], [-5.9, -191.4, 0.3]] as const) {
    if (!P.free(x, z, 0.4)) continue;
    b.place(x, z, rot, () => bedroll(b, PAL.cloth[Math.floor(R() * 4)]), 0.02);
  }

  // Schafe rund um die Feuerstelle im Westen
  let n = 0;
  for (let i = 0; i < 60 && n < 5; i++) {
    const x = -9.0 + R() * 4.0;
    const z = -184.4 - R() * 6.4;
    if (!P.free(x, z, 0.6) || Math.abs(x) > 9.1) continue;
    P.reserve(x, z, 0.6);
    b.place(x, z, R() * 6, () => {
      b.scale(1.45);
      sheep(b);
    }, 0.02);
    n++;
  }

  // Stammesfahnen am Vorhof
  for (const [x, z, c] of [[TX - 2.9, TZ + 3.9, 1], [TX + 2.9, TZ + 3.9, 0], [TX - 2.9, TZ - 3.8, 2], [TX + 2.9, TZ - 3.8, 4]] as const) {
    b.place(x, z, 0, () => banner(b, 2.7, PAL.cloth[c]), 0.05);
  }
  // Fahnen am Lagereingang
  b.place(pathX(-185.0) + 2.1, -185.0, 0, () => banner(b, 2.6, PAL.cloth[2]), 0.05);
  b.place(pathX(-185.0) - 2.1, -185.0, 0, () => banner(b, 2.6, PAL.cloth[1]), 0.05);

  // ── Bundesaltar mit zwölf Pfeilern (2. Mose 24) ──────────────────────────
  const AX = -3.7;
  const AZ = -201.0;
  b.place(AX, AZ, 0.3, () => stoneAltar(b), 0.05);
  ctx.fires.push([AX, ctx.ground(AX, AZ) + 0.95, AZ]);
  P.reserve(AX, AZ, 1.2);
  // Pfeiler im Halbkreis (Nordseite)
  for (let i = 0; i < 12; i++) {
    const a = Math.PI * (1.08 + (i / 11) * 0.84);
    const x = AX + Math.cos(a) * 2.5;
    const z = AZ + Math.sin(a) * 1.55;
    const h = 0.58 + (i % 3) * 0.1;
    b.place(x, z, -a + 1.57, () => standingStone(b, h), 0.12);
  }

  // ── Der Berg: Felsen an den Flanken, Büsche, Steinhaufen an den Kehren ──
  const smp = trailSamples(trail);
  const trailDist = (x: number, z: number) => {
    let m = 1e9;
    for (const [tx, tz] of smp) {
      const d = Math.hypot(x - tx, z - tz);
      if (d < m) m = d;
    }
    return m;
  };
  let placed = 0;
  for (let i = 0; i < 120 && placed < 16; i++) {
    const phi = (R() - 0.5) * 2.5;
    const r = 3.6 + R() * 7.2;
    const x = SINAI.x + Math.sin(phi) * r;
    const z = SINAI.z + Math.cos(phi) * r;
    if (Math.abs(x) > 8.4 || trailDist(x, z) < 1.8 || !P.free(x, z, 0.6)) continue;
    P.reserve(x, z, 0.6);
    b.place(x, z, R() * 6, () => rockCluster(b, 0.55 + R() * 0.5), 0.22);
    placed++;
  }
  // Steinhaufen an den Wendepunkten des Pfades
  for (let i = 1; i < smp.length - 1; i++) {
    const [px] = smp[i - 1];
    const [cx, cz] = smp[i];
    const [nx] = smp[i + 1];
    const turning = (cx - px) * (nx - cx) < 0;
    if (!turning) continue;
    const dir = Math.sign(cx - smp[Math.max(0, i - 4)][0]);
    const x = cx + dir * 1.0;
    const z = cz + 0.1;
    if (Math.abs(x) > 8.6) continue;
    b.place(x, z, R() * 6, () => {
      for (let k = 0; k < 3; k++) {
        b.push();
        b.translate(0, k * 0.2, 0);
        b.rock(0.34 - k * 0.08, 0.14, 0.32 - k * 0.07, 0, 0.18, PAL.rockLight, { top: PAL.rockPale });
        b.pop();
      }
    }, 0.12);
    i += 6;
  }
  // Büsche am Fuß
  P.many(7, { x0: -9.2, x1: 9.2, z0: -184, z1: -203 }, 0.5, { tries: 50, maxSlope: 0.5 }, (x, z) => b.place(x, z, R() * 6, () => bush(b, 0.6 + R() * 0.35, '#8aa94a'), 0.05));
  P.many(6, { x0: -9.2, x1: 9.2, z0: -184, z1: -203 }, 0.7, { tries: 50, maxSlope: 0.5 }, (x, z) => b.place(x, z, R() * 6, () => rockCluster(b, 0.5 + R() * 0.4), 0.05));

  // ── Gipfel: Steinplatte mit den Gesetzestafeln ───────────────────────────
  b.place(SUMMIT.x, SUMMIT.z, 0.0, () => summitTablets(b), 0.14);
}
