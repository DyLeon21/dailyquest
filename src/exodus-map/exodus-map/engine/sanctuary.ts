import { PAL } from '../config';
import type { ColorInput, GeoBuilder } from './GeoBuilder';

/**
 * Bausteine für Station 6: Vorhof und Stiftshütte (2. Mose 25–40), Bronzealtar, Waschbecken
 * und die beiden Gesetzestafeln auf dem Gipfel. Alles in lokalen Koordinaten (Ursprung = Bodenpunkt).
 * Konvention für den Vorhof: +z = Süden (Eingang), −z = Norden (Zelt).
 */

const BRONZE = '#c47a3c';
const BRONZE_D = '#9c5a2a';
const BRONZE_L = '#e09c58';
const SILVER = '#efe6d2';
const BLUE = PAL.blue;
const PURPLE = PAL.cloth[4];
const SCARLET = PAL.cloth[0];

/** Pfosten des Vorhofs: Bronzesockel, helle Säule, goldener Knauf. */
function post(b: GeoBuilder, h = 1.0, knob = true) {
  b.frustum(0.1, 0.085, 0.1, 6, BRONZE_D, { ao: 0.15, jitter: 0.03 });
  b.push();
  b.translate(0, 0.1, 0);
  b.frustum(0.05, 0.042, h - 0.1, 5, SILVER, { cap: false, ao: 0.1, jitter: 0.03 });
  b.translate(0, h - 0.1, 0);
  if (knob) b.blob(0.075, 0.075, 0.075, 0, PAL.gold, { ao: 0, jitter: 0.02 });
  b.pop();
}

/** Zeichnet ein Rechteck aus Leinenwänden mit Pfosten; die Südseite hat eine Toröffnung. */
export function courtFence(b: GeoBuilder, w: number, d: number, gate = 1.5) {
  const hx = w / 2;
  const hz = d / 2;
  const sides: [number, number, number, number][] = [
    [-hx, -hz, hx, -hz], // Nord
    [hx, -hz, hx, hz], // Ost
    [-hx, hz, -hx, -hz], // West
  ];
  const panel = (x0: number, z0: number, x1: number, z1: number) => {
    const len = Math.hypot(x1 - x0, z1 - z0);
    if (len < 0.05) return;
    b.push();
    b.translate((x0 + x1) / 2, 0, (z0 + z1) / 2);
    b.rotateY(-Math.atan2(z1 - z0, x1 - x0));
    b.translate(0, 0.14, 0);
    b.box(len - 0.1, 0.78, 0.05, PAL.linen, { top: '#fffaf0', ao: 0.12, jitter: 0.025 });
    // Saum
    b.box(len - 0.1, 0.07, 0.07, '#e7d4a6', { ao: 0, jitter: 0.02 });
    b.pop();
  };
  for (const [x0, z0, x1, z1] of sides) {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const n = Math.max(1, Math.round(len / 0.95));
    for (let i = 0; i < n; i++) {
      const ax = x0 + ((x1 - x0) * i) / n;
      const az = z0 + ((z1 - z0) * i) / n;
      const bx = x0 + ((x1 - x0) * (i + 1)) / n;
      const bz = z0 + ((z1 - z0) * (i + 1)) / n;
      panel(ax, az, bx, bz);
    }
    for (let i = 0; i < n; i++) {
      b.push();
      b.translate(x0 + ((x1 - x0) * i) / n, 0, z0 + ((z1 - z0) * i) / n);
      post(b);
      b.pop();
    }
  }
  // Südseite: zwei Flügel + Tor
  const gx = gate / 2;
  for (const s of [-1, 1]) {
    const xe = s * hx;
    const xi = s * gx;
    const len = Math.abs(xe - xi);
    const n = Math.max(1, Math.round(len / 0.95));
    for (let i = 0; i < n; i++) panel(xi + ((xe - xi) * i) / n, hz, xi + ((xe - xi) * (i + 1)) / n, hz);
    // Ecken gehören zu den Seitenwänden (West: Start, Ost: fehlt) → Südwestecke nicht doppelt setzen
    for (let i = 1; i <= (s < 0 ? n - 1 : n); i++) {
      b.push();
      b.translate(xi + ((xe - xi) * i) / n, 0, hz);
      post(b);
      b.pop();
    }
  }
  // Torpfosten (höher, goldene Köpfe)
  for (const s of [-1, 1]) {
    b.push();
    b.translate(s * gx, 0, hz);
    post(b, 1.4);
    b.pop();
  }
  // Torvorhang: zwei gerafft hängende Bahnen (blau/purpur und scharlach/purpur) + goldene Stange
  const bands: [number, ColorInput][] = [
    [-1, BLUE],
    [-1, PURPLE],
    [1, SCARLET],
    [1, PURPLE],
  ];
  let li = 0;
  let ri = 0;
  for (const [side, col] of bands) {
    const k = side < 0 ? li++ : ri++;
    const x0 = side * (gx - 0.06 - k * 0.22);
    const x1 = side * (gx - 0.06 - (k + 1) * 0.22);
    const y0 = 0.16;
    const y1 = 1.28;
    const sway = (_x: number, y: number) => 0.5 * (1 - (y - y0) / (y1 - y0));
    b.quad([x0, y0, hz], [x1, y0, hz], [x1, y1, hz], [x0, y1, hz], col, { ao: 0, jitter: 0.02, sway });
    b.quad([x0, y1, hz], [x1, y1, hz], [x1, y0, hz], [x0, y0, hz], col, { ao: 0, jitter: 0.02, sway });
  }
  b.push();
  b.translate(0, 1.28, hz);
  b.box(gate + 0.1, 0.06, 0.07, PAL.gold, { ao: 0, jitter: 0.02 });
  b.pop();
}

