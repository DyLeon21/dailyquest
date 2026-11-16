import { Mesh } from 'three';
import { PAL } from '../../config';
import { GeoBuilder } from '../GeoBuilder';
import { SEA, STATION_Z, pathX } from '../layout';
import { emitPath } from '../terrain';
import { acacia, bush, palm, reeds, rockCluster, spire } from '../props';
import { buildWaterWall, wallCrest, waterFromTerrain } from '../water';
import { Placer, addWater, platform } from './common';
import type { StationContext } from './common';

const FISH_COLORS = ['#ff9f43', '#ffd166', '#ef6f6c', '#5bc0eb', '#f6f1de', '#ff8fa3'] as const;

/** Kleiner Fisch, schwimmt nach +x. Nur Formen, keine Gesichtszüge. */
function fish(b: GeoBuilder, color: string) {
  b.push();
  b.blob(0.23, 0.1, 0.07, 0, color, { ao: 0, jitter: 0.05 });
  const fin = '#fff3d6';
  // Schwanzflosse (beidseitig sichtbar)
  b.tri([-0.18, 0, 0], [-0.44, 0.15, 0], [-0.44, -0.15, 0], fin, { ao: 0 });
  b.tri([-0.18, 0, 0], [-0.44, -0.15, 0], [-0.44, 0.15, 0], fin, { ao: 0 });
  // Rückenflosse
  b.tri([0.04, 0.07, 0], [-0.1, 0.2, 0], [-0.15, 0.06, 0], fin, { ao: 0 });
  b.tri([0.04, 0.07, 0], [-0.15, 0.06, 0], [-0.1, 0.2, 0], fin, { ao: 0 });
  b.pop();
}

function starfish(b: GeoBuilder) {
  b.frustum(0.2, 0.05, 0.05, 5, '#f07c4a', { ao: 0, jitter: 0.06, rot: b.rand() * 6, top: '#f59a63' });
}

function coral(b: GeoBuilder, color: string) {
  b.cone(0.13, 0.55, 5, color, { ao: 0.2, jitter: 0.06 });
  for (const [x, z, t] of [[0.1, 0.05, 0.6], [-0.09, -0.04, -0.55], [0.0, 0.1, 0.4]] as const) {
    b.push();
    b.translate(x, 0.22, z);
    b.rotateZ(t);
    b.rotateY(x * 20);
    b.cone(0.07, 0.34, 4, color, { ao: 0, jitter: 0.06 });
    b.pop();
  }
}

function seaweed(b: GeoBuilder, count = 4, h = 0.9) {
  for (let i = 0; i < count; i++) {
    const hh = h * (0.7 + b.rand() * 0.6);
    b.push();
    b.translate((b.rand() - 0.5) * 0.35, 0, (b.rand() - 0.5) * 0.35);
    b.rotateZ((b.rand() - 0.5) * 0.3);
    b.frustum(0.05, 0.015, hh, 4, ['#5f9f4d', '#7fb35a', '#4e8c47'][i % 3], { cap: false, sway: (_x, y) => 0.2 + 0.9 * (y / hh), ao: 0.2 });
    b.pop();
  }
}

function shell(b: GeoBuilder) {
  b.push();
  b.scale(1, 0.6, 1);
  b.cone(0.1, 0.12, 6, '#f7e6c8', { ao: 0, jitter: 0.05, alt: '#efc9a6' });
  b.pop();
}

/** Der Stab des Mose, in einem Steinhaufen. */
function staff(b: GeoBuilder) {
  for (let i = 0; i < 5; i++) {
    const a = i * 1.3;
    b.push();
    b.translate(Math.cos(a) * 0.3, 0, Math.sin(a) * 0.3);
    b.rock(0.22, 0.14, 0.2, 0, 0.2, PAL.rockLight, { top: PAL.rockPale, jitter: 0.06 });
    b.pop();
  }
  b.frustum(0.06, 0.045, 2.6, 5, PAL.wood, { alt: PAL.woodDark, ao: 0.1, cap: false });
  b.push();
  b.translate(0, 2.6, 0);
  b.rotateZ(-0.9);
  b.frustum(0.045, 0.04, 0.38, 5, PAL.wood, { ao: 0, cap: false });
  b.translate(0, 0.38, 0);
  b.rotateZ(-0.9);
  b.frustum(0.04, 0.035, 0.3, 5, PAL.wood, { ao: 0 });
  b.pop();
  b.push();
  b.translate(0, 2.55, 0);
  b.blob(0.075, 0.075, 0.075, 0, PAL.gold, { ao: 0 });
  b.pop();
}

