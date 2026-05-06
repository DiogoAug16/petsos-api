import { z } from "zod";
import { VALID_COMPLAINT_TYPES } from "../shared/types/complaint.types.js";
import { VALID_COMPLAINT_STATUS } from "../shared/types/complaint.status.js";
import { VALID_COMPLAINT_ANIMALS } from "../shared/types/complaint.animals.js";

const locationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

const complaintBaseSchema = z.object({
  title: z.string().trim().min(3),
  description: z.string().trim().optional(),
  type: z.enum(VALID_COMPLAINT_TYPES),
  animal: z.enum(VALID_COMPLAINT_ANIMALS),
  location: locationSchema,
  photos: z.array(z.string()).optional(),
});

export const createComplaintSchema = complaintBaseSchema.refine(
  (data) => data.description || (data.photos && data.photos.length > 0),
  {
    message: "A denúncia deve ter pelo menos uma descrição ou uma foto.",
    path: ["_root"],
  },
);

export const updateComplaintSchema = complaintBaseSchema
  .partial()
  .extend({
    status: z.enum(VALID_COMPLAINT_STATUS).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Nenhum campo fornecido para atualização",
    path: ["_root"],
  });

export const nearestQuerySchema = z.object({
  query: z.object({
    lat: z.coerce.number().min(-90).max(90),
    lng: z.coerce.number().min(-180).max(180),
    radiusKm: z.coerce.number().positive(),
  }),
});

export const complaintResponseSchema = complaintBaseSchema.extend({
  id: z.string(),
  status: z.enum(VALID_COMPLAINT_STATUS),
  followersCount: z.number().default(0),
  createdAt: z.any().optional(),
  updatedAt: z.any().optional(),
  createdByUsername: z.string().nullable().optional(),
});
