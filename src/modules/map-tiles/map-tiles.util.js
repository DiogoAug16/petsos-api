const TILE_ZOOM = 12;
const MAX_LATITUDE = 85.05112878;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export const getMapTile = ({ latitude, longitude }, zoom = TILE_ZOOM) => {
  const safeLatitude = clamp(Number(latitude), -MAX_LATITUDE, MAX_LATITUDE);
  const safeLongitude = clamp(Number(longitude), -180, 180);
  const latitudeRadians = (safeLatitude * Math.PI) / 180;
  const tiles = 2 ** zoom;
  const x = clamp(Math.floor(((safeLongitude + 180) / 360) * tiles), 0, tiles - 1);
  const y = clamp(
    Math.floor(
      ((1 -
        Math.log(Math.tan(latitudeRadians) + 1 / Math.cos(latitudeRadians)) / Math.PI) /
        2) *
        tiles,
    ),
    0,
    tiles - 1,
  );

  return {
    z: zoom,
    x,
    y,
    key: `${zoom}:${x}:${y}`,
  };
};

export const getComplaintTileKeys = (complaint) => {
  if (!complaint?.location) return [];

  const latitude = complaint.location.latitude;
  const longitude = complaint.location.longitude;

  if (!Number.isFinite(Number(latitude)) || !Number.isFinite(Number(longitude))) {
    return [];
  }

  return [getMapTile({ latitude, longitude }).key];
};

export const getChangedComplaintTileKeys = (previousComplaint, nextComplaint) => {
  return [
    ...new Set([
      ...getComplaintTileKeys(previousComplaint),
      ...getComplaintTileKeys(nextComplaint),
    ]),
  ];
};
