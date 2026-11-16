import { PAL } from '../config';
import type { ColorInput, GeoBuilder } from './GeoBuilder';
import { banner, column, mudHouse, obelisk, palm, sphinx } from './props';
import type { HouseOpts } from './props';

/**
 * Größere Bauwerke für Stadt, Palast und Tempel. Wie in props.ts: lokale Koordinaten,
 * Ursprung = Bodenpunkt, Vorderseite = +z (Richtung Betrachter/Süden).
 */

const S = PAL.stone;
const SL = PAL.stoneLight;
const SD = PAL.stoneDark;

/** Reihe kleiner Zinnen entlang x (zentriert). */
export function crenels(b: GeoBuilder, len: number, color: ColorInput = SL, size = 0.3, h = 0.28, depth = 0.34) {
  const gap = size * 0.95;
  const n = Math.max(1, Math.floor((len + gap) / (size + gap)));
  const total = n * size + (n - 1) * gap;
  for (let i = 0; i < n; i++) {
    b.push();
    b.translate(-total / 2 + size / 2 + i * (size + gap), 0, 0);
    b.box(size, h, depth, color, { top: SL, ao: 0, jitter: 0.04 });
    b.pop();
  }
}

/** Niedrige Stadtmauer, entlang x. */
export function wall(b: GeoBuilder, len: number, h = 1.5, thick = 0.55, color: ColorInput = S) {
  b.push();
  b.translate(0, -0.3, 0);
  b.box(len, h + 0.3, thick, color, { top: SL, ao: 0.2, jitter: 0.04 });
  b.translate(0, h + 0.3, 0);
  b.box(len + 0.04, 0.14, thick + 0.08, PAL.tile, { ao: 0, jitter: 0.02 });
  b.translate(0, 0.14, 0);
  crenels(b, len - 0.2, SL, 0.3, 0.3, thick * 0.55);
  b.pop();
}

/** Viereckiger Wehrturm mit Gesims und Zinnen. */
export function gateTower(b: GeoBuilder, w = 1.7, h = 3.4, color: ColorInput = S) {
  b.push();
  b.translate(0, -0.3, 0);
  b.taper(w, w, w * 0.86, w * 0.86, h + 0.3, color, { top: SL, ao: 0.25 });
  b.translate(0, h + 0.3, 0);
  b.box(w * 0.98, 0.2, w * 0.98, PAL.tile, { ao: 0, jitter: 0.02 });
  b.translate(0, 0.2, 0);
  b.box(w * 1.06, 0.12, w * 1.06, PAL.gold, { top: '#f9e08c', ao: 0, jitter: 0.02 });
  b.translate(0, 0.12, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    b.push();
    b.translate(sx * w * 0.38, 0, sz * w * 0.38);
    b.box(w * 0.22, 0.3, w * 0.22, SL, { top: SL, ao: 0, jitter: 0.04 });
    b.pop();
  }
  // Schießscharte an der Vorderseite
  b.translate(0, -h * 0.55 - 0.32, w * 0.47);
  b.box(0.16, 0.5, 0.06, PAL.door, { ao: 0, jitter: 0.02 });
  b.pop();
}

/** Tor: zwei Türme mit Sturz über der Lücke; Öffnung liegt in x ∈ [-gap/2, gap/2]. */
export function cityGate(b: GeoBuilder, gap = 3.2, towerW = 1.9, h = 3.6) {
  for (const s of [-1, 1]) {
    b.push();
    b.translate(s * (gap / 2 + towerW / 2), 0, 0);
    gateTower(b, towerW, h);
    b.pop();
  }
  b.push();
  b.translate(0, h * 0.72, 0);
  b.box(gap + 0.1, 0.55, towerW * 0.78, S, { top: SL, ao: 0.1 });
  b.translate(0, 0.55, 0);
  b.box(gap + 0.18, 0.12, towerW * 0.86, PAL.tile, { ao: 0, jitter: 0.02 });
  b.pop();
}

