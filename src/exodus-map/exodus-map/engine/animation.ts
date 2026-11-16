import { DEFAULT_ANIMATION } from '../config';
import type { AnimationSettings, PartialAnimationSettings } from '../types';

type U = { value: number };

/**
 * Jeder Animationskanal hat eine eigene Zeit + Stärke als Shader-Uniform.
 * So lässt sich jede Bewegung einzeln anpassen oder abschalten, ohne Sprünge:
 * Stärken werden weich nachgeführt, die Zeit läuft nur, solange der Kanal aktiv ist.
 */
export class AnimationState {
  settings: AnimationSettings = structuredClone(DEFAULT_ANIMATION);

  readonly u = {
    windT: { value: 0 } as U,
    windAmp: { value: 1 } as U,
    riverT: { value: 0 } as U,
    riverStr: { value: 1 } as U,
    seaT: { value: 0 } as U,
    seaAmp: { value: 1 } as U,
    cloudT: { value: 0 } as U,
    lightT: { value: 0 } as U,
    lightAmt: { value: 0.1 } as U,
  };

  /** Zeit für Marker-Puls / Licht-Atmen (JS-seitig). */
  time = 0;
  /** Weicher Faktor 0..1 für Lichtsäule & Sonnenatmen. */
  lightStrength = 1;
  /** Weicher Faktor 0..1 für Marker-Puls. */
  markerPulse = 1;
  /** Weicher Faktor 0..1 für Partikel. */
  particleAmount = 1;

  set(partial: PartialAnimationSettings) {
    for (const key of Object.keys(partial) as (keyof AnimationSettings)[]) {
      Object.assign(this.settings[key], partial[key]);
    }
  }

  replace(settings: AnimationSettings) {
    this.settings = structuredClone(settings);
  }

  update(dt: number) {
    const s = this.settings;
    const k = Math.min(1, dt * 3.5);
    const approach = (u: U, target: number) => {
      u.value += (target - u.value) * k;
    };
    this.time += dt;

    if (s.palms.enabled) this.u.windT.value += dt * s.palms.speed;
    approach(this.u.windAmp, s.palms.enabled ? s.palms.amount : 0);

    if (s.nile.enabled) this.u.riverT.value += dt * s.nile.speed;
    approach(this.u.riverStr, s.nile.enabled ? s.nile.strength : 0);

    if (s.redSea.enabled) this.u.seaT.value += dt * s.redSea.speed;
    approach(this.u.seaAmp, s.redSea.enabled ? s.redSea.amplitude : 0);

    if (s.clouds.enabled) this.u.cloudT.value += dt * s.clouds.speed;

    if (s.light.enabled) this.u.lightT.value += dt * s.light.speed;
    const lt = s.light.enabled ? s.light.strength : 0;
    approach(this.u.lightAmt, 0.11 * lt);
    this.lightStrength += ((s.light.enabled ? s.light.strength : 0) - this.lightStrength) * k;

    this.markerPulse += ((s.markers.enabled ? 1 : 0) - this.markerPulse) * k;
    this.particleAmount += ((s.particles.enabled ? s.particles.amount : 0) - this.particleAmount) * k;
  }
}
