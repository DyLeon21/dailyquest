import { buildStation1 } from './station1';
import { buildStation2 } from './station2';
import { buildStation3 } from './station3';
import { buildStation4 } from './station4';
import { buildStation5 } from './station5';
import { buildStation6 } from './station6';
import type { StationContext } from './common';

export type StationBuilder = (ctx: StationContext) => void;

/** Reihenfolge = Stationsnummer 1–6. */
export const STATION_BUILDERS: StationBuilder[] = [buildStation1, buildStation2, buildStation3, buildStation4, buildStation5, buildStation6];
