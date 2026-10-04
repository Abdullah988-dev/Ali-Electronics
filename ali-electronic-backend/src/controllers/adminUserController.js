import bcrypt from "bcryptjs";
import { query } from "../config/db.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { toBool } from "../utils/parse.js";
import { getId } from "../utils/params.js";
import { ROLES } from "../models/constants.js";
import { requireFields, isEmail } from "../validators/validate.js";

const COLUMNS = "Id, Name, Email, Phone, Role, IsActive, CreatedAt";
const ALL_ROLES = Object.values(ROLES);

const findUser = async (id) => {
  const result = await query(`SELECT ${COLUMNS} FROM dbo.Users WHERE Id = @id`, { id });
  return result.recordset[0];
};

// GET /api/admin/users?role=staff&search=
export const listUsers = asyncHandler(async (req, res) => {
  const where = [];
  const params = {};
  if (req.query.role && ALL_ROLES.includes(req.query.role)) {
    where.push("Role = @role");
    params.role = req.query.role;
  }
  if (req.query.search && String(req.query.search).trim()) {
    where.push("(Name LIKE @search OR Email LIKE @search OR Phone LIKE @search)");
    params.search = `%${String(req.query.search).trim()}%`;
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const result = await query(`SELECT TOP 300 ${COLUMNS} FROM dbo.Users ${whereSql} ORDER BY Id DESC`, params);
  res.json(result.recordset);
});

// POST /api/admin/users   { name, email, phone, password, role: "staff" | "admin" }
export const createUser = asyncHandler(async (req, res) => {
  requireFields(req.body, ["name", "email", "password"]);

  const name = String(req.body.name).trim();
  const email = String(req.body.email).trim().toLowerCase();
  const password = String(req.body.password);
  const role = req.body.role ? String(req.body.role) : ROLES.STAFF;

  if (!isEmail(email)) throw new ApiError(400, "Sahi email likhein");
  if (password.length < 8) throw new ApiError(400, "Staff/Admin ka password kam az kam 8 characters ka ho");
  if (![ROLES.STAFF, ROLES.ADMIN].includes(role)) throw new ApiError(400, "Role sirf staff ya admin ho sakta hai");

  const exists = await query("SELECT Id FROM dbo.Users WHERE Email = @email", { email });
  if (exists.recordset.length) throw new ApiError(409, "Is email se account pehle se bana hua hai");

  const hash = await bcrypt.hash(password, 10);
  const result = await query(
    `INSERT INTO dbo.Users (Name, Email, Phone, PasswordHash, Role)
     OUTPUT INSERTED.Id
     VALUES (@name, @email, @phone, @hash, @role)`,
    { name, email, phone: req.body.phone ? String(req.body.phone).trim() : null, hash, role }
  );
  res.status(201).json(await findUser(result.recordset[0].Id));
});

// PUT /api/admin/users/:id   { name, phone, role, isActive, password }
export const updateUser = asyncHandler(async (req, res) => {
  const id = getId(req);
  const cur = await findUser(id);
  if (!cur) throw new ApiError(404, "User nahi mila");

  const b = req.body;
  const name = b.name !== undefined ? String(b.name).trim() : cur.Name;
  if (!name) throw new ApiError(400, "Naam likhein");

  const role = b.role !== undefined ? String(b.role) : cur.Role;
  if (!ALL_ROLES.includes(role)) throw new ApiError(400, "Ghalat role");
  const isActive = toBool(b.isActive, cur.IsActive);

  // apna role ya account band karna mana hai
  if (id === req.user.Id && (role !== cur.Role || !isActive)) {
    throw new ApiError(400, "Aap apna role ya account khud band nahi kar sakte");
  }

  // aakhri active admin ko hatana mana hai
  if (cur.Role === ROLES.ADMIN && cur.IsActive && (role !== ROLES.ADMIN || !isActive)) {
    const others = await query(
      "SELECT COUNT(*) AS n FROM dbo.Users WHERE Role = 'admin' AND IsActive = 1 AND Id <> @id",
      { id }
    );
    if (others.recordset[0].n === 0) throw new ApiError(400, "Kam az kam ek active admin hona zaroori hai");
  }

  let hash = null;
  if (b.password) {
    if (String(b.password).length < 8) throw new ApiError(400, "Naya password kam az kam 8 characters ka ho");
    hash = await bcrypt.hash(String(b.password), 10);
  }

  await query(
    `UPDATE dbo.Users
     SET Name = @name, Phone = @phone, Role = @role, IsActive = @isActive, PasswordHash = ISNULL(@hash, PasswordHash)
     WHERE Id = @id`,
    {
      id,
      name,
      phone: b.phone !== undefined ? String(b.phone).trim() || null : cur.Phone,
      role,
      isActive,
      hash,
    }
  );
  res.json(await findUser(id));
});