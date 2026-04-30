// Shared vineyard geometry — used by both the home-page Scene 4 scroll
// scene and the /tool Geospatial view. Keeping this in one place so the
// two maps stay in sync when coords, tilt, or block data are tuned.

// Bordeaux vineyard location provided by Benson: 44°54'19.3"N 0°10'34.8"W.
export const CENTER: [number, number] = [-0.17715, 44.90610];

export const ROTATION_DEG = -30; // negative = CW (top leans right)
export const SHIFT_LNG = -0.00025;
export const SHIFT_LAT = -0.00040;
export const ROW_ROTATION_DEG = ROTATION_DEG + 3;

// Extra offset applied to the focus row only (on top of SHIFT_LNG/LAT)
// — nudges the highlighted row slightly NE within the focus block.
export const ROW_OFFSET_LNG = 0.00015;
export const ROW_OFFSET_LAT = 0.00012;

export type Block = {
  name: string;
  varietal: string;
  clones: string[];
  planted: number;
  rows: number;
  vines: number;
  coords: [number, number][]; // closed polygon, rotated + shifted
};

export function rotatePoints(
  points: [number, number][],
  center: [number, number],
  angleDeg: number
): [number, number][] {
  const theta = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  const latCos = Math.cos((center[1] * Math.PI) / 180);
  return points.map(([lng, lat]) => {
    const dlng = lng - center[0];
    const dlat = lat - center[1];
    const mx = dlng * latCos;
    const my = dlat;
    const rx = mx * cos - my * sin;
    const ry = mx * sin + my * cos;
    return [center[0] + rx / latCos, center[1] + ry];
  });
}

export function shiftPoints(
  points: [number, number][],
  dlng: number,
  dlat: number
): [number, number][] {
  return points.map(([lng, lat]) => [lng + dlng, lat + dlat]);
}

export function centroid(coords: [number, number][]): [number, number] {
  const unique = coords.slice(0, 4);
  let lng = 0;
  let lat = 0;
  for (const [x, y] of unique) {
    lng += x;
    lat += y;
  }
  return [lng / 4, lat / 4];
}

// Axis-aligned block bases. Top row: Cab Sauv · Merlot · Malbec.
// Bottom row: Cab Franc · Petit Verdot.
const BLOCKS_BASE: Block[] = [
  {
    name: "07",
    varietal: "Cabernet Sauvignon",
    clones: ["Clone 337", "Clone 169"],
    planted: 2014,
    rows: 38,
    vines: 1560,
    coords: [
      [-0.17935, 44.90689],
      [-0.17798, 44.90689],
      [-0.17798, 44.90591],
      [-0.17935, 44.90591],
      [-0.17935, 44.90689],
    ],
  },
  {
    name: "04",
    varietal: "Merlot",
    clones: ["Clone 181"],
    planted: 2013,
    rows: 32,
    vines: 1330,
    coords: [
      [-0.17784, 44.90689],
      [-0.17647, 44.90689],
      [-0.17647, 44.90591],
      [-0.17784, 44.90591],
      [-0.17784, 44.90689],
    ],
  },
  {
    name: "11",
    varietal: "Malbec",
    clones: ["Clone 595"],
    planted: 2016,
    rows: 30,
    vines: 1240,
    coords: [
      [-0.17633, 44.90689],
      [-0.17496, 44.90689],
      [-0.17496, 44.90591],
      [-0.17633, 44.90591],
      [-0.17633, 44.90689],
    ],
  },
  {
    name: "12",
    varietal: "Cabernet Franc",
    clones: ["Clone 214"],
    planted: 2016,
    rows: 30,
    vines: 1240,
    coords: [
      [-0.17867, 44.90580],
      [-0.17729, 44.90580],
      [-0.17729, 44.90492],
      [-0.17867, 44.90492],
      [-0.17867, 44.90580],
    ],
  },
  {
    name: "15",
    varietal: "Petit Verdot",
    clones: ["Clone 2"],
    planted: 2015,
    rows: 28,
    vines: 1150,
    coords: [
      [-0.17715, 44.90580],
      [-0.17578, 44.90580],
      [-0.17578, 44.90492],
      [-0.17715, 44.90492],
      [-0.17715, 44.90580],
    ],
  },
];

// Rotate the grid around CENTER as a whole, then shift down-along-tilt.
export const BLOCKS: Block[] = BLOCKS_BASE.map((b) => {
  const rotated = rotatePoints(b.coords, CENTER, ROTATION_DEG);
  const shifted = shiftPoints(rotated, SHIFT_LNG, SHIFT_LAT);
  return { ...b, coords: shifted };
});

export const BLOCKS_GEOJSON: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: BLOCKS.map((b) => ({
    type: "Feature",
    properties: { name: b.name, varietal: b.varietal },
    geometry: { type: "Polygon", coordinates: [b.coords] },
  })),
};

// Focus block for scene pinned-drilldown (Block 07 = Cab Sauv, top-left).
export const FOCUS_BLOCK = BLOCKS[0];
export const FOCUS_CENTER: [number, number] = centroid(FOCUS_BLOCK.coords);

// Focus row inside the focus block, rotated 3° less CW than the grid
// (leans a touch left of the block's long edge) then shifted with the
// blocks so they travel together.
const FOCUS_ROW_BASE: [[number, number], [number, number]] = [
  [-0.17905, 44.90670],
  [-0.17905, 44.90612],
];
const FOCUS_ROW_ROTATED = rotatePoints(FOCUS_ROW_BASE, CENTER, ROW_ROTATION_DEG);
const FOCUS_ROW_SHIFTED = shiftPoints(
  FOCUS_ROW_ROTATED,
  SHIFT_LNG + ROW_OFFSET_LNG,
  SHIFT_LAT + ROW_OFFSET_LAT
);
export const FOCUS_ROW_START: [number, number] = FOCUS_ROW_SHIFTED[0];
export const FOCUS_ROW_END: [number, number] = FOCUS_ROW_SHIFTED[1];
export const FOCUS_ROW_CENTER: [number, number] = [
  (FOCUS_ROW_START[0] + FOCUS_ROW_END[0]) / 2,
  (FOCUS_ROW_START[1] + FOCUS_ROW_END[1]) / 2,
];
export const FOCUS_VINE: [number, number] = FOCUS_ROW_CENTER;
