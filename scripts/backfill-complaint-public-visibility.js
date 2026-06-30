import "../src/config/env.js";
import { db } from "../src/config/firebase.js";
import { env } from "../src/config/env.js";
import { COMPLAINT_PUBLIC_VISIBILITY } from "../src/shared/types/complaint.visibility.js";

const COMPLAINTS_COLLECTION = `${env.firebase.collectionPrefix}complaints`;

const snapshot = await db.collection(COMPLAINTS_COLLECTION).get();
const writer = db.bulkWriter();
let updated = 0;

for (const doc of snapshot.docs) {
  const data = doc.data();
  if (data.publicVisibility != null) continue;

  writer.update(doc.ref, {
    publicVisibility: COMPLAINT_PUBLIC_VISIBILITY.VISIBLE,
    updatedAt: data.updatedAt ?? new Date(),
  });
  updated += 1;
}

await writer.close();

console.log(
  `Backfill concluído: ${snapshot.size} denúncias lidas, ${updated} denúncias atualizadas.`,
);
process.exit(0);
