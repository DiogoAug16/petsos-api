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
const COMMENTS_COLLECTION = `${env.firebase.collectionPrefix}comments`;
const MODERATIONS_COLLECTION = `${env.firebase.collectionPrefix}complaint_moderations`;
const REPORTS_COLLECTION = `${env.firebase.collectionPrefix}complaint_reports`;
const ADMIN_LOGS_COLLECTION = `${env.firebase.collectionPrefix}admin_logs`;
const DOCUMENT_ID_FIELD = admin.firestore.FieldPath.documentId();

const complaintsCollection = () => db.collection(COMPLAINTS_COLLECTION);
const commentsCollection = () => db.collection(COMMENTS_COLLECTION);
const moderationsCollection = () => db.collection(MODERATIONS_COLLECTION);
const reportsCollection = () => db.collection(REPORTS_COLLECTION);
const adminLogsCollection = () => db.collection(ADMIN_LOGS_COLLECTION);

const getCursorValuesFromDoc = (doc) => {
  const data = doc.data();
  return [timestampToMillis(data.createdAt), doc.id];
};

const getReportId = (complaintId, reporterId) => `${complaintId}_${reporterId}`;
const getCommentModerationId = (commentId) => `comment_${commentId}`;
const getCommentReportId = (commentId, reporterId) =>
  `comment_${commentId}_${reporterId}`;

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
      targetType: "complaint",
      complaintId,
      reporterId,
      reason,
      createdAt: now,
    });

    if (moderationDoc.exists) {
      transaction.update(moderationRef, {
        targetType: "complaint",
        moderationStatus: COMPLAINT_MODERATION_STATUS.PENDING,
        moderatedBy: null,
        moderatedAt: null,
        moderationReason: null,
        reportCount: FieldValue.increment(1),
        latestReportType: "complaint",
        latestReportReason: reason,
        lastReportedAt: now,
        createdAt: now,
        updatedAt: now,
      });
      return;
    }

    transaction.set(moderationRef, {
      targetType: "complaint",
      complaintId,
      moderationStatus: COMPLAINT_MODERATION_STATUS.PENDING,
      moderatedBy: null,
      moderatedAt: null,
      moderationReason: null,
      createdAt: now,
      updatedAt: now,
      reportCount: 1,
      commentReportCount: 0,
      latestReportType: "complaint",
      latestReportReason: reason,
      latestReportedCommentId: null,
      latestReportedCommentText: null,
      lastReportedAt: now,
    });
  });

  const moderationDoc = await moderationRef.get();
  return serialize(moderationDoc.id, moderationDoc.data());
};

