import "../src/config/env.js";
import { db } from "../src/config/firebase.js";
import { env } from "../src/config/env.js";
import { geohashForLocation } from "geofire-common";

const COLLECTION = `${env.firebase.collectionPrefix}complaints`;
const BATCH_SIZE = 400;

const snapshot = await db.collection(COLLECTION).get();
let batch = db.batch();
let pending = 0;
let updated = 0;

for (const doc of snapshot.docs) {
  const data = doc.data();
  const location = data.location;

  if (data.geoHash || !location) continue;

  const latitude = Number(location.latitude);
  const longitude = Number(location.longitude);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;

  batch.update(doc.ref, {
    geoHash: geohashForLocation([latitude, longitude]),
  });
  pending += 1;
  updated += 1;

  if (pending >= BATCH_SIZE) {
    await batch.commit();
    batch = db.batch();
    pending = 0;
  }
}

if (pending > 0) {
  await batch.commit();
}

console.log(`Backfill concluído: ${updated} denúncias atualizadas.`);
process.exit(0);
