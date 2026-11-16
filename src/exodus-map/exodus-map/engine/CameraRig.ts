import { OrthographicCamera, Vector3 } from 'three';
import { CAMERA } from '../config';
import { pathX } from './layout';
import { clamp } from './rng';

/**
 * Feste isometrische Kamera. Der Blickwinkel ändert sich nie – die Kamera gleitet nur entlang
 * der Karte (Wischen/Scrollen/Antippen eines Markers). Mit Trägheit und weichem Anschlag.
 */
export class CameraRig {
  readonly camera = new OrthographicCamera(-10, 10, 10, -10, CAMERA.near, CAMERA.far);
  readonly target = new Vector3(0, CAMERA.targetY, -24);

  /** Anschläge: zMin = Süden (Start), zMax = Norden (Ende) – zMax < zMin. */
  zMin = -6;
  zMax = -214;

  viewW = 20;
  viewH = 40;
  pxH = 800;

  private az = (CAMERA.azimuthDeg * Math.PI) / 180;
  private el = (CAMERA.elevationDeg * Math.PI) / 180;
  /** Seitlicher Versatz der Kamera gegenüber dem Pfad (s. CAMERA.markerBias). */
  private xBias = (CAMERA.lookAhead * Math.sin((CAMERA.azimuthDeg * Math.PI) / 180) - CAMERA.markerBias) / Math.cos((CAMERA.azimuthDeg * Math.PI) / 180);
  private vel = 0;
  private dragging = false;
  private tween: { from: number; to: number; t: number; dur: number } | null = null;

  readonly dir = new Vector3(
    Math.sin(this.az) * Math.cos(this.el),
    Math.sin(this.el),
    Math.cos(this.az) * Math.cos(this.el),
  );

  constructor() {
    this.apply();
  }

  get z() {
    return this.target.z;
  }

  resize(w: number, h: number) {
    const aspect = w / Math.max(1, h);
    // Hochformat: Streifenbreite füllt die Breite. Breiter als 3:4: nicht weiter hineinzoomen.
    this.viewH = CAMERA.fitWidth / Math.min(aspect, 0.75);
    this.viewW = this.viewH * aspect;
    this.pxH = h;
    const c = this.camera;
    c.left = -this.viewW / 2;
    c.right = this.viewW / 2;
    c.top = this.viewH / 2;
    c.bottom = -this.viewH / 2;
    c.updateProjectionMatrix();
  }

  /** Kamera-x in Abhängigkeit von z: folgt dem Pfad, damit die Karte im schmalen Hochformat gut im Bild bleibt. */
  xOf(z: number) {
    return clamp(pathX(z - CAMERA.lookAhead) + this.xBias, -6, 8);
  }

  private dxdz(z: number) {
    return (this.xOf(z + 0.25) - this.xOf(z - 0.25)) / 0.5;
  }

  private apply() {
    this.target.x = this.xOf(this.target.z);
    const c = this.camera;
    c.position.copy(this.target).addScaledVector(this.dir, CAMERA.distance);
    c.lookAt(this.target);
    c.updateMatrixWorld();
  }

  /** z-Position der Kamera, damit der Bodenpunkt (x, y, z) auf Höhe `fracFromTop` des Bildes liegt. */
  zForGround(x: number, y: number, z: number, fracFromTop = 0.42): number {
    const s = Math.sin(this.az);
    const c = Math.cos(this.az);
    const se = Math.sin(this.el);
    const ce = Math.cos(this.el);
    const yd = (0.5 - fracFromTop) * this.viewH;
    let zc = z + 12;
    // Kamera-x hängt von z ab → ein paar Fixpunkt-Schritte
    for (let i = 0; i < 6; i++) {
      zc = z + ((x - this.xOf(zc)) * s) / c + (yd - (y - CAMERA.targetY) * ce) / (c * se);
    }
    return zc;
  }

  setZ(z: number) {
    this.target.z = clamp(z, this.zMax, this.zMin);
    this.vel = 0;
    this.tween = null;
    this.apply();
  }

  glideTo(z: number, duration = 0.9) {
    this.vel = 0;
    this.tween = { from: this.target.z, to: clamp(z, this.zMax, this.zMin), t: 0, dur: duration };
  }

  // ── Eingabe ──────────────────────────────────────────────────────────────
  beginDrag() {
    this.dragging = true;
    this.tween = null;
    this.vel = 0;
  }

  /** Bildschirm-Verschiebung in Pixeln → Bewegung entlang der Karte (Inhalt folgt dem Finger). */
  dragBy(dxPx: number, dyPx: number, dt: number) {
    const wpp = this.viewH / this.pxH;
    const X = dxPx * wpp;
    const Y = -dyPx * wpp;
    // Bildverschiebung eines Bodenpunkts bei Kamerabewegung dz (x folgt dem Pfad mit Steigung m):
    //   X = dz·(sin − m·cos),  Y = dz·(m·sin + cos)·sin(el)   → bestmögliches dz im Sinne kleinster Quadrate
    const m = this.dxdz(this.target.z);
    const a = Math.sin(this.az) - m * Math.cos(this.az);
    const c = (m * Math.sin(this.az) + Math.cos(this.az)) * Math.sin(this.el);
    const dz = (X * a + Y * c) / (a * a + c * c);
    let z = this.target.z + dz;
    // Widerstand außerhalb der Anschläge
    if (z > this.zMin) z = this.zMin + (z - this.zMin) * 0.35;
    if (z < this.zMax) z = this.zMax + (z - this.zMax) * 0.35;
    this.target.z = z;
    if (dt > 0) this.vel = this.vel * 0.6 + (dz / dt) * 0.4;
    this.apply();
  }

  endDrag() {
    this.dragging = false;
    if (Math.abs(this.vel) < 4) this.vel = 0;
    this.vel = clamp(this.vel, -140, 140);
  }

  wheelBy(deltaY: number) {
    this.tween = null;
    this.vel = 0;
    this.target.z = clamp(this.target.z - deltaY * 0.045, this.zMax - 3, this.zMin + 3);
    this.apply();
  }

  update(dt: number): boolean {
    const before = this.target.z;
    if (this.tween) {
      const tw = this.tween;
      tw.t = Math.min(1, tw.t + dt / tw.dur);
      const e = tw.t < 0.5 ? 4 * tw.t ** 3 : 1 - (-2 * tw.t + 2) ** 3 / 2; // easeInOutCubic
      this.target.z = tw.from + (tw.to - tw.from) * e;
      if (tw.t >= 1) this.tween = null;
    } else if (!this.dragging) {
      this.target.z += this.vel * dt;
      this.vel *= Math.exp(-dt * 3.4);
      if (Math.abs(this.vel) < 0.15) this.vel = 0;
      // weich zurück in die Anschläge
      const over = this.target.z > this.zMin ? this.target.z - this.zMin : this.target.z < this.zMax ? this.target.z - this.zMax : 0;
      if (over !== 0) {
        this.target.z -= over * Math.min(1, dt * 9);
        this.vel *= 0.8;
      }
    }
    if (this.target.z !== before) {
      this.apply();
      return true;
    }
    return false;
  }
}
