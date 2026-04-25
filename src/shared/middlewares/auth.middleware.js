import admin from "firebase-admin";
import { StatusCodes } from "http-status-codes";
import logger from "../../logger/index.js";

export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: "Token não fornecido",
        errorCode: "UNAUTHORIZED",
      });
    }

    const token = authHeader.replace("Bearer ", "");

    const decodedToken = await admin.auth().verifyIdToken(token);
    req.userId = decodedToken.uid;

    next();
  } catch (error) {
    logger.error({ error: error.message }, "Erro ao verificar token");

    return res.status(StatusCodes.UNAUTHORIZED).json({
      success: false,
      message: "Token inválido ou expirado",
      errorCode: "UNAUTHORIZED",
    });
  }
};
