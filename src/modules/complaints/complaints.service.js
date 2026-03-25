import * as complaintRepository from './complaints.repository.js';
import { COMPLAINT_TYPES } from '../../shared/types/complaintTypes.js';
import { COMPLAINT_ALLOWED_FIELDS } from '../../shared/types/complaintAllowedFields.js';

export const create = async ({ title, description, location, type }) => {
  const missingFields = [];
  const validTypes = Object.values(COMPLAINT_TYPES);

  if (!title) missingFields.push('title');
  if (!description) missingFields.push('description');
  if (!location) missingFields.push('location');
  if (!type) missingFields.push('type');
  if (!location.latitude) missingFields.push('location.latitude');
  if (!location.longitude) missingFields.push('location.longitude');

  if (missingFields.length > 0) {
    throw new Error(`Campos obrigatórios faltando: ${missingFields.join(', ')}`);
  }

  // tá certo estar repetido? (15:17)
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
    photos: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return await complaintRepository.create(complaint);
};

export const getAll = async () => {
  return await complaintRepository.getAll();
}

export const getDetail = async (id) => {
  return await complaintRepository.getDetail(id);
}

export const patch = async (id, body) => {
  const validTypes = Object.values(COMPLAINT_TYPES);
  const allowedFields = Object.values(COMPLAINT_ALLOWED_FIELDS);

  if (Object.keys(body).length === 0) {
    throw new Error('Nenhum campo para atualizar');
  }

  if (!Object.keys(body).every(field => allowedFields.includes(field))) {
    throw new Error(`Existem campos inválidos para atualizar`);
  }

  if (body.type && !validTypes.includes(body.type)) {
    throw new Error(`Tipo inválido. Valores aceitos: ${validTypes.join(', ')}`);
  }

  if (body.location) {
    if (body.location.latitude === undefined || body.location.longitude === undefined) {
      throw new Error('Location deve conter latitude e longitude');
    }
  }

  // verificar depois se o status é valido

  const complaint = {
    ...body,
    updatedAt: new Date(),
  };

  return await complaintRepository.patch(id, complaint);
};

export const deleteComplaint = async (id) => {
  const complaint = await complaintRepository.getDetail(id);

  if (!complaint) {
    throw new Error('Denúncia não encontrada');
  }

  await complaintRepository.deleteComplaint(id);
  return { message: 'Denúncia excluída com sucesso' };
};