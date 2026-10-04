import { query } from "../config/db.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { toBool, toIntOrNull } from "../utils/parse.js";
import { removeUpload } from "../utils/files.js";
import { getId } from "../utils/params.js";
import { uploadedPath } from "../middleware/upload.js";
import { requireFields } from "../validators/validate.js";

const FOLDER = "brands";

const findById = async (id) => {
  const result = await query(
    `SELECT b.*, c.Name AS CategoryName
     FROM dbo.Brands b JOIN dbo.Categories c ON c.Id = b.CategoryId
     WHERE b.Id = @id`,
    { id }
  );
  return result.recordset[0];
};

// GET /api/admin/brands?categoryId=1
export const listBrands = asyncHandler(async (req, res) => {
  const params = {};
  let where = "";
  if (req.query.categoryId) {
    where = "WHERE b.CategoryId = @categoryId";
    params.categoryId = Number(req.query.categoryId);
  }

  const result = await query(
    `SELECT b.Id, b.Name, b.CategoryId, c.Name AS CategoryName, b.IsLocal, b.LogoUrl, b.IsActive, b.CreatedAt,
            (SELECT COUNT(*) FROM dbo.Products p WHERE p.BrandId = b.Id) AS ProductCount
     FROM dbo.Brands b
     JOIN dbo.Categories c ON c.Id = b.CategoryId
     ${where}
     ORDER BY c.Name, b.Name`,
    params
  );
  res.json(result.recordset);
});

// POST /api/admin/brands   (form-data: name, categoryId, isLocal, isActive, image)
export const createBrand = asyncHandler(async (req, res) => {
  const logoUrl = uploadedPath(FOLDER, req.file) ?? null;
  try {
    requireFields(req.body, ["name", "categoryId"]);
    const name = String(req.body.name).trim();
    const categoryId = toIntOrNull(req.body.categoryId);
    if (!categoryId) throw new ApiError(400, "Category select karein");

    const result = await query(
      `INSERT INTO dbo.Brands (Name, CategoryId, IsLocal, LogoUrl, IsActive)
       OUTPUT INSERTED.Id
       VALUES (@name, @categoryId, @isLocal, @logoUrl, @isActive)`,
      {
        name,
        categoryId,
        isLocal: toBool(req.body.isLocal, true),
        logoUrl,
        isActive: toBool(req.body.isActive, true),
      }
    );
    res.status(201).json(await findById(result.recordset[0].Id));
  } catch (err) {
    await removeUpload(logoUrl);
    throw err;
  }
});

// PUT /api/admin/brands/:id
export const updateBrand = asyncHandler(async (req, res) => {
  const id = getId(req);
  const newLogo = uploadedPath(FOLDER, req.file);
  try {
    const cur = await findById(id);
    if (!cur) throw new ApiError(404, "Brand nahi mili");

    const name = req.body.name !== undefined ? String(req.body.name).trim() : cur.Name;
    if (!name) throw new ApiError(400, "Brand ka naam likhein");

    const categoryId = req.body.categoryId !== undefined ? toIntOrNull(req.body.categoryId) : cur.CategoryId;
    if (!categoryId) throw new ApiError(400, "Category select karein");

    // jis brand ke products bane hue hain uski category badalne se data kharab hota hai
    if (categoryId !== cur.CategoryId) {
      const used = await query("SELECT COUNT(*) AS n FROM dbo.Products WHERE BrandId = @id", { id });
      if (used.recordset[0].n > 0) {
        throw new ApiError(409, "Is brand ke products bane hue hain, isliye category nahi badal sakte");
      }
    }

    await query(
      `UPDATE dbo.Brands
       SET Name = @name, CategoryId = @categoryId, IsLocal = @isLocal, LogoUrl = @logoUrl, IsActive = @isActive
       WHERE Id = @id`,
      {
        id,
        name,
        categoryId,
        isLocal: toBool(req.body.isLocal, cur.IsLocal),
        logoUrl: newLogo ?? cur.LogoUrl,
        isActive: toBool(req.body.isActive, cur.IsActive),
      }
    );

    if (newLogo) await removeUpload(cur.LogoUrl);
    res.json(await findById(id));
  } catch (err) {
    await removeUpload(newLogo);
    throw err;
  }
});

// DELETE /api/admin/brands/:id
export const deleteBrand = asyncHandler(async (req, res) => {
  const id = getId(req);
  const cur = await findById(id);
  if (!cur) throw new ApiError(404, "Brand nahi mili");

  try {
    await query("DELETE FROM dbo.Brands WHERE Id = @id", { id });
  } catch (err) {
    if (err.number === 547) {
      throw new ApiError(409, "Is brand ke products maujood hain. Pehle unhein hatayen ya brand ko Inactive kar dein.");
    }
    throw err;
  }

  await removeUpload(cur.LogoUrl);
  res.json({ message: "Brand delete ho gayi" });
});