import * as authService from "./auth.service.js";
import { success } from "../../shared/utils/response.util.js";
import { StatusCodes } from "http-status-codes";

/** @type {import("express").RequestHandler} */
export const register = async (req, res) => {
  const user = await authService.register(req.validatedAuthData);
  return success(res, user, StatusCodes.CREATED);
};

/** @type {import("express").RequestHandler} */
export const checkUsername = async (req, res) => {
  const result = await authService.checkUsername(req.params.username);
  return success(res, result, StatusCodes.OK);
};
