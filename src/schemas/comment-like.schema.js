import { z } from "zod";

const commentLikeParamsSchema = z.strictObject({
  id: z.string({ required_error: "id e obrigatorio" }).trim().min(1),
  commentId: z.string({ required_error: "commentId e obrigatorio" }).trim().min(1),
});

export const commentLikeSchema = z.object({
  params: commentLikeParamsSchema,
});

export const commentLikeResponseSchema = z.object({
  commentId: z.string(),
  liked: z.boolean(),
  likes: z.number().int().min(0),
});
