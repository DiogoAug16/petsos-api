import { completeProfileSchema, checkUsernameSchema } from "../schemas/auth.schema.js";

export const validateCompleteProfile = (req, res, next) => {
  const result = completeProfileSchema.safeParse({ body: req.body });

  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: "Dados inválidos",
      errors: result.error.errors.map((err) => ({
        field: err.path[1],
        message: err.message,
      })),
    });
  }

  req.validatedAuthData = result.data.body;
  next();
};

export const validateCheckUsername = (req, res, next) => {
  const result = checkUsernameSchema.safeParse({ params: req.params });

  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: "Username inválido",
    });
  }

  next();
};
