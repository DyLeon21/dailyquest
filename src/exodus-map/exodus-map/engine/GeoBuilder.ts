import { BufferGeometry, Color, Float32BufferAttribute, Matrix4 } from 'three';
import { hash2, mulberry32, smoothstep } from './rng';

/**
 * GeoBuilder – sammelt viele kleine Low-Poly-Formen in EINER Geometrie.
 *
 * Warum? Jede Station besteht aus tausenden Einzelteilen (Palmen, Häuser, Zelte …).
 * Als einzelne Meshes wären das tausende Draw Calls. Hier werden alle Teile mit Vertexfarben
 * zu einem einzigen Mesh verschmolzen → 1 Draw Call pro Station.
 *
 * Konventionen:
 *  - Primitive stehen mit der Unterseite auf y = 0 (außer blob/rock: Mittelpunkt im Ursprung).
 *  - Positionierung über push()/translate()/rotateY()/scale()/pop() oder place().
 *  - Jede Fläche bekommt eine eigene Farbe (flaches Shading) + leichte Helligkeitsstreuung.
 *  - Unten dunkler = eingebackener Kontaktschatten ("Ambient Occlusion") relativ zum Boden des Objekts.
 */

export type ColorInput = number | string | Color;
type V3 = readonly [number, number, number];

export interface PrimOpts {
  /** Farbe für nach oben zeigende Flächen (z. B. sonnengebleichtes Dach). */
  top?: ColorInput;
  /** Abwechselnde Farbe für Seitenflächen runder Körper (Streifen). */
  alt?: ColorInput;
  /** Helligkeitsstreuung pro Fläche (Standard: Builder-Wert). */
  jitter?: number;
  /** Windgewicht (0 = starr). Zahl oder Funktion der lokalen Koordinaten. */
  sway?: number | ((x: number, y: number, z: number) => number);
  /** Stärke des Kontaktschattens (0 = aus). */
  ao?: number;
  /** Boden mitzeichnen (Standard: aus – spart Dreiecke). */
  bottom?: boolean;
}

const colorCache = new Map<string, Color>();
export function toColor(c: ColorInput): Color {
  if (c instanceof Color) return c;
  const key = String(c);
  let v = colorCache.get(key);
  if (!v) {
    v = new Color(c as never);
    colorCache.set(key, v);
  }
  return v;
}

// ── Ikosaeder-Daten für Blobs/Felsen ───────────────────────────────────────────────────────────
const icoCache = new Map<number, { v: number[][]; f: number[][] }>();
function icoData(detail: number) {
  const cached = icoCache.get(detail);
  if (cached) return cached;
  const t = (1 + Math.sqrt(5)) / 2;
  let v: number[][] = [
    [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t],
    [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1],
  ].map(([x, y, z]) => {
    const l = Math.hypot(x, y, z);
    return [x / l, y / l, z / l];
  });
  let f: number[][] = [
    [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2],
    [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5],
    [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1],
  ];
  for (let d = 0; d < detail; d++) {
    const mid = new Map<string, number>();
    const getMid = (a: number, b: number) => {
      const key = a < b ? `${a}_${b}` : `${b}_${a}`;
      let i = mid.get(key);
      if (i === undefined) {
        const m = [(v[a][0] + v[b][0]) / 2, (v[a][1] + v[b][1]) / 2, (v[a][2] + v[b][2]) / 2];
        const l = Math.hypot(m[0], m[1], m[2]);
        v.push([m[0] / l, m[1] / l, m[2] / l]);
        i = v.length - 1;
        mid.set(key, i);
      }
      return i;
    };
    const nf: number[][] = [];
    for (const [a, b, c] of f) {
      const ab = getMid(a, b), bc = getMid(b, c), ca = getMid(c, a);
      nf.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]);
    }
    f = nf;
  }
  const out = { v, f };
  icoCache.set(detail, out);
  return out;
}

export class GeoBuilder {
  private pos: number[] = [];
  private col: number[] = [];
  private swy: number[] = [];

  readonly rand: () => number;
  jitter = 0.045;
  aoStrength = 0.3;
  aoHeight = 0.9;

