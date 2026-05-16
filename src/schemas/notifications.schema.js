import { z } from "zod";

/**
 * Schema para validar o parâmetro id da notificação.
 */
export const notificationIdParamSchema = z.object({
  params: z.strictObject({
    id: z
      .string({ required_error: "id é obrigatório" })
      .trim()
      .min(1, "id é obrigatório"),
  }),
});

/**
 * Schema para validar o pushToken enviado pelo app.
 */
export const registerPushTokenSchema = z.object({
  body: z.strictObject({
    pushToken: z
      .string({ required_error: "pushToken é obrigatório" })
      .trim()
      .min(1, "pushToken é obrigatório"),
  }),
});
