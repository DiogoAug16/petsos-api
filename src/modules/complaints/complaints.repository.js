import { db } from '../../config/firebase.js';
import { env } from '../../config/env.js';

const COLLECTION = `${env.firebase.collectionPrefix}complaints`;

export const create = async (data) => {
  const docRef = await db.collection(COLLECTION).add(data);
  return { id: docRef.id, ...data };
};