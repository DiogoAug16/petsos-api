import { z } from "zod";

export const complaintIdParamSchema = z.object({
  params: z.strictObject({
    complaintId: z
      .string({ required_error: "complaintId é obrigatório" })
      .trim()
      .min(1, "complaintId é obrigatório"),
  }),
});
