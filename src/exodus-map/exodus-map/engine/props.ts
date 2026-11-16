import { PAL } from '../config';
import { toColor } from './GeoBuilder';
import type { ColorInput, GeoBuilder } from './GeoBuilder';

/**
 * Wiederverwendbare Low-Poly-Bausteine. Alle Funktionen zeichnen in lokalen Koordinaten
 * (Ursprung = Bodenpunkt) – positioniert wird per b.place(x, z, rotation, () => …).
 */

const pick = <T,>(b: GeoBuilder, arr: readonly T[]): T => arr[Math.floor(b.rand() * arr.length) % arr.length];

// ── Pflanzen ───────────────────────────────────────────────────────────────────────────────────
/** Frondenblatt in der xz-Ebene, zeigt nach +x, mit V-Falz und Absenkung. Wind wächst zur Spitze. */
function frond(b: GeoBuilder, len: number, width: number, droop: number, color: ColorInput) {
  const segs = 3;
  const pts: { c: [number, number, number]; l: [number, number, number]; r: [number, number, number]; w: number }[] = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const x = len * t;
    const y = len * (0.3 * Math.sin(Math.PI * t * 0.75) - droop * t * t);
    const hw = width * (0.45 + 0.55 * Math.sin(Math.PI * Math.min(1, t * 0.9 + 0.12))) * (1 - t * 0.75);
    pts.push({ c: [x, y + 0.05 * len * 0.25, 0], l: [x, y, -hw], r: [x, y, hw], w: 0.25 + 0.75 * t });
  }
  for (let i = 0; i < segs; i++) {
    const a = pts[i], n = pts[i + 1];
    b.tri(a.c, n.c, n.l, color, { ao: 0.12 }, a.w, n.w, n.w);
    b.tri(a.c, n.l, a.l, color, { ao: 0.12 }, a.w, n.w, a.w);
    b.tri(a.r, n.r, n.c, color, { ao: 0.12 }, a.w, n.w, n.w);
    b.tri(a.r, n.c, a.c, color, { ao: 0.12 }, a.w, n.w, a.w);
  }
}

export function palm(b: GeoBuilder, s = 1) {
  const r = b.rand;
  const dir = r() * Math.PI * 2;
  const lean = 0.1 + r() * 0.34;
  const segs = 3;
  const segH = 0.82 * s;
  b.push();
  b.rotateY(dir);
  for (let i = 0; i < segs; i++) {
    const rb = 0.12 * s * (1 - i * 0.17);
    const rt = 0.12 * s * (1 - (i + 1) * 0.17);
    const base = i * segH;
    b.frustum(rb, rt, segH * 1.05, 5, PAL.trunk, {
      cap: false,
      sway: (_x, y) => 0.025 + 0.1 * ((base + y) / (segs * segH)) ** 2,
      jitter: 0.06,
    });
    b.translate(0, segH, 0);
    b.rotateZ(lean / segs);
  }
  // Krone
  const n = 7;
  for (let k = 0; k < n; k++) {
    b.push();
    b.rotateY((k / n) * Math.PI * 2 + r() * 0.35);
    b.rotateZ(0.5 + r() * 0.3);
    frond(b, (1.25 + r() * 0.35) * s, 0.28 * s, 0.8 + r() * 0.5, pick(b, PAL.leaf));
    b.pop();
  }
  // Kokosnüsse
  b.blob(0.09 * s, 0.09 * s, 0.09 * s, 0, '#6b4a2a', { sway: 0.3, ao: 0 });
  b.pop();
}

