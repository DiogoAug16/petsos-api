export const TILE_ZOOM = 12;
export const TILE_INDEX_MIN_ZOOM = 12;
export const TILE_INDEX_MAX_ZOOM = 15;
export const TILE_INDEX_ZOOMS = Array.from(
  { length: TILE_INDEX_MAX_ZOOM - TILE_INDEX_MIN_ZOOM + 1 },
  (_, index) => TILE_INDEX_MIN_ZOOM + index,
);
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

export const getMapTileKey = ({ z, x, y }) => `${z}:${x}:${y}`;

export const parseMapTileKey = (tileKey) => {
  const [z, x, y] = String(tileKey || "")
    .split(":")
    .map(Number);

  if (![z, x, y].every(Number.isInteger)) return null;

  return { z, x, y, key: getMapTileKey({ z, x, y }) };
};

const tileYToLatitude = (y, zoom) => {
  const radians = Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / 2 ** zoom)));
  return (radians * 180) / Math.PI;
};

export const getMapTileBounds = ({ z, x, y }) => {
  const tiles = 2 ** z;

  return {
    north: tileYToLatitude(y, z),
    south: tileYToLatitude(y + 1, z),
    west: (x / tiles) * 360 - 180,
    east: ((x + 1) / tiles) * 360 - 180,
  };
};

export const getMapTileCenter = (tile) => {
  const bounds = getMapTileBounds(tile);

  return {
    latitude: (bounds.north + bounds.south) / 2,
    longitude: (bounds.east + bounds.west) / 2,
  };
};

export const getComplaintTiles = (complaint, zooms = TILE_INDEX_ZOOMS) => {
  if (!complaint?.location) return [];

  const latitude = complaint.location.latitude;
  const longitude = complaint.location.longitude;

  if (!Number.isFinite(Number(latitude)) || !Number.isFinite(Number(longitude))) {
    return [];
  }

  return zooms.map((zoom) => getMapTile({ latitude, longitude }, zoom));
};

export const getComplaintTileKeys = (complaint) => {
  return getComplaintTiles(complaint, [TILE_ZOOM]).map((tile) => tile.key);
};

export const getChangedComplaintTileKeys = (previousComplaint, nextComplaint) => {
  return [
    ...new Set([
      ...getComplaintTileKeys(previousComplaint),
      ...getComplaintTileKeys(nextComplaint),
    ]),
  ];
};

export const getTilesForRadius = ({ lat, lng, radiusKm, z }) => {
  const latitude = Number(lat);
  const longitude = Number(lng);
  const radius = Number(radiusKm);
  const zoom = Number(z);
  const latitudeDelta = radius / 111.32;
  const longitudeDelta =
    radius / (111.32 * Math.max(Math.cos((latitude * Math.PI) / 180), 0.1));
  const north = clamp(latitude + latitudeDelta, -MAX_LATITUDE, MAX_LATITUDE);
  const south = clamp(latitude - latitudeDelta, -MAX_LATITUDE, MAX_LATITUDE);
  const west = clamp(longitude - longitudeDelta, -180, 180);
  const east = clamp(longitude + longitudeDelta, -180, 180);
  const northWest = getMapTile({ latitude: north, longitude: west }, zoom);
  const southEast = getMapTile({ latitude: south, longitude: east }, zoom);
  const tiles = [];

  for (let x = northWest.x; x <= southEast.x; x += 1) {
    for (let y = northWest.y; y <= southEast.y; y += 1) {
      tiles.push({
        z: zoom,
        x,
        y,
        key: getMapTileKey({ z: zoom, x, y }),
      });
    }
  }

  return tiles;
};
