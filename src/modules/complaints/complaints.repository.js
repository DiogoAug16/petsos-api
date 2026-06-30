import admin from "firebase-admin";
import { db, GeoPoint, FieldValue } from "../../config/firebase.js";
import { env } from "../../config/env.js";
import { NotFoundError } from "../../shared/errors/not-found.error.js";
import { ERROR_CODES } from "../../shared/types/error.codes.js";
import { serialize, timestampToMillis } from "../../shared/utils/firestore.util.js";
import { distanceBetween, geohashForLocation, geohashQueryBounds } from "geofire-common";
import { COMPLAINT_STATUS } from "../../shared/types/complaint.status.js";
import { COMPLAINT_PUBLIC_VISIBILITY } from "../../shared/types/complaint.visibility.js";
import { paginateFirestore } from "../../shared/helpers/paginate.helper.js";
import { complaintsCursorSchema } from "../../schemas/pagination.schema.js";

const COLLECTION = `${env.firebase.collectionPrefix}complaints`;
const DOCUMENT_ID_FIELD = admin.firestore.FieldPath.documentId();
const MAX_GEOHASH_RANGES_PER_MAP_QUERY = 9;
const MAP_RANGE_LIMIT_MULTIPLIER = 2;

const toGeoPoint = (data) => {
  if (!data.location) return data;
  const { latitude, longitude } = data.location;
  return {
    ...data,
    location: new GeoPoint(latitude, longitude),
    geoHash: geohashForLocation([latitude, longitude]),
  };
};

export const createId = () => db.collection(COLLECTION).doc().id;

export const create = async (data, id) => {
  const prepared = toGeoPoint(data);
  const docRef = db.collection(COLLECTION).doc(id);

  await docRef.set(prepared);

  return serialize(docRef.id, {
    ...prepared,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  });
};

const getPageCursorValuesFromDoc = (doc) => {
  const data = doc.data();
  return [timestampToMillis(data.createdAt), doc.id];
};

const SUMMARY_FIELDS = [
  "title",
  "description",
  "type",
  "animal",
  "location",
  "thumbnailPhotos",
  "status",
  "followersCount",
  "createdAt",
  "updatedAt",
];
const ADMIN_SUMMARY_FIELDS = [...SUMMARY_FIELDS, "publicVisibility", "createdById"];

export const getPage = async ({ limit, cursor }) => {
  const query = db
    .collection(COLLECTION)
    .where("publicVisibility", "==", COMPLAINT_PUBLIC_VISIBILITY.VISIBLE)
    .orderBy("createdAt", "desc")
    .orderBy(DOCUMENT_ID_FIELD);
  return await paginateFirestore({
    query,
    cursor,
    limit,
    cursorContext: { collection: COLLECTION },
    cursorSchema: complaintsCursorSchema,
    getCursorValuesFromDoc: getPageCursorValuesFromDoc,
    mapDoc: (doc) => serialize(doc.id, doc.data()),
  });
};

export const getSummaryPage = async ({ limit, cursor }) => {
  const query = db
    .collection(COLLECTION)
    .where("publicVisibility", "==", COMPLAINT_PUBLIC_VISIBILITY.VISIBLE)
    .orderBy("createdAt", "desc")
    .orderBy(DOCUMENT_ID_FIELD)
    .select(...SUMMARY_FIELDS);

  return await paginateFirestore({
    query,
    cursor,
    limit,
    cursorContext: { collection: COLLECTION },
    cursorSchema: complaintsCursorSchema,
    getCursorValuesFromDoc: getPageCursorValuesFromDoc,
    mapDoc: (doc) => serialize(doc.id, doc.data()),
  });
};

export const getAdminSummaryPage = async ({ limit, cursor }) => {
  const query = db
    .collection(COLLECTION)
    .orderBy("createdAt", "desc")
    .orderBy(DOCUMENT_ID_FIELD)
    .select(...ADMIN_SUMMARY_FIELDS);

  return await paginateFirestore({
    query,
    cursor,
    limit,
    cursorContext: { collection: COLLECTION, scope: "admin" },
    cursorSchema: complaintsCursorSchema,
    getCursorValuesFromDoc: getPageCursorValuesFromDoc,
    mapDoc: (doc) => serialize(doc.id, doc.data()),
  });
};

export const getDetail = async (id) => {
  const doc = await db.collection(COLLECTION).doc(id).get();
  if (!doc.exists) throw new NotFoundError(ERROR_CODES.COMPLAINT_NOT_FOUND);
  return serialize(doc.id, doc.data());
};