/** Schilf/Papyrus-Büschel. */
export function reeds(b: GeoBuilder, count = 5, h = 1.5) {
  for (let i = 0; i < count; i++) {
    const a = b.rand() * Math.PI * 2;
    const d = b.rand() * 0.35;
    const hh = h * (0.7 + b.rand() * 0.6);
    b.push();
    b.translate(Math.cos(a) * d, 0, Math.sin(a) * d);
    b.rotateY(b.rand() * 6);
    b.rotateZ((b.rand() - 0.5) * 0.35);
    b.frustum(0.045, 0.012, hh, 3, pick(b, ['#7bb85a', '#6aa84c', '#8cc466']), { cap: false, sway: (_x, y) => 0.15 + 0.85 * (y / hh), ao: 0.15 });
    // Dolde
    b.translate(0, hh, 0);
    b.blob(0.11, 0.08, 0.11, 0, '#a98a4a', { sway: 1 });
    b.pop();
  }
}

export function bush(b: GeoBuilder, s = 1, color: ColorInput = PAL.bush) {
  const top = toColor(color).clone().offsetHSL(0.01, 0.03, 0.07);
  b.push();
  b.translate(0, 0.26 * s, 0);
  b.blob(0.46 * s, 0.4 * s, 0.46 * s, 0, color, { top, jitter: 0.06, sway: 0.12, ao: 0.25 });
  b.push();
  b.translate(0.34 * s, -0.08 * s, 0.12 * s);
  b.blob(0.3 * s, 0.26 * s, 0.3 * s, 0, color, { top, jitter: 0.06, sway: 0.12, ao: 0.25 });
  b.pop();
  b.push();
  b.translate(-0.28 * s, -0.1 * s, -0.2 * s);
  b.blob(0.26 * s, 0.22 * s, 0.26 * s, 0, color, { top, jitter: 0.06, sway: 0.12, ao: 0.25 });
  b.pop();
  b.pop();
}

/** Flachkronige Wüstenakazie: knorriger Stamm, Krone aus mehreren flachen Laubschichten. */
export function acacia(b: GeoBuilder, s = 1) {
  b.push();
  b.rotateY(b.rand() * 6);
  b.frustum(0.1 * s, 0.06 * s, 1.1 * s, 5, PAL.woodDark, { cap: false, sway: 0.03 });
  b.translate(0, 1.0 * s, 0);
  b.rotateZ(0.22);
  b.frustum(0.055 * s, 0.035 * s, 0.4 * s, 4, PAL.woodDark, { cap: false, sway: 0.05 });
  b.translate(0, 0.34 * s, 0);
  b.rotateZ(-0.22);
  const leaf = (x: number, y: number, z: number, r: number, h: number, c: string) => {
    b.push();
    b.translate(x * s, y * s, z * s);
    b.scale(1, h, 1);
    b.blob(r * s, r * s, r * s, 1, c, { top: '#9ccb62', jitter: 0.07, sway: 0.2, ao: 0.12 });
    b.pop();
  };
  leaf(0, 0.12, 0, 1.0, 0.36, '#7fb450');
  leaf(0.55, -0.02, 0.25, 0.7, 0.34, '#76ab4b');
  leaf(-0.5, 0.0, -0.3, 0.66, 0.34, '#86bb56');
  leaf(0.05, 0.3, -0.05, 0.62, 0.34, '#8cc25c');
  b.pop();
}

// ── Gebäude Ägyptens ───────────────────────────────────────────────────────────────────────────
export interface HouseOpts {
  w: number;
  d: number;
  h: number;
  color?: ColorInput;
  second?: boolean;
  dome?: boolean;
  stair?: boolean;
  door?: boolean;
}

