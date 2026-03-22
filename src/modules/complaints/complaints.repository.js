import { db } from '../../config/firebase.js';
import { env } from '../../config/env.js';

const COLLECTION = `${env.firebase.collectionPrefix}complaints`;

export const create = async (data) => {
  const docRef = await db.collection(COLLECTION).add(data);
  return {
    id: docRef.id,
    ...data,
    createdAt: data.createdAt.toISOString(),
    updatedAt: data.updatedAt.toISOString(),
  };
};

export const getAll = async () => {
  const snapshot = await db.collection(COLLECTION).get();
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt.toDate().toISOString(),
      updatedAt: data.createdAt.toDate().toISOString(),
    };
  });
}