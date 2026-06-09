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

export const VALIDATION_REQUEST_REASON_TYPES = [
  "already_resolved",
  "false_report",
  "needs_community_review",
  "evidence_selection",
  "owner_inactive",
];

export const MANUAL_VALIDATION_REQUEST_REASON_TYPES =
  VALIDATION_REQUEST_REASON_TYPES.filter((reasonType) => reasonType !== "owner_inactive");

export const requestValidationSchema = z.object({
  reasonType: z.enum(MANUAL_VALIDATION_REQUEST_REASON_TYPES),
  reasonText: z.string().trim().max(500).optional().nullable(),
  evidenceIds: z.array(z.string()).optional().nullable(),
});

export const complaintResponseSchema = complaintBaseSchema.extend({
  id: z.string(),
  status: z.enum(VALID_COMPLAINT_STATUS),
  followersCount: z.number().default(0),
  volunteersCount: z.number().default(0),
  createdAt: z.any().optional(),
  updatedAt: z.any().optional(),
  statusUpdatedAt: z.any().optional(),
  validationRequestedAt: z.any().optional(),
  validationRequestedBy: z.string().nullable().optional(),
  validationRequestReasonType: z.enum(VALIDATION_REQUEST_REASON_TYPES).optional(),
  validationRequestReasonText: z.string().nullable().optional(),
  createdById: z.string().optional(),
  createdByUsername: z.string().nullable().optional(),
  resolvedBy: z.string().nullable().optional(),
  resolvedAt: z.any().optional(),
  closedBy: z.string().nullable().optional(),
  closedAt: z.any().optional(),
  rejectedBy: z.string().nullable().optional(),
  rejectedAt: z.any().optional(),
  rejectionExpiresAt: z.any().optional(),
  rejectionCount: z.number().nullable().optional(),
  proposedEvidenceIds: z.array(z.string()).nullable().optional(),
});

export const updateStatusSchema = z.object({
  status: z.enum(VALID_COMPLAINT_STATUS),
});

export const publicComplaintSummarySchema = complaintBaseSchema.extend({
  id: z.string(),
  status: z.enum(VALID_COMPLAINT_STATUS),
  followersCount: z.number().default(0),
  createdAt: z.any().optional(),
  updatedAt: z.any().optional(),
});
