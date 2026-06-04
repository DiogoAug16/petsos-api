import { z } from "zod";

export const submitEvidenceSchema = z.object({
  description: z
    .string({ required_error: "Descrição é obrigatória" })
    .trim()
    .min(20, "Descrição deve ter no mínimo 20 caracteres"),
});