/** Lehmziegelhaus mit Flachdach, Tür, Fenster, optionalem Obergeschoss/Kuppel/Außentreppe. */
export function mudHouse(b: GeoBuilder, o: HouseOpts) {
  b.push();
  const col = o.color ?? pick(b, [PAL.mud, PAL.mudLight, PAL.mudDark]);
  const roof = PAL.mudLight;
  b.box(o.w, o.h, o.d, col, { top: roof });
  b.translate(0, o.h, 0);
  b.box(o.w + 0.14, 0.13, o.d + 0.14, PAL.mudLight, { top: PAL.stoneLight, ao: 0 });
  b.translate(0, 0.13, 0);
  if (o.second) {
    b.push();
    b.translate(o.w * 0.12, 0, -o.d * 0.1);
    const w2 = o.w * 0.6, d2 = o.d * 0.6, h2 = o.h * 0.7;
    b.box(w2, h2, d2, col, { top: roof });
    b.translate(0, h2, 0);
    b.box(w2 + 0.12, 0.11, d2 + 0.12, PAL.mudLight, { top: PAL.stoneLight, ao: 0 });
    b.pop();
  }
  if (o.dome) {
    b.push();
    b.translate(-o.w * 0.2, 0, o.d * 0.05);
    b.scale(1, 0.75, 1);
    b.blob(Math.min(o.w, o.d) * 0.3, Math.min(o.w, o.d) * 0.3, Math.min(o.w, o.d) * 0.3, 1, PAL.stoneLight, { ao: 0.1 });
    b.pop();
  }
  // Tür & Fenster an der +z-Seite
  b.translate(0, -(o.h + 0.13), 0);
  if (o.door !== false) {
    b.push();
    b.translate(-o.w * 0.18, 0, o.d / 2 + 0.01);
    b.box(0.46, o.h * 0.62, 0.06, PAL.door, { ao: 0, jitter: 0.02 });
    b.translate(0, o.h * 0.62, 0);
    b.box(0.62, 0.1, 0.1, PAL.stoneDark, { ao: 0, jitter: 0.02 });
    b.pop();
    b.push();
    b.translate(o.w * 0.26, o.h * 0.5, o.d / 2 + 0.01);
    b.box(0.26, 0.24, 0.05, PAL.door, { ao: 0, jitter: 0.02 });
    b.pop();
  }
  if (o.stair) {
    b.push();
    b.translate(o.w / 2 + 0.22, 0, 0);
    for (let i = 0; i < 4; i++) {
      b.push();
      b.translate(0, 0, (i - 1.5) * 0.16);
      b.box(0.4, 0.17 * (i + 1) * (o.h / 0.68), 0.16, PAL.mudLight, { ao: 0.1 });
      b.pop();
    }
    b.pop();
  }
  b.pop();
}

/** Kleine Lehmziegel-Stapel (Ziegelei in Ägypten). */
export function brickStack(b: GeoBuilder, rows = 4, cols = 3) {
  const bw = 0.42, bh = 0.16, bd = 0.22;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols - (y % 2); x++) {
      b.push();
      b.translate((x - (cols - 1) / 2 + (y % 2) * 0.5) * (bw + 0.02), y * bh, 0);
      b.box(bw, bh, bd, pick(b, [PAL.mud, PAL.mudLight, PAL.mudDark]), { jitter: 0.06 });
      b.pop();
    }
  }
}

export function jar(b: GeoBuilder, s = 1, color: ColorInput = '#c97f4e') {
  b.push();
  b.frustum(0.14 * s, 0.2 * s, 0.22 * s, 6, color, { cap: false, ao: 0.2 });
  b.translate(0, 0.22 * s, 0);
  b.frustum(0.2 * s, 0.1 * s, 0.16 * s, 6, color, { cap: false, ao: 0 });
  b.translate(0, 0.16 * s, 0);
  b.frustum(0.1 * s, 0.12 * s, 0.07 * s, 6, color, { ao: 0 });
  b.pop();
}

export function sack(b: GeoBuilder, s = 1, color: ColorInput = '#d8c08a') {
  b.push();
  b.translate(0, 0.2 * s, 0);
  b.blob(0.22 * s, 0.22 * s, 0.2 * s, 1, color, { jitter: 0.07 });
  b.translate(0, 0.2 * s, 0);
  b.blob(0.07 * s, 0.07 * s, 0.07 * s, 0, color, { jitter: 0.07 });
  b.pop();
}

export function basket(b: GeoBuilder, s = 1) {
  b.frustum(0.2 * s, 0.28 * s, 0.22 * s, 7, '#b98b4e', { alt: '#a57a42', ao: 0.2 });
}

