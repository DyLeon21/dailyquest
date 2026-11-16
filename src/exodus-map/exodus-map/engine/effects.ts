import {
  AdditiveBlending, BufferGeometry, CanvasTexture, Color, CylinderGeometry, DoubleSide, Float32BufferAttribute, Group, Mesh, Points,
  ShaderMaterial, SpriteMaterial, Sprite, SRGBColorSpace, Vector3,
} from 'three';
import type { Camera } from 'three';
import { PAL } from '../config';
import { GeoBuilder } from './GeoBuilder';
import type { AnimationState } from './animation';
import { SINAI, SUMMIT, TABERNACLE } from './layout';
import { mulberry32 } from './rng';

/**
 * Atmosphäre: schwebender Staub im goldenen Licht, Funken an den Lagerfeuern,
 * Lichtsäule über der Stiftshütte, ziehende Wolken + schwebende Felsbrocken.
 */

// ── Wolken & schwebende Felsen (ein Mesh, ein Draw Call) ───────────────────────────────────────
export interface CloudSpec {
  center: [number, number, number];
  /** Bahn um das Zentrum: [rx, rz] */
  orbit: [number, number];
  speed: number;
  phase: number;
  size: number;
  puffs?: number;
  rock?: boolean;
  /** Flache Wolkenunterseite weglassen (Wolkensäule). */
  column?: boolean;
  /** Fester Radius für einzelne Puffs (Wolkensäule). */
  blobR?: number;
}

export function buildDrifters(specs: CloudSpec[]): BufferGeometry {
  const pos: number[] = [];
  const col: number[] = [];
  const nor: number[] = [];
  const cen: number[] = [];
  const orb: number[] = [];
  const rnd = mulberry32(2024);

  for (const spec of specs) {
    const b = new GeoBuilder(Math.floor(rnd() * 1e6));
    b.jitter = spec.rock ? 0.06 : 0.025;
    b.aoStrength = 0;
    if (spec.rock) {
      // schwebender Felsbrocken mit Sandkappe
      b.rock(spec.size * 0.9, spec.size * 0.6, spec.size * 0.9, 1, 0.28, PAL.rockDark, { top: PAL.sandLight });
      b.push();
      b.translate(0, -spec.size * 0.35, 0);
      b.cone(spec.size * 0.55, spec.size * 0.9, 5, '#6a4c3c', { rot: 1 });
      b.pop();
    } else {
      const n = spec.puffs ?? 5;
      for (let i = 0; i < n; i++) {
        const t = n === 1 ? 0 : i / (n - 1) - 0.5;
        const r = spec.blobR ?? spec.size * (0.55 + 0.5 * Math.sin((i / Math.max(1, n - 1)) * Math.PI) + rnd() * 0.15);
        b.push();
        b.translate(t * spec.size * 2.1, (rnd() - 0.4) * spec.size * 0.35, (rnd() - 0.5) * spec.size * 0.7);
        b.scale(1, 0.72, 0.9);
        b.blob(r, r, r, 1, i % 2 ? PAL.cloud : '#ffffff', { top: '#ffffff', jitter: 0.025 });
        b.pop();
      }
      if (!spec.column) {
        // flache Unterseite
        b.push();
        b.translate(0, -spec.size * 0.3, 0);
        b.scale(1, 0.25, 0.8);
        b.blob(spec.size * 1.6, spec.size, spec.size, 1, PAL.cloudShade, { jitter: 0.02 });
        b.pop();
      }
    }
    const g = b.toGeometry();
    const p = g.attributes.position.array;
    const c = g.attributes.color.array;
    const n = g.attributes.normal.array;
    for (let i = 0; i < p.length; i += 3) {
      pos.push(p[i], p[i + 1], p[i + 2]);
      col.push(c[i], c[i + 1], c[i + 2]);
      nor.push(n[i], n[i + 1], n[i + 2]);
      cen.push(...spec.center);
      orb.push(spec.orbit[0], spec.orbit[1], spec.speed, spec.phase);
    }
    g.dispose();
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new Float32BufferAttribute(nor, 3));
  g.setAttribute('color', new Float32BufferAttribute(col, 3));
  g.setAttribute('aCenter', new Float32BufferAttribute(cen, 3));
  g.setAttribute('aOrbit', new Float32BufferAttribute(orb, 4));
  // Die Wolken wandern per Shader – Culling-Kugel großzügig, damit nichts verschwindet.
  g.computeBoundingSphere();
  const bs = g.boundingSphere as { radius: number } | null;
  if (bs) bs.radius += 40;
  return g;
}

