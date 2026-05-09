import { z } from "zod";
import {
  cursorPaginationQuerySchema,
  paginatedResponseSchema,
} from "./pagination.schema.js";

const idParamSchema = z.strictObject({
  id: z.string({ required_error: "id é obrigatório" }).trim().min(1),
});

export const createCommentSchema = z.object({
  params: idParamSchema,
  body: z.strictObject({
    text: z.string({ required_error: "text é obrigatório" }).trim().min(1),
  }),
});

export const getCommentsSchema = z.object({
  params: idParamSchema,
  query: cursorPaginationQuerySchema,
});

export const baseCommentResponseSchema = z.object({
  id: z.string(),
  complaintId: z.string(),
  parentCommentId: z.string().nullable().optional(),
  text: z.string(),
  createdAt: z.string().datetime(),
  likes: z.number().default(0),
  username: z.string().nullable().optional(),
});

export const commentResponseSchema = baseCommentResponseSchema.extend({
  repliesCount: z.number().default(0),
});

export const commentsPageResponseSchema = paginatedResponseSchema(commentResponseSchema);