/**
 * Station 4 – Der Durchzug durch das Rote Meer (2. Mose 14–15)
 * Mitten im Meer führt ein trockener Sandweg zwischen zwei hohen, türkisen Wasserwänden hindurch.
 * In den (durchscheinenden) Wänden schwimmen Fische, auf den Wellenkämmen sitzt weißer Schaum.
 * Am Boden des Weges: Seetang, Korallen, Muscheln, Seesterne. Davor der Stab des Mose.
 */
export function buildStation4(ctx: StationContext) {
  const { b, terrain: T } = ctx;
  const P = new Placer(ctx, 4);
  const R = P.rand;

  T.emitRange(b, ctx.zNorth, ctx.zSouth);
  emitPath(b, T, ctx.zNorth, ctx.zSouth);

  const markerZ = STATION_Z[3];
  platform(ctx, markerZ);
  P.reserve(pathX(markerZ), markerZ, 2.8);

  // ── Wasser: Meeresfläche + zwei Wände ─────────────────────────────────────
  const sea = waterFromTerrain(T, SEA.level, (_x, z) => z < SEA.zS + 3 && z > SEA.zN - 3);
  addWater(ctx, 'sea', sea, 1);
  const Z0 = -120.8;
  const Z1 = -141.6;
  addWater(ctx, 'wall', buildWaterWall(-1, Z0, Z1, 2.2), 2);
  addWater(ctx, 'wall', buildWaterWall(1, Z0, Z1, 0.0), 3);

  const fb = new GeoBuilder(417);
  fb.setGround(ctx.ground);
  fb.aoStrength = 0;
  // Schaumkronen auf den Wellenkämmen (normale Geometrie, deckend weiß): breite, flache Gischtbänder
  for (const side of [-1, 1] as const) {
    const phase = side < 0 ? 2.2 : 0;
    for (let z = Z0 - 0.5; z > Z1 + 0.5; z -= 0.55) {
      const c = wallCrest(side, z, Z0, Z1, phase);
      const r = 0.34 + R() * 0.36;
      fb.push();
      fb.translate(c.x + (R() - 0.5) * 1.2, c.y + 0.04 + R() * 0.12, z + (R() - 0.5) * 0.25);
      fb.scale(1.15, 0.5, 1.0);
      fb.blob(r, r, r, 1, R() > 0.5 ? '#ffffff' : '#eefcff', { top: '#ffffff', ao: 0, jitter: 0.03 });
      fb.pop();
    }
  }

  // Fische in den Wänden: eigenes Mesh ohne Schattenwurf, sonst werfen sie dunkle Flecken auf die Wasserwände
  for (const side of [-1, 1] as const) {
    const phase = side < 0 ? 2.2 : 0;
    for (let i = 0; i < 9; i++) {
      const z = Z0 - 2.5 - R() * (Z0 - Z1 - 5);
      const c = wallCrest(side, z, Z0, Z1, phase);
      const x = side * (3.5 + R() * 1.1);
      const y = 0.7 + R() * Math.max(0.6, c.hs * 3.3);
      const dir = R() < 0.5 ? Math.PI / 2 : -Math.PI / 2;
      const col = FISH_COLORS[Math.floor(R() * FISH_COLORS.length)];
      const k = 1.9 + R() * 0.7;
      fb.push();
      fb.translate(x, y, z);
      fb.rotateY(dir + (R() - 0.5) * 0.4);
      fb.rotateZ((R() - 0.5) * 0.3);
      fb.scale(k);
      fish(fb, col);
      fb.pop();
    }
  }
  const fishMesh = new Mesh(fb.toGeometry(), ctx.mats.land);
  fishMesh.name = 'station-4-fish';
  fishMesh.castShadow = false;
  fishMesh.receiveShadow = false;
  ctx.group.add(fishMesh);

  // ── Meeresboden am Weg: Seetang, Korallen, Muscheln, Seesterne ────────────
  const floorY = (x: number, z: number) => ctx.ground(x, z);
  for (let i = 0; i < 46; i++) {
    const z = -121.4 - R() * 19;
    const side = R() < 0.5 ? -1 : 1;
    const x = side * (1.9 + R() * 1.25);
    if (Math.abs(x - pathX(z)) < 1.35) continue;
    const kind = R();
    b.place(x, z, R() * 6, () => {
      if (kind < 0.34) seaweed(b, 4 + Math.floor(R() * 3), 0.8 + R() * 0.5);
      else if (kind < 0.52) coral(b, ['#f08a9d', '#f4a259', '#c97bd0'][Math.floor(R() * 3)]);
      else if (kind < 0.74) shell(b);
      else if (kind < 0.88) starfish(b);
      else rockCluster(b, 0.35);
    }, 0.02);
  }
  void floorY;

  // ── Felsen im äußeren Meer (ragen aus dem Wasser) ─────────────────────────
  for (const [x, z, h] of [[-8.7, -125.4, 3.0], [8.8, -128.6, 3.6], [-8.4, -135.0, 2.4], [8.6, -137.6, 2.8], [8.9, -122.8, 1.8]] as const) {
    b.place(x, z, R() * 6, () => spire(b, 0.85 + R() * 0.3, h, PAL.rock), 0, -1.1);
  }
  for (const [x, z] of [[-9.0, -130.2], [9.0, -132.8], [-8.9, -139.8]] as const) {
    b.place(x, z, R() * 6, () => rockCluster(b, 0.5), 0, -0.75);
  }

  // ── Ufer: Stab des Mose, Palmen, Schilf, Felsen ───────────────────────────
  b.place(pathX(-116.4) + 2.5, -116.4, 0, () => staff(b), 0.04);
  P.reserve(pathX(-116.4) + 2.5, -116.4, 1.0);

  P.many(9, { x0: -9.3, x1: 9.3, z0: -114.3, z1: -118.4 }, 0.7, { tries: 50, waterGap: 0.4 }, (x, z) => b.place(x, z, 0, () => palm(b, 0.8 + R() * 0.45), 0.1));
  P.many(8, { x0: -9.3, x1: 9.3, z0: -143.6, z1: -148 }, 0.7, { tries: 50, waterGap: 0.4 }, (x, z) => b.place(x, z, 0, () => palm(b, 0.8 + R() * 0.45), 0.1));
  P.many(6, { x0: -9.3, x1: 9.3, z0: -114.5, z1: -118.3 }, 0.5, { tries: 40, waterGap: 0.3 }, (x, z) => b.place(x, z, R() * 6, () => reeds(b, 4, 1.4), 0.1));
  P.many(6, { x0: -9.3, x1: 9.3, z0: -143.4, z1: -147.6 }, 0.5, { tries: 40, waterGap: 0.3 }, (x, z) => b.place(x, z, R() * 6, () => reeds(b, 4, 1.4), 0.1));
  P.many(5, { x0: -9.3, x1: 9.3, z0: -114.5, z1: -118.4 }, 0.8, { tries: 40 }, (x, z) => b.place(x, z, R() * 6, () => rockCluster(b, 0.6), 0.05));
  P.many(5, { x0: -9.3, x1: 9.3, z0: -143.3, z1: -148 }, 0.8, { tries: 40 }, (x, z) => b.place(x, z, R() * 6, () => rockCluster(b, 0.6), 0.05));
  P.many(3, { x0: -9.3, x1: 9.3, z0: -143.4, z1: -148 }, 1.0, { tries: 40 }, (x, z) => b.place(x, z, R() * 6, () => acacia(b, 0.9), 0.05));
  P.many(3, { x0: -9.3, x1: 9.3, z0: -114.5, z1: -118 }, 0.5, { tries: 30 }, (x, z) => b.place(x, z, R() * 6, () => bush(b, 0.7, '#8aa94a'), 0.05));
}