/** Pylon (Tempel-/Palasttor): zwei geböschte Türme, Sturz, geflügelte Sonnenscheibe, Fahnenmasten. */
export function pylon(b: GeoBuilder, o: { tw?: number; gap?: number; h?: number; depth?: number; banners?: boolean } = {}) {
  const tw = o.tw ?? 2.6;
  const gap = o.gap ?? 2.4;
  const h = o.h ?? 5.4;
  const d = o.depth ?? 1.9;
  for (const s of [-1, 1]) {
    b.push();
    b.translate(s * (gap / 2 + tw / 2), 0, 0);
    b.taper(tw, d, tw * 0.82, d * 0.82, h, S, { top: SL, ao: 0.25, jitter: 0.04 });
    // Gesims
    b.translate(0, h, 0);
    b.box(tw * 0.9, 0.22, d * 0.9, PAL.tile, { ao: 0, jitter: 0.02 });
    b.translate(0, 0.22, 0);
    b.box(tw * 0.98, 0.16, d * 0.98, PAL.gold, { top: '#f9e08c', ao: 0, jitter: 0.02 });
    b.pop();
    // Nischen für die Fahnenmasten
    for (const sx of [-0.5, 0.5]) {
      b.push();
      b.translate(s * (gap / 2 + tw / 2) + sx * tw * 0.5, 0.9, d / 2 - 0.02 + 0.0);
      b.box(0.2, 2.5, 0.07, PAL.door, { ao: 0, jitter: 0.02 });
      b.pop();
    }
    // Fenster
    b.push();
    b.translate(s * (gap / 2 + tw / 2), h * 0.62, d * 0.45 - 0.02);
    b.box(0.42, 0.62, 0.06, PAL.door, { ao: 0, jitter: 0.02 });
    b.translate(0, 0.62, 0);
    b.box(0.56, 0.1, 0.09, SD, { ao: 0, jitter: 0.02 });
    b.pop();
  }
  // Sturz
  b.push();
  b.translate(0, h * 0.64, 0);
  b.box(gap + 0.2, h * 0.2, d * 0.84, S, { top: SL, ao: 0.1 });
  b.translate(0, h * 0.2, 0);
  b.box(gap + 0.34, 0.16, d * 0.92, PAL.tile, { ao: 0, jitter: 0.02 });
  b.pop();
  // geflügelte Sonnenscheibe an der Front
  b.push();
  b.translate(0, h * 0.64 + h * 0.05, d * 0.43 + 0.02);
  const wingCols = [PAL.turquoise, PAL.blue, PAL.gold];
  for (const s of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const w = 1.05 - i * 0.26;
      b.push();
      b.translate(s * (0.5 + w / 2), 0.08 + i * 0.2, 0);
      b.box(w, 0.13, 0.06, wingCols[i], { ao: 0, jitter: 0.02 });
      b.pop();
    }
  }
  b.translate(0, h * 0.24 + 0.34, 0);
  b.rotateX(Math.PI / 2);
  b.frustum(0.58, 0.58, 0.1, 14, PAL.gold, { top: '#fbe28f', alt: '#f6cf62', ao: 0, jitter: 0.02 });
  b.pop();
  if (o.banners !== false) {
    const cols = [PAL.cloth[0], PAL.cloth[1], PAL.cloth[2], PAL.cloth[0]];
    let k = 0;
    for (const s of [-1, 1]) {
      for (const sx of [-0.5, 0.5]) {
        b.push();
        b.translate(s * (gap / 2 + tw / 2) + sx * tw * 0.5, 0.0, d / 2 + 0.16);
        banner(b, h * 0.9, cols[k++ % cols.length]);
        b.pop();
      }
    }
  }
}

export interface PalaceOpts {
  fires?: (x: number, y: number, z: number) => void;
}

/**
 * Palast des Pharao – das optische Zentrum der Stadt.
 * Vorderseite (Pylon) bei z = 0, das Gebäude erstreckt sich nach -z (ca. 15 Einheiten tief, 12 breit).
 * Aufbau von vorn nach hinten: Sphinx-Allee, Pylon mit Sonnenscheibe, Säulenhof mit Becken,
 * Säulenhalle mit Lichtgaden, mehrstufiger Heiligtumsturm mit goldener Spitze.
 */
