import { Color, DoubleSide, FrontSide, MeshLambertMaterial, MeshStandardMaterial } from 'three';
import type { WebGLProgramParametersWithUniforms } from 'three';
import { PAL } from '../config';
import { toColor } from './GeoBuilder';
import type { AnimationState } from './animation';

/**
 * Alle Materialien der Karte. Bewusst wenige:
 *  - land:  Lambert + Vertexfarben (Terrain, Gebäude, Zelte …) mit Wind (Palmen/Banner) und ziehenden Wolkenschatten
 *  - drift: wie land, aber Teile kreisen/schweben (Wolken, schwebende Felsen)
 *  - water: Standard-Material mit flachem Shading + Wellen/Strömung/Schaum – je Modus eine Variante
 */

export type WaterMode = 'river' | 'sea' | 'pond' | 'wall' | 'fall';
const MODE_ID: Record<WaterMode, number> = { river: 1, sea: 2, pond: 3, wall: 4, fall: 5 };

type Shader = WebGLProgramParametersWithUniforms;

export function createLandMaterial(anim: AnimationState): MeshLambertMaterial {
  const m = new MeshLambertMaterial({ vertexColors: true });
  m.customProgramCacheKey = () => 'exodus-land';
  m.onBeforeCompile = (shader: Shader) => {
    shader.uniforms.uWindT = anim.u.windT;
    shader.uniforms.uWindAmp = anim.u.windAmp;
    shader.uniforms.uLightT = anim.u.lightT;
    shader.uniforms.uLightAmt = anim.u.lightAmt;
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
         attribute float aSway;
         uniform float uWindT;
         uniform float uWindAmp;
         varying vec3 vWPos;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         {
           float ph = position.x * 0.6 + position.z * 0.47;
           float w = aSway * uWindAmp;
           transformed.x += (sin(uWindT * 1.8 + ph) * 0.13 + sin(uWindT * 3.3 + ph * 1.9) * 0.045) * w;
           transformed.z += cos(uWindT * 1.45 + ph * 0.8) * 0.09 * w;
           transformed.y -= abs(sin(uWindT * 1.8 + ph)) * 0.04 * w;
         }
         vWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
         varying vec3 vWPos;
         uniform float uLightT;
         uniform float uLightAmt;`,
      )
      .replace(
        '#include <dithering_fragment>',
        `#include <dithering_fragment>
         {
           // Ziehende, sehr weiche Wolkenschatten über dem Land
           vec2 q = vWPos.xz;
           float c1 = sin(q.x * 0.075 + uLightT * 0.14) * sin(q.y * 0.052 - uLightT * 0.09);
           float c2 = sin(q.x * 0.043 - q.y * 0.031 + uLightT * 0.07);
           float cs = smoothstep(0.3, 0.95, c1 * 0.6 + c2 * 0.5);
           gl_FragColor.rgb *= 1.0 - cs * uLightAmt;
         }`,
      );
  };
  return m;
}

export function createDriftMaterial(anim: AnimationState): MeshLambertMaterial {
  const m = new MeshLambertMaterial({ vertexColors: true, emissive: new Color('#fff1da'), emissiveIntensity: 0.3 });
  m.customProgramCacheKey = () => 'exodus-drift';
  m.onBeforeCompile = (shader: Shader) => {
    shader.uniforms.uCloudT = anim.u.cloudT;
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
         attribute vec3 aCenter;
         attribute vec4 aOrbit; // rx, rz, Tempo, Phase
         uniform float uCloudT;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         {
           float a = uCloudT * aOrbit.z + aOrbit.w;
           transformed += aCenter + vec3(cos(a) * aOrbit.x, sin(a * 1.7) * 0.35, sin(a) * aOrbit.y);
         }`,
      );
  };
  return m;
}

