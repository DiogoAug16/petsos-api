import admin from "firebase-admin";
import { db } from "../../config/firebase.js";
import { env } from "../../config/env.js";
import { ConflictError } from "../../shared/errors/conflict.error.js";
import { NotFoundError } from "../../shared/errors/not-found.error.js";
import { ERROR_CODES } from "../../shared/types/error.codes.js";

const COLLECTION = `${env.firebase.collectionPrefix}complaint_followers`;
const COMPLAINTS_COLLECTION = `${env.firebase.collectionPrefix}complaints`;

const makeDocId = (complaintId, userId) => `${complaintId}_${userId}`;

const getFollowerDocRef = (complaintId, userId) => {
  const followerDocId = makeDocId(complaintId, userId);
  return db.collection(COLLECTION).doc(followerDocId);
};

const getComplaintSnapshotOrFail = async (complaintId) => {
  const complaintDoc = await db.collection(COMPLAINTS_COLLECTION).doc(complaintId).get();

  if (!complaintDoc.exists) {
    throw new NotFoundError(ERROR_CODES.COMPLAINT_NOT_FOUND);
  }

  return complaintDoc;
};

export const follow = async (complaintId, userId) => {
  const docRef = getFollowerDocRef(complaintId, userId);
  const complaintRef = db.collection(COMPLAINTS_COLLECTION).doc(complaintId);

  await db.runTransaction(async (transaction) => {
    const complaintDoc = await transaction.get(complaintRef);

    if (!complaintDoc.exists) {
      throw new NotFoundError(ERROR_CODES.COMPLAINT_NOT_FOUND);
    }

    const doc = await transaction.get(docRef);

    if (doc.exists) {
      throw new ConflictError("Usuário já acompanha esta denúncia");
    }

    transaction.set(docRef, {
      complaintId,
      userId,
      createdAt: new Date(),
    });

    transaction.update(complaintRef, {
      followersCount: admin.firestore.FieldValue.increment(1),
    });
  });
};

export const createInitialFollower = async (complaintId, userId, createdAt) => {
  const docRef = getFollowerDocRef(complaintId, userId);

  await docRef.set({
    complaintId,
    userId,
    createdAt,
  });
};

export const unfollow = async (complaintId, userId) => {
  const docRef = getFollowerDocRef(complaintId, userId);
  const complaintRef = db.collection(COMPLAINTS_COLLECTION).doc(complaintId);

  await db.runTransaction(async (transaction) => {
    const complaintDoc = await transaction.get(complaintRef);

    if (!complaintDoc.exists) {
      throw new NotFoundError(ERROR_CODES.COMPLAINT_NOT_FOUND);
    }

    const complaint = complaintDoc.data();
    if (complaint.createdById === userId) {
      throw new ConflictError(
        "Criador da denúncia não pode deixar de acompanhar a própria denúncia",
      );
    }

    const doc = await transaction.get(docRef);

    if (!doc.exists) return;

    const currentFollowersCount = complaintDoc.data().followersCount ?? 0;
    const updatedFollowersCount =
      currentFollowersCount > 0 ? admin.firestore.FieldValue.increment(-1) : 0;

    transaction.delete(docRef);
    transaction.update(complaintRef, {
      followersCount: updatedFollowersCount,
    });
  });
};

export const getFollowers = async (complaintId) => {
  const complaintDoc = await getComplaintSnapshotOrFail(complaintId);
  const complaint = complaintDoc.data();

  const snapshot = await db
    .collection(COLLECTION)
    .where("complaintId", "==", complaintId)
    .get();

  const followerIds = snapshot.docs.map((doc) => doc.data().userId);

  if (!complaint.isAnonymous) return followerIds;

  return followerIds.filter((userId) => userId !== complaint.createdById);
};

export const isFollowing = async (complaintId, userId) => {
  const docRef = getFollowerDocRef(complaintId, userId);
  const doc = await docRef.get();
  return doc.exists;
};

export const countByComplaintId = async (complaintId) => {
  const complaintDoc = await getComplaintSnapshotOrFail(complaintId);
  const complaint = complaintDoc.data();
  const followersCount = complaint.followersCount ?? 0;

  if (!complaint.isAnonymous || !complaint.createdById) return followersCount;

  const creatorFollowerDoc = await getFollowerDocRef(
    complaintId,
    complaint.createdById,
  ).get();

  if (!creatorFollowerDoc.exists) return followersCount;

  return Math.max(followersCount - 1, 0);
};

export const getComplaintIdsByUserId = async (userId) => {
  const snapshot = await db.collection(COLLECTION).where("userId", "==", userId).get();

  return snapshot.docs.map((doc) => doc.data().complaintId);
};