export function sinaiClouds(): CloudSpec[] {
  const px = SINAI.x, pz = SINAI.z;
  const top = SINAI.top;
  return [
    // Ring um den Gipfel: bleibt seitlich, damit Tafeln und Pfad frei bleiben
    { center: [px - 3.6, top - 1.2, pz + 1.6], orbit: [2.6, 1.8], speed: 0.14, phase: 0.2, size: 1.45, puffs: 4 },
    { center: [px + 5.0, top - 2.6, pz + 0.8], orbit: [2.4, 1.6], speed: -0.12, phase: 2.4, size: 1.5, puffs: 4 },
    { center: [px - 6.6, top - 8.2, pz + 3.6], orbit: [2.0, 1.4], speed: -0.09, phase: 1.1, size: 1.7, puffs: 4 },
    { center: [px + 7.2, top - 9.6, pz + 3.2], orbit: [1.8, 1.4], speed: 0.07, phase: 5.2, size: 1.6, puffs: 4 },
    { center: [px - 0.4, top + 1.7, pz - 2.6], orbit: [3.4, 2.0], speed: 0.12, phase: 3.3, size: 1.0, puffs: 3 },
    { center: [px + 2.4, top - 5.4, pz - 3.8], orbit: [3.0, 1.6], speed: 0.1, phase: 4.1, size: 1.3, puffs: 4 },
  ];
}

/** Wolkensäule vor dem Volk (2. Mose 13): dicht gestapelte Wolken, die sich kaum bewegen. */
export function cloudPillar(x = 5.3, z = -113.2): CloudSpec[] {
  const out: CloudSpec[] = [];
  const levels = 11;
  for (let i = 0; i < levels; i++) {
    const t = i / (levels - 1);
    out.push({
      center: [x + Math.sin(i * 1.7) * 0.16, 0.9 + i * 0.86, z + Math.cos(i * 2.3) * 0.14],
      orbit: [0.22, 0.18],
      speed: 0.3 + (i % 3) * 0.08,
      phase: i * 1.3,
      size: 1.2,
      blobR: 1.08 - t * 0.28,
      puffs: 1,
      column: true,
    });
  }
  // Krone: oben breiter, wie aufquellender Rauch
  out.push({ center: [x, 10.9, z], orbit: [0.45, 0.35], speed: 0.2, phase: 2, size: 1.0, puffs: 3, column: true });
  return out;
}

export function skyClouds(): CloudSpec[] {
  // Wolkenbänke unter und neben der Insel – lassen sie schweben.
  const out: CloudSpec[] = [];
  const rnd = mulberry32(99);
  for (let i = 0; i < 16; i++) {
    const z = -8 - i * 14.5 + (rnd() - 0.5) * 6;
    const side = i % 2 === 0 ? -1 : 1;
    out.push({
      center: [side * (11 + rnd() * 6), -9 - rnd() * 5, z],
      orbit: [1.8 + rnd() * 2, 1 + rnd()],
      speed: 0.05 + rnd() * 0.05,
      phase: rnd() * 6,
      size: 2.2 + rnd() * 1.6,
      puffs: 4 + Math.floor(rnd() * 3),
    });
  }
  // Gischt unter dem Wasserfall
  out.push({ center: [11.2, -12.5, -23], orbit: [0.8, 0.6], speed: 0.4, phase: 0, size: 1.6, puffs: 4 });
  out.push({ center: [10.8, -9.0, -22.5], orbit: [0.6, 0.5], speed: -0.3, phase: 2, size: 1.2, puffs: 3 });
  return out;
}

export function floatingRocks(): CloudSpec[] {
  const rocks: CloudSpec[] = [];
  const rnd = mulberry32(5);
  const spots: [number, number, number][] = [
    [-13, -4, 6], [14, -9, 2], [-14.5, -7, -34], [13.5, -3, -62], [-13, -6, -104], [15, -8, -150], [-14, -4, -190], [13.5, -5, -226], [3, -13, 6],
  ];
  for (const [x, y, z] of spots) {
    rocks.push({ center: [x, y, z], orbit: [0.0, 0.0], speed: 0.3 + rnd() * 0.2, phase: rnd() * 6, size: 0.6 + rnd() * 0.5, rock: true });
  }
  return rocks;
}