/** Heller Hofboden mit Trittplatten. */
export function courtFloor(b: GeoBuilder, w: number, d: number) {
  b.box(w - 0.12, 0.05, d - 0.12, '#f4e4b8', { top: '#f7ebc8', ao: 0, jitter: 0.012 });
}

/** Brandopferaltar aus Bronze mit vier Hörnern, Rost und Feuer. Gibt die Feuerposition (lokal) zurück. */
export function bronzeAltar(b: GeoBuilder): [number, number, number] {
  b.push();
  b.translate(0, 0.05, 0);
  b.box(1.05, 0.16, 1.05, BRONZE_D, { top: BRONZE, ao: 0.2, jitter: 0.03 });
  b.translate(0, 0.16, 0);
  b.taper(0.9, 0.9, 0.84, 0.84, 0.44, BRONZE, { top: BRONZE_L, ao: 0.1, jitter: 0.035 });
  b.translate(0, 0.44, 0);
  b.box(0.98, 0.05, 0.98, BRONZE_L, { top: BRONZE_L, ao: 0, jitter: 0.03 });
  // Hörner an den vier Ecken
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    b.push();
    b.translate(sx * 0.43, 0.05, sz * 0.43);
    b.frustum(0.065, 0.02, 0.2, 4, BRONZE_L, { ao: 0, jitter: 0.03, rot: Math.PI / 4 });
    b.pop();
  }
  // Rost + Glut
  b.push();
  b.translate(0, 0.05, 0);
  b.box(0.72, 0.05, 0.72, '#6f4a30', { top: '#d9622a', ao: 0, jitter: 0.04 });
  b.translate(0, 0.05, 0);
  const flame = (h: number, r: number, col: string, ox: number, oz: number) => {
    b.push();
    b.translate(ox, 0, oz);
    b.frustum(r, 0, h, 5, col, { ao: 0, jitter: 0.03, sway: (_x, y) => 2.0 * (y / h) });
    b.pop();
  };
  flame(0.6, 0.2, '#f2862f', 0, 0);
  flame(0.42, 0.14, '#f7b53a', 0.14, 0.1);
  flame(0.3, 0.1, '#fbe07a', -0.1, -0.08);
  flame(0.34, 0.11, '#f5a03a', -0.16, 0.14);
  b.pop();
  b.pop();
  return [0, 0.85, 0];
}

/** Bronzenes Waschbecken auf Fuß. */
export function laver(b: GeoBuilder) {
  b.push();
  b.frustum(0.3, 0.2, 0.1, 8, BRONZE_D, { ao: 0.2, jitter: 0.03 });
  b.translate(0, 0.1, 0);
  b.frustum(0.12, 0.1, 0.32, 8, BRONZE, { cap: false, ao: 0.1, jitter: 0.03 });
  b.translate(0, 0.32, 0);
  b.frustum(0.2, 0.52, 0.22, 10, BRONZE_L, { alt: BRONZE, ao: 0, cap: false, jitter: 0.03 });
  b.translate(0, 0.17, 0);
  b.frustum(0.46, 0.46, 0.02, 10, '#6fdcd2', { top: '#9af0e4', ao: 0, jitter: 0.012 });
  b.pop();
}

