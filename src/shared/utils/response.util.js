import { StatusCodes } from "http-status-codes";

export const success = (res, data, statusCode = StatusCodes.OK) => {
  return res.status(statusCode).json({
    success: true,
    data,
  });
};