export function crate(b: GeoBuilder, s = 1) {
  b.box(0.45 * s, 0.34 * s, 0.4 * s, PAL.wood, { top: '#a2713f', ao: 0.25 });
}

/** Gerolltes Zelttuch / Matte, liegend. */
export function bedroll(b: GeoBuilder, color: ColorInput = '#d5584a') {
  b.push();
  b.translate(0, 0.14, 0);
  b.rotateZ(Math.PI / 2);
  b.translate(-0.3, 0.0, 0);
  b.frustum(0.14, 0.14, 0.6, 6, color, { alt: '#f2e6c9', ao: 0.2 });
  b.pop();
}

// ── Zelte & Lager ──────────────────────────────────────────────────────────────────────────────
export function tentGable(b: GeoBuilder, w = 1.9, h = 1.15, d = 1.7, color: ColorInput = PAL.tentCream, flap: ColorInput = PAL.tentBrown) {
  b.gable(w, h, d, color, { end: flap, top: color, ao: 0.2 });
  // Eingang
  b.push();
  b.translate(0, 0, d / 2 + 0.01);
  b.tri([-w * 0.16, 0, 0], [w * 0.16, 0, 0], [0, h * 0.56, 0], '#4a3220', { ao: 0, jitter: 0.02 });
  b.pop();
  // Mastspitzen
  for (const sz of [-1, 1]) {
    b.push();
    b.translate(0, h, sz * (d / 2));
    b.frustum(0.03, 0.02, 0.3, 4, PAL.woodDark, { ao: 0 });
    b.pop();
  }
}

export function tentRound(b: GeoBuilder, r = 1.0, h = 1.35, color: ColorInput = PAL.tentTan, alt: ColorInput = PAL.tentBrown) {
  b.push();
  const wallH = h * 0.38;
  b.frustum(r, r * 0.97, wallH, 8, color, { alt, ao: 0.25, rot: 0.3, cap: false });
  b.translate(0, wallH, 0);
  b.frustum(r * 1.05, r * 0.08, h - wallH, 8, color, { alt, ao: 0, rot: 0.3, top: PAL.tentCream });
  // Eingang (dunkles Dreieck) an der +z-Seite
  b.push();
  b.translate(0, -wallH, r * 0.97 + 0.01);
  b.tri([-r * 0.2, 0, 0], [r * 0.2, 0, 0], [0, wallH * 1.15, 0], '#4a3220', { ao: 0, jitter: 0.02 });
  b.pop();
  b.translate(0, h - wallH - 0.02, 0);
  b.frustum(0.03, 0.02, 0.3, 4, PAL.woodDark, { ao: 0 });
  b.pop();
}

/** Gestreiftes Marktzelt (Dach auf vier Pfosten). */
export function stall(b: GeoBuilder, c1: ColorInput = PAL.cloth[0], c2: ColorInput = PAL.cloth[3]) {
  const w = 1.5, d = 1.1, h = 0.95;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    b.push();
    b.translate(sx * (w / 2 - 0.05), 0, sz * (d / 2 - 0.05));
    b.frustum(0.04, 0.035, h, 4, PAL.woodDark, { ao: 0.1 });
    b.pop();
  }
  b.push();
  b.translate(0, h, 0);
  const n = 6;
  for (let i = 0; i < n; i++) {
    const x0 = -w / 2 + (i / n) * w;
    const x1 = -w / 2 + ((i + 1) / n) * w;
    const col = i % 2 ? c2 : c1;
    b.quad([x0, 0.0, d / 2 + 0.08], [x1, 0.0, d / 2 + 0.08], [x1, 0.3, -d / 2], [x0, 0.3, -d / 2], col, { ao: 0, jitter: 0.02, sway: 0.1 });
  }
  b.pop();
  // Waren
  b.push();
  b.translate(0, 0, 0.1);
  b.box(w * 0.8, 0.38, d * 0.5, PAL.wood, { top: '#b78752' });
  for (let i = 0; i < 3; i++) {
    b.push();
    b.translate((i - 1) * 0.38, 0.38, 0);
    b.blob(0.13, 0.1, 0.13, 0, pick(b, ['#e0a63e', '#c8553f', '#78b24e']), { ao: 0 });
    b.pop();
  }
  b.pop();
}

