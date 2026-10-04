import { ApiError } from "./apiError.js";

/** URL ke :id ko number me badalta hai, ghalat ho to 400 deta hai. */
export const getId = (req, name = "id") => {
  const id = Number(req.params[name]);
  if (!Number.isInteger(id) || id <= 0) throw new ApiError(400, "Invalid id");
  return id;
};