import { z } from "zod";
import { VALID_COMPLAINT_TYPES } from "../shared/types/complaint.types.js";
import { VALID_COMPLAINT_STATUS } from "../shared/types/complaint.status.js";
import { VALID_COMPLAINT_ANIMALS } from "../shared/types/complaint.animals.js";

const locationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export const createComplaintSchema = z.object({
  title: z.string().trim().min(3),
  description: z.string().trim().optional(),
  type: z.enum(VALID_COMPLAINT_TYPES),
  animal: z.enum(VALID_COMPLAINT_ANIMALS),
  location: locationSchema,
  photos: z.array(z.string()).optional(),
});

export const updateComplaintSchema = createComplaintSchema
  .partial()
  .extend({
    status: z.enum(VALID_COMPLAINT_STATUS).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Nenhum campo fornecido para atualização",
    path: ["_root"],
  });
