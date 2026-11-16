import type { StationId, StationInfo } from './types';

/** Stationsdaten. Titel und Bibelstellen aus dem Konzept der Karte. */
export const STATIONS: readonly StationInfo[] = [
  { id: 1, short: 'Ägypten', title: 'Israel in Ägypten', reference: '2. Mose 1–4', chapters: [1, 4] },
  { id: 2, short: 'Plagen', title: 'Die zehn Plagen', reference: '2. Mose 5–12', chapters: [5, 12] },
  { id: 3, short: 'Auszug', title: 'Der Auszug aus Ägypten', reference: '2. Mose 12–13', chapters: [12, 13] },
  { id: 4, short: 'Rotes Meer', title: 'Der Durchzug durch das Rote Meer', reference: '2. Mose 14–15', chapters: [14, 15] },
  { id: 5, short: 'Wildnis', title: 'Die Reise durch die Wildnis', reference: '2. Mose 16–18', chapters: [16, 18] },
  { id: 6, short: 'Sinai', title: 'Der Berg Sinai', reference: '2. Mose 19–40', chapters: [19, 40] },
];

export const STATION_IDS: readonly StationId[] = [1, 2, 3, 4, 5, 6];

export function getStation(id: StationId): StationInfo {
  return STATIONS[id - 1];
}