/** Die Stiftshütte: goldene Bretterwände, mehrlagige Decke, Vorhang in Blau, Purpur und Scharlach. */
export function tabernacleTent(b: GeoBuilder) {
  const W = 2.1;
  const D = 2.8;
  const H = 1.02;
  // Sockel
  b.box(W + 0.4, 0.1, D + 0.4, PAL.stoneDark, { top: PAL.stone, ao: 0.2, jitter: 0.03 });
  b.push();
  b.translate(0, 0.1, 0);
  // Seitenwände aus senkrechten goldenen Brettern
  const boards = Math.round(D / 0.36);
  const bw = D / boards;
  for (const sx of [-1, 1]) {
    for (let i = 0; i < boards; i++) {
      b.push();
      b.translate(sx * (W / 2 - 0.06), 0, -D / 2 + (i + 0.5) * bw);
      b.box(0.12, H, bw - 0.025, i % 2 ? PAL.gold : '#e7b242', { top: '#f9dc83', ao: 0.18, jitter: 0.03 });
      b.pop();
    }
  }
  // Rückwand
  for (let i = 0; i < 5; i++) {
    b.push();
    b.translate(-W / 2 + 0.06 + (i + 0.5) * ((W - 0.12) / 5), 0, -D / 2 + 0.06);
    b.box((W - 0.12) / 5 - 0.025, H, 0.12, i % 2 ? PAL.gold : '#e7b242', { top: '#f9dc83', ao: 0.18, jitter: 0.03 });
    b.pop();
  }
  // Dach: Widderfelle (rot) + Ziegenhaar (dunkel) + goldener First
  b.push();
  b.translate(0, H, 0);
  b.gable(W + 0.54, 0.8, D + 0.54, '#b64f3d', { end: '#a24433', top: '#c05b46', ao: 0, jitter: 0.025 });
  b.translate(0, 0.075, 0);
  b.gable(W + 0.34, 0.72, D + 0.34, '#54433a', { end: '#6b4a3a', top: '#6a584d', ao: 0, jitter: 0.03 });
  b.translate(0, 0.72, 0);
  b.box(0.1, 0.06, D + 0.4, PAL.gold, { top: '#fbe38d', ao: 0, jitter: 0.02 });
  for (const sz of [-1, 1]) {
    b.push();
    b.translate(0, 0, sz * (D / 2 + 0.2));
    b.blob(0.08, 0.08, 0.08, 0, PAL.gold, { ao: 0, jitter: 0.02 });
    b.pop();
  }
  b.pop();
  // Eingang: fünf goldene Säulen und vierteiliger Vorhang
  const zf = D / 2 + 0.02;
  for (let i = 0; i < 5; i++) {
    b.push();
    b.translate(-0.88 + i * 0.44, 0, zf);
    b.frustum(0.08, 0.065, H + 0.06, 6, PAL.gold, { cap: false, alt: '#e7b242', ao: 0.1, jitter: 0.03 });
    b.pop();
  }
  const cols: ColorInput[] = [BLUE, PURPLE, SCARLET, '#f6ecd3'];
  cols.forEach((c, i) => {
    const x0 = -0.88 + i * 0.44 + 0.05;
    const x1 = -0.88 + (i + 1) * 0.44 - 0.05;
    const y0 = 0.08;
    const y1 = H - 0.04;
    const sway = (_x: number, y: number) => 0.3 * (1 - (y - y0) / (y1 - y0));
    b.quad([x0, y0, zf], [x1, y0, zf], [x1, y1, zf], [x0, y1, zf], c, { ao: 0, jitter: 0.02, sway });
    b.quad([x0, y1, zf], [x1, y1, zf], [x1, y0, zf], [x0, y0, zf], c, { ao: 0, jitter: 0.02, sway });
  });
  // goldener Querbalken über dem Vorhang
  b.push();
  b.translate(0, H - 0.04, zf + 0.01);
  b.box(2.0, 0.06, 0.08, PAL.gold, { ao: 0, jitter: 0.02 });
  b.pop();
  b.pop();
}

/** Prisma aus Polygon (konvex, gegen den Uhrzeigersinn, Blick von +z), Dicke t. */
function extrude(b: GeoBuilder, pts: [number, number][], t: number, color: ColorInput, edge: ColorInput) {
  const n = pts.length;
  let cx = 0;
  let cy = 0;
  for (const [x, y] of pts) {
    cx += x / n;
    cy += y / n;
  }
  const o = { ao: 0, jitter: 0.02 } as const;
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    const q = pts[(i + 1) % n];
    b.tri([cx, cy, t / 2], [p[0], p[1], t / 2], [q[0], q[1], t / 2], color, o);
    b.tri([cx, cy, -t / 2], [q[0], q[1], -t / 2], [p[0], p[1], -t / 2], color, o);
    b.quad([p[0], p[1], -t / 2], [q[0], q[1], -t / 2], [q[0], q[1], t / 2], [p[0], p[1], t / 2], edge, o);
  }
}