  private m = new Matrix4();
  private stack: Matrix4[] = [];
  private tmp = new Matrix4();
  /** Bodenhöhe des aktuellen Objekts (für den Kontaktschatten). */
  groundY = -1e9;
  private groundFn: ((x: number, z: number) => number) | null = null;

  constructor(seed = 1) {
    this.rand = mulberry32(seed);
  }

  setGround(fn: (x: number, z: number) => number) {
    this.groundFn = fn;
  }

  get triangleCount() {
    return this.pos.length / 9;
  }

  // ── Transformationen ─────────────────────────────────────────────────────────────────────────
  push() {
    this.stack.push(this.m.clone());
    return this;
  }
  pop() {
    const m = this.stack.pop();
    if (m) this.m.copy(m);
    return this;
  }
  translate(x: number, y: number, z: number) {
    this.m.multiply(this.tmp.makeTranslation(x, y, z));
    return this;
  }
  rotateY(a: number) {
    this.m.multiply(this.tmp.makeRotationY(a));
    return this;
  }
  rotateX(a: number) {
    this.m.multiply(this.tmp.makeRotationX(a));
    return this;
  }
  rotateZ(a: number) {
    this.m.multiply(this.tmp.makeRotationZ(a));
    return this;
  }
  scale(x: number, y = x, z = x) {
    this.m.multiply(this.tmp.makeScale(x, y, z));
    return this;
  }

  /**
   * Objekt auf den Boden stellen: wechselt in lokale Koordinaten bei (x, Boden(x,z) - sink, z),
   * dreht um Y und führt fn aus. Setzt automatisch die Bodenhöhe für den Kontaktschatten.
   */
  place(x: number, z: number, rotY: number, fn: () => void, sink = 0.04, yOverride?: number) {
    const gy = yOverride ?? (this.groundFn ? this.groundFn(x, z) : 0);
    const prev = this.groundY;
    this.push();
    this.translate(x, gy - sink, z);
    if (rotY) this.rotateY(rotY);
    this.groundY = gy;
    fn();
    this.groundY = prev;
    this.pop();
  }

  /** Lokaler Punkt → Weltkoordinaten (nach aktueller Transformation). */
  toWorld(x: number, y: number, z: number): [number, number, number] {
    const e = this.m.elements;
    return [e[0] * x + e[4] * y + e[8] * z + e[12], e[1] * x + e[5] * y + e[9] * z + e[13], e[2] * x + e[6] * y + e[10] * z + e[14]];
  }

  // ── Dreiecke ─────────────────────────────────────────────────────────────────────────────────
  tri(a: V3, b: V3, c: V3, color: ColorInput, opts?: PrimOpts, wa = 0, wb = 0, wc = 0) {
    const e = this.m.elements;
    const ax = e[0] * a[0] + e[4] * a[1] + e[8] * a[2] + e[12];
    const ay = e[1] * a[0] + e[5] * a[1] + e[9] * a[2] + e[13];
    const az = e[2] * a[0] + e[6] * a[1] + e[10] * a[2] + e[14];
    const bx = e[0] * b[0] + e[4] * b[1] + e[8] * b[2] + e[12];
    const by = e[1] * b[0] + e[5] * b[1] + e[9] * b[2] + e[13];
    const bz = e[2] * b[0] + e[6] * b[1] + e[10] * b[2] + e[14];
    const cx = e[0] * c[0] + e[4] * c[1] + e[8] * c[2] + e[12];
    const cy = e[1] * c[0] + e[5] * c[1] + e[9] * c[2] + e[13];
    const cz = e[2] * c[0] + e[6] * c[1] + e[10] * c[2] + e[14];

    let base = toColor(color);
    if (opts?.top !== undefined) {
      // Normale (nur y-Anteil) bestimmen
      const ux = bx - ax, uy = by - ay, uz = bz - az;
      const vx = cx - ax, vy = cy - ay, vz = cz - az;
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const len = Math.hypot(nx, ny, nz) || 1;
      if (ny / len > 0.6) base = toColor(opts.top);
    }
    const jit = opts?.jitter ?? this.jitter;
    const f = 1 + (this.rand() - 0.5) * 2 * jit;
    const tint = (this.rand() - 0.5) * jit; // leichte Farbtonverschiebung warm/kalt
    const ao = opts?.ao ?? this.aoStrength;
    const useAo = ao > 0 && this.groundY > -1e8;

    const pushV = (x: number, y: number, z: number, w: number) => {
      let k = f;
      if (useAo) k *= 1 - ao * (1 - smoothstep(-0.1, this.aoHeight, y - this.groundY));
      this.pos.push(x, y, z);
      this.col.push(base.r * k * (1 + tint), base.g * k, base.b * k * (1 - tint));
      this.swy.push(w);
    };
    pushV(ax, ay, az, wa);
    pushV(bx, by, bz, wb);
    pushV(cx, cy, cz, wc);
  }