export const patch = async (id, data) => {
  const docRef = db.collection(COLLECTION).doc(id);
  const doc = await docRef.get();
  if (!doc.exists) throw new NotFoundError(ERROR_CODES.COMPLAINT_NOT_FOUND);

  const prepared = toGeoPoint(data);
  await docRef.update(prepared);

  const updated = (await docRef.get()).data();
  return serialize(id, updated);
};

export const setStatus = async (id, status) => {
  const docRef = db.collection(COLLECTION).doc(id);
  const doc = await docRef.get();
  if (!doc.exists) throw new NotFoundError(ERROR_CODES.COMPLAINT_NOT_FOUND);

  await docRef.update({ status, statusUpdatedAt: new Date(), updatedAt: new Date() });

  const updated = (await docRef.get()).data();
  return serialize(id, updated);
};

export const setStatusWithMetadata = async (id, status, metadata = {}) => {
  const docRef = db.collection(COLLECTION).doc(id);
  const doc = await docRef.get();
  if (!doc.exists) throw new NotFoundError(ERROR_CODES.COMPLAINT_NOT_FOUND);

  const updateData = {
    status,
    statusUpdatedAt: new Date(),
    updatedAt: new Date(),
  };

  for (const [key, value] of Object.entries(metadata)) {
    updateData[key] = value === null ? FieldValue.delete() : value;
  }

  await docRef.update(updateData);

  const updated = (await docRef.get()).data();
  return serialize(id, updated);
};

export const setStatusWithMetadataOnce = async (
  id,
  status,
  metadata = {},
  decisionId,
) => {
  const docRef = db.collection(COLLECTION).doc(id);

  return await db.runTransaction(async (transaction) => {
    const doc = await transaction.get(docRef);
    if (!doc.exists) throw new NotFoundError(ERROR_CODES.COMPLAINT_NOT_FOUND);

    const data = doc.data();
    if (decisionId && data.communityDecisionId === decisionId) {
      return { applied: false, complaint: serialize(id, data) };
    }

    const updateData = {
      status,
      statusUpdatedAt: new Date(),
      updatedAt: new Date(),
    };

    for (const [key, value] of Object.entries(metadata)) {
      updateData[key] = value === null ? FieldValue.delete() : value;
    }

    transaction.update(docRef, updateData);

    return {
      applied: true,
      complaint: serialize(id, { ...data, ...metadata, status }),
    };
  });
};

export const requestValidation = async (
  id,
  { requestedBy, reasonType, reasonText, evidenceIds },
) => {
  const docRef = db.collection(COLLECTION).doc(id);
  const doc = await docRef.get();
  if (!doc.exists) throw new NotFoundError(ERROR_CODES.COMPLAINT_NOT_FOUND);

  const updateData = {
    status: COMPLAINT_STATUS.AWAITING_VALIDATION,
    validationRequestedAt: new Date(),
    validationRequestedBy: requestedBy,
    validationRequestReasonType: reasonType,
    validationRequestReasonText: reasonText,
    statusUpdatedAt: new Date(),
    updatedAt: new Date(),
  };

  if (evidenceIds && evidenceIds.length > 0) {
    updateData.proposedEvidenceIds = evidenceIds;
  }

  await docRef.update(updateData);

  const updated = (await docRef.get()).data();

  return serialize(id, updated);
};

export const requestValidationIfUnrequested = async (
  id,
  { requestedBy, reasonType, reasonText },
) => {
  const docRef = db.collection(COLLECTION).doc(id);

  return await db.runTransaction(async (transaction) => {
    const doc = await transaction.get(docRef);
    if (!doc.exists) throw new NotFoundError(ERROR_CODES.COMPLAINT_NOT_FOUND);

    const data = doc.data();
    if (
      data.validationRequestedAt ||
      data.status !== COMPLAINT_STATUS.AWAITING_VALIDATION
    ) {
      return {
        opened: false,
        complaint: serialize(doc.id, data),
      };
    }

    const update = {
      validationRequestedAt: new Date(),
      validationRequestedBy: requestedBy,
      validationRequestReasonType: reasonType,
      validationRequestReasonText: reasonText,
      statusUpdatedAt: new Date(),
      updatedAt: new Date(),
    };

    transaction.update(docRef, update);

    return {
      opened: true,
      complaint: serialize(doc.id, { ...data, ...update }),
    };
  });
};

export const deleteComplaint = async (id) => {
  await db.collection(COLLECTION).doc(id).delete();
};

