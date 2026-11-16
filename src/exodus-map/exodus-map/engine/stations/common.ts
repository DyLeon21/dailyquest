import { Mesh } from 'three';
import type { BufferGeometry, Group } from 'three';
import { PAL } from '../../config';
import type { GeoBuilder } from '../GeoBuilder';
import type { AnimationState } from '../animation';
import { PATH_HALF_WIDTH, distToPath, pathX } from '../layout';
import type { Materials, WaterMode } from '../materials';
import { mulberry32 } from '../rng';
import { nearWater } from '../terrain';
import type { Terrain } from '../terrain';

/** Alles, was eine Station zum Bauen braucht. */
export interface StationContext {
  index: number;
  /** z-Grenzen der Zone (zNorth < zSouth ≤ 0). */
  zSouth: number;
  zNorth: number;
  terrain: Terrain;
  /** Sammelt Land-Geometrie (Terrain, Props …) → ein Draw Call. */
  b: GeoBuilder;
  group: Group;
  mats: Materials;
  anim: AnimationState;
  /** Feuerstellen für Funken (Weltkoordinaten). */
  fires: [number, number, number][];
  /** Geländehöhe an (x,z) – exakt auf der Gitteroberfläche. */
  ground: (x: number, z: number) => number;
}

export function addWater(ctx: StationContext, mode: WaterMode, geo: BufferGeometry, renderOrder = 1): Mesh {
  const m = new Mesh(geo, ctx.mats.water[mode]);
  m.receiveShadow = true;
  m.renderOrder = renderOrder;
  m.frustumCulled = false;
  ctx.group.add(m);
  return m;
}

/** Rechteckige Region für die Platzierung. */
export interface Box {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
}

export interface FindOpts {
  /** Zusätzlicher Abstand zum Pfad (Standard: Platz für den Pfad + Objektradius). */
  pathGap?: number;
  waterGap?: number;
  maxSlope?: number;
  minH?: number;
  tries?: number;
}

/** Platziert Objekte ohne Überlappung, abseits von Pfad und Wasser, auf flachem Grund. */
export class Placer {
  private items: { x: number; z: number; r: number }[] = [];
  readonly rand: () => number;

 private ctx: StationContext

constructor(ctx: StationContext, seed = 1) {
  this.ctx = ctx
  this.rand = mulberry32(seed)
}

  reserve(x: number, z: number, r: number) {
    this.items.push({ x, z, r });
  }

  free(x: number, z: number, r: number) {
    return this.items.every((o) => Math.hypot(o.x - x, o.z - z) >= o.r + r);
  }

  slopeAt(x: number, z: number) {
    const g = this.ctx.ground;
    const h = g(x, z);
    return Math.max(Math.abs(g(x + 0.7, z) - h), Math.abs(g(x - 0.7, z) - h), Math.abs(g(x, z + 0.7) - h), Math.abs(g(x, z - 0.7) - h)) / 0.7;
  }

  find(box: Box, r: number, o: FindOpts = {}): [number, number] | null {
    const tries = o.tries ?? 60;
    for (let i = 0; i < tries; i++) {
      const x = box.x0 + this.rand() * (box.x1 - box.x0);
      const z = box.z0 + this.rand() * (box.z1 - box.z0);
      if (Math.abs(x) > 9.4 - r * 0.4) continue;
      if (distToPath(x, z) < PATH_HALF_WIDTH + 0.5 + r + (o.pathGap ?? 0)) continue;
      if (nearWater(x, z, r + (o.waterGap ?? 0.6))) continue;
      if (o.minH !== undefined && this.ctx.ground(x, z) < o.minH) continue;
      if (this.slopeAt(x, z) > (o.maxSlope ?? 0.7)) continue;
      if (!this.free(x, z, r)) continue;
      this.items.push({ x, z, r });
      return [x, z];
    }
    return null;
  }

  /** Mehrere Objekte auf einmal; fn bekommt Position und Zufall. */
  many(count: number, box: Box, r: number, o: FindOpts, fn: (x: number, z: number) => void) {
    let placed = 0;
    for (let i = 0; i < count; i++) {
      const p = this.find(box, r, o);
      if (!p) continue;
      fn(p[0], p[1]);
      placed++;
    }
    return placed;
  }
}

/** Runde Marker-Plattform auf dem Pfad: goldener Ring + heller Kern. */
export function platform(ctx: StationContext, z: number) {
  const { b } = ctx;
  const x = pathX(z);
  let gy = -1e9;
  for (const [dx, dz] of [[0, 0], [1.3, 0], [-1.3, 0], [0, 1.3], [0, -1.3]] as const) gy = Math.max(gy, ctx.ground(x + dx, z + dz));
  b.place(
    x,
    z,
    0,
    () => {
      b.frustum(1.62, 1.5, 0.2, 14, PAL.gold, { alt: '#f7de94', ao: 0.05, jitter: 0.02, top: '#f9e7a8' });
      b.translate(0, 0.2, 0);
      b.frustum(1.26, 1.2, 0.06, 14, '#fff6dc', { ao: 0, jitter: 0.015 });
    },
    0,
    gy + 0.02,
  );
  return { x, y: gy + 0.26, z };
}

/** Tupfer von Dekor (kleine Felsen) am Rand zwischen zwei Positionen. */
export function jitterAngle(rand: () => number, spread = Math.PI) {
  return (rand() - 0.5) * spread * 2;
}