export function campfire(b: GeoBuilder) {
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    b.push();
    b.translate(Math.cos(a) * 0.38, 0, Math.sin(a) * 0.38);
    b.rock(0.13, 0.1, 0.13, 0, 0.25, '#8f8478', { ao: 0.2 });
    b.pop();
  }
  b.push();
  b.rotateY(0.5);
  b.box(0.7, 0.08, 0.1, PAL.woodDark, { ao: 0 });
  b.rotateY(1.4);
  b.box(0.7, 0.08, 0.1, PAL.woodDark, { ao: 0 });
  b.pop();
  // Flammen (flackern per Wind-Shader)
  const flame = (h: number, r: number, col: string, ox: number, oz: number) => {
    b.push();
    b.translate(ox, 0.06, oz);
    b.frustum(r, 0, h, 5, col, { ao: 0, jitter: 0.03, sway: (_x, y) => 2.2 * (y / h) });
    b.pop();
  };
  flame(0.52, 0.17, '#f2862f', 0, 0);
  flame(0.36, 0.12, '#f7b53a', 0.08, 0.06);
  flame(0.26, 0.08, '#fbe07a', -0.06, -0.05);
}

// ── Fels ───────────────────────────────────────────────────────────────────────────────────────
export function rockCluster(b: GeoBuilder, s = 1, colors: readonly ColorInput[] = [PAL.rock, PAL.rockLight, PAL.rockDark]) {
  const n = 2 + Math.floor(b.rand() * 3);
  for (let i = 0; i < n; i++) {
    b.push();
    b.translate((b.rand() - 0.5) * 1.2 * s, 0.1 * s, (b.rand() - 0.5) * 1.2 * s);
    b.rotateY(b.rand() * 6);
    const k = (0.35 + b.rand() * 0.55) * s;
    b.rock(k, k * (0.6 + b.rand() * 0.5), k * (0.8 + b.rand() * 0.4), 1, 0.22, pick(b, colors), { top: PAL.rockLight, jitter: 0.07 });
    b.pop();
  }
}

/** Tafelberg: gestapelte, nach oben schmaler werdende Schichten. */
export function butte(b: GeoBuilder, w: number, d: number, h: number, layers = 4, colors: readonly ColorInput[] = [PAL.rock, PAL.rockLight, '#a8683f', PAL.rockPale]) {
  let cw = w, cd = d, y = 0;
  const lh = h / layers;
  for (let i = 0; i < layers; i++) {
    const nw = cw * (0.82 + b.rand() * 0.1);
    const nd = cd * (0.82 + b.rand() * 0.1);
    b.push();
    b.translate((b.rand() - 0.5) * 0.18, y, (b.rand() - 0.5) * 0.18);
    b.rotateY((b.rand() - 0.5) * 0.25);
    b.taper(cw, cd, nw, nd, lh, colors[i % colors.length], { top: PAL.rockPale, jitter: 0.06, ao: i === 0 ? 0.3 : 0.12 });
    b.pop();
    cw = nw;
    cd = nd;
    y += lh * 0.98;
  }
}

export function spire(b: GeoBuilder, r: number, h: number, color: ColorInput = PAL.rock) {
  b.push();
  b.frustum(r, r * 0.45, h * 0.7, 5, color, { alt: PAL.rockDark, ao: 0.3, rot: b.rand() });
  b.translate(0, h * 0.7, 0);
  b.frustum(r * 0.45, 0, h * 0.3, 5, PAL.rockLight, { alt: color, ao: 0 });
  b.pop();
}

