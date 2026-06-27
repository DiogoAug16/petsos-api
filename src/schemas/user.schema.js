import { z } from "zod";

const isValidLocationLabel = (value) => {
  const trimmed = value.trim();
  if (!trimmed) return true;

  const parts = trimmed.split(",");
  if (parts.length !== 2) return false;

  const city = parts[0].trim();
  const state = parts[1].trim();
  return city.length >= 2 && /^[A-Z]{2}$/.test(state);
};

export const publicUserProfileSchema = z.object({
  name: z.string().nullable().optional(),
  username: z.string(),
  description: z.string().nullable().optional(),
  locationLabel: z.string().nullable().optional(),
  photoUrl: z.string().nullable().optional(),
  createdAt: z.any().optional(),
  updatedAt: z.any().optional(),
});

export const updateUserProfileSchema = z.object({
  body: z.object({
    name: z
      .string({ required_error: "Nome é obrigatório" })
      .trim()
      .min(2, "Nome deve ter pelo menos 2 caracteres")
      .max(80, "Nome deve ter no máximo 80 caracteres"),
    locationLabel: z
      .string()
      .trim()
      .max(80, "Localização deve ter no máximo 80 caracteres")
      .refine(isValidLocationLabel, 'Localização deve estar no formato "Cidade, UF"')
      .optional()
      .default(""),
    description: z
      .string()
      .trim()
      .max(240, "Descrição deve ter no máximo 240 caracteres")
      .optional()
      .default(""),
  }),
});
