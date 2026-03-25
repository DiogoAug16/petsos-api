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
      updatedAt: data.updatedAt.toDate().toISOString(),
    };
  });
};

export const getDetail = async (id) => {
  const docRef = await db.collection(COLLECTION).doc(id).get();
  if (!docRef.exists) {
    throw new Error("Denúncia não encontrada");
  }
  const data = docRef.data();
  return {
    id: docRef.id,
    ...data,
    createdAt: data.createdAt.toDate().toISOString(),
    updatedAt: data.updatedAt.toDate().toISOString(),
  };
}

export const patch = async (id, data) => {
  const docRef = db.collection(COLLECTION).doc(id);
  const doc = await docRef.get();
  if (!doc.exists) {
    throw new Error("Denúncia não encontrada");
  }
  await docRef.update(data);
  const updatedDocRef = (await docRef.get()).data();
  return {
    id,
    ...updatedDocRef,
    createdAt: updatedDocRef.createdAt.toDate().toISOString(),
    updatedAt: updatedDocRef.updatedAt.toDate().toISOString(),
  }
};

export const deleteComplaint = async (id) => {
  await db.collection(COLLECTION).doc(id).delete();
};

