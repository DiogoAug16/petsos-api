import "../src/config/env.js";
import "../src/config/storage.js";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { db } from "../src/config/firebase.js";
import { env } from "../src/config/env.js";
import { UPLOADS_DIR } from "../src/config/storage.js";

const COLLECTION = `${env.firebase.collectionPrefix}complaints`;
const BATCH_SIZE = 400;

const getUploadPath = (photoPath) => {
  if (typeof photoPath !== "string" || !photoPath.startsWith("/uploads/")) {
    return null;
  }

  return path.join(UPLOADS_DIR, path.basename(photoPath));
};

const makeThumbnail = async (photoPath) => {
  const sourcePath = getUploadPath(photoPath);
  if (!sourcePath || !fs.existsSync(sourcePath)) return null;

  const parsedPath = path.parse(sourcePath);
  const thumbnailFilename = `${parsedPath.name}-thumb.jpg`;
  const thumbnailPath = path.join(parsedPath.dir, thumbnailFilename);

  if (!fs.existsSync(thumbnailPath)) {
    await sharp(sourcePath)
      .rotate()
      .resize({
        width: 360,
        height: 360,
        fit: "cover",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 68 })
      .toFile(thumbnailPath);
  }

  return `/uploads/${thumbnailFilename}`;
};

const snapshot = await db.collection(COLLECTION).get();
let batch = db.batch();
let pending = 0;
let updated = 0;

for (const doc of snapshot.docs) {
  const data = doc.data();
  if (Array.isArray(data.thumbnailPhotos) && data.thumbnailPhotos.length > 0) {
    continue;
  }

  const photos = Array.isArray(data.photos) ? data.photos : [];
  if (!photos.length) continue;

  const thumbnailPhotos = (await Promise.all(photos.map(makeThumbnail))).filter(Boolean);
  if (!thumbnailPhotos.length) continue;

  batch.update(doc.ref, { thumbnailPhotos });
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

console.log(`Backfill concluído: ${updated} denúncias com thumbnails.`);
process.exit(0);
