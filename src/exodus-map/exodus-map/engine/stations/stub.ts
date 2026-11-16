import { emitPath } from '../terrain';
import { STATION_Z } from '../layout';
import { platform } from './common';
import type { StationContext } from './common';

/** Platzhalter: nur Gelände, Pfad und Plattform. */
export function buildStub(ctx: StationContext) {
  ctx.terrain.emitRange(ctx.b, ctx.zNorth, ctx.zSouth);
  emitPath(ctx.b, ctx.terrain, ctx.zNorth, ctx.zSouth);
  platform(ctx, STATION_Z[ctx.index]);
}
