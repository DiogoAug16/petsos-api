import test from "node:test";
import assert from "node:assert/strict";
import {
  getComplaintTileKeys,
  getComplaintTiles,
  getMapTile,
  getMapTileBounds,
  getTilesForRadius,
  parseMapTileKey,
  TILE_INDEX_ZOOMS,
} from "./map-tiles.util.js";

test("getMapTile creates stable tile keys", () => {
  const tile = getMapTile({ latitude: -15.619, longitude: -56.049 }, 12);

  assert.equal(tile.key, `${tile.z}:${tile.x}:${tile.y}`);
  assert.equal(tile.z, 12);
  assert.equal(parseMapTileKey(tile.key).key, tile.key);
});

test("getComplaintTiles returns all indexed zoom levels", () => {
  const complaint = {
    location: {
      latitude: -15.619,
      longitude: -56.049,
    },
  };

  const tiles = getComplaintTiles(complaint);

  assert.equal(tiles.length, TILE_INDEX_ZOOMS.length);
  assert.deepEqual(
    tiles.map((tile) => tile.z),
    TILE_INDEX_ZOOMS,
  );
  assert.equal(getComplaintTileKeys(complaint).length, 1);
});

test("getTilesForRadius includes the center tile bounds", () => {
  const latitude = -15.619;
  const longitude = -56.049;
  const centerTile = getMapTile({ latitude, longitude }, 12);
  const tiles = getTilesForRadius({ lat: latitude, lng: longitude, radiusKm: 10, z: 12 });
  const found = tiles.find((tile) => tile.key === centerTile.key);
  const bounds = getMapTileBounds(centerTile);

  assert.ok(found);
  assert.ok(latitude <= bounds.north);
  assert.ok(latitude >= bounds.south);
  assert.ok(longitude >= bounds.west);
  assert.ok(longitude <= bounds.east);
});
