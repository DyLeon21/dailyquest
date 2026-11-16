import {
  Color, DirectionalLight, Fog, HemisphereLight, Mesh, MeshBasicMaterial, NeutralToneMapping, PCFShadowMap,
  RingGeometry, Scene, SRGBColorSpace, Vector3, WebGLRenderer,
} from 'three';
import { CAMERA, LIGHT, PAL, pickQuality } from '../config';
import type { QualityPreset } from '../config';
import type { AnimationSettings, PartialAnimationSettings, QualityLevel, StationId } from '../types';
import { AnimationState } from './animation';
import { CameraRig } from './CameraRig';
import { createDust, createEmbers, createLightColumn } from './effects';
import { STATION_Z } from './layout';
import { createMaterials } from './materials';
import type { Materials } from './materials';
import { buildWorld } from './world';
import type { BuiltWorld } from './world';

export interface EngineOptions {
  container: HTMLElement;
  canvas: HTMLCanvasElement;
  quality: QualityLevel;
  animation: AnimationSettings;
  initialStation: StationId;
}

// Himmel wandert mit der Reise: je Station leicht andere Stimmung (alles im selben Türkis/Creme-Verlauf).
const SKY: { z: number; top: string; mid: string; bottom: string }[] = [
  { z: -10, top: PAL.sky.top, mid: PAL.sky.mid, bottom: PAL.sky.bottom },
  { z: -58, top: '#86d9c4', mid: '#cdebcf', bottom: '#fbf0c6' },
  { z: -97, top: '#92dac0', mid: '#dbeccb', bottom: '#fcecc0' },
  { z: -131, top: '#5ec9d2', mid: '#a9e6dc', bottom: '#f3f0d0' },
  { z: -166, top: '#93d7bd', mid: '#dcedcc', bottom: '#fcebbd' },
  { z: -200, top: '#79c3d7', mid: '#b7e1dd', bottom: '#f7eac7' },
];

const _v = new Vector3();

export class MapEngine {
  readonly anim = new AnimationState();
  readonly rig = new CameraRig();
  readonly world: BuiltWorld;

  private container: HTMLElement;
  private canvas: HTMLCanvasElement;
  private renderer: WebGLRenderer;
  private scene = new Scene();
  private mats: Materials;
  private preset: QualityPreset;
  private sun: DirectionalLight;
  private hemi: HemisphereLight;
  private bounce: DirectionalLight;
  private dust: ReturnType<typeof createDust>;
  private embers: ReturnType<typeof createEmbers>;
  private column: ReturnType<typeof createLightColumn>;
  private pulse: Mesh;
  private pulseMat: MeshBasicMaterial;

  private raf = 0;
  private last = 0;
  private paused = false;
  private disposed = false;
  private dirty = true;
  private width = 1;
  private height = 1;
  private dpr = 1;
  private dprScale = 1;
  private frameTimes: number[] = [];
  private markerEls: (HTMLElement | null)[] = [];
  private markerVisible: boolean[] = [];
  private current: StationId | null = null;
  private skyKey = '';
  private ro: ResizeObserver;

  private pointer: { id: number; x: number; y: number; sx: number; sy: number; t: number; moved: boolean } | null = null;

