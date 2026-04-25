import { z } from "zod";

export const completeProfileSchema = z.object({
  body: z.object({
    name: z
      .string({ required_error: "Nome é obrigatório" })
      .trim()
      .min(2, "Nome deve ter pelo menos 2 caracteres"),

    username: z
      .string({ required_error: "Username é obrigatório" })
      .trim()
      .min(4, "Username deve ter pelo menos 4 caracteres")
      .regex(/^[a-zA-Z0-9_]+$/, "Username pode conter apenas letras, números e _"),
  }),
});

export const checkUsernameSchema = z.object({
  params: z.object({
    username: z
      .string({ required_error: "Username é obrigatório" })
      .trim()
      .min(1, "Username é obrigatório"),
  }),
});
