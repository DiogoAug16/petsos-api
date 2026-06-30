import admin from "firebase-admin";
import { db } from "../../config/firebase.js";
import { env } from "../../config/env.js";
import { NotFoundError } from "../../shared/errors/not-found.error.js";
import { ERROR_CODES } from "../../shared/types/error.codes.js";
import { COMPLAINT_PUBLIC_VISIBILITY } from "../../shared/types/complaint.visibility.js";
import { paginateFirestore } from "../../shared/helpers/paginate.helper.js";
import { commentsCursorSchema } from "../../schemas/pagination.schema.js";
import { serialize, timestampToMillis } from "../../shared/utils/firestore.util.js";

const COLLECTION = `${env.firebase.collectionPrefix}comments`;
const COMPLAINTS_COLLECTION = `${env.firebase.collectionPrefix}complaints`;
const DOCUMENT_ID_FIELD = admin.firestore.FieldPath.documentId();

const commentsCollection = () => db.collection(COLLECTION);
const complaintsCollection = () => db.collection(COMPLAINTS_COLLECTION);

const getCursorValuesFromDoc = (doc) => {
  const data = doc.data();
  return [data.score ?? 0, timestampToMillis(data.createdAt), doc.id];
};

const getComplaintSnapshotOrFail = async (complaintId) => {
  const complaintDoc = await complaintsCollection().doc(complaintId).get();

  if (!complaintDoc.exists) {
    throw new NotFoundError(ERROR_CODES.COMPLAINT_NOT_FOUND);
  }

  return complaintDoc;
};

const buildCommentsBaseQuery = (complaintId) => {
  return commentsCollection()
    .where("complaintId", "==", complaintId)
    .where("parentCommentId", "==", null);
};

const buildCommentsQuery = (complaintId) => {
  return buildCommentsBaseQuery(complaintId)
    .orderBy("score", "desc")
    .orderBy("createdAt", "desc")
    .orderBy(DOCUMENT_ID_FIELD);
};

const getCommentsPage = async ({ complaintId, limit, cursor }) => {
  const cursorContext = {
    complaintId,
    parentCommentId: null,
  };

  return await paginateFirestore({
    query: buildCommentsQuery(complaintId),
    cursor,
    limit,
    cursorContext,
    cursorSchema: commentsCursorSchema,
    getCursorValuesFromDoc,
    mapDoc: (doc) => serialize(doc.id, doc.data()),
  });
};

const countCommentsByComplaintId = async (complaintId) => {
  const snapshot = await buildCommentsBaseQuery(complaintId).count().get();
  return snapshot.data().count;
};

const isPublicComment = (comment) =>
  !comment.deletedAt &&
  (comment.publicVisibility == null ||
    comment.publicVisibility === COMPLAINT_PUBLIC_VISIBILITY.VISIBLE);

export const create = async ({ complaintId, userId, text }) => {
  const docRef = commentsCollection().doc();
  const complaintRef = complaintsCollection().doc(complaintId);
  const createdAt = new Date();
  const likes = 0;
  const comment = {
    complaintId,
    userId,
    parentCommentId: null,
    text,
    createdAt,
    likes,
    score: 0,
    repliesCount: 0,
  };

  await db.runTransaction(async (transaction) => {
    const complaintDoc = await transaction.get(complaintRef);

    if (!complaintDoc.exists) {
      throw new NotFoundError(ERROR_CODES.COMPLAINT_NOT_FOUND);
    }

    transaction.set(docRef, comment);
  });

  return serialize(docRef.id, comment);
};

export const getByComplaintId = async ({ complaintId, limit, cursor }) => {
  const [, commentsPage, totalItems] = await Promise.all([
    getComplaintSnapshotOrFail(complaintId),
    getCommentsPage({
      complaintId,
      limit,
      cursor,
    }),
    countCommentsByComplaintId(complaintId),
  ]);

  return {
    ...commentsPage,
    items: commentsPage.items.filter(isPublicComment),
    pageInfo: {
      ...commentsPage.pageInfo,
      totalItems,
    },
  };
};

export const deleteComment = async ({ complaintId, commentId, deletedBy }) => {
  const commentRef = commentsCollection().doc(commentId);
  const deletedAt = new Date();
  let deletedComment = null;

  await db.runTransaction(async (transaction) => {
    const commentDoc = await transaction.get(commentRef);

    if (!commentDoc.exists || commentDoc.data()?.complaintId !== complaintId) {
      throw new NotFoundError(ERROR_CODES.COMMENT_NOT_FOUND);
    }

    const comment = commentDoc.data();

    if (comment.deletedAt) {
      deletedComment = serialize(commentDoc.id, comment);
      return;
    }

    const update = {
      publicVisibility: COMPLAINT_PUBLIC_VISIBILITY.HIDDEN,
      deletedAt,
      deletedBy,
      updatedAt: deletedAt,
    };

    transaction.update(commentRef, update);

    if (comment.parentCommentId) {
      const parentRef = commentsCollection().doc(comment.parentCommentId);
      transaction.update(parentRef, {
        repliesCount: admin.firestore.FieldValue.increment(-1),
      });
    }

    deletedComment = serialize(commentDoc.id, {
      ...comment,
      ...update,
    });
  });

  return deletedComment;
};
