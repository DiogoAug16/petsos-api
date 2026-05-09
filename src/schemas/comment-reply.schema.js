import { z } from "zod";
import {
  cursorPaginationQuerySchema,
  paginatedResponseSchema,
} from "./pagination.schema.js";
import { baseCommentResponseSchema } from "./comment.schema.js";

const commentReplyParamSchema = z.strictObject({
  id: z.string({ required_error: "id e obrigatorio" }).trim().min(1),
  commentId: z.string({ required_error: "commentId e obrigatorio" }).trim().min(1),
});

export const createCommentReplySchema = z.object({
  params: commentReplyParamSchema,
  body: z.strictObject({
    text: z.string({ required_error: "text e obrigatorio" }).trim().min(1),
  }),
});

export const getCommentRepliesSchema = z.object({
  params: commentReplyParamSchema,
  query: cursorPaginationQuerySchema,
});

export const commentReplyResponseSchema = baseCommentResponseSchema.extend({
  parentCommentId: z.string().trim().min(1),
});

export const commentRepliesPageResponseSchema = paginatedResponseSchema(
  commentReplyResponseSchema,
);