// ── Staub / Funken ─────────────────────────────────────────────────────────────────────────────
/** Schwebende Staubkörner im goldenen Licht. Umhüllen den Sichtbereich und laufen mit der Kamera mit. */
export function createDust(anim: AnimationState, count: number): { points: Points; update(target: Vector3, camera: Camera, dpr: number): void; dispose(): void } {
  const g = new BufferGeometry();
  const rnd = mulberry32(31);
  const seeds = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) {
    seeds[i * 4] = rnd();
    seeds[i * 4 + 1] = rnd();
    seeds[i * 4 + 2] = rnd();
    seeds[i * 4 + 3] = rnd();
  }
  g.setAttribute('position', new Float32BufferAttribute(new Float32Array(count * 3), 3));
  g.setAttribute('aSeed', new Float32BufferAttribute(seeds, 4));
  const mat = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    uniforms: {
      uT: { value: 0 },
      uTarget: { value: new Vector3() },
      uBox: { value: new Vector3(34, 13, 52) },
      uSize: { value: 2.5 },
      uAmount: { value: 1 },
      uColor: { value: new Color('#ffe7b0') },
    },
    vertexShader: /* glsl */ `
      attribute vec4 aSeed;
      uniform float uT; uniform vec3 uTarget; uniform vec3 uBox; uniform float uSize; uniform float uAmount;
      varying float vA;
      void main() {
        vec3 base = aSeed.xyz * uBox;
        vec3 drift = vec3(sin(uT * 0.21 + aSeed.w * 6.28) * 1.6 + uT * 0.35, uT * 0.22 + sin(uT * 0.5 + aSeed.x * 9.0) * 0.4, cos(uT * 0.17 + aSeed.w * 5.0) * 1.2);
        vec3 p = mod(base + drift - uTarget, uBox) + uTarget - uBox * 0.5;
        p.y = mod(base.y + drift.y, uBox.y) + 0.8;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        float tw = 0.55 + 0.45 * sin(uT * (1.2 + aSeed.w * 2.0) + aSeed.x * 40.0);
        float keep = step(aSeed.z, uAmount);
        vA = tw * keep * (0.35 + 0.65 * aSeed.w);
        gl_PointSize = uSize * (0.7 + aSeed.y * 1.1);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; varying float vA;
      void main() {
        vec2 c = gl_PointCoord - 0.5;
        float d = length(c);
        float a = smoothstep(0.5, 0.0, d) * vA * 0.75;
        if (a < 0.01) discard;
        gl_FragColor = vec4(uColor, a);
      }`,
  });
  const points = new Points(g, mat);
  points.frustumCulled = false;
  points.renderOrder = 10;
  return {
    points,
    update(target, _camera, dpr) {
      mat.uniforms.uT.value = anim.time;
      mat.uniforms.uTarget.value.copy(target);
      mat.uniforms.uSize.value = 2.6 * dpr;
      mat.uniforms.uAmount.value = Math.min(1, anim.particleAmount);
      points.visible = anim.particleAmount > 0.01;
    },
    dispose() {
      g.dispose();
      mat.dispose();
    },
  };
}

/** Aufsteigende Funken an den Lagerfeuern. */
export function createEmbers(anim: AnimationState, fires: [number, number, number][]): { points: Points; update(dpr: number): void; dispose(): void } {
  const per = 9;
  const count = fires.length * per;
  const g = new BufferGeometry();
  const rnd = mulberry32(8);
  const pos = new Float32Array(count * 3);
  const seeds = new Float32Array(count * 4);
  fires.forEach((f, i) => {
    for (let k = 0; k < per; k++) {
      const n = i * per + k;
      pos[n * 3] = f[0];
      pos[n * 3 + 1] = f[1];
      pos[n * 3 + 2] = f[2];
      seeds[n * 4] = rnd();
      seeds[n * 4 + 1] = rnd();
      seeds[n * 4 + 2] = rnd();
      seeds[n * 4 + 3] = rnd();
    }
  });
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('aSeed', new Float32BufferAttribute(seeds, 4));
  const mat = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    uniforms: { uT: { value: 0 }, uSize: { value: 3 }, uAmount: { value: 1 } },
    vertexShader: /* glsl */ `
      attribute vec4 aSeed; uniform float uT; uniform float uSize; uniform float uAmount;
      varying float vA;
      void main() {
        float life = fract(uT * (0.12 + aSeed.x * 0.1) + aSeed.y);
        vec3 p = position + vec3((aSeed.z - 0.5) * 0.6 + sin(uT * 0.9 + aSeed.w * 12.0) * 0.25 * life, 0.5 + life * 2.6, (aSeed.w - 0.5) * 0.6 + cos(uT * 0.8 + aSeed.z * 9.0) * 0.25 * life);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        vA = (1.0 - life) * smoothstep(0.0, 0.1, life) * uAmount;
        gl_PointSize = uSize * (0.6 + 0.8 * (1.0 - life));
      }`,
    fragmentShader: /* glsl */ `
      varying float vA;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.05, d) * vA;
        if (a < 0.01) discard;
        gl_FragColor = vec4(mix(vec3(1.0, 0.82, 0.35), vec3(1.0, 0.45, 0.15), 1.0 - a), a);
      }`,
  });
  const points = new Points(g, mat);
  points.frustumCulled = false;
  points.renderOrder = 11;
  return {
    points,
    update(dpr) {
      mat.uniforms.uT.value = anim.time;
      mat.uniforms.uSize.value = 3.4 * dpr;
      mat.uniforms.uAmount.value = Math.min(1, anim.particleAmount);
      points.visible = anim.particleAmount > 0.01;
    },
    dispose() {
      g.dispose();
      mat.dispose();
    },
  };
}