export const getByIds = async (ids) => {
  if (!ids || ids.length === 0) return [];

  const docRefs = ids.map((id) => db.collection(COLLECTION).doc(id));

  const chunks = [];
  for (let offset = 0; offset < docRefs.length; offset += 100) {
    chunks.push(docRefs.slice(offset, offset + 100));
  }

  const snapshots = await Promise.all(chunks.map((chunk) => db.getAll(...chunk)));

  const complaints = snapshots
    .flat()
    .filter((doc) => doc.exists)
    .map((doc) => serialize(doc.id, doc.data()));

  return complaints;
};

export const getStatusSummaryByIds = async (ids) => {
  if (!ids || ids.length === 0) return { total: 0, resolved: 0 };

  const docRefs = ids.map((id) => db.collection(COLLECTION).doc(id));
  const chunks = [];

  for (let offset = 0; offset < docRefs.length; offset += 100) {
    chunks.push(docRefs.slice(offset, offset + 100));
  }

  const snapshots = await Promise.all(
    chunks.map((chunk) => db.getAll(...chunk, { fieldMask: ["status"] })),
  );

  return snapshots
    .flat()
    .filter((doc) => doc.exists)
    .reduce(
      (summary, doc) => {
        const status = doc.data()?.status;
        summary.total += 1;
        if (status === COMPLAINT_STATUS.RESOLVED) summary.resolved += 1;
        return summary;
      },
      { total: 0, resolved: 0 },
    );
};

export const findNearestWithinRadius = async (lat, lng, radiusKm) => {
  const center = [Number(lat), Number(lng)];
  const radiusInKm = Number(radiusKm);
  const bounds = geohashQueryBounds(center, radiusInKm * 1000);
  const snapshots = await Promise.all(
    bounds.map(([start, end]) =>
      db
        .collection(COLLECTION)
        .where("publicVisibility", "==", COMPLAINT_PUBLIC_VISIBILITY.VISIBLE)
        .orderBy("geoHash")
        .startAt(start)
        .endAt(end)
        .get(),
    ),
  );

  const resultsById = new Map();

  for (const doc of snapshots.flatMap((snapshot) => snapshot.docs)) {
    const data = doc.data();
    if (!data.location || resultsById.has(doc.id)) continue;

    const docCenter = [data.location.latitude, data.location.longitude];
    const distanceInKm = distanceBetween(docCenter, center);

    if (distanceInKm <= radiusInKm) {
      resultsById.set(doc.id, {
        ...serialize(doc.id, data),
        distanceKm: Number(distanceInKm.toFixed(3)),
      });
    }
  }

  const results = [...resultsById.values()];

  results.sort((a, b) => a.distanceKm - b.distanceKm);

  return results;
};

export const findWithinBounds = async ({ north, south, east, west, limit }) => {
  const center = [(north + south) / 2, (east + west) / 2];
  const radiusInM = distanceBetween(center, [north, east]) * 1000;
  const bounds = geohashQueryBounds(center, radiusInM).slice(
    0,
    MAX_GEOHASH_RANGES_PER_MAP_QUERY,
  );
  if (!bounds.length) return [];

  const perRangeLimit = Math.max(
    1,
    Math.ceil((limit * MAP_RANGE_LIMIT_MULTIPLIER) / bounds.length),
  );
  const snapshots = await Promise.all(
    bounds.map(([start, end]) =>
      db
        .collection(COLLECTION)
        .where("publicVisibility", "==", COMPLAINT_PUBLIC_VISIBILITY.VISIBLE)
        .orderBy("geoHash")
        .startAt(start)
        .endAt(end)
        .limit(perRangeLimit)
        .get(),
    ),
  );
  const resultsById = new Map();

  for (const doc of snapshots.flatMap((snapshot) => snapshot.docs)) {
    if (resultsById.size >= limit) break;

    const data = doc.data();
    if (!data.location || resultsById.has(doc.id)) continue;

    const latitude = data.location.latitude;
    const longitude = data.location.longitude;

    if (
      latitude <= north &&
      latitude >= south &&
      longitude <= east &&
      longitude >= west
    ) {
      resultsById.set(doc.id, serialize(doc.id, data));
    }
  }

  return [...resultsById.values()];
};

export const confirmResolution = async (id) => {
  const docRef = db.collection(COLLECTION).doc(id);
  const doc = await docRef.get();

  if (!doc.exists) throw new NotFoundError(ERROR_CODES.COMPLAINT_NOT_FOUND);

  await docRef.update({
    status: COMPLAINT_STATUS.RESOLVED,
    resolvedAt: new Date(),
    resolvedBy: "author",
    updatedAt: new Date(),
  });

  const updatedDoc = await docRef.get();

  return serialize(updatedDoc.id, updatedDoc.data());
};