  constructor(opts: EngineOptions) {
    this.container = opts.container;
    this.canvas = opts.canvas;
    this.preset = pickQuality(opts.quality);
    this.anim.replace(opts.animation);

    this.renderer = new WebGLRenderer({
      canvas: this.canvas,
      antialias: this.preset.antialias,
      alpha: true,
      powerPreference: 'high-performance',
    });
    const r = this.renderer;
    r.outputColorSpace = SRGBColorSpace;
    r.toneMapping = NeutralToneMapping;
    r.toneMappingExposure = 1.0;
    r.setClearColor(0x000000, 0);
    r.shadowMap.enabled = this.preset.shadows;
    r.shadowMap.type = PCFShadowMap;

    this.mats = createMaterials(this.anim);
    this.world = buildWorld(this.anim, this.mats);
    this.scene.add(this.world.root);
    this.scene.fog = new Fog(new Color(PAL.sky.mid), 150, 400);

    // Licht: goldene Sonne von links-vorn, warmes Himmelslicht, türkiser Rückstrahl von rechts
    this.hemi = new HemisphereLight(LIGHT.hemiSky, LIGHT.hemiGround, LIGHT.hemiIntensity);
    this.scene.add(this.hemi);
    this.sun = new DirectionalLight(LIGHT.sunColor, LIGHT.sunIntensity);
    this.sun.castShadow = this.preset.shadows;
    const sc = this.sun.shadow.camera;
    sc.left = -46;
    sc.right = 46;
    sc.top = 46;
    sc.bottom = -46;
    sc.near = 20;
    sc.far = 340;
    this.sun.shadow.mapSize.set(this.preset.shadowMapSize, this.preset.shadowMapSize);
    this.sun.shadow.bias = -0.0005;
    this.sun.shadow.normalBias = 0.07;
    this.sun.shadow.radius = 2.5;
    this.scene.add(this.sun, this.sun.target);
    this.bounce = new DirectionalLight(LIGHT.bounceColor, LIGHT.bounceIntensity);
    this.scene.add(this.bounce, this.bounce.target);

    // Effekte
    this.dust = createDust(this.anim, this.preset.dustCount);
    this.scene.add(this.dust.points);
    this.embers = createEmbers(this.anim, this.world.fires.length ? this.world.fires : [[0, -50, 0]]);
    this.scene.add(this.embers.points);
    this.column = createLightColumn(this.anim);
    this.scene.add(this.column.mesh);

    // Pulsring am aktuellen Marker
    const ringGeo = new RingGeometry(1.75, 2.05, 40);
    ringGeo.rotateX(-Math.PI / 2);
    this.pulseMat = new MeshBasicMaterial({ color: '#fff2b8', transparent: true, opacity: 0, depthWrite: false });
    this.pulse = new Mesh(ringGeo, this.pulseMat);
    this.pulse.renderOrder = 5;
    this.pulse.visible = false;
    this.scene.add(this.pulse);

    // Größe, Start-Position
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(this.container);
    this.resize();
    this.rig.setZ(this.zForStation(opts.initialStation));

    this.bindInput();
    this.canvas.addEventListener('webglcontextlost', this.onContextLost);
    this.canvas.addEventListener('webglcontextrestored', this.onContextRestored);
    document.addEventListener('visibilitychange', this.onVisibility);
    this.raf = requestAnimationFrame((t) => {
      this.last = t;
      this.frame(t);
    });
  }

  // ── Öffentliche API ───────────────────────────────────────────────────────
  setMarkerElements(els: (HTMLElement | null)[]) {
    this.markerEls = els;
    this.markerVisible = els.map(() => true);
    this.dirty = true;
  }

  setCurrent(id: StationId | null) {
    this.current = id;
    this.dirty = true;
  }

  setAnimation(partial: PartialAnimationSettings) {
    this.anim.set(partial);
    this.dirty = true;
  }

  getAnimation(): AnimationSettings {
    return structuredClone(this.anim.settings);
  }

  setPaused(p: boolean) {
    this.paused = p;
    if (!p) this.last = performance.now();
  }

  focusStation(id: StationId, instant = false) {
    const z = this.zForStation(id);
    if (instant) this.rig.setZ(z);
    else this.rig.glideTo(z);
    this.dirty = true;
  }

  /** Kamera-z, bei der die Station im oberen Bilddrittel liegt (Platz für Karten/Sheets unten). */
  zForStation(id: StationId): number {
    const a = this.world.stations[id - 1].anchor;
    return this.rig.zForGround(a.x, a.y, a.z, CAMERA.frameFrac[id - 1] ?? 0.42);
  }

  /** Für Tests/Debugging. */
  info() {
    const i = this.renderer.info;
    return {
      drawCalls: i.render.calls,
      triangles: i.render.triangles,
      worldTriangles: Math.round(this.world.stats.triangles),
      geometries: i.memory.geometries,
      dpr: this.dpr,
      cameraZ: this.rig.z,
      shadows: this.preset.shadows,
    };
  }

  /** Frame sofort rendern (Tests). */
  renderNow() {
    this.frame(performance.now(), 0.016, true);
  }

  setCameraZ(z: number) {
    this.rig.setZ(z);
    this.dirty = true;
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    this.unbindInput();
    this.canvas.removeEventListener('webglcontextlost', this.onContextLost);
    this.canvas.removeEventListener('webglcontextrestored', this.onContextRestored);
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.world.dispose();
    this.dust.dispose();
    this.embers.dispose();
    this.column.dispose();
    this.pulse.geometry.dispose();
    this.pulseMat.dispose();
    this.mats.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }

