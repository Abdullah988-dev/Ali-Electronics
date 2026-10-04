import { ApiError } from "../utils/apiError.js";

/** Throws 400 if any of the given fields is missing/blank in body. */
export const requireFields = (body, fields) => {
  const missing = fields.filter((f) => body[f] === undefined || body[f] === null || String(body[f]).trim() === "");
  if (missing.length) throw new ApiError(400, `Required: ${missing.join(", ")}`);
};

export const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || ""));

export const positiveInt = (value, label = "Value") => {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) throw new ApiError(400, `${label} must be a whole number greater than 0`);
  return n;
};

export const positiveNumber = (value, label = "Value") => {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) throw new ApiError(400, `${label} must be greater than 0`);
  return n;
};

export const nonNegativeNumber = (value, label = "Value") => {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) throw new ApiError(400, `${label} must be 0 or more`);
  return n;
};
