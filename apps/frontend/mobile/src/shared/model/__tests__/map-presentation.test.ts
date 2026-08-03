import {
  getMapCoordinateBounds,
  getMapCoordinateCenter,
  hasMapCoordinate,
} from "@/src/shared/model/map-presentation";

describe("map presentation", () => {
  it("accepts only finite coordinate pairs", () => {
    expect(hasMapCoordinate(48.8, 2.3)).toBe(true);
    expect(hasMapCoordinate(null, 2.3)).toBe(false);
    expect(hasMapCoordinate(48.8, Number.NaN)).toBe(false);
  });

  it("derives a center and bounds for several markers", () => {
    const coordinates: [number, number][] = [
      [1, 2],
      [5, 8],
      [3, 4],
    ];

    expect(getMapCoordinateCenter(coordinates)).toEqual([3, 14 / 3]);
    expect(getMapCoordinateBounds(coordinates)).toEqual({
      southWest: [1, 2],
      northEast: [5, 8],
    });
  });
});