// ── Monumente ──────────────────────────────────────────────────────────────────────────────────
/** Pyramide aus Schichten mit hervorstehenden Quadern (wie in der Vorlage), goldene Spitze optional. */
export function pyramid(b: GeoBuilder, base: number, height: number, opts: { cap?: boolean; slabs?: number } = {}) {
  const layers = Math.max(5, Math.round(height * 0.9));
  const lh = height / layers;
  const colA = PAL.stone, colB = '#dcc08c';
  for (let i = 0; i < layers; i++) {
    const t0 = i / layers, t1 = (i + 1) / layers;
    const w0 = base * (1 - t0), w1 = base * (1 - t1 * 0.995);
    b.push();
    b.translate(0, i * lh, 0);
    if (i === layers - 1) b.frustum(w0 * 0.7071, 0, lh, 4, opts.cap === false ? colA : PAL.stoneLight, { rot: Math.PI / 4, ao: 0.1, jitter: 0.05 });
    else b.taper(w0, w0, w1, w1, lh, i % 2 ? colA : colB, { ao: i === 0 ? 0.3 : 0.08, jitter: 0.05 });
    b.pop();
  }
  // Quader auf den Flächen
  const slabs = opts.slabs ?? Math.round(base * 1.4);
  const psi = Math.atan(base / 2 / height);
  for (let side = 0; side < 4; side++) {
    b.push();
    b.rotateY((side * Math.PI) / 2);
    for (let k = 0; k < slabs / 4; k++) {
      const u = 0.06 + b.rand() * 0.7;
      const hw = (base / 2) * (1 - u);
      const w = (0.35 + b.rand() * 0.7) * (base / 9);
      const x = (b.rand() * 2 - 1) * Math.max(0.1, hw - w * 0.6);
      b.push();
      b.translate(x, u * height, hw);
      b.rotateX(-psi);
      b.box(w, (0.3 + b.rand() * 0.5) * (base / 9), 0.26, pick(b, [PAL.stone, PAL.stoneLight, '#d8b983', PAL.stoneDark]), { top: PAL.stoneLight, ao: 0.06, jitter: 0.06 });
      b.pop();
    }
    b.pop();
  }
}

export function obelisk(b: GeoBuilder, h = 3.6, w = 0.7) {
  b.push();
  b.box(w * 1.7, 0.22, w * 1.7, PAL.stoneDark, { top: PAL.stone });
  b.translate(0, 0.22, 0);
  b.taper(w, w, w * 0.55, w * 0.55, h, PAL.stoneLight, { top: PAL.stoneLight, jitter: 0.03 });
  b.translate(0, h, 0);
  b.frustum(w * 0.55 * 0.7071, 0, w * 0.7, 4, PAL.gold, { rot: Math.PI / 4, ao: 0, jitter: 0.02 });
  b.pop();
}

export function column(b: GeoBuilder, h = 2.2, r = 0.26, band: ColorInput = PAL.turquoise) {
  b.push();
  b.frustum(r * 1.35, r * 1.25, 0.14, 8, PAL.stoneDark, { ao: 0.25 });
  b.translate(0, 0.14, 0);
  b.frustum(r, r * 0.88, h, 8, PAL.stoneLight, { cap: false, jitter: 0.03, ao: 0.1 });
  b.translate(0, h, 0);
  b.frustum(r * 0.95, r * 1.05, 0.12, 8, band, { cap: false, ao: 0, jitter: 0.02 });
  b.translate(0, 0.12, 0);
  b.frustum(r * 1.05, r * 1.5, 0.34, 8, PAL.stone, { alt: PAL.stoneLight, ao: 0, jitter: 0.03 });
  b.translate(0, 0.34, 0);
  b.box(r * 3.4, 0.12, r * 3.4, PAL.stoneDark, { top: PAL.stone, ao: 0 });
  b.pop();
}

