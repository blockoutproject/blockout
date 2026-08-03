export type MapCoordinate = [longitude: number, latitude: number];

export const DEFAULT_MAP_CENTER: MapCoordinate = [1.888334, 46.603354];
export const DEFAULT_MAP_ZOOM = 5;

export const hasMapCoordinate = (
  latitude: number | null | undefined,
  longitude: number | null | undefined,
): boolean =>
  typeof latitude === "number" &&
  typeof longitude === "number" &&
  Number.isFinite(latitude) &&
  Number.isFinite(longitude);

export const getMapCoordinateBounds = (coordinates: MapCoordinate[]) => {
  const longitudes = coordinates.map(([longitude]) => longitude);
  const latitudes = coordinates.map(([, latitude]) => latitude);

  return {
    southWest: [
      Math.min(...longitudes),
      Math.min(...latitudes),
    ] as MapCoordinate,
    northEast: [
      Math.max(...longitudes),
      Math.max(...latitudes),
    ] as MapCoordinate,
  };
};

export const getMapCoordinateCenter = (
  coordinates: MapCoordinate[],
): MapCoordinate => [
  coordinates.reduce((sum, [longitude]) => sum + longitude, 0) /
    coordinates.length,
  coordinates.reduce((sum, [, latitude]) => sum + latitude, 0) /
    coordinates.length,
];
