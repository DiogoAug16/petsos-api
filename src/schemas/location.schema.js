import { z } from "zod";

export const citySearchQuerySchema = z.object({
  query: z.object({
    query: z
      .string({ required_error: "Busca é obrigatória" })
      .trim()
      .min(2, "Digite ao menos 2 caracteres")
      .max(80),
    limit: z.coerce.number().int().min(1).max(10).optional().default(5),
  }),
});
