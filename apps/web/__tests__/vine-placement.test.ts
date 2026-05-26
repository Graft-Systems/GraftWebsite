import { describe, expect, it } from "vitest";
import {
  defaultRowLengthM,
  pointInBlock,
  rowEndpoints,
} from "@/lib/vinePlacementUtils";

const testPolygon: GeoJSON.Polygon = {
  type: "Polygon",
  coordinates: [
    [
      [-122.0, 38.0],
      [-122.0, 38.01],
      [-121.99, 38.01],
      [-121.99, 38.0],
      [-122.0, 38.0],
    ],
  ],
};

describe("vinePlacementUtils", () => {
  it("pointInBlock accepts interior point", () => {
    expect(pointInBlock([-121.995, 38.005], testPolygon)).toBe(true);
  });

  it("pointInBlock rejects exterior point", () => {
    expect(pointInBlock([-121.5, 38.5], testPolygon)).toBe(false);
  });

  it("rowEndpoints extends east by default bearing", () => {
    const anchor: [number, number] = [-121.995, 38.005];
    const { start, end } = rowEndpoints(anchor, 0, 10);
    expect(start).toEqual(anchor);
    expect(end[0]).toBeGreaterThan(anchor[0]);
    expect(Math.abs(end[1] - anchor[1])).toBeLessThan(1e-6);
  });

  it("defaultRowLengthM uses spacing and count", () => {
    expect(defaultRowLengthM("2.5", 5)).toBe(10);
    expect(defaultRowLengthM(null, 4)).toBe(6);
  });
});