  // ── Größe ──────────────────────────────────────────────────────────────────
  private resize() {
    const w = Math.max(1, this.container.clientWidth);
    const h = Math.max(1, this.container.clientHeight);
    this.width = w;
    this.height = h;
    this.applyPixelRatio();
    this.rig.resize(w, h);
    this.dirty = true;
  }

  private applyPixelRatio() {
    const dev = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    this.dpr = Math.max(0.7, Math.min(dev, this.preset.pixelRatioCap) * this.dprScale);
    this.renderer.setPixelRatio(this.dpr);
    this.renderer.setSize(this.width, this.height, false);
  }

  /** Bei dauerhaft niedriger Bildrate die Auflösung schrittweise senken (nie unter 0.7). */
  private adapt(dt: number) {
    this.frameTimes.push(dt);
    if (this.frameTimes.length < 50) return;
    const avg = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    this.frameTimes.length = 0;
    if (avg > 1 / 40 && this.dpr > 0.75) {
      this.dprScale *= 0.85;
      this.applyPixelRatio();
    }
  }

  // ── Eingabe ────────────────────────────────────────────────────────────────
  private bindInput() {
    const c = this.container;
    c.addEventListener('pointerdown', this.onDown);
    c.addEventListener('pointermove', this.onMove);
    c.addEventListener('pointerup', this.onUp);
    c.addEventListener('pointercancel', this.onUp);
    c.addEventListener('wheel', this.onWheel, { passive: false });
  }
  private unbindInput() {
    const c = this.container;
    c.removeEventListener('pointerdown', this.onDown);
    c.removeEventListener('pointermove', this.onMove);
    c.removeEventListener('pointerup', this.onUp);
    c.removeEventListener('pointercancel', this.onUp);
    c.removeEventListener('wheel', this.onWheel);
  }
  private onDown = (e: PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    this.pointer = { id: e.pointerId, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: e.timeStamp, moved: false };
  };
  private onMove = (e: PointerEvent) => {
    const p = this.pointer;
    if (!p || p.id !== e.pointerId) return;
    const dx = e.clientX - p.x;
    const dy = e.clientY - p.y;
    if (!p.moved) {
      if (Math.hypot(e.clientX - p.sx, e.clientY - p.sy) < 7) return;
      p.moved = true;
      this.rig.beginDrag();
      try {
        this.container.setPointerCapture(e.pointerId);
      } catch {
        /* ignorieren */
      }
      this.container.classList.add('is-dragging');
    }
    const dt = Math.max(0.004, (e.timeStamp - p.t) / 1000);
    this.rig.dragBy(dx, dy, dt);
    p.x = e.clientX;
    p.y = e.clientY;
    p.t = e.timeStamp;
    this.dirty = true;
  };
  private onUp = (e: PointerEvent) => {
    const p = this.pointer;
    if (!p || p.id !== e.pointerId) return;
    if (p.moved) {
      this.rig.endDrag();
      try {
        this.container.releasePointerCapture(e.pointerId);
      } catch {
        /* ignorieren */
      }
      this.container.classList.remove('is-dragging');
    }
    this.pointer = null;
    this.dirty = true;
  };
  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    this.rig.wheelBy(e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY);
    this.dirty = true;
  };
  private onContextLost = (e: Event) => {
    e.preventDefault();
    this.paused = true;
  };
  private onContextRestored = () => {
    this.paused = false;
    this.dirty = true;
  };
  private onVisibility = () => {
    if (!document.hidden) this.last = performance.now();
  };

  // ── Frame ──────────────────────────────────────────────────────────────────
  private isStatic(): boolean {
    const s = this.anim.settings;
    return !(s.nile.enabled || s.redSea.enabled || s.palms.enabled || s.clouds.enabled || s.particles.enabled || s.light.enabled || (s.markers.enabled && this.current));
  }

  private frame = (t: number, forcedDt?: number, force = false) => {
    if (this.disposed) return;
    if (!force) this.raf = requestAnimationFrame((n) => this.frame(n));
    if (!force && (this.paused || document.hidden)) {
      this.last = t;
      return;
    }
    const dt = forcedDt ?? Math.min(0.05, Math.max(0, (t - this.last) / 1000));
    this.last = t;

    const moved = this.rig.update(dt);
    if (this.isStatic() && !this.dirty && !moved && !force) return;
    this.dirty = false;

    this.anim.update(dt);
    this.updateLights();
    this.updateEffects();
    this.updateSky();
    this.renderer.render(this.scene, this.rig.camera);
    this.projectMarkers();
    if (!force) this.adapt(dt);
  };

  private updateLights() {
    const target = this.rig.target;
    const s = LIGHT.sunDir;
    _v.set(s[0], s[1], s[2]).normalize();
    // Schattenkamera am Licht ausrichten und auf Texelraster einrasten (kein Flimmern beim Scrollen)
    const texel = 92 / this.preset.shadowMapSize;
    const right = new Vector3().crossVectors(new Vector3(0, 1, 0), _v).normalize();
    const up = new Vector3().crossVectors(_v, right).normalize();
    const dr = Math.round(target.dot(right) / texel) * texel;
    const du = Math.round(target.dot(up) / texel) * texel;
    const dd = target.dot(_v);
    const snapped = new Vector3().addScaledVector(right, dr).addScaledVector(up, du).addScaledVector(_v, dd);
    this.sun.position.copy(snapped).addScaledVector(_v, 140);
    this.sun.target.position.copy(snapped);
    this.sun.target.updateMatrixWorld();
    const breathe = 1 + 0.03 * Math.sin(this.anim.time * 0.4) * this.anim.lightStrength;
    this.sun.intensity = LIGHT.sunIntensity * breathe;
    this.bounce.position.set(target.x + 70, target.y + 30, target.z - 40);
    this.bounce.target.position.copy(target);
    this.bounce.target.updateMatrixWorld();
  }

  private updateEffects() {
    this.dust.update(this.rig.target, this.rig.camera, this.dpr);
    this.embers.update(this.dpr);
    this.column.update();

    // Pulsring
    const st = this.current ? this.world.stations[this.current - 1] : null;
    if (st && this.anim.markerPulse > 0.02) {
      const ph = (this.anim.time * 0.75) % 1;
      this.pulse.visible = true;
      this.pulse.position.set(st.anchor.x, st.anchor.y + 0.1, st.anchor.z);
      const sc = 0.95 + ph * 0.75;
      this.pulse.scale.set(sc, 1, sc);
      this.pulseMat.opacity = (1 - ph) * (1 - ph) * 0.8 * this.anim.markerPulse;
    } else {
      this.pulse.visible = false;
    }
  }

  private updateSky() {
    const z = this.rig.z;
    let i = 0;
    while (i < SKY.length - 2 && z < SKY[i + 1].z) i++;
    const a = SKY[i];
    const b = SKY[i + 1];
    const t = Math.min(1, Math.max(0, (a.z - z) / (a.z - b.z)));
    const top = new Color(a.top).lerp(new Color(b.top), t);
    const mid = new Color(a.mid).lerp(new Color(b.mid), t);
    const bottom = new Color(a.bottom).lerp(new Color(b.bottom), t);
    const key = `${top.getHexString()}${mid.getHexString()}${bottom.getHexString()}`;
    if (key === this.skyKey) return;
    this.skyKey = key;
    const st = this.container.style;
    st.setProperty('--sky-top', `#${top.getHexString()}`);
    st.setProperty('--sky-mid', `#${mid.getHexString()}`);
    st.setProperty('--sky-bottom', `#${bottom.getHexString()}`);
    (this.scene.fog as Fog).color.copy(mid);
  }

  private projectMarkers() {
    const cam = this.rig.camera;
    const w = this.width;
    const h = this.height;
    for (let i = 0; i < this.markerEls.length; i++) {
      const el = this.markerEls[i];
      if (!el) continue;
      _v.copy(this.world.stations[i].anchor).project(cam);
      const px = (_v.x * 0.5 + 0.5) * w;
      const py = (-_v.y * 0.5 + 0.5) * h;
      const vis = px > -70 && px < w + 70 && py > -90 && py < h + 90;
      el.style.transform = `translate3d(${px.toFixed(1)}px, ${py.toFixed(1)}px, 0)`;
      if (vis !== this.markerVisible[i]) {
        this.markerVisible[i] = vis;
        el.dataset.offscreen = vis ? 'false' : 'true';
      }
    }
  }
}

export { STATION_Z };
