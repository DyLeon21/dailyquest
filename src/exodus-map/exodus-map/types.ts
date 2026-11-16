/** Öffentliche Typen der Exodus-Karte. */
import type { CSSProperties } from 'react';

export type StationId = 1 | 2 | 3 | 4 | 5 | 6;

export interface StationInfo {
  id: StationId;
  /** Kurzer Titel für Marker-Beschriftung, z. B. "Rotes Meer". */
  short: string;
  /** Vollständiger Titel, z. B. "Der Durchzug durch das Rote Meer". */
  title: string;
  /** Bibelstellen, z. B. "2. Mose 14–15". */
  reference: string;
  /** Erstes und letztes Kapitel im 2. Buch Mose. */
  chapters: readonly [number, number];
}

export type StationStatus = 'done' | 'current' | 'open';

/** Einstellungen für jeden Animationskanal – alle unabhängig voneinander änderbar. */
export interface AnimationSettings {
  /** Nil + Wasserfall: Strömung. */
  nile: { enabled: boolean; speed: number; strength: number };
  /** Rotes Meer, Wasserwände, Oase: Wellen und Schaum. */
  redSea: { enabled: boolean; speed: number; amplitude: number };
  /** Palmwedel, Schilf, Banner, Flammen: Wind. */
  palms: { enabled: boolean; speed: number; amount: number };
  /** Wolken am Sinai und unter der Insel. */
  clouds: { enabled: boolean; speed: number };
  /** Staubflimmern und Funken am Lagerfeuer. */
  particles: { enabled: boolean; amount: number };
  /** Wolkenschatten, Sonnenatmen, Lichtsäule am Sinai. */
  light: { enabled: boolean; speed: number; strength: number };
  /** Pulsierender Ring am aktuellen Marker. */
  markers: { enabled: boolean };
}

export type PartialAnimationSettings = {
  [K in keyof AnimationSettings]?: Partial<AnimationSettings[K]>;
};

export type QualityLevel = 'auto' | 'low' | 'medium' | 'high';

export interface ExodusMapProps {
  /** Abgeschlossene Stationen (grünes Häkchen). */
  completed?: readonly StationId[];
  /**
   * Aktuelle Station (pulsierender Marker). Standard: die erste noch nicht abgeschlossene.
   * `null` schaltet die Hervorhebung ab.
   */
  current?: StationId | null;
  /** Ausgewählte Station (Kamera gleitet dorthin). Wenn gesetzt, ist die Auswahl "controlled". */
  selected?: StationId | null;
  /** Station, auf die beim Start zentriert wird. Standard: aktuelle Station. */
  initialStation?: StationId;
  /** Wird aufgerufen, wenn ein Marker angetippt wird. */
  onStationSelect?: (station: StationInfo) => void;
  /** Animationen einzeln anpassen oder abschalten. */
  animation?: PartialAnimationSettings;
  /** Grafikqualität. "auto" passt sich dem Gerät an. */
  quality?: QualityLevel;
  /** Beschriftungs-Chip unter dem ausgewählten Marker anzeigen. */
  showLabels?: boolean;
  /** Pausiert das Rendern (z. B. wenn die Karte verdeckt ist). */
  paused?: boolean;
  className?: string;
  style?: CSSProperties;
}

export interface ExodusMapHandle {
  /** Kamera sanft auf eine Station fahren. */
  focusStation(id: StationId, opts?: { instant?: boolean }): void;
  /** Animationen zur Laufzeit ändern. */
  setAnimation(partial: PartialAnimationSettings): void;
  /** Aktuelle Animationswerte lesen. */
  getAnimation(): AnimationSettings;
  /** Leistungswerte der letzten Szene (Draw Calls, Dreiecke …) – praktisch zum Prüfen auf dem Zielgerät. */
  getStats(): ExodusMapStats | null;
  /** Kamera ohne Animation an eine z-Position setzen (Test/Debug). */
  setCameraZ(z: number): void;
}

export interface ExodusMapStats {
  drawCalls: number;
  triangles: number;
  geometries: number;
  pixelRatio: number;
  cameraZ: number;
  shadows: boolean;
}
