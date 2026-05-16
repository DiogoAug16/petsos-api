import { z } from "zod";
import { millisToTimestamp } from "../shared/utils/firestore.util.js";

const optionalTrimmedStringSchema = z
  .string()
  .trim()
  .transform((value) => (value === "" ? undefined : value))
  .pipe(z.string().min(1).optional())
  .optional();

export const cursorPaginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: optionalTrimmedStringSchema,
});

export const cursorPageInfoSchema = z.object({
  limit: z.number().int().min(1),
  hasMore: z.boolean(),
  nextCursor: z.string().nullable(),
  totalItems: z.number().int().min(0).optional(),
});

export const paginatedResponseSchema = (itemSchema) =>
  z.object({
    items: z.array(itemSchema),
    pageInfo: cursorPageInfoSchema,
  });

export const commentsCursorSchema = z.tuple([
  z.number().finite(),
  z.number().finite().transform(millisToTimestamp),
  z.string().trim().min(1),
]);