  quad(a: V3, b: V3, c: V3, d: V3, color: ColorInput, opts?: PrimOpts) {
    const sw = (p: V3) => swayOf(opts, p);
    this.tri(a, b, c, color, opts, sw(a), sw(b), sw(c));
    this.tri(a, c, d, color, opts, sw(a), sw(c), sw(d));
  }

  /** Direkt in die Welt schreiben (ohne Transformation), z. B. für Terrain-Dreiecke. */
  rawTri(a: V3, b: V3, c: V3, color: ColorInput, ao = 0) {
    this.push();
    this.m.identity();
    const prev = this.groundY;
    this.groundY = -1e9;
    this.tri(a, b, c, color, { ao });
    this.groundY = prev;
    this.pop();
  }

  // ── Primitive ────────────────────────────────────────────────────────────────────────────────
  /** Quader, Unterseite auf y = 0, in x/z zentriert. */
  box(w: number, h: number, d: number, color: ColorInput, opts?: PrimOpts) {
    const x0 = -w / 2, x1 = w / 2, z0 = -d / 2, z1 = d / 2;
    const A: V3 = [x0, 0, z0], B: V3 = [x1, 0, z0], C: V3 = [x1, 0, z1], D: V3 = [x0, 0, z1];
    const E: V3 = [x0, h, z0], F: V3 = [x1, h, z0], G: V3 = [x1, h, z1], H: V3 = [x0, h, z1];
    const top = opts?.top ?? color;
    this.quad(H, G, F, E, top, opts); // oben
    this.quad(D, C, G, H, color, opts); // +z
    this.quad(B, A, E, F, color, opts); // -z
    this.quad(C, B, F, G, color, opts); // +x
    this.quad(A, D, H, E, color, opts); // -x
    if (opts?.bottom) this.quad(A, B, C, D, color, opts);
  }

  /** Rechteckiger Stumpf (Pyramidenstufe, Turm, Obelisk). Unterseite y=0. */
  taper(wb: number, db: number, wt: number, dt: number, h: number, color: ColorInput, opts?: PrimOpts) {
    const bx = wb / 2, bz = db / 2, tx = wt / 2, tz = dt / 2;
    const A: V3 = [-bx, 0, -bz], B: V3 = [bx, 0, -bz], C: V3 = [bx, 0, bz], D: V3 = [-bx, 0, bz];
    const E: V3 = [-tx, h, -tz], F: V3 = [tx, h, -tz], G: V3 = [tx, h, tz], H: V3 = [-tx, h, tz];
    this.quad(D, C, G, H, color, opts);
    this.quad(B, A, E, F, color, opts);
    this.quad(C, B, F, G, color, opts);
    this.quad(A, D, H, E, color, opts);
    if (tx > 1e-4 && tz > 1e-4) this.quad(H, G, F, E, opts?.top ?? color, opts);
    if (opts?.bottom) this.quad(A, B, C, D, color, opts);
  }

  /** Satteldach / Zelt: First entlang z, Unterseite y=0. */
  gable(w: number, h: number, d: number, color: ColorInput, opts?: PrimOpts & { end?: ColorInput }) {
    const x0 = -w / 2, x1 = w / 2, z0 = -d / 2, z1 = d / 2;
    const A: V3 = [x0, 0, z0], B: V3 = [x1, 0, z0], C: V3 = [x1, 0, z1], D: V3 = [x0, 0, z1];
    const R0: V3 = [0, h, z0], R1: V3 = [0, h, z1];
    const end = opts?.end ?? color;
    // Giebel vorne/hinten + zwei Dachflächen
    this.tri(D, C, R1, end, opts);
    this.tri(B, A, R0, end, opts);
    this.quad(C, B, R0, R1, color, { ...opts, top: opts?.top ?? color }); // +x Dachfläche
    this.quad(A, D, R1, R0, color, { ...opts, top: opts?.top ?? color }); // -x Dachfläche
    if (opts?.bottom) this.quad(A, B, C, D, color, opts);
  }