/** Eine Gesetzestafel mit abgerundeter Oberkante und eingeritzten Zeilen. */
function tablet(b: GeoBuilder, w = 0.82, h = 1.0, t = 0.2) {
  const pts: [number, number][] = [[-w / 2, 0], [w / 2, 0]];
  const seg = 6;
  pts.push([w / 2, h]);
  for (let i = 1; i < seg; i++) {
    const a = (i / seg) * Math.PI;
    pts.push([Math.cos(a) * (w / 2), h + Math.sin(a) * (w / 2) * 0.95]);
  }
  pts.push([-w / 2, h]);
  extrude(b, pts, t, '#f4ecd7', '#d8c8a0');
  // Zeilen (Gold), auf beiden Seiten
  const lines = [0.84, 0.69, 0.54, 0.39, 0.24];
  for (const side of [1, -1]) {
    lines.forEach((ly, i) => {
      const lw = w * (i === 2 ? 0.46 : i === 4 ? 0.34 : 0.56);
      b.push();
      b.translate(0, h * ly + 0.12, side * (t / 2 + 0.006));
      b.box(lw, 0.05, 0.012, '#c99a3c', { ao: 0, jitter: 0.015 });
      b.pop();
    });
  }
}

/** Gipfel des Sinai: Steinplatte mit den beiden Gesetzestafeln und kleinen Felsen. */
export function summitTablets(b: GeoBuilder) {
  b.frustum(1.75, 1.6, 0.2, 10, PAL.stone, { alt: PAL.stoneLight, top: PAL.stoneLight, ao: 0.12, jitter: 0.04 });
  b.push();
  b.translate(0, 0.2, 0);
  b.frustum(1.3, 1.2, 0.12, 10, PAL.stoneLight, { top: '#f8ecc8', ao: 0, jitter: 0.03 });
  b.translate(0, 0.12, 0);
  for (const [sx, rot] of [[-0.52, 0.1], [0.52, -0.1]] as const) {
    b.push();
    b.translate(sx, 0, 0.0);
    b.rotateY(rot);
    b.rotateZ(-sx * 0.05);
    tablet(b);
    b.pop();
  }
  b.pop();
  // Steinhaufen am Rand
  for (const [x, z, s] of [[-1.35, 0.55, 0.9], [1.4, 0.4, 0.8], [0.2, -1.4, 0.7]] as const) {
    b.push();
    b.translate(x, 0.15, z);
    b.rock(0.28 * s, 0.2 * s, 0.26 * s, 0, 0.22, PAL.rockLight, { top: PAL.rockPale, ao: 0.1, jitter: 0.06 });
    b.pop();
  }
}

/** Kleiner Steinpfeiler (Stammespfeiler am Fuß des Berges, 2. Mose 24). */
export function standingStone(b: GeoBuilder, h = 0.7) {
  b.taper(0.3, 0.24, 0.2, 0.16, h, PAL.stoneLight, { top: '#f8ecc8', ao: 0.2, jitter: 0.05 });
}

/** Steinernes Altarblock mit Feuerschale (Bundesaltar). */
export function stoneAltar(b: GeoBuilder) {
  b.box(1.1, 0.4, 0.9, PAL.stone, { top: PAL.stoneLight, ao: 0.2, jitter: 0.04 });
  b.push();
  b.translate(0, 0.4, 0);
  b.box(0.8, 0.12, 0.6, PAL.stoneDark, { top: '#7a5a42', ao: 0, jitter: 0.04 });
  b.translate(0, 0.12, 0);
  const flame = (h: number, r: number, col: string, ox: number, oz: number) => {
    b.push();
    b.translate(ox, 0, oz);
    b.frustum(r, 0, h, 5, col, { ao: 0, jitter: 0.03, sway: (_x, y) => 2.0 * (y / h) });
    b.pop();
  };
  flame(0.46, 0.16, '#f2862f', 0, 0);
  flame(0.32, 0.11, '#f7b53a', 0.1, 0.06);
  flame(0.22, 0.08, '#fbe07a', -0.08, -0.05);
  b.pop();
}
