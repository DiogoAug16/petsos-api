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

const getCommentSnapshotOrFail = async (commentId, complaintId) => {
  const commentDoc = await commentsCollection().doc(commentId).get();
  const valid = commentDoc.exists && commentDoc.data()?.complaintId === complaintId;

  if (!valid) {
    throw new NotFoundError(ERROR_CODES.COMMENT_NOT_FOUND);
  }

  return commentDoc;
};

const getTopLevelCommentId = (commentDoc) => {
  const parentCommentId = commentDoc.data()?.parentCommentId ?? null;
  return parentCommentId ?? commentDoc.id;
};

const resolveTopLevelCommentInTransaction = async ({
  transaction,
  commentRef,
  complaintId,
}) => {
  const commentDoc = await transaction.get(commentRef);

  if (!commentDoc.exists || commentDoc.data()?.complaintId !== complaintId) {
    throw new NotFoundError(ERROR_CODES.COMMENT_NOT_FOUND);
  }

  const comment = commentDoc.data();
  const topLevelCommentId = comment.parentCommentId ?? commentDoc.id;

  if (!comment.parentCommentId) {
    return {
      commentId: topLevelCommentId,
      commentRef,
    };
  }

  const topLevelCommentRef = commentsCollection().doc(topLevelCommentId);
  const topLevelCommentDoc = await transaction.get(topLevelCommentRef);

  if (
    !topLevelCommentDoc.exists ||
    topLevelCommentDoc.data()?.complaintId !== complaintId
  ) {
    throw new NotFoundError(ERROR_CODES.COMMENT_NOT_FOUND);
  }

  return {
    commentId: topLevelCommentId,
    commentRef: topLevelCommentRef,
  };
};

const buildRepliesQuery = ({ complaintId, parentCommentId }) => {
  return commentsCollection()
    .where("complaintId", "==", complaintId)
    .where("parentCommentId", "==", parentCommentId)
    .orderBy("score", "desc")
    .orderBy("createdAt", "desc")
    .orderBy(DOCUMENT_ID_FIELD);
};

const getRepliesPage = async ({ complaintId, parentCommentId, limit, cursor }) => {
  const cursorContext = {
    complaintId,
    parentCommentId,
  };

  return await paginateFirestore({
    query: buildRepliesQuery({
      complaintId,
      parentCommentId,
    }),
    cursor,
    limit,
    cursorContext,
    cursorSchema: commentsCursorSchema,
    getCursorValuesFromDoc,
    mapDoc: (doc) => serialize(doc.id, doc.data()),
  });
};

const isPublicComment = (comment) =>
  !comment.deletedAt &&
  (comment.publicVisibility == null ||
    comment.publicVisibility === COMPLAINT_PUBLIC_VISIBILITY.VISIBLE);

export const create = async ({ complaintId, commentId, userId, text }) => {
  const docRef = commentsCollection().doc();
  const complaintRef = complaintsCollection().doc(complaintId);
  const commentRef = commentsCollection().doc(commentId);
  const createdAt = new Date();
  const likes = 0;
  let reply;

  await db.runTransaction(async (transaction) => {
    const complaintDoc = await transaction.get(complaintRef);

    if (!complaintDoc.exists) {
      throw new NotFoundError(ERROR_CODES.COMPLAINT_NOT_FOUND);
    }

    const topLevelComment = await resolveTopLevelCommentInTransaction({
      transaction,
      commentRef,
      complaintId,
    });

    reply = {
      complaintId,
      userId,
      parentCommentId: topLevelComment.commentId,
      text,
      createdAt,
      likes,
      score: 0,
      repliesCount: 0,
    };

    transaction.set(docRef, reply);
    transaction.update(topLevelComment.commentRef, {
      repliesCount: admin.firestore.FieldValue.increment(1),
    });
  });

  return serialize(docRef.id, reply);
};

export const getByCommentId = async ({ complaintId, commentId, limit, cursor }) => {
  const commentDoc = await getCommentSnapshotOrFail(commentId, complaintId);

  const topLevelCommentId = getTopLevelCommentId(commentDoc);

  const repliesPage = await getRepliesPage({
    complaintId,
    parentCommentId: topLevelCommentId,
    limit,
    cursor,
  });

  return {
    ...repliesPage,
    items: repliesPage.items.filter(isPublicComment),
  };
};
