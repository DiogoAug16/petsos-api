import { z } from "zod";

export const submitEvidenceSchema = z.object({
  description: z
    .string({ required_error: "Descrição é obrigatória" })
    .trim()
    .min(20, "Descrição deve ter no mínimo 20 caracteres"),
});

export const validateEvidenceSchema = z.object({
  approved: z.boolean({ required_error: "Campo 'approved' é obrigatório" }),
  evidenceIds: z
    .array(z.string().trim().min(1, "ID da evidência é obrigatório"))
    .min(1, "Selecione ao menos uma evidência para validar"),
});
