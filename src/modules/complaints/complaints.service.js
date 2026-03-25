import * as complaintRepository from './complaints.repository.js';
import { COMPLAINT_TYPES } from '../../shared/types/complaintTypes.js';

export const create = async ({ title, description, location, type, photos }) => {
  const missingFields = [];
  const validTypes = Object.values(COMPLAINT_TYPES);

  if (!title) missingFields.push('title');
  if (!description) missingFields.push('description');
  if (!location) missingFields.push('location');
  if (!type) missingFields.push('type');
  if (location && !location.latitude) missingFields.push('location.latitude');
  if (location && !location.longitude) missingFields.push('location.longitude');

  if (missingFields.length > 0) {
    throw new Error(`Campos obrigatórios faltando: ${missingFields.join(', ')}`);
  }

  if (!validTypes.includes(type)) {
    throw new Error(`Tipo inválido. Valores aceitos: ${validTypes.join(', ')}`);
  }

  const complaint = {
    title,
    description,
    type,
    location,
    status: 'open',
    photos: photos || [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return await complaintRepository.create(complaint);
};

export const getAll = async () => {
  return await complaintRepository.getAll();
};

export const getDetail = async (id) => {
  return await complaintRepository.getDetail(id);
};