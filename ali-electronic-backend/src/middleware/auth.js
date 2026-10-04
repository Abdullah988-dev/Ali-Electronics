import { query } from "../config/db.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { verifyToken } from "../utils/token.js";

const loadUser = async (token) => {
  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    throw new ApiError(401, "Session expired, please login again");
  }
  const result = await query("SELECT Id, Name, Email, Phone, Role, IsActive FROM dbo.Users WHERE Id = @id", { id: payload.id });
  const user = result.recordset[0];
  if (!user || !user.IsActive) throw new ApiError(401, "Account not found or disabled");
  return user;
};

export const protect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) throw new ApiError(401, "Please login first");
  req.user = await loadUser(token);
  next();
});

export const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.Role)) {
    return next(new ApiError(403, "You do not have permission for this action"));
  }
  next();
};