/** Sphinx – bewusst abstrakt und ohne Gesichtszüge. */
export function sphinx(b: GeoBuilder, s = 1) {
  b.push();
  b.scale(s);
  b.box(0.95, 0.15, 1.9, PAL.stoneDark, { ao: 0.2 });
  b.translate(0, 0.15, 0);
  b.box(0.7, 0.55, 1.15, PAL.stone, { top: PAL.stoneLight, jitter: 0.05 });
  b.push();
  b.translate(0, 0, 0.95);
  b.box(0.52, 0.3, 0.75, PAL.stone, { top: PAL.stoneLight, jitter: 0.05 }); // Vordertatzen
  b.pop();
  b.push();
  b.translate(0, 0.55, 0.45);
  b.box(0.46, 0.42, 0.5, PAL.stoneLight, { top: PAL.stoneLight });
  b.translate(0, 0.42, 0);
  b.gable(0.58, 0.18, 0.54, PAL.turquoise, { end: PAL.gold, ao: 0 }); // Kopftuch
  b.pop();
  b.pop();
}

/** Mast mit Banner, der im Wind flattert. */
export function banner(b: GeoBuilder, h = 2.6, color: ColorInput = PAL.cloth[0], gold = true) {
  b.frustum(0.05, 0.04, h, 5, PAL.woodDark, { ao: 0.1 });
  if (gold) {
    b.push();
    b.translate(0, h, 0);
    b.blob(0.09, 0.09, 0.09, 0, PAL.gold, { ao: 0 });
    b.pop();
  }
  const fw = 0.7, fh = 0.9;
  const y0 = h - 0.15;
  b.quad([0.04, y0 - fh, 0], [0.04 + fw, y0 - fh * 0.96, 0], [0.04 + fw, y0, 0], [0.04, y0, 0], color, { ao: 0, sway: (x) => Math.max(0, (x - 0.04) / fw) * 2.2, jitter: 0.02 });
  b.quad([0.04, y0, 0], [0.04 + fw, y0, 0], [0.04 + fw, y0 - fh * 0.96, 0], [0.04, y0 - fh, 0], color, { ao: 0, sway: (x) => Math.max(0, (x - 0.04) / fw) * 2.2, jitter: 0.02 });
}

// ── Tiere ──────────────────────────────────────────────────────────────────────────────────────
export function sheep(b: GeoBuilder) {
  const wool = pick(b, ['#f7f1e1', '#efe6d0', '#f3ead8']);
  b.push();
  b.translate(0, 0.3, 0);
  b.blob(0.3, 0.22, 0.2, 1, wool, { jitter: 0.06, ao: 0.25 });
  b.pop();
  b.push();
  b.translate(0.3, 0.38, 0);
  b.box(0.17, 0.17, 0.15, '#5a4636', { ao: 0, jitter: 0.03 });
  b.pop();
  for (const [x, z] of [[-0.15, -0.09], [-0.15, 0.09], [0.14, -0.09], [0.14, 0.09]] as const) {
    b.push();
    b.translate(x, 0, z);
    b.box(0.06, 0.22, 0.06, '#5a4636', { ao: 0.1, jitter: 0.02 });
    b.pop();
  }
}