export function palace(b: GeoBuilder, o: PalaceOpts = {}) {
  const Y = 0.55;
  // Sockel in zwei Stufen
  b.push();
  b.translate(0, -0.5, -7.2);
  b.box(12.3, 0.78, 16.8, SD, { top: SL, ao: 0.2, jitter: 0.03 });
  b.translate(0, 0.78, 0);
  b.box(11.6, 0.27, 16.1, S, { top: SL, ao: 0, jitter: 0.03 });
  b.pop();
  // Freitreppe vor dem Tor
  for (let i = 0; i < 2; i++) {
    b.push();
    b.translate(0, -0.5, 1.45 + i * 0.5);
    b.box(3.2 - i * 0.2, 0.9 - i * 0.2, 0.5, i % 2 ? SL : S, { top: SL, ao: 0.1, jitter: 0.03 });
    b.pop();
  }

  b.push();
  b.translate(0, Y, 0);

  // ── Pylon ─────────────────────────────────────────────
  b.push();
  b.translate(0, 0, -0.3);
  pylon(b, { tw: 2.6, gap: 2.4, h: 5.4, depth: 1.9 });
  b.pop();
  // Obelisken am Tor
  for (const s of [-1, 1]) {
    b.push();
    b.translate(s * 4.7, 0, 0.4);
    obelisk(b, 4.0, 0.66);
    b.pop();
  }

  // ── Säulenhof ─────────────────────────────────────────
  b.push();
  b.translate(0, 0, -4.7);
  // Boden mit türkisem Rand
  b.box(6.9, 0.06, 6.7, '#f1e2bb', { top: '#f4e8c6', ao: 0, jitter: 0.02 });
  // Seitenmauern
  for (const s of [-1, 1]) {
    b.push();
    b.translate(s * 3.55, 0, 0);
    b.box(0.5, 2.9, 6.7, S, { top: SL, ao: 0.2, jitter: 0.04 });
    b.translate(0, 2.9, 0);
    b.box(0.64, 0.2, 6.84, PAL.tile, { ao: 0, jitter: 0.02 });
    b.translate(0, 0.2, 0);
    b.box(0.7, 0.12, 6.9, PAL.gold, { top: '#f9e08c', ao: 0, jitter: 0.02 });
    b.pop();
    // Säulenreihe
    for (let i = 0; i < 4; i++) {
      b.push();
      b.translate(s * 2.75, 0.0, -2.35 + i * 1.57);
      column(b, 2.1, 0.25);
      b.pop();
    }
    // Architrav über den Säulen
    b.push();
    b.translate(s * 3.08, 2.1 + 0.72, 0);
    b.box(1.34, 0.22, 6.5, SL, { top: S, ao: 0, jitter: 0.03 });
    b.pop();
  }
  // Wasserbecken
  b.push();
  b.translate(0, 0.02, 0.1);
  b.box(2.3, 0.2, 3.2, SD, { top: SL, ao: 0.2 });
  b.translate(0, 0.17, 0);
  b.box(1.9, 0.04, 2.8, '#3fcfc6', { top: '#6fe0d4', ao: 0, jitter: 0.015 });
  b.pop();
  for (const [x, z] of [[-1.35, 1.7], [1.35, 1.7], [-1.35, -1.5], [1.35, -1.5]] as const) {
    b.push();
    b.translate(x, 0.04, z);
    palm(b, 0.62);
    b.pop();
  }
  b.pop();

  // ── Säulenhalle mit Lichtgaden ────────────────────────
  b.push();
  b.translate(0, 0, -10.2);
  b.box(8.0, 3.6, 4.2, S, { top: SL, ao: 0.2, jitter: 0.04 });
  b.translate(0, 3.6, 0);
  b.box(8.34, 0.26, 4.5, PAL.tile, { ao: 0, jitter: 0.02 });
  b.translate(0, 0.26, 0);
  b.box(8.46, 0.14, 4.62, PAL.gold, { top: '#f9e08c', ao: 0, jitter: 0.02 });
  b.translate(0, 0.14, 0);
  b.box(4.8, 1.25, 2.8, SL, { top: SL, ao: 0.1, jitter: 0.03 });
  for (let i = -2; i <= 2; i++) {
    b.push();
    b.translate(i * 0.88, 0.45, 1.41);
    b.box(0.34, 0.55, 0.06, PAL.door, { ao: 0, jitter: 0.02 });
    b.pop();
  }
  b.translate(0, 1.25, 0);
  b.box(5.0, 0.14, 3.0, PAL.tile, { ao: 0, jitter: 0.02 });
  b.pop();
  // Tür der Halle + Vorhalle-Säulen
  b.push();
  b.translate(0, 0, -8.08);
  b.box(1.5, 2.5, 0.08, PAL.door, { ao: 0, jitter: 0.02 });
  b.translate(0, 2.5, 0);
  b.box(1.9, 0.18, 0.14, PAL.gold, { ao: 0, jitter: 0.02 });
  b.pop();
  for (const x of [-3.2, -2.15, 2.15, 3.2]) {
    b.push();
    b.translate(x, 0, -7.7);
    column(b, 2.55, 0.28);
    b.pop();
  }
  // ── Heiligtumsturm (gestuft) ──────────────────────────
  b.push();
  b.translate(0, 0, -13.7);
  b.taper(5.4, 3.3, 4.7, 2.9, 4.4, S, { top: SL, ao: 0.2, jitter: 0.04 });
  b.translate(0, 4.4, 0);
  b.box(4.95, 0.2, 3.1, PAL.tile, { ao: 0, jitter: 0.02 });
  b.translate(0, 0.2, 0);
  b.taper(4.2, 2.6, 3.4, 2.2, 2.5, SL, { top: SL, ao: 0.1, jitter: 0.03 });
  b.push();
  b.translate(0, 1.0, 1.25);
  for (const x of [-0.8, 0, 0.8]) {
    b.push();
    b.translate(x, 0, 0);
    b.box(0.3, 0.7, 0.06, PAL.door, { ao: 0, jitter: 0.02 });
    b.pop();
  }
  b.pop();
  b.translate(0, 2.5, 0);
  b.box(3.7, 0.18, 2.4, PAL.gold, { top: '#f9e08c', ao: 0, jitter: 0.02 });
  b.translate(0, 0.18, 0);
  b.taper(2.8, 1.8, 2.2, 1.4, 1.5, S, { top: SL, ao: 0.1, jitter: 0.03 });
  b.translate(0, 1.5, 0);
  b.frustum(1.25 * 0.7071, 0, 1.5, 4, PAL.gold, { rot: Math.PI / 4, alt: '#f9de88', ao: 0, jitter: 0.02 });
  b.pop();

  // ── Seitenflügel (Verwaltung, Kammern) ────────────────
  const wings: [number, number, number, number, number, boolean][] = [
    // side, z-center, depth, height, width, stair
    [1, -3.0, 3.2, 2.1, 1.9, false],
    [1, -7.6, 4.6, 2.9, 1.9, true],
    [1, -12.6, 4.6, 2.3, 1.9, false],
    [-1, -3.4, 3.8, 2.4, 1.9, false],
    [-1, -8.4, 5.4, 2.0, 1.9, false],
    [-1, -13.0, 3.4, 2.7, 1.9, false],
  ];
  for (const [side, zc, dep, hgt, wid, stair] of wings) {
    b.push();
    b.translate(side * 4.85, 0, zc);
    b.box(wid, hgt, dep, S, { top: SL, ao: 0.2, jitter: 0.04 });
    b.translate(0, hgt, 0);
    b.box(wid + 0.14, 0.14, dep + 0.14, SL, { top: PAL.stoneLight, ao: 0, jitter: 0.02 });
    b.translate(0, -hgt, 0);
    // Tür + Fenster an der Außenseite
    b.push();
    b.translate(side * (wid / 2 + 0.01), 0, 0);
    b.box(0.07, hgt * 0.5, 0.5, PAL.door, { ao: 0, jitter: 0.02 });
    b.translate(0, hgt * 0.55, dep * 0.28);
    b.box(0.07, 0.3, 0.26, PAL.door, { ao: 0, jitter: 0.02 });
    b.translate(0, 0, -dep * 0.56);
    b.box(0.07, 0.3, 0.26, PAL.door, { ao: 0, jitter: 0.02 });
    b.pop();
    if (stair) {
      for (let i = 0; i < 5; i++) {
        b.push();
        b.translate(side * (wid / 2 + 0.3), 0, -dep * 0.5 + 0.35 + i * 0.3);
        b.box(0.5, 0.16 + i * (hgt / 5.4), 0.3, SL, { ao: 0.1, jitter: 0.03 });
        b.pop();
      }
    }
    b.pop();
  }

  // Feuerschalen am Tor
  for (const s of [-1, 1]) {
    b.push();
    b.translate(s * 1.5, 0, 1.2);
    b.frustum(0.2, 0.12, 0.7, 6, PAL.stoneDark, { cap: false, ao: 0.2 });
    b.translate(0, 0.7, 0);
    b.frustum(0.28, 0.3, 0.12, 7, PAL.gold, { ao: 0, jitter: 0.02 });
    b.frustum(0.18, 0, 0.45, 5, '#f2862f', { ao: 0, jitter: 0.03, sway: (_x, y) => 2.0 * (y / 0.45) });
    if (o.fires) {
      const p = b.toWorld(0, 0.3, 0);
      o.fires(p[0], p[1], p[2]);
    }
    b.pop();
  }

  b.pop(); // Y

  // Sphinx-Allee (auf Bodenhöhe, vor dem Sockel)
  for (let i = 0; i < 2; i++) {
    for (const s of [-1, 1]) {
      b.push();
      b.translate(s * 1.8, 0, 2.4 + i * 1.7);
      b.rotateY(s > 0 ? -Math.PI / 2 : Math.PI / 2);
      sphinx(b, 0.9);
      b.pop();
    }
  }
}

