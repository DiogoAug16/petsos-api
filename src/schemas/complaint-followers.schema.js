import { z } from "zod";

export const followComplaintSchema = z.object({
  body: z
    .object({
      complaintId: z
        .string({ required_error: "complaintId é obrigatório" })
        .trim()
        .min(1, "complaintId é obrigatório"),
    })
    .strict(),
});

export const complaintIdParamSchema = z.object({
  params: z
    .object({
      complaintId: z
        .string({ required_error: "complaintId é obrigatório" })
        .trim()
        .min(1, "complaintId é obrigatório"),
    })
    .strict(),
});