export function camel(b: GeoBuilder, loaded = true) {
  const fur = pick(b, ['#d7ad6e', '#cfa264', '#dcb77d']);
  const light = '#e6c68e';
  const dark = '#b98a4c';
  // Rumpf, Brust, Hinterteil, Höcker
  b.push();
  b.translate(0, 0.9, 0);
  b.blob(0.62, 0.34, 0.3, 1, fur, { ao: 0.25, jitter: 0.04, top: light });
  b.pop();
  b.push();
  b.translate(0.42, 0.9, 0);
  b.blob(0.3, 0.36, 0.27, 1, fur, { ao: 0.2, jitter: 0.04 });
  b.pop();
  b.push();
  b.translate(-0.44, 0.9, 0);
  b.blob(0.31, 0.33, 0.27, 1, fur, { ao: 0.2, jitter: 0.04 });
  b.pop();
  b.push();
  b.translate(-0.08, 1.26, 0);
  b.blob(0.2, 0.24, 0.19, 1, fur, { ao: 0, jitter: 0.04, top: light });
  b.pop();
  // Beine
  for (const [x, z] of [[-0.44, -0.15], [-0.44, 0.15], [0.44, -0.15], [0.44, 0.15]] as const) {
    b.push();
    b.translate(x, 0, z);
    b.frustum(0.09, 0.065, 0.82, 5, fur, { ao: 0.25, jitter: 0.04, cap: false });
    b.pop();
    b.push();
    b.translate(x, 0, z);
    b.frustum(0.1, 0.1, 0.1, 5, dark, { ao: 0, jitter: 0.03 }); // Fuß
    b.pop();
  }
  // Hals und Kopf (ohne Gesichtszüge, nur Formen)
  b.push();
  b.translate(0.56, 1.02, 0);
  b.rotateZ(-0.58);
  b.frustum(0.15, 0.095, 0.9, 5, fur, { ao: 0.1, jitter: 0.04, cap: false });
  b.pop();
  b.push();
  b.translate(0.99, 1.8, 0);
  b.rotateZ(-0.3);
  b.blob(0.2, 0.1, 0.09, 1, fur, { ao: 0, jitter: 0.04 });
  b.translate(0.2, -0.03, 0);
  b.blob(0.13, 0.075, 0.075, 0, light, { ao: 0, jitter: 0.04 });
  b.pop();
  // Schwanz
  b.push();
  b.translate(-0.7, 1.0, 0);
  b.rotateZ(0.7);
  b.frustum(0.04, 0.02, 0.38, 4, dark, { ao: 0, jitter: 0.03 });
  b.pop();
  if (loaded) {
    // Satteldecke + zwei Bündel + Rolle quer über dem Höcker
    const cloth = pick(b, PAL.cloth);
    b.push();
    b.translate(-0.08, 1.12, 0);
    b.box(0.74, 0.1, 0.7, cloth, { top: PAL.cloth[3], ao: 0, jitter: 0.03 });
    b.pop();
    for (const sz of [-1, 1]) {
      b.push();
      b.translate(-0.08, 0.86, sz * 0.4);
      b.box(0.62, 0.5, 0.26, pick(b, ['#c9a46a', '#d8c08a', '#b9a07a']), { top: '#e2cd9a', ao: 0.1, jitter: 0.05 });
      b.translate(0, 0.5, 0);
      b.blob(0.2, 0.12, 0.15, 0, '#d8c08a', { ao: 0 });
      b.pop();
    }
    b.push();
    b.translate(-0.08, 1.58, 0);
    b.rotateX(Math.PI / 2);
    b.translate(0, -0.42, 0);
    b.frustum(0.14, 0.14, 0.84, 6, PAL.cloth[(Math.floor(b.rand() * 3) + 1) % 5], { alt: PAL.cloth[3], ao: 0, jitter: 0.03 });
    b.pop();
  }
}

export function cart(b: GeoBuilder) {
  b.push();
  b.translate(0, 0.42, 0);
  b.box(1.5, 0.12, 0.85, PAL.wood, { top: '#a2713f', ao: 0.1 });
  b.pop();
  for (const sz of [-1, 1]) {
    b.push();
    b.translate(0, 0.32, sz * 0.5);
    b.rotateX(Math.PI / 2);
    b.translate(0, -0.05, 0);
    b.frustum(0.32, 0.32, 0.1, 8, PAL.woodDark, { alt: PAL.wood, ao: 0 });
    b.pop();
  }
  b.push();
  b.translate(-1.1, 0.46, 0);
  b.box(1.0, 0.07, 0.07, PAL.woodDark, { ao: 0 });
  b.pop();
  b.push();
  b.translate(0.1, 0.54, 0);
  sack(b, 1.3);
  b.translate(0.45, 0, 0.1);
  sack(b, 1.1, '#cdb47c');
  b.translate(-0.8, 0, -0.1);
  basket(b, 1.2);
  b.pop();
}
