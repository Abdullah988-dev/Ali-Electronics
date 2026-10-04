import { env } from "../config/env.js";

export const notFound = (req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
};

export const errorHandler = (err, req, res, next) => {
  let status = err.status || 500;
  let message = err.message || "Server error";

  if (err.name === "MulterError") {
    status = 400;
    message = err.code === "LIMIT_FILE_SIZE" ? "Image must be smaller than 5MB" : err.message;
  } else if (err.number === 2627 || err.number === 2601) {
    status = 409;
    message = "This record already exists (duplicate value)";
  } else if (err.number === 547) {
    status = 409;
    message = "Invalid reference, or this record is used by other data so it cannot be removed";
  } else if (!err.status) {
    console.error(err);
    if (["ESOCKET", "ELOGIN", "ETIMEOUT", "EINSTLOOKUP"].includes(err.code)) {
      message = "Database connection problem. Check SQL Server and backend .env settings";
    } else if (env.nodeEnv === "production") {
      message = "Server error";
    }
  }

  res.status(status).json({ message });
};