/** Kleiner Tempel mit Säulenvorhalle, Vorderseite +z. */
export function temple(b: GeoBuilder) {
  b.push();
  b.translate(0, -0.3, 0);
  b.box(5.4, 0.5, 4.8, SD, { top: SL, ao: 0.2, jitter: 0.03 });
  b.translate(0, 0.5, 0);
  b.box(4.9, 0.2, 4.3, S, { top: SL, ao: 0, jitter: 0.03 });
  b.translate(0, 0.2, 0);
  // Cella
  b.push();
  b.translate(0, 0, -0.7);
  b.box(3.7, 2.4, 2.6, S, { top: SL, ao: 0.2, jitter: 0.04 });
  b.translate(0, 2.4, 0);
  b.box(4.0, 0.22, 2.9, PAL.tile, { ao: 0, jitter: 0.02 });
  b.translate(0, 0.22, 0);
  b.box(4.12, 0.12, 3.02, PAL.gold, { top: '#f9e08c', ao: 0, jitter: 0.02 });
  b.pop();
  // Säulen der Vorhalle
  for (const x of [-1.5, -0.5, 0.5, 1.5]) {
    b.push();
    b.translate(x, 0, 1.45);
    column(b, 1.85, 0.22);
    b.pop();
  }
  // Dach der Vorhalle
  b.push();
  b.translate(0, 1.85 + 0.72, 0.9);
  b.box(4.3, 0.24, 2.2, SL, { top: S, ao: 0, jitter: 0.03 });
  b.translate(0, 0.24, 0);
  b.box(4.4, 0.12, 2.3, PAL.tile, { ao: 0, jitter: 0.02 });
  b.pop();
  // Tür
  b.push();
  b.translate(0, 0, 0.62);
  b.box(1.0, 1.8, 0.07, PAL.door, { ao: 0, jitter: 0.02 });
  b.pop();
  b.pop();
}

