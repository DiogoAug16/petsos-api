import { StatusCodes } from "http-status-codes";
import * as locationsService from "./locations.service.js";
import { success } from "../../shared/utils/response.util.js";

export const searchCities = async (req, res) => {
  const cities = await locationsService.searchCities(req.validatedQuery);
  return success(res, cities, StatusCodes.OK);
};
