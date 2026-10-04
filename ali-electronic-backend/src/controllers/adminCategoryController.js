import { query } from "../config/db.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { slugify } from "../utils/slugify.js";
import { toBool } from "../utils/parse.js";
import { removeUpload } from "../utils/files.js";
import { getId } from "../utils/params.js";
import { uploadedPath } from "../middleware/upload.js";
import { requireFields } from "../validators/validate.js";

const FOLDER = "categories";

const findById = async (id) => {
  const result = await query("SELECT * FROM dbo.Categories WHERE Id = @id", { id });
  return result.recordset[0];
};

// GET /api/admin/categories
export const listCategories = asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT c.Id, c.Name, c.Slug, c.Description, c.ImageUrl, c.IsActive, c.CreatedAt,
            (SELECT COUNT(*) FROM dbo.Products p WHERE p.CategoryId = c.Id) AS ProductCount,
            (SELECT COUNT(*) FROM dbo.Brands b WHERE b.CategoryId = c.Id) AS BrandCount
     FROM dbo.Categories c
     ORDER BY c.Name`
  );
  res.json(result.recordset);
});

// POST /api/admin/categories   (form-data: name, description, isActive, image)
export const createCategory = asyncHandler(async (req, res) => {
  const imageUrl = uploadedPath(FOLDER, req.file) ?? null;
  try {
    requireFields(req.body, ["name"]);
    const name = String(req.body.name).trim();

    const result = await query(
      `INSERT INTO dbo.Categories (Name, Slug, Description, ImageUrl, IsActive)
       OUTPUT INSERTED.*
       VALUES (@name, @slug, @description, @imageUrl, @isActive)`,
      {
        name,
        slug: slugify(name) || `category-${Date.now()}`,
        description: req.body.description ? String(req.body.description).trim() : null,
        imageUrl,
        isActive: toBool(req.body.isActive, true),
      }
    );
    res.status(201).json(result.recordset[0]);
  } catch (err) {
    await removeUpload(imageUrl); // error aaye to upload hui image hata do
    throw err;
  }
});

// PUT /api/admin/categories/:id
export const updateCategory = asyncHandler(async (req, res) => {
  const id = getId(req);
  const newImage = uploadedPath(FOLDER, req.file);
  try {
    const cur = await findById(id);
    if (!cur) throw new ApiError(404, "Category nahi mili");

    const name = req.body.name !== undefined ? String(req.body.name).trim() : cur.Name;
    if (!name) throw new ApiError(400, "Category ka naam likhein");

    const description =
      req.body.description !== undefined ? String(req.body.description).trim() || null : cur.Description;
    const slug = name !== cur.Name ? slugify(name) || cur.Slug : cur.Slug;

    await query(
      `UPDATE dbo.Categories
       SET Name = @name, Slug = @slug, Description = @description, ImageUrl = @imageUrl, IsActive = @isActive
       WHERE Id = @id`,
      {
        id,
        name,
        slug,
        description,
        imageUrl: newImage ?? cur.ImageUrl,
        isActive: toBool(req.body.isActive, cur.IsActive),
      }
    );

    if (newImage) await removeUpload(cur.ImageUrl); // purani image hata do
    res.json(await findById(id));
  } catch (err) {
    await removeUpload(newImage);
    throw err;
  }
});

// DELETE /api/admin/categories/:id
export const deleteCategory = asyncHandler(async (req, res) => {
  const id = getId(req);
  const cur = await findById(id);
  if (!cur) throw new ApiError(404, "Category nahi mili");

  try {
    await query("DELETE FROM dbo.Categories WHERE Id = @id", { id });
  } catch (err) {
    if (err.number === 547) {
      throw new ApiError(409, "Is category me brands ya products maujood hain. Pehle unhein hatayen ya Inactive kar dein.");
    }
    throw err;
  }

  await removeUpload(cur.ImageUrl);
  res.json({ message: "Category delete ho gayi" });
});