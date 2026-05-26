/** Geo helpers for vine map placement (no external deps). */

export type LngLat = [number, number];

function pointInRing(lng: number, lat: number, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i]![0]!;
    const yi = ring[i]![1]!;
    const xj = ring[j]![0]!;
    const yj = ring[j]![1]!;
    const intersect =
      (yi > lat) !== (yj > lat) &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function pointInPolygonCoords(
  lng: number,
  lat: number,
  coordinates: number[][][],
): boolean {
  const outer = coordinates[0];
  if (!outer || !pointInRing(lng, lat, outer)) return false;
  for (let h = 1; h < coordinates.length; h++) {
    const hole = coordinates[h];
    if (hole && pointInRing(lng, lat, hole)) return false;
  }
  return true;
}

/** True if `lngLat` lies inside block footprint (Polygon or MultiPolygon). */
export function pointInBlock(
  lngLat: LngLat,
  geom: GeoJSON.Polygon | GeoJSON.MultiPolygon,
): boolean {
  const [lng, lat] = lngLat;
  if (geom.type === "Polygon") {
    return pointInPolygonCoords(lng, lat, geom.coordinates);
  }
  for (const poly of geom.coordinates) {
    if (pointInPolygonCoords(lng, lat, poly)) return true;
  }
  return false;
}

/** Meters per degree at latitude (WGS84 approximation). */
function metersPerDegree(lat: number): { lng: number; lat: number } {
  const latRad = (lat * Math.PI) / 180;
  return {
    lat: 111_320,
    lng: 111_320 * Math.cos(latRad),
  };
}

/** Row segment from anchor, bearing (rad, 0 = east), and length in meters. */
export function rowEndpoints(
  anchor: LngLat,
  bearingRad: number,
  lengthM: number,
): { start: LngLat; end: LngLat } {
  const m = metersPerDegree(anchor[1]);
  const dxM = Math.cos(bearingRad) * lengthM;
  const dyM = Math.sin(bearingRad) * lengthM;
  return {
    start: anchor,
    end: [anchor[0] + dxM / m.lng, anchor[1] + dyM / m.lat],
  };
}

/** Default row length from spacing (m) and vine count. */
export function defaultRowLengthM(
  rowSpacingM: string | null | undefined,
  vineCount: number,
): number {
  const spacing = parseFloat(rowSpacingM ?? "");
  const step = Number.isFinite(spacing) && spacing > 0 ? spacing : 2;
  const n = Math.max(2, vineCount);
  return step * (n - 1);
}

export const ROW_BEARING_STEP_RAD = (2 * Math.PI) / 180;
export const ROW_LENGTH_STEP_M = 0.5;
export const ROW_MIN_LENGTH_M = 1;
