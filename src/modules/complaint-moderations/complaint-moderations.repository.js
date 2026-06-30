import admin from "firebase-admin";
import { db, FieldValue } from "../../config/firebase.js";
import { env } from "../../config/env.js";
import { NotFoundError } from "../../shared/errors/not-found.error.js";
import { ConflictError } from "../../shared/errors/conflict.error.js";
import { ERROR_CODES } from "../../shared/types/error.codes.js";
import { COMPLAINT_MODERATION_STATUS } from "../../shared/types/complaint-moderation.status.js";
import { COMPLAINT_PUBLIC_VISIBILITY } from "../../shared/types/complaint.visibility.js";
import { paginateFirestore } from "../../shared/helpers/paginate.helper.js";
import { complaintModerationsCursorSchema } from "../../schemas/pagination.schema.js";
import { serialize, timestampToMillis } from "../../shared/utils/firestore.util.js";

const COMPLAINTS_COLLECTION = `${env.firebase.collectionPrefix}complaints`;
const MODERATIONS_COLLECTION = `${env.firebase.collectionPrefix}complaint_moderations`;
const REPORTS_COLLECTION = `${env.firebase.collectionPrefix}complaint_reports`;
const ADMIN_LOGS_COLLECTION = `${env.firebase.collectionPrefix}admin_logs`;
const DOCUMENT_ID_FIELD = admin.firestore.FieldPath.documentId();

const complaintsCollection = () => db.collection(COMPLAINTS_COLLECTION);
const moderationsCollection = () => db.collection(MODERATIONS_COLLECTION);
const reportsCollection = () => db.collection(REPORTS_COLLECTION);
const adminLogsCollection = () => db.collection(ADMIN_LOGS_COLLECTION);

const getCursorValuesFromDoc = (doc) => {
  const data = doc.data();
  return [timestampToMillis(data.createdAt), doc.id];
};

const getReportId = (complaintId, reporterId) => `${complaintId}_${reporterId}`;

const getVisibilityForAction = (action) => {
  if (action === "approve") return COMPLAINT_PUBLIC_VISIBILITY.VISIBLE;
  return COMPLAINT_PUBLIC_VISIBILITY.HIDDEN;
};

const getStatusForAction = (action) => {
  if (action === "approve") return COMPLAINT_MODERATION_STATUS.APPROVED;
  if (action === "reject") return COMPLAINT_MODERATION_STATUS.REJECTED;
  return COMPLAINT_MODERATION_STATUS.HIDDEN;
};

export const reportComplaint = async ({ complaintId, reporterId, reason }) => {
  const complaintRef = complaintsCollection().doc(complaintId);
  const moderationRef = moderationsCollection().doc(complaintId);
  const reportRef = reportsCollection().doc(getReportId(complaintId, reporterId));
  const now = new Date();

  await db.runTransaction(async (transaction) => {
    const [complaintDoc, moderationDoc, reportDoc] = await Promise.all([
      transaction.get(complaintRef),
      transaction.get(moderationRef),
      transaction.get(reportRef),
    ]);

    if (!complaintDoc.exists) {
      throw new NotFoundError(ERROR_CODES.COMPLAINT_NOT_FOUND);
    }

    if (reportDoc.exists) {
      throw new ConflictError(
        "Você já reportou esta denúncia",
        ERROR_CODES.COMPLAINT_REPORT_ALREADY_EXISTS,
      );
    }

    transaction.set(reportRef, {
      complaintId,
      reporterId,
      reason,
      createdAt: now,
    });

    if (moderationDoc.exists) {
      transaction.update(moderationRef, {
        reportCount: FieldValue.increment(1),
        lastReportedAt: now,
        updatedAt: now,
      });
      return;
    }

    transaction.set(moderationRef, {
      complaintId,
      moderationStatus: COMPLAINT_MODERATION_STATUS.PENDING,
      moderatedBy: null,
      moderatedAt: null,
      moderationReason: null,
      createdAt: now,
      updatedAt: now,
      reportCount: 1,
      lastReportedAt: now,
    });
  });

  const moderationDoc = await moderationRef.get();
  return serialize(moderationDoc.id, moderationDoc.data());
};

export const getPendingPage = async ({ limit, cursor }) => {
  const query = moderationsCollection()
    .where("moderationStatus", "==", COMPLAINT_MODERATION_STATUS.PENDING)
    .orderBy("createdAt", "desc")
    .orderBy(DOCUMENT_ID_FIELD);

  return await paginateFirestore({
    query,
    cursor,
    limit,
    cursorContext: { collection: MODERATIONS_COLLECTION },
    cursorSchema: complaintModerationsCursorSchema,
    getCursorValuesFromDoc,
    mapDoc: (doc) => serialize(doc.id, doc.data()),
  });
};

export const applyModerationAction = async ({ complaintId, adminId, action, reason }) => {
  const complaintRef = complaintsCollection().doc(complaintId);
  const moderationRef = moderationsCollection().doc(complaintId);
  const logRef = adminLogsCollection().doc();
  const now = new Date();
  const moderationStatus = getStatusForAction(action);
  const publicVisibility = getVisibilityForAction(action);
  let previousComplaint;
  let updatedComplaint;
  let moderation;

  await db.runTransaction(async (transaction) => {
    const [complaintDoc, moderationDoc] = await Promise.all([
      transaction.get(complaintRef),
      transaction.get(moderationRef),
    ]);

    if (!complaintDoc.exists) {
      throw new NotFoundError(ERROR_CODES.COMPLAINT_NOT_FOUND);
    }

    if (!moderationDoc.exists) {
      throw new NotFoundError(ERROR_CODES.COMPLAINT_MODERATION_NOT_FOUND);
    }

    previousComplaint = serialize(complaintDoc.id, complaintDoc.data());

    const moderationUpdate = {
      moderationStatus,
      moderatedBy: adminId,
      moderatedAt: now,
      moderationReason: reason,
      updatedAt: now,
    };
    const complaintUpdate = {
      publicVisibility,
      updatedAt: now,
    };
    const log = {
      adminId,
      complaintId,
      action,
      reason,
      createdAt: now,
    };

    transaction.update(moderationRef, moderationUpdate);
    transaction.update(complaintRef, complaintUpdate);
    transaction.set(logRef, log);

    updatedComplaint = serialize(complaintDoc.id, {
      ...complaintDoc.data(),
      ...complaintUpdate,
    });
    moderation = serialize(moderationDoc.id, {
      ...moderationDoc.data(),
      ...moderationUpdate,
    });
  });

  return {
    complaint: updatedComplaint,
    previousComplaint,
    moderation,
  };
};
