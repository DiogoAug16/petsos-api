import { z } from "zod";

export const publicUserProfileSchema = z.object({
  name: z.string().nullable().optional(),
  username: z.string(),
  createdAt: z.any().optional(),
});