// ── Lichtsäule (Herrlichkeit des Herrn über der Stiftshütte) + Glanz am Gipfel ────────────────
function glowTexture(): CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  try {
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 128;
    const g = c.getContext('2d');
    if (!g) return null;
    const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, 'rgba(255,238,176,1)');
    grd.addColorStop(0.22, 'rgba(255,216,128,0.55)');
    grd.addColorStop(0.55, 'rgba(255,196,96,0.16)');
    grd.addColorStop(1, 'rgba(255,184,84,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 128, 128);
    const t = new CanvasTexture(c);
    t.colorSpace = SRGBColorSpace;
    return t;
  } catch {
    return null;
  }
}

export function createLightColumn(anim: AnimationState): { mesh: Group; update(): void; dispose(): void } {
  const root = new Group();
  const H = 16;
  const geo = new CylinderGeometry(0.6, 1.45, H, 20, 1, true);
  geo.translate(0, H / 2, 0);
  const mat = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    side: DoubleSide,
    uniforms: { uT: { value: 0 }, uAmt: { value: 1 }, uColor: { value: new Color('#ffe2a0') } },
    vertexShader: /* glsl */ `
      varying vec3 vP; varying float vH; varying float vFace;
      void main() {
        vP = position;
        vH = position.y / ${H.toFixed(1)};
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vec3 n = normalize(normalMatrix * normal);
        vec3 v = projectionMatrix[3][3] > 0.5 ? vec3(0.0, 0.0, 1.0) : normalize(-mv.xyz);
        vFace = abs(dot(n, v));
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uT; uniform float uAmt; uniform vec3 uColor; varying vec3 vP; varying float vH; varying float vFace;
      void main() {
        // unten weich einblenden (kein harter Rand), nach oben ausklingen; Silhouette weich
        float fade = smoothstep(0.0, 0.3, vH) * (1.0 - smoothstep(0.3, 1.0, vH));
        float ang = atan(vP.z, vP.x);
        float shimmer = 0.8 + 0.2 * sin(ang * 4.0 + uT * 0.6 + vH * 7.0);
        float breathe = 0.88 + 0.12 * sin(uT * 0.7);
        float soft = pow(vFace, 1.3);
        gl_FragColor = vec4(uColor, fade * shimmer * breathe * soft * 0.42 * uAmt);
      }`,
  });
  const beam = new Mesh(geo, mat);
  beam.position.set(TABERNACLE.x, 2.4, TABERNACLE.z + TABERNACLE.tentDz);
  beam.renderOrder = 9;
  beam.frustumCulled = false;
  root.add(beam);

  // weiche Lichthöfe (immer zur Kamera gedreht): über dem Zelt und hinter den Gesetzestafeln
  const tex = glowTexture();
  const sprites: { s: Sprite; base: number; size: number; phase: number }[] = [];
  const spriteMats: SpriteMaterial[] = [];
  if (tex) {
    const mk = (x: number, y: number, z: number, size: number, base: number, phase: number) => {
      const m = new SpriteMaterial({ map: tex, color: '#ffe3a6', transparent: true, depthWrite: false, depthTest: false, blending: AdditiveBlending, opacity: base });
      const s = new Sprite(m);
      s.position.set(x, y, z);
      s.scale.set(size, size, 1);
      s.renderOrder = 12;
      root.add(s);
      sprites.push({ s, base, size, phase });
      spriteMats.push(m);
    };
    mk(TABERNACLE.x, 2.5, TABERNACLE.z + TABERNACLE.tentDz, 4.4, 0.55, 0.0);
    mk(SUMMIT.x, SINAI.top + 1.1, SUMMIT.z, 8.2, 0.55, 1.7);
  }
  return {
    mesh: root,
    update() {
      mat.uniforms.uT.value = anim.time;
      mat.uniforms.uAmt.value = anim.lightStrength;
      root.visible = anim.lightStrength > 0.01;
      for (const sp of sprites) {
        const k = 0.85 + 0.15 * Math.sin(anim.time * 0.7 + sp.phase);
        (sp.s.material as SpriteMaterial).opacity = sp.base * k * Math.min(1, anim.lightStrength);
        sp.s.scale.setScalar(sp.size * (0.97 + 0.03 * k));
      }
    },
    dispose() {
      geo.dispose();
      mat.dispose();
      for (const m of spriteMats) m.dispose();
      tex?.dispose();
    },
  };
}