/** Stadthaus im Sandstein-Look mit Markise. */
export function cityHouse(b: GeoBuilder, o: HouseOpts & { awning?: boolean; awningColors?: [ColorInput, ColorInput]; plants?: boolean }) {
  mudHouse(b, { ...o, color: o.color ?? [S, '#dcc08c', SL][Math.floor(b.rand() * 3)] });
  if (o.awning) {
    const [c1, c2] = o.awningColors ?? [PAL.cloth[0], PAL.cloth[3]];
    b.push();
    b.translate(o.w * 0.26 - 0.0, o.h * 0.64, o.d / 2);
    const aw = Math.min(1.2, o.w * 0.5);
    const n = 4;
    for (let i = 0; i < n; i++) {
      const x0 = -aw / 2 + (i / n) * aw;
      const x1 = -aw / 2 + ((i + 1) / n) * aw;
      b.quad([x0, 0.1, 0.0], [x1, 0.1, 0.0], [x1, -0.12, 0.55], [x0, -0.12, 0.55], i % 2 ? c2 : c1, { ao: 0, jitter: 0.02, sway: (_x, _y, z) => z * 0.15 });
    }
    b.pop();
  }
}

/** Brunnen mit rotem Wasser (erste Plage: der Nil wird zu Blut). */
export function bloodFountain(b: GeoBuilder, water: ColorInput = '#c9463a') {
  b.frustum(1.05, 1.0, 0.42, 10, SD, { alt: S, ao: 0.25, top: SL });
  b.push();
  b.translate(0, 0.4, 0);
  b.frustum(0.86, 0.86, 0.06, 10, water, { ao: 0, jitter: 0.02, top: '#e0594a' });
  b.translate(0, 0.06, 0);
  b.frustum(0.17, 0.12, 0.85, 6, SL, { ao: 0.1 });
  b.translate(0, 0.85, 0);
  b.frustum(0.36, 0.1, 0.2, 8, S, { ao: 0, top: SL });
  b.pop();
}

