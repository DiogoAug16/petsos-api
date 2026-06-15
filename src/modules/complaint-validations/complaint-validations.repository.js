import { db } from "../../config/firebase.js";
import { env } from "../../config/env.js";
import { serialize } from "../../shared/utils/firestore.util.js";

const COLLECTION = `${env.firebase.collectionPrefix}complaint_validations`;

export const getValidationsByComplaintId = async (complaintId) => {
  const snapshot = await db
    .collection(COLLECTION)
    .where("complaintId", "==", complaintId)
    .get();

  return snapshot.docs.map((doc) => serialize(doc.id, doc.data()));
};

export const countByComplaintId = async (complaintId) => {
  const validations = await getValidationsByComplaintId(complaintId);

  return {
    count: validations.length,
    validations,
  };
};
