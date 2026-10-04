export const toBool = (value, fallback = false) => {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  return ["true", "1", "yes", "on"].includes(String(value).toLowerCase());
};

export const toNumOrNull = (value) => {
  if (value === undefined || value === null || value === "" || value === "null") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

export const toIntOrNull = (value) => {
  const n = toNumOrNull(value);
  return n !== null && Number.isInteger(n) ? n : null;
};

export const round2 = (n) => Math.round(Number(n) * 100) / 100;
