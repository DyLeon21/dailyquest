import type { AnimationSettings, PartialAnimationSettings, QualityLevel } from './types';

/** Farbpalette (sRGB-Hex). Warme Sandtöne, türkises Wasser, goldenes Licht. */
export const PAL = {
  sky: { top: '#7fd6c6', mid: '#bfe8d2', bottom: '#f7efcb' },

  sandLight: '#f5e1ab',
  sand: '#ecc886',
  sandDeep: '#e0b274',
  sandDark: '#cf9d5f',
  wet: '#cda266',
  fertile: '#bdb96c',
  grass: '#8fb85a',
  grassDark: '#6fa24d',

  path: '#fdf3d6',
  pathEdge: '#f0dcae',
  pathDash: '#fffbee',

  stone: '#e8d3a8',
  stoneLight: '#f5e6c0',
  stoneDark: '#d0b182',
  mud: '#dcb682',
  mudLight: '#ebcd9a',
  mudDark: '#c4975f',
  door: '#6d4727',

  rock: '#bf8556',
  rockDark: '#9a6542',
  rockLight: '#d9a972',
  rockPale: '#e6bf8a',

  wood: '#8c5b33',
  woodDark: '#6a4525',
  trunk: '#a77842',
  leaf: ['#5db64d', '#77c75b', '#4aa646', '#8ad06a'] as const,
  bush: '#6fae4e',

  linen: '#f6ecd3',
  cloth: ['#d5584a', '#2fa6b3', '#e9b53f', '#f2e6c9', '#7a4a9a'] as const,
  tentBrown: '#8d6a47',
  tentCream: '#efe2c4',
  tentTan: '#d3b385',

  gold: '#f4c552',
  goldDark: '#d99a2b',
  turquoise: '#33c8c2',
  /** weiches Glasurtürkis für Dachplatten und Gesimse (ruhiger als der Akzent-Türkis) */
  tile: '#6cc9bb',
  blue: '#3f66b0',

  water: { deep: '#14a3b7', mid: '#28c3c1', shallow: '#86e6d6', foam: '#f6fffb' },
  cloud: '#fff9ee',
  cloudShade: '#f3dcc0',
};

/** Fest eingestellte Isometrie – die Kamera dreht sich nie. */
export const CAMERA = {
  /** Drehung um die Hochachse in Grad (0 = Streifen läuft senkrecht durchs Bild). */
  azimuthDeg: 18,
  /** Neigung in Grad (35.26 = klassische Isometrie). */
  elevationDeg: 36,
  /** Sichtbare Szenenbreite in Welt-Einheiten (bestimmt Zoom auf dem Handy). */
  fitWidth: 25.5,
  targetY: 2.4,
  /** Die Kamera folgt der Pfad-x-Position, so weit voraus (Welt-Einheiten nach Norden) – hält die Station im Bild. */
  lookAhead: 13,
  /** Gewünschter Versatz der Station nach rechts von der Bildmitte (Welt-Einheiten, Bildebene). */
  markerBias: 2.2,
  /** Bildhöhe (von oben) auf der der Stationsmarker beim Anfahren landet. */
  frameFrac: [0.42, 0.42, 0.42, 0.42, 0.42, 0.67] as readonly number[],
  distance: 170,
  near: 1,
  far: 420,
};

export const LIGHT = {
  sunColor: '#ffe2b4',
  sunIntensity: 2.6,
  /** Richtung zur Sonne (links-vorn-oben) */
  sunDir: [-0.42, 0.8, 0.52] as const,
  hemiSky: '#fff3dc',
  hemiGround: '#e8b878',
  hemiIntensity: 1.75,
  bounceColor: '#8fe2d6',
  bounceIntensity: 0.5,
};

export const DEFAULT_ANIMATION: AnimationSettings = {
  nile: { enabled: true, speed: 1, strength: 1 },
  redSea: { enabled: true, speed: 1, amplitude: 1 },
  palms: { enabled: true, speed: 1, amount: 1 },
  clouds: { enabled: true, speed: 1 },
  particles: { enabled: true, amount: 1 },
  light: { enabled: true, speed: 1, strength: 1 },
  markers: { enabled: true },
};

export function resolveAnimation(partial?: PartialAnimationSettings, reducedMotion = false): AnimationSettings {
  const base: AnimationSettings = structuredClone(DEFAULT_ANIMATION);
  if (reducedMotion) {
    base.nile.speed = 0.3;
    base.redSea.speed = 0.3;
    base.palms.amount = 0.4;
    base.clouds.speed = 0.3;
    base.particles.enabled = false;
    base.light.speed = 0.3;
    base.markers.enabled = false;
  }
  if (partial) {
    for (const key of Object.keys(partial) as (keyof AnimationSettings)[]) {
      Object.assign(base[key], partial[key]);
    }
  }
  return base;
}

export interface QualityPreset {
  pixelRatioCap: number;
  shadows: boolean;
  shadowMapSize: number;
  antialias: boolean;
  dustCount: number;
}

export const QUALITY: Record<Exclude<QualityLevel, 'auto'>, QualityPreset> = {
  low: { pixelRatioCap: 1.25, shadows: false, shadowMapSize: 1024, antialias: true, dustCount: 60 },
  medium: { pixelRatioCap: 1.5, shadows: true, shadowMapSize: 1024, antialias: true, dustCount: 120 },
  high: { pixelRatioCap: 2, shadows: true, shadowMapSize: 2048, antialias: true, dustCount: 200 },
};

export function pickQuality(level: QualityLevel): QualityPreset {
  if (level !== 'auto') return QUALITY[level];
  if (typeof navigator === 'undefined') return QUALITY.medium;
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
  const cores = navigator.hardwareConcurrency ?? 4;
  if (mem <= 2 || cores <= 3) return QUALITY.low;
  if (mem >= 8 && cores >= 8) return QUALITY.high;
  return QUALITY.medium;
}
