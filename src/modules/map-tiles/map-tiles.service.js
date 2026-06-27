import { ValidationError } from "../../shared/errors/validation.error.js";
import { ERROR_CODES } from "../../shared/types/error.codes.js";
import * as mapTilesRepository from "./map-tiles.repository.js";
import { getTilesForRadius } from "./map-tiles.util.js";

const MAX_TILE_INDEX_LOOKUP_TILES = 1200;

export const getTilesIndex = async ({ lat, lng, radiusKm, z }) => {
  const tiles = getTilesForRadius({ lat, lng, radiusKm, z });

  if (tiles.length > MAX_TILE_INDEX_LOOKUP_TILES) {
    throw new ValidationError(
      "Área do índice de tiles muito grande",
      ERROR_CODES.COMPLAINT_VALIDATION,
    );
  }

  const tileKeys = tiles.map((tile) => tile.key);
  const stats = await mapTilesRepository.getByTileKeys(tileKeys);

  return stats.sort((first, second) => {
    const countDiff = Number(second.count ?? 0) - Number(first.count ?? 0);
    if (countDiff !== 0) return countDiff;
    return String(first.tileKey).localeCompare(String(second.tileKey));
  });
};

export const syncComplaintTileStats = mapTilesRepository.syncComplaintTileStats;
