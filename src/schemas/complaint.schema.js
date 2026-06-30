import { z } from "zod";
import { VALID_COMPLAINT_TYPES } from "../shared/types/complaint.types.js";
import { VALID_COMPLAINT_STATUS } from "../shared/types/complaint.status.js";
import { VALID_COMPLAINT_ANIMALS } from "../shared/types/complaint.animals.js";
import { VALID_COMPLAINT_MODERATION_STATUS } from "../shared/types/complaint-moderation.status.js";
import { VALID_COMPLAINT_PUBLIC_VISIBILITY } from "../shared/types/complaint.visibility.js";
import {
  TILE_INDEX_MAX_ZOOM,
  TILE_INDEX_MIN_ZOOM,
} from "../modules/map-tiles/map-tiles.util.js";

const MAX_MAP_VIEWPORT_DELTA = 0.35;
const MAX_MAP_TILE_INDEX_RADIUS_KM = 25;
const MAX_MAP_BATCH_TILES = 12;

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
  thumbnailPhotos: z.array(z.string()).optional(),
  isAnonymous: z
    .preprocess((value) => {
      if (value === true || value === "true") return true;
      if (value === false || value === "false") return false;
      return false;
    }, z.boolean())
    .default(false),
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
    radiusKm: z.coerce.number().positive().max(50),
  }),
});

export const mapQuerySchema = z.object({
  query: z
    .object({
      north: z.coerce.number().min(-90).max(90),
      south: z.coerce.number().min(-90).max(90),
      east: z.coerce.number().min(-180).max(180),
      west: z.coerce.number().min(-180).max(180),
      limit: z.coerce.number().int().min(1).max(150).default(120),
    })
    .refine((query) => query.north > query.south, {
      message: "Bounds inválidos",
      path: ["north"],
    })
    .refine((query) => query.east > query.west, {
      message: "Bounds inválidos",
      path: ["east"],
    })
    .refine((query) => query.north - query.south <= MAX_MAP_VIEWPORT_DELTA, {
      message: "Área do mapa muito grande",
      path: ["north"],
    })
    .refine((query) => query.east - query.west <= MAX_MAP_VIEWPORT_DELTA, {
      message: "Área do mapa muito grande",
      path: ["east"],
    }),
});

export const mapTileQuerySchema = z.object({
  query: z
    .object({
      z: z.coerce.number().int().min(10).max(18),
      x: z.coerce.number().int().min(0),
      y: z.coerce.number().int().min(0),
      limit: z.coerce.number().int().min(1).max(150).default(120),
    })
    .refine((query) => query.x < 2 ** query.z, {
      message: "Tile X inválido para o zoom informado",
      path: ["x"],
    })
    .refine((query) => query.y < 2 ** query.z, {
      message: "Tile Y inválido para o zoom informado",
      path: ["y"],
    }),
});

const mapTileBodySchema = z
  .object({
    z: z.coerce.number().int().min(10).max(18),
    x: z.coerce.number().int().min(0),
    y: z.coerce.number().int().min(0),
  })
  .refine((tile) => tile.x < 2 ** tile.z, {
    message: "Tile X inválido para o zoom informado",
    path: ["x"],
  })
  .refine((tile) => tile.y < 2 ** tile.z, {
    message: "Tile Y inválido para o zoom informado",
    path: ["y"],
  });

export const mapTilesBatchSchema = z.object({
  tiles: z.array(mapTileBodySchema).min(1).max(MAX_MAP_BATCH_TILES),
  limit: z.coerce.number().int().min(1).max(150).default(120),
});

export const mapTilesIndexQuerySchema = z.object({
  query: z.object({
    lat: z.coerce.number().min(-90).max(90),
    lng: z.coerce.number().min(-180).max(180),
    radiusKm: z.coerce.number().positive().max(MAX_MAP_TILE_INDEX_RADIUS_KM).default(10),
    z: z.coerce
      .number()
      .int()
      .min(TILE_INDEX_MIN_ZOOM)
      .max(TILE_INDEX_MAX_ZOOM)
      .default(12),
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

const moderationReasonSchema = z
  .string()
  .trim()
  .max(500)
  .transform((value) => (value === "" ? null : value))
  .nullable()
  .optional();

export const reportComplaintSchema = z.object({
  reason: moderationReasonSchema,
});

export const moderationActionSchema = z.object({
  reason: moderationReasonSchema,
});

export const complaintModerationResponseSchema = z.object({
  complaintId: z.string(),
  moderationStatus: z.enum(VALID_COMPLAINT_MODERATION_STATUS),
  moderatedBy: z.string().nullable().optional(),
  moderatedAt: z.any().nullable().optional(),
  moderationReason: z.string().nullable().optional(),
  createdAt: z.any().optional(),
  updatedAt: z.any().optional(),
  reportCount: z.number().default(0),
  lastReportedAt: z.any().nullable().optional(),
});

export const complaintModerationPendingItemSchema =
  complaintModerationResponseSchema.extend({
    complaint: z
      .object({
        id: z.string(),
        title: z.string(),
        description: z.string().optional(),
        type: z.string(),
        animal: z.string(),
        location: locationSchema,
        photos: z.array(z.string()).optional(),
        thumbnailPhotos: z.array(z.string()).optional(),
        status: z.enum(VALID_COMPLAINT_STATUS),
        publicVisibility: z.enum(VALID_COMPLAINT_PUBLIC_VISIBILITY).optional(),
        createdAt: z.any().optional(),
        updatedAt: z.any().optional(),
        createdById: z.string().optional(),
        createdByUsername: z.string().nullable().optional(),
      })
      .nullable(),
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

export const adminComplaintResponseSchema = complaintResponseSchema.extend({
  publicVisibility: z.enum(VALID_COMPLAINT_PUBLIC_VISIBILITY).optional(),
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

export const adminComplaintSummarySchema = publicComplaintSummarySchema.extend({
  publicVisibility: z.enum(VALID_COMPLAINT_PUBLIC_VISIBILITY).optional(),
  createdById: z.string().optional(),
  createdByUsername: z.string().nullable().optional(),
});