export function createWaterMaterial(anim: AnimationState, mode: WaterMode): MeshStandardMaterial {
  const translucent = mode === 'wall' || mode === 'fall';
  const m = new MeshStandardMaterial({
    color: 0xffffff,
    roughness: mode === 'wall' ? 0.18 : 0.3,
    metalness: 0,
    flatShading: true,
    transparent: translucent,
    depthWrite: !translucent,
    side: mode === 'fall' ? DoubleSide : FrontSide,
  });
  m.defines = { WATER_MODE: MODE_ID[mode] };
  m.customProgramCacheKey = () => `exodus-water-${mode}`;

  const timeU = mode === 'river' || mode === 'fall' ? anim.u.riverT : anim.u.seaT;
  const ampU = mode === 'river' || mode === 'fall' ? anim.u.riverStr : anim.u.seaAmp;

  m.onBeforeCompile = (shader: Shader) => {
    shader.uniforms.uT = timeU;
    shader.uniforms.uAmp = ampU;
    shader.uniforms.uDeep = { value: toColor(PAL.water.deep) };
    shader.uniforms.uMid = { value: toColor(PAL.water.mid) };
    shader.uniforms.uShallow = { value: toColor(PAL.water.shallow) };
    shader.uniforms.uFoam = { value: toColor(PAL.water.foam) };
    shader.uniforms.uFallLen = { value: 11 };

    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
         attribute float aDepth;
         attribute vec2 aFlow;
         attribute float aShade;
         uniform float uT;
         uniform float uAmp;
         varying float vDepth;
         varying vec2 vFlow;
         varying float vShade;
         varying float vWave;
         varying vec3 vWP;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         vDepth = aDepth;
         vFlow = aFlow;
         vShade = aShade;
         float wv = 0.0;
         #if WATER_MODE == 1
           wv = sin(position.x * 0.8 + uT * 0.9) * 0.5 + sin(position.z * 1.1 - uT * 1.2) * 0.5;
           transformed.y += wv * 0.035 * min(uAmp, 1.5);
         #elif WATER_MODE == 2
           wv = sin(position.x * 0.7 + uT * 1.1) * 0.4 + sin(position.z * 0.9 - uT * 1.5) * 0.4 + sin((position.x + position.z) * 0.5 + uT * 0.8) * 0.4;
           transformed.y += wv * 0.075 * uAmp;
         #elif WATER_MODE == 3
           wv = sin(position.x * 1.1 + uT * 1.0) * 0.5 + sin(position.z * 1.3 - uT * 1.3) * 0.5;
           transformed.y += wv * 0.03 * uAmp;
         #elif WATER_MODE == 4
           wv = sin(position.y * 1.3 + position.z * 0.9 - uT * 1.6);
           transformed.x += aFlow.x * wv * 0.09 * uAmp * smoothstep(0.1, 0.7, aShade);
           transformed.y += sin(position.z * 1.1 + uT * 1.2) * 0.06 * uAmp * smoothstep(0.7, 1.0, aShade);
         #endif
         vWave = wv;
         vWP = (modelMatrix * vec4(transformed, 1.0)).xyz;`,
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
         uniform float uT;
         uniform float uAmp;
         uniform vec3 uDeep;
         uniform vec3 uMid;
         uniform vec3 uShallow;
         uniform vec3 uFoam;
         uniform float uFallLen;
         varying float vDepth;
         varying vec2 vFlow;
         varying float vShade;
         varying float vWave;
         varying vec3 vWP;`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
         {
           vec3 wcol;
           #if WATER_MODE == 4
             float sh = clamp(vShade, 0.0, 1.0);
             wcol = mix(uDeep, uMid, smoothstep(0.0, 0.55, sh));
             wcol = mix(wcol, uShallow, smoothstep(0.5, 0.97, sh));
             float st = sin(vWP.y * 3.4 - uT * 1.3 + vWP.z * 0.9 + sin(vWP.z * 1.7) * 0.8);
             wcol += uShallow * 0.32 * smoothstep(0.7, 1.0, st);
             wcol = mix(wcol, uFoam, smoothstep(0.9, 0.995, sh));
             diffuseColor.a = mix(0.36, 0.78, smoothstep(0.08, 0.92, sh));
           #elif WATER_MODE == 5
             float edge = abs(vFlow.x);
             float stripe = sin(vFlow.x * 10.0 + sin(vFlow.y * 0.7) * 1.5) * 0.5 + 0.5;
             float run = sin(vFlow.y * 2.2 + uT * 5.0 + vFlow.x * 3.0) * 0.5 + 0.5;
             wcol = mix(uMid, uFoam, clamp(stripe * 0.3 + run * 0.45 + smoothstep(0.65, 1.0, edge) * 0.4, 0.0, 1.0));
             diffuseColor.a = (1.0 - smoothstep(uFallLen * 0.25, uFallLen, vFlow.y)) * (1.0 - smoothstep(0.82, 1.0, edge)) * 0.92;
           #else
             float shallow = 1.0 - smoothstep(0.0, 1.6, vDepth);
             wcol = mix(uMid, uDeep, smoothstep(0.55, 2.0, vDepth));
             wcol = mix(wcol, uShallow, shallow * 0.9);
             #if WATER_MODE == 1
               float s1 = sin(vFlow.x * 1.1 - uT * 1.0 + sin(vFlow.y * 0.85 + vFlow.x * 0.22) * 0.75);
               wcol += uShallow * 0.22 * smoothstep(0.66, 1.0, s1) * uAmp;
               wcol -= uDeep * 0.08 * smoothstep(-0.6, -1.0, s1) * uAmp;
             #endif
             float lap = 0.55 + 0.45 * sin(vWP.x * 2.1 + vWP.z * 2.7 + uT * 1.5);
             float foam = smoothstep(0.32, 0.02, vDepth) * lap;
             #if WATER_MODE == 2
               foam = max(foam, smoothstep(0.5, 0.95, vWave) * 0.55);
             #endif
             wcol = mix(wcol, uFoam, clamp(foam, 0.0, 1.0));
           #endif
           diffuseColor.rgb = wcol;
         }`,
      );
  };
  return m;
}

export interface Materials {
  land: MeshLambertMaterial;
  drift: MeshLambertMaterial;
  water: Record<WaterMode, MeshStandardMaterial>;
  dispose(): void;
}

export function createMaterials(anim: AnimationState): Materials {
  const land = createLandMaterial(anim);
  const drift = createDriftMaterial(anim);
  const water = {
    river: createWaterMaterial(anim, 'river'),
    sea: createWaterMaterial(anim, 'sea'),
    pond: createWaterMaterial(anim, 'pond'),
    wall: createWaterMaterial(anim, 'wall'),
    fall: createWaterMaterial(anim, 'fall'),
  };
  return {
    land,
    drift,
    water,
    dispose() {
      land.dispose();
      drift.dispose();
      Object.values(water).forEach((w) => w.dispose());
    },
  };
}

export { Color };
