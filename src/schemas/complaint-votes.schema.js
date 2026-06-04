import { z } from "zod";

export const voteSchema = z.object({
  approved: z.boolean({ required_error: "Campo 'approved' é obrigatório" }),
});
