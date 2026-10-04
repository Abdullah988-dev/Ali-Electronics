import bcrypt from "bcryptjs";
import { query } from "../config/db.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { signToken } from "../utils/token.js";
import { requireFields, isEmail } from "../validators/validate.js";

const publicUser = (u) => ({
  id: u.Id,
  name: u.Name,
  email: u.Email,
  phone: u.Phone,
  role: u.Role,
});

// Password: kam az kam 8 characters, kam az kam ek harf aur ek number
const isStrongPassword = (p) => p.length >= 8 && p.length <= 100 && /[A-Za-z]/.test(p) && /\d/.test(p);

// Email na milne par bhi bcrypt chalta hai taake jawab ke waqt se pata na chale ke email maujood hai ya nahi
const DUMMY_HASH = bcrypt.hashSync("dummy-password-for-timing", 10);

// POST /api/auth/register  (sirf customer account banta hai)
export const register = asyncHandler(async (req, res) => {
  requireFields(req.body, ["name", "email", "password"]);

  const name = String(req.body.name).trim().slice(0, 100);
  const email = String(req.body.email).trim().toLowerCase();
  const password = String(req.body.password);
  const phone = req.body.phone ? String(req.body.phone).trim().slice(0, 30) : null;

  if (name.length < 2) throw new ApiError(400, "Apna poora naam likhein");
  if (!isEmail(email)) throw new ApiError(400, "Sahi email likhein");
  if (!isStrongPassword(password)) {
    throw new ApiError(400, "Password kam az kam 8 characters ka ho, us me harf aur number dono hon");
  }

  const exists = await query("SELECT Id FROM dbo.Users WHERE Email = @email", { email });
  if (exists.recordset.length) throw new ApiError(409, "Is email se account pehle se bana hua hai");

  const hash = await bcrypt.hash(password, 10);
  const result = await query(
    `INSERT INTO dbo.Users (Name, Email, Phone, PasswordHash, Role)
     OUTPUT INSERTED.*
     VALUES (@name, @email, @phone, @hash, 'customer')`,
    { name, email, phone, hash }
  );

  const user = result.recordset[0];
  res.status(201).json({ token: signToken(user), user: publicUser(user) });
});

// POST /api/auth/login
export const login = asyncHandler(async (req, res) => {
  requireFields(req.body, ["email", "password"]);

  const email = String(req.body.email).trim().toLowerCase();
  const password = String(req.body.password);

  const result = await query("SELECT * FROM dbo.Users WHERE Email = @email", { email });
  const user = result.recordset[0];

  const ok = await bcrypt.compare(password, user ? user.PasswordHash : DUMMY_HASH);
  if (!user || !ok) throw new ApiError(401, "Email ya password ghalat hai");
  if (!user.IsActive) throw new ApiError(403, "Ye account band hai");

  res.json({ token: signToken(user), user: publicUser(user) });
});

// GET /api/auth/me  (token se current user)
export const me = (req, res) => {
  res.json({ user: publicUser(req.user) });
};