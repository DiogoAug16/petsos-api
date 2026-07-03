import "../src/config/env.js";
import { db, FieldValue } from "../src/config/firebase.js";
import { env } from "../src/config/env.js";
import { COMPLAINT_STATUS } from "../src/shared/types/complaint.status.js";
import { isComplaintPubliclyVisible } from "../src/shared/types/complaint.visibility.js";
import { getComplaintTiles } from "../src/modules/map-tiles/map-tiles.util.js";
import {
  COLLECTION as MAP_TILE_STATS_COLLECTION,
  replaceAll,
} from "../src/modules/map-tiles/map-tiles.repository.js";

const COMPLAINTS_COLLECTION = `${env.firebase.collectionPrefix}complaints`;

const emptyStats = (tile) => ({
  z: tile.z,
  x: tile.x,
  y: tile.y,
  tileKey: tile.key,
  count: 0,
  openCount: 0,
  resolvedCount: 0,
  closedCount: 0,
  inProgressCount: 0,
  awaitingValidationCount: 0,
});

const statusCounterField = (status) => {
  if (status === COMPLAINT_STATUS.OPEN) return "openCount";
  if (status === COMPLAINT_STATUS.RESOLVED) return "resolvedCount";
  if (status === COMPLAINT_STATUS.CLOSED) return "closedCount";
  if (status === COMPLAINT_STATUS.IN_PROGRESS) return "inProgressCount";
  if (status === COMPLAINT_STATUS.AWAITING_VALIDATION) {
    return "awaitingValidationCount";
  }
  return null;
};

const incrementStats = (stats, status) => {
  stats.count += 1;
  const field = statusCounterField(status);
  if (field) stats[field] += 1;
};

const snapshot = await db.collection(COMPLAINTS_COLLECTION).get();
const statsByTileKey = new Map();

for (const doc of snapshot.docs) {
  const complaint = { id: doc.id, ...doc.data() };
  if (!isComplaintPubliclyVisible(complaint)) continue;

  const tiles = getComplaintTiles(complaint);

  for (const tile of tiles) {
    const stats = statsByTileKey.get(tile.key) || emptyStats(tile);
    incrementStats(stats, complaint.status);
    statsByTileKey.set(tile.key, stats);
  }
}

await replaceAll([...statsByTileKey.values()]);

const existingStats = await db.collection(MAP_TILE_STATS_COLLECTION).get();
const writer = db.bulkWriter();
let cleared = 0;

for (const doc of existingStats.docs) {
  if (statsByTileKey.has(doc.id)) continue;

  writer.set(
    doc.ref,
    {
      count: 0,
      openCount: 0,
      resolvedCount: 0,
      closedCount: 0,
      inProgressCount: 0,
      awaitingValidationCount: 0,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  cleared += 1;
}

await writer.close();

console.log(
  `Backfill concluído: ${snapshot.size} denúncias lidas, ${statsByTileKey.size} tiles atualizados, ${cleared} tiles zerados.`,
);
process.exit(0);
