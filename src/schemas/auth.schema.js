import { z } from "zod";

export const registerSchema = z.object({
  body: z.object({
    name: z
      .string({ required_error: "Nome é obrigatório" })
      .trim()
      .min(2, "Nome deve ter pelo menos 2 caracteres"),

    email: z
      .string({ required_error: "Email é obrigatório" })
      .trim()
      .email("Email inválido"),

    username: z
      .string({ required_error: "Username é obrigatório" })
      .trim()
      .min(4, "Username deve ter pelo menos 4 caracteres")
      .regex(/^[a-zA-Z0-9_]+$/, "Username pode conter apenas letras, números e _"),

    password: z
      .string({ required_error: "Senha é obrigatória" })
      .min(8, "Senha deve ter pelo menos 8 caracteres")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "Senha deve conter letras maiúsculas, minúsculas e números",
      ),
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
