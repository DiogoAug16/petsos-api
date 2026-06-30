import { db, FieldValue } from "../../config/firebase.js";
import { env } from "../../config/env.js";
import { COMPLAINT_STATUS } from "../../shared/types/complaint.status.js";
import { COMPLAINT_PUBLIC_VISIBILITY } from "../../shared/types/complaint.visibility.js";
import { serialize } from "../../shared/utils/firestore.util.js";
import { getComplaintTiles, getMapTileKey, parseMapTileKey } from "./map-tiles.util.js";

export const COLLECTION = `${env.firebase.collectionPrefix}map_tile_stats`;

const getCollection = () => db.collection(COLLECTION);

const getStatusCounterField = (status) => {
  if (status === COMPLAINT_STATUS.OPEN) return "openCount";
  if (status === COMPLAINT_STATUS.RESOLVED) return "resolvedCount";
  if (status === COMPLAINT_STATUS.CLOSED) return "closedCount";
  if (status === COMPLAINT_STATUS.IN_PROGRESS) return "inProgressCount";
  if (status === COMPLAINT_STATUS.AWAITING_VALIDATION) {
    return "awaitingValidationCount";
  }

  return null;
};

const getComplaintTileStats = (complaint) => {
  if (!complaint) return new Map();
  if (complaint.publicVisibility !== COMPLAINT_PUBLIC_VISIBILITY.VISIBLE) {
    return new Map();
  }

  return new Map(
    getComplaintTiles(complaint).map((tile) => [
      tile.key,
      {
        ...tile,
        status: complaint.status,
      },
    ]),
  );
};

const getEmptyStats = (tile) => ({
  z: tile.z,
  x: tile.x,
  y: tile.y,
  tileKey: getMapTileKey(tile),
  count: 0,
  openCount: 0,
  resolvedCount: 0,
  closedCount: 0,
  inProgressCount: 0,
  awaitingValidationCount: 0,
});

const clampCount = (value) => Math.max(0, Number(value ?? 0));

const applyDelta = (stats, status, delta) => {
  stats.count = clampCount(stats.count + delta);

  const field = getStatusCounterField(status);
  if (field) {
    stats[field] = clampCount(stats[field] + delta);
  }
};

export const syncComplaintTileStats = async ({ previousComplaint, nextComplaint }) => {
  const previousTiles = getComplaintTileStats(previousComplaint);
  const nextTiles = getComplaintTileStats(nextComplaint);
  const tileKeys = [...new Set([...previousTiles.keys(), ...nextTiles.keys()])];

  if (tileKeys.length === 0) return [];

  await db.runTransaction(async (transaction) => {
    const refs = tileKeys.map((tileKey) => getCollection().doc(tileKey));
    const snapshots = await Promise.all(refs.map((ref) => transaction.get(ref)));

    snapshots.forEach((snapshot, index) => {
      const tileKey = tileKeys[index];
      const previousTile = previousTiles.get(tileKey);
      const nextTile = nextTiles.get(tileKey);
      const tile = nextTile || previousTile || parseMapTileKey(tileKey);
      const stats = snapshot.exists
        ? { ...getEmptyStats(tile), ...snapshot.data() }
        : getEmptyStats(tile);

      if (previousTile) applyDelta(stats, previousTile.status, -1);
      if (nextTile) applyDelta(stats, nextTile.status, 1);

      stats.updatedAt = new Date();
      transaction.set(refs[index], stats, { merge: true });
    });
  });

  return tileKeys;
};

export const getByTileKeys = async (tileKeys) => {
  if (!tileKeys?.length) return [];

  const refs = tileKeys.map((tileKey) => getCollection().doc(tileKey));
  const chunks = [];

  for (let offset = 0; offset < refs.length; offset += 100) {
    chunks.push(refs.slice(offset, offset + 100));
  }

  const snapshots = await Promise.all(chunks.map((chunk) => db.getAll(...chunk)));

  return snapshots
    .flat()
    .filter((doc) => doc.exists)
    .map((doc) => serialize(doc.id, doc.data()))
    .filter((tile) => Number(tile.count ?? 0) > 0);
};

export const replaceAll = async (tileStats) => {
  const writer = db.bulkWriter();

  tileStats.forEach((stats) => {
    writer.set(getCollection().doc(stats.tileKey), {
      ...stats,
      updatedAt: FieldValue.serverTimestamp(),
    });
  });

  await writer.close();
};
