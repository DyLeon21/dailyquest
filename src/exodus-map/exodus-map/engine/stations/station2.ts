import { PAL } from '../../config';
import { STATION_Z, pathX } from '../layout';
import { emitPath } from '../terrain';
import {
  bloodFountain, cityGate, cityHouse, frog, locust, palace, passoverDoor, temple, wall,
} from '../buildings';
import {
  banner, basket, jar, obelisk, palm, rockCluster, sack, sheep, stall,
} from '../props';
import { Placer, platform } from './common';
import type { StationContext } from './common';

/**
 * Station 2 – Die zehn Plagen (2. Mose 5–12)
 * Große ägyptische Stadt hinter einer Mauer mit zwei Toren. Mittelpunkt ist der Palast des Pharao
 * (Pylon mit geflügelter Sonnenscheibe, Säulenhof, Halle, Heiligtumsturm). Davor ein Marktplatz um die
 * Station, ein Tempel mit Säulen, Obelisken. Kleine Hinweise auf die Plagen: blutrotes Wasser im Brunnen,
 * Frösche, Heuschrecken – und ein Haus mit rot bemaltem Türrahmen (Passah).
 */
export function buildStation2(ctx: StationContext) {
  const { b, terrain: T } = ctx;
  const P = new Placer(ctx, 2);
  const R = P.rand;

  T.emitRange(b, ctx.zNorth, ctx.zSouth);
  emitPath(b, T, ctx.zNorth, ctx.zSouth);

  const markerZ = STATION_Z[1];
  platform(ctx, markerZ);
  P.reserve(pathX(markerZ), markerZ, 2.6);

  // ── Stadtmauer, Tore ──────────────────────────────────────────────────────
  const Z_S = -50.9; // Südtor
  const Z_N = -87.6; // Nordtor
  for (const [zg, towers] of [[Z_S, 3.5], [Z_N, 3.8]] as const) {
    const px = pathX(zg);
    b.place(px, zg, 0, () => cityGate(b, 3.4, 1.9, towers), 0.1);
    const xw = px - 3.6;
    const xe = px + 3.6;
    // Westflügel
    const lw = xw - -9.3;
    b.place((xw + -9.3) / 2, zg, 0, () => wall(b, lw, 1.45), 0);
    // Ostflügel
    const le = 9.3 - xe;
    b.place((xe + 9.3) / 2, zg, 0, () => wall(b, le, 1.45), 0);
    P.reserve(px, zg, 3.2);
  }
  // Seitenmauern (niedrig, in kurzen Stücken, damit sie dem Gelände folgen)
  for (let z = Z_S - 2.2; z > Z_N + 1.8; z -= 3.7) {
    for (const x of [-9.2, 9.2]) b.place(x, z, Math.PI / 2, () => wall(b, 3.6, 1.1, 0.5), 0.0);
  }
  // Ecktürme
  for (const [x, z] of [[-9.1, Z_S], [9.1, Z_S], [-9.1, Z_N], [9.1, Z_N]] as const) {
    b.place(x, z, 0, () => {
      b.frustum(0.85, 0.75, 2.6, 8, PAL.stone, { alt: PAL.stoneLight, ao: 0.25, jitter: 0.04 });
      b.translate(0, 2.6, 0);
      b.frustum(0.95, 0.95, 0.2, 8, PAL.tile, { ao: 0, jitter: 0.02 });
      b.translate(0, 0.2, 0);
      b.frustum(1.0, 1.0, 0.12, 8, PAL.gold, { ao: 0, jitter: 0.02 });
    }, 0.25);
  }

  // ── Palast des Pharao ─────────────────────────────────────────────────────
  const PAL_X = -2.8;
  const PAL_Z = -64.4;
  P.reserve(PAL_X, PAL_Z - 8, 9.2);
  b.place(PAL_X, PAL_Z, 0, () => palace(b, { fires: (x, y, z) => ctx.fires.push([x, y, z]) }), 0, 0.42);
  // Fahnen entlang der Ostseite des Palastes
  for (const z of [-67.5, -72.5, -77.5]) {
    const x = 4.4;
    b.place(x, z, 0, () => banner(b, 3.1, PAL.cloth[(Math.round(z) + 100) % 3]), 0.1);
  }
  // Palmen in Steinringen entlang der Palastseite
  for (const z of [-69.8, -75.2]) {
    b.place(4.5, z, 0, () => {
      b.frustum(0.5, 0.45, 0.22, 8, PAL.stoneDark, { alt: PAL.stone, ao: 0.2 });
      b.translate(0, 0.2, 0);
      palm(b, 0.8);
    }, 0.1);
  }

  // ── Marktplatz ────────────────────────────────────────────────────────────
  b.place(-1.9, -55.4, 0, () => bloodFountain(b), 0.15);
  P.reserve(-1.9, -55.4, 1.7);
  // Frösche um den Brunnen
  for (let i = 0; i < 7; i++) {
    const a = 0.3 + i * 0.95;
    const r = 1.35 + (i % 3) * 0.28;
    b.place(-1.9 + Math.cos(a) * r, -55.4 + Math.sin(a) * r, a + 1.3, () => frog(b), 0.02);
  }
  // Marktstände
  const stalls: [number, number, number, number, number][] = [
    [7.0, -54.2, -0.3, 0, 3],
    [7.6, -60.8, -0.2, 2, 1],
    [1.5, -60.9, 0.15, 1, 2],
  ];
  for (const [x, z, rot, c1, c2] of stalls) {
    b.place(x, z, rot, () => stall(b, PAL.cloth[c1], PAL.cloth[c2]), 0.05);
    P.reserve(x, z, 1.2);
    b.place(x - 0.9, z + 0.75, R() * 6, () => {
      jar(b, 1.2);
      b.translate(0.45, 0, 0.2);
      sack(b, 1);
    }, 0.02);
    b.place(x + 1.0, z - 0.6, R() * 6, () => basket(b, 1.1), 0.02);
  }
  // Heuschrecken am Getreidestand (achte Plage)
  for (let i = 0; i < 11; i++) {
    const x = 7.0 + (R() - 0.5) * 3.2;
    const z = -54.2 + (R() - 0.5) * 2.6;
    b.place(x, z, R() * 6, () => locust(b), 0.0);
  }
  // Palmen im Steinring auf dem Platz
  for (const [x, z] of [[-4.2, -52.6], [5.4, -52.4]] as const) {
    b.place(x, z, 0, () => {
      b.frustum(0.55, 0.5, 0.24, 8, PAL.stoneDark, { alt: PAL.stone, ao: 0.2 });
      b.translate(0, 0.22, 0);
      palm(b, 0.85);
    }, 0.1);
    P.reserve(x, z, 0.9);
  }

  // ── Tempel mit Säulen und Obelisken ───────────────────────────────────────
  b.place(-6.6, -56.2, Math.PI / 2, () => temple(b), 0.0, 0.42);
  P.reserve(-6.6, -56.2, 3.2);
  for (const z of [-53.2, -59.2]) {
    b.place(-3.7, z, 0, () => obelisk(b, 3.3, 0.6), 0.1);
    P.reserve(-3.7, z, 0.9);
  }

  // ── Häuser der Stadt ──────────────────────────────────────────────────────
  const awn: [number, number][] = [[0, 3], [1, 3], [2, 3]];
  const houses: [number, number, number, number, number, number, Partial<Parameters<typeof cityHouse>[1]>][] = [
    // Südwest
    [-8.1, -52.9, 0.1, 1.9, 1.8, 1.4, { awning: true }],
    [-7.6, -61.3, -0.2, 2.2, 1.9, 1.5, { second: true }],
    // Nordviertel
    [-7.4, -83.0, 0.15, 2.4, 2.0, 1.6, { second: true, stair: true }],
    [-4.0, -84.6, -0.2, 2.0, 1.8, 1.3, { awning: true }],
    [-0.4, -83.6, 0.1, 2.2, 1.8, 1.5, { dome: true }],
    [8.2, -82.6, -0.3, 2.0, 1.8, 1.3, { awning: true }],
    [7.8, -85.6, 0.25, 1.9, 1.7, 1.2, {}],
    // Ostrand
    [8.4, -66.8, 0.1, 1.5, 1.6, 1.1, {}],
  ];
  houses.forEach(([x, z, rot, w, d, h, o], i) => {
    P.reserve(x, z, Math.max(w, d) * 0.8);
    const [c1, c2] = awn[i % awn.length];
    b.place(x, z, rot, () => cityHouse(b, { w, d, h, awningColors: [PAL.cloth[c1], PAL.cloth[c2]], ...o }), 0.12);
  });
  // Passah-Haus: Türrahmen in Rot, davor ein Lamm
  {
    const [x, z] = [-4.6, -80.4] as const;
    const w = 2.1, d = 1.8, h = 1.3;
    P.reserve(x, z, 1.7);
    b.place(x, z, 0.0, () => {
      cityHouse(b, { w, d, h });
      passoverDoor(b, w, h, d);
    }, 0.12);
    b.place(x - 0.5, z + 1.55, 0.4, () => sheep(b), 0.02);
  }
  // Krüge, Säcke vor Häusern
  for (const [x, z] of [[-6.0, -55.5], [-5.6, -62.6], [-2.2, -81.6], [6.6, -85.0]] as const) {
    b.place(x, z, R() * 6, () => {
      jar(b, 1.1);
      b.translate(0.35, 0, 0.1);
      sack(b, 1);
    }, 0.02);
  }

  // ── Palmen & Grün ─────────────────────────────────────────────────────────
  P.many(5, { x0: -9.2, x1: 9.2, z0: -52, z1: -88 }, 0.6, { tries: 60, maxSlope: 0.35 }, (x, z) => b.place(x, z, 0, () => palm(b, 0.8 + R() * 0.3), 0.1));
  P.many(4, { x0: -9.2, x1: 9.2, z0: -52, z1: -88 }, 0.5, { tries: 40, maxSlope: 0.35 }, (x, z) => b.place(x, z, R() * 6, () => rockCluster(b, 0.45), 0.05));

  // Banner am Marktplatz
  for (const [x, z, c] of [[pathX(-52.2) + 2.1, -52.2, 1], [pathX(-52.2) - 2.1, -52.2, 2]] as const) {
    b.place(x, z, 0, () => banner(b, 2.6, PAL.cloth[c]), 0.05);
  }
}
