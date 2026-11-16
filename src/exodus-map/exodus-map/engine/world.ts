import { Group, Mesh, Vector3 } from 'three';
import { GeoBuilder } from './GeoBuilder';
import type { AnimationState } from './animation';
import { buildDioramaBody } from './diorama';
import { buildDrifters, cloudPillar, floatingRocks, skyClouds, sinaiClouds } from './effects';
import { STATION_BOUNDS, STATION_Z, pathX } from './layout';
import type { Materials } from './materials';
import { Terrain } from './terrain';
import { STATION_BUILDERS } from './stations';
import type { StationContext } from './stations/common';

export interface BuiltStation {
  group: Group;
  /** Weltposition der Marker-Plattform (Oberkante). */
  anchor: Vector3;
}

export interface BuiltWorld {
  root: Group;
  stations: BuiltStation[];
  terrain: Terrain;
  fires: [number, number, number][];
  stats: { triangles: number };
  dispose(): void;
}

/** Baut die gesamte Spielwelt: Erdkörper, sechs Stationsgruppen, Wolken. */
export function buildWorld(anim: AnimationState, mats: Materials): BuiltWorld {
  const root = new Group();
  root.name = 'exodus-world';
  const terrain = new Terrain();
  const fires: [number, number, number][] = [];
  let triangles = 0;

  // Schwebender Erdkörper
  const bodyGeo = buildDioramaBody(terrain);
  const body = new Mesh(bodyGeo, mats.land);
  body.name = 'earth-layers';
  body.castShadow = true;
  body.receiveShadow = true;
  root.add(body);
  triangles += bodyGeo.attributes.position.count / 3;

  const stations: BuiltStation[] = [];
  const ground = (x: number, z: number) => terrain.surfaceAt(x, z);

  for (let i = 0; i < 6; i++) {
    const group = new Group();
    group.name = `station-${i + 1}`;
    const b = new GeoBuilder(100 + i * 17);
    b.setGround(ground);
    const ctx: StationContext = {
      index: i,
      zSouth: STATION_BOUNDS[i],
      zNorth: STATION_BOUNDS[i + 1],
      terrain,
      b,
      group,
      mats,
      anim,
      fires,
      ground,
    };
    STATION_BUILDERS[i](ctx);
    const geo = b.toGeometry();
    const mesh = new Mesh(geo, mats.land);
    mesh.name = `station-${i + 1}-land`;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    triangles += geo.attributes.position.count / 3;
    root.add(group);

    const z = STATION_Z[i];
    const x = pathX(z);
    let gy = -1e9;
    for (const [dx, dz] of [[0, 0], [1.3, 0], [-1.3, 0], [0, 1.3], [0, -1.3]] as const) gy = Math.max(gy, ground(x + dx, z + dz));
    stations.push({ group, anchor: new Vector3(x, gy + 0.26, z) });
  }

  // Wolken, Felsbrocken (ein Mesh, Bewegung im Shader)
  const driftGeo = buildDrifters([...sinaiClouds(), ...skyClouds(), ...floatingRocks(), ...cloudPillar()]);
  const drifters = new Mesh(driftGeo, mats.drift);
  drifters.name = 'clouds-and-floating-rocks';
  drifters.frustumCulled = false;
  root.add(drifters);
  triangles += driftGeo.attributes.position.count / 3;

  return {
    root,
    stations,
    terrain,
    fires,
    stats: { triangles },
    dispose() {
      root.traverse((o) => {
        const m = o as Mesh;
        if (m.geometry) m.geometry.dispose();
      });
    },
  };
}