export const reportComment = async ({ complaintId, commentId, reporterId, reason }) => {
  const complaintRef = complaintsCollection().doc(complaintId);
  const commentRef = commentsCollection().doc(commentId);
  const moderationRef = moderationsCollection().doc(getCommentModerationId(commentId));
  const reportRef = reportsCollection().doc(getCommentReportId(commentId, reporterId));
  const now = new Date();

  await db.runTransaction(async (transaction) => {
    const [complaintDoc, commentDoc, moderationDoc, reportDoc] = await Promise.all([
      transaction.get(complaintRef),
      transaction.get(commentRef),
      transaction.get(moderationRef),
      transaction.get(reportRef),
    ]);

    if (!complaintDoc.exists) {
      throw new NotFoundError(ERROR_CODES.COMPLAINT_NOT_FOUND);
    }

    if (!commentDoc.exists || commentDoc.data()?.complaintId !== complaintId) {
      throw new NotFoundError(ERROR_CODES.COMMENT_NOT_FOUND);
    }

    if (reportDoc.exists) {
      throw new ConflictError(
        "Você já reportou este comentário",
        ERROR_CODES.COMMENT_REPORT_ALREADY_EXISTS,
      );
    }

    const comment = commentDoc.data();
    const commentText = String(comment.text ?? "").slice(0, 240);

    transaction.set(reportRef, {
      targetType: "comment",
      complaintId,
      commentId,
      reporterId,
      reason,
      createdAt: now,
    });

    if (moderationDoc.exists) {
      transaction.update(moderationRef, {
        targetType: "comment",
        moderationStatus: COMPLAINT_MODERATION_STATUS.PENDING,
        moderatedBy: null,
        moderatedAt: null,
        moderationReason: null,
        reportCount: FieldValue.increment(1),
        latestReportReason: reason,
        reportedCommentText: commentText,
        lastReportedAt: now,
        createdAt: now,
        updatedAt: now,
      });
      return;
    }

    transaction.set(moderationRef, {
      targetType: "comment",
      complaintId,
      commentId,
      moderationStatus: COMPLAINT_MODERATION_STATUS.PENDING,
      moderatedBy: null,
      moderatedAt: null,
      moderationReason: null,
      createdAt: now,
      updatedAt: now,
      reportCount: 1,
      latestReportReason: reason,
      reportedCommentText: commentText,
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

export const applyModerationAction = async ({
  moderationId,
  adminId,
  action,
  reason,
}) => {
  const moderationRef = moderationsCollection().doc(moderationId);
  const logRef = adminLogsCollection().doc();
  const now = new Date();
  const moderationStatus = getStatusForAction(action);
  let previousComplaint;
  let updatedComplaint;
  let moderation;

  await db.runTransaction(async (transaction) => {
    const moderationDoc = await transaction.get(moderationRef);

    if (!moderationDoc.exists) {
      throw new NotFoundError(ERROR_CODES.COMPLAINT_MODERATION_NOT_FOUND);
    }

    const currentModeration = moderationDoc.data();
    const targetType = currentModeration.targetType ?? "complaint";
    const complaintId = currentModeration.complaintId ?? moderationId;
    let commentRef;
    let commentUpdate;
    let complaintRef;
    let complaintUpdate;

    const moderationUpdate = {
      moderationStatus,
      moderatedBy: adminId,
      moderatedAt: now,
      moderationReason: reason,
      updatedAt: now,
    };
    const log = {
      adminId,
      moderationId,
      targetType,
      complaintId,
      commentId: currentModeration.commentId ?? null,
      action,
      reason,
      createdAt: now,
    };

    if (targetType === "comment") {
      commentRef = commentsCollection().doc(currentModeration.commentId);
      const commentDoc = await transaction.get(commentRef);

      if (!commentDoc.exists) {
        throw new NotFoundError(ERROR_CODES.COMMENT_NOT_FOUND);
      }

      commentUpdate = {
        publicVisibility: getVisibilityForAction(action),
        updatedAt: now,
      };

      if (action === "reject") {
        commentUpdate.deletedAt = now;
        commentUpdate.deletedBy = adminId;
      } else if (action === "hide") {
        commentUpdate.hiddenAt = now;
        commentUpdate.hiddenBy = adminId;
      }
    } else {
      complaintRef = complaintsCollection().doc(complaintId);
      const complaintDoc = await transaction.get(complaintRef);

      if (!complaintDoc.exists) {
        throw new NotFoundError(ERROR_CODES.COMPLAINT_NOT_FOUND);
      }

      previousComplaint = serialize(complaintDoc.id, complaintDoc.data());

      complaintUpdate = {
        publicVisibility: getVisibilityForAction(action),
        updatedAt: now,
      };

      updatedComplaint = serialize(complaintDoc.id, {
        ...complaintDoc.data(),
        ...complaintUpdate,
      });
    }

    transaction.update(moderationRef, moderationUpdate);
    transaction.set(logRef, log);

    if (commentRef && commentUpdate) {
      transaction.update(commentRef, commentUpdate);
    }

    if (complaintRef && complaintUpdate) {
      transaction.update(complaintRef, complaintUpdate);
    }

    moderation = serialize(moderationDoc.id, {
      ...currentModeration,
      ...moderationUpdate,
    });
  });

  return {
    complaint: updatedComplaint,
    previousComplaint,
    moderation,
  };
};