  /** Rundkörper (Säule, Turm, Topf). Unterseite y=0, Radius unten rb, oben rt. */
  frustum(rb: number, rt: number, h: number, sides: number, color: ColorInput, opts?: PrimOpts & { rot?: number; cap?: boolean }) {
    const rot = opts?.rot ?? 0;
    const bot: V3[] = [], top: V3[] = [];
    for (let i = 0; i < sides; i++) {
      const a = rot + (i / sides) * Math.PI * 2;
      bot.push([Math.cos(a) * rb, 0, -Math.sin(a) * rb]);
      top.push([Math.cos(a) * rt, h, -Math.sin(a) * rt]);
    }
    const alt = opts?.alt;
    const point = rt < 1e-4;
    for (let i = 0; i < sides; i++) {
      const j = (i + 1) % sides;
      const col = alt !== undefined && i % 2 === 1 ? alt : color;
      if (point) {
        this.tri(bot[i], bot[j], top[i], col, opts, swayOf(opts, bot[i]), swayOf(opts, bot[j]), swayOf(opts, top[i]));
      } else {
        this.quad(bot[i], bot[j], top[j], top[i], col, opts);
      }
    }
    if (!point && opts?.cap !== false) {
      const c: V3 = [0, h, 0];
      for (let i = 0; i < sides; i++) this.tri(c, top[i], top[(i + 1) % sides], opts?.top ?? color, opts);
    }
    if (opts?.bottom) {
      const c0: V3 = [0, 0, 0];
      for (let i = 0; i < sides; i++) this.tri(c0, bot[(i + 1) % sides], bot[i], color, opts);
    }
  }

  cone(r: number, h: number, sides: number, color: ColorInput, opts?: PrimOpts & { rot?: number }) {
    this.frustum(r, 0, h, sides, color, opts);
  }

  /** Kugel-/Ellipsoid-Blob, Mittelpunkt im Ursprung. */
  blob(rx: number, ry: number, rz: number, detail: number, color: ColorInput, opts?: PrimOpts) {
    const { v, f } = icoData(detail);
    const p = v.map(([x, y, z]) => [x * rx, y * ry, z * rz] as unknown as V3);
    for (const [a, b, c] of f) this.tri(p[a], p[b], p[c], color, opts, swayOf(opts, p[a]), swayOf(opts, p[b]), swayOf(opts, p[c]));
  }

  /** Felsbrocken: verformter Ikosaeder. */
  rock(rx: number, ry: number, rz: number, detail: number, rough: number, color: ColorInput, opts?: PrimOpts, seed = 0) {
    const { v, f } = icoData(detail);
    const s = Math.floor(this.rand() * 1e6) + seed;
    const p = v.map(([x, y, z], i) => {
      const k = 1 + (hash2(i, s, 7) - 0.5) * 2 * rough;
      // unten abflachen, damit der Fels "sitzt"
      const yy = Math.max(y, -0.35) * k;
      return [x * rx * k, yy * ry, z * rz * k] as unknown as V3;
    });
    for (const [a, b, c] of f) this.tri(p[a], p[b], p[c], color, opts);
  }

  // ── Ausgabe ──────────────────────────────────────────────────────────────────────────────────
  toGeometry(): BufferGeometry {
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(this.pos, 3));
    g.setAttribute('color', new Float32BufferAttribute(this.col, 3));
    g.setAttribute('aSway', new Float32BufferAttribute(this.swy, 1));
    g.computeVertexNormals(); // nicht indiziert → pro Fläche genau eine Normale = flaches Shading
    g.computeBoundingSphere();
    g.computeBoundingBox();
    return g;
  }
}

function swayOf(opts: PrimOpts | undefined, p: V3): number {
  const s = opts?.sway;
  if (s === undefined) return 0;
  return typeof s === 'number' ? s : s(p[0], p[1], p[2]);
}