/** Kleiner Frosch (zweite Plage). Abstrakt: Körper, Hinterbeine, zwei Augenkuppeln. */
export function frog(b: GeoBuilder) {
  const g = '#6fb24a';
  b.push();
  b.translate(0, 0.07, 0);
  b.scale(1, 0.62, 1.15);
  b.blob(0.1, 0.1, 0.1, 0, g, { ao: 0.1, jitter: 0.05 });
  b.pop();
  for (const s of [-1, 1]) {
    b.push();
    b.translate(s * 0.07, 0.025, -0.07);
    b.scale(0.7, 0.45, 1.2);
    b.blob(0.06, 0.06, 0.07, 0, '#5ea23e', { ao: 0 });
    b.pop();
    b.push();
    b.translate(s * 0.045, 0.14, 0.06);
    b.blob(0.035, 0.035, 0.035, 0, '#f4f0c8', { ao: 0 });
    b.pop();
  }
}

/** Heuschrecke (achte Plage), winzig. */
export function locust(b: GeoBuilder) {
  b.push();
  b.translate(0, 0.03, 0);
  b.box(0.07, 0.035, 0.2, '#b8913f', { ao: 0, jitter: 0.08 });
  b.translate(0, 0.03, -0.02);
  b.box(0.1, 0.012, 0.16, '#d6b765', { ao: 0, jitter: 0.08 });
  b.pop();
}

/** Tür mit rot bemaltem Rahmen (Passah, 2. Mose 12) – Haus + Lamm. */
export function passoverDoor(b: GeoBuilder, w: number, h: number, d: number) {
  b.push();
  const z = d / 2 + 0.035;
  const x = -w * 0.18;
  const dh = h * 0.62;
  for (const s of [-1, 1]) {
    b.push();
    b.translate(x + s * 0.3, 0, z);
    b.box(0.08, dh + 0.12, 0.05, '#c9382f', { ao: 0, jitter: 0.02 });
    b.pop();
  }
  b.push();
  b.translate(x, dh + 0.1, z);
  b.box(0.7, 0.09, 0.05, '#c9382f', { ao: 0, jitter: 0.02 });
  b.pop();
  b.pop();
}
