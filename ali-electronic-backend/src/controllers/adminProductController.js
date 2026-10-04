import { query, withTransaction, txQuery } from "../config/db.js";
import { env } from "../config/env.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { toBool, toIntOrNull, toNumOrNull } from "../utils/parse.js";
import { removeUpload } from "../utils/files.js";
import { getId } from "../utils/params.js";
import { requireFields, positiveNumber } from "../validators/validate.js";
import { listProducts, getProductById } from "../services/productService.js";
import { applyProductImages, getProductImages } from "../services/productImageService.js";

const uploadedUrls = (req) => (req.files || []).map((f) => f.storedUrl).filter(Boolean);
const cleanup = (urls) => Promise.all(urls.filter(Boolean).map((u) => removeUpload(u)));

// imageOrder: JSON jaise ["id:12","new:0","id:15"]
const parseOrder = (value) => {
  if (value === undefined) return undefined;
  try {
    const arr = JSON.parse(value);
    return Array.isArray(arr) ? arr : undefined;
  } catch {
    return undefined;
  }
};

const checkDiscount = (price, discountPrice) => {
  if (discountPrice !== null && (discountPrice <= 0 || discountPrice >= price)) {
    throw new ApiError(400, "Discount price asli price se kam (aur 0 se zyada) honi chahiye");
  }
};

// Brand select ho to wo usi category ki honi chahiye
const checkBrand = async (brandId, categoryId) => {
  if (!brandId) return;
  const result = await query("SELECT CategoryId FROM dbo.Brands WHERE Id = @brandId", { brandId });
  const brand = result.recordset[0];
  if (!brand) throw new ApiError(400, "Brand nahi mili");
  if (brand.CategoryId !== categoryId) throw new ApiError(400, "Ye brand is category ki nahi hai");
};

// GET /api/admin/products?search=&categoryId=&brandId=&published=1|0&page=1&limit=20
export const listAdminProducts = asyncHandler(async (req, res) => {
  res.json(await listProducts({ limit: 20, ...req.query }));
});

// GET /api/admin/products/:id   (poori gallery ke saath)
export const getAdminProduct = asyncHandler(async (req, res) => {
  const product = await getProductById(getId(req));
  if (!product) throw new ApiError(404, "Product nahi mila");
  res.json(product);
});

// POST /api/admin/products
// form-data: name, categoryId, brandId, price, discountPrice, sku, description, isPublished, isFeatured,
//            lowStockLimit, openingStock, openingCost, imageOrder, images (kai files)
export const createProduct = asyncHandler(async (req, res) => {
  const urls = uploadedUrls(req);
  let result;

  try {
    const b = req.body;
    requireFields(b, ["name", "categoryId", "price"]);

    const price = positiveNumber(b.price, "Price");
    const discountPrice = toNumOrNull(b.discountPrice);
    checkDiscount(price, discountPrice);

    const categoryId = toIntOrNull(b.categoryId);
    if (!categoryId) throw new ApiError(400, "Category select karein");
    const brandId = toIntOrNull(b.brandId);
    await checkBrand(brandId, categoryId);

    // Opening stock (optional): product ke saath hi Stock In me chala jata hai
    const openingStock = b.openingStock === undefined || b.openingStock === "" ? 0 : Number(b.openingStock);
    if (!Number.isInteger(openingStock) || openingStock < 0) {
      throw new ApiError(400, "Opening stock 0 ya us se zyada poora number ho");
    }
    const openingCost = toNumOrNull(b.openingCost) ?? 0;
    if (openingCost < 0) throw new ApiError(400, "Kharid rate 0 ya us se zyada ho");

    result = await withTransaction(async (tx) => {
      const inserted = await txQuery(
        tx,
        `INSERT INTO dbo.Products
           (Name, Description, Sku, Price, DiscountPrice, CategoryId, BrandId, IsPublished, IsFeatured, LowStockLimit)
         OUTPUT INSERTED.Id
         VALUES (@name, @description, @sku, @price, @discountPrice, @categoryId, @brandId, @isPublished, @isFeatured, @lowStockLimit)`,
        {
          name: String(b.name).trim(),
          description: b.description ? String(b.description).trim() : null,
          sku: b.sku ? String(b.sku).trim() : null,
          price,
          discountPrice,
          categoryId,
          brandId,
          isPublished: toBool(b.isPublished, true),
          isFeatured: toBool(b.isFeatured, false),
          lowStockLimit: toIntOrNull(b.lowStockLimit) ?? env.lowStockLimit,
        }
      );
      const newId = inserted.recordset[0].Id;

      if (openingStock > 0) {
        await txQuery(
          tx,
          `INSERT INTO dbo.StockIn (ProductId, Quantity, CostPrice, Note, CreatedBy)
           VALUES (@productId, @quantity, @costPrice, @note, @createdBy)`,
          { productId: newId, quantity: openingStock, costPrice: openingCost, note: "Opening stock", createdBy: req.user.Id }
        );
      }

      const images = await applyProductImages(tx, newId, parseOrder(b.imageOrder), urls);
      return { newId, images };
    });
  } catch (err) {
    await cleanup(urls); // error aaye to upload hui tasveerein hata do
    throw err;
  }

  await cleanup(result.images.unusedUploads);
  res.status(201).json(await getProductById(result.newId));
});

// PUT /api/admin/products/:id
export const updateProduct = asyncHandler(async (req, res) => {
  const id = getId(req);
  const urls = uploadedUrls(req);
  let imageResult;

  try {
    const found = await query("SELECT * FROM dbo.Products WHERE Id = @id", { id });
    const cur = found.recordset[0];
    if (!cur) throw new ApiError(404, "Product nahi mila");

    const b = req.body;
    const has = (key) => b[key] !== undefined;

    const name = has("name") ? String(b.name).trim() : cur.Name;
    if (!name) throw new ApiError(400, "Product ka naam likhein");

    const price = has("price") ? positiveNumber(b.price, "Price") : Number(cur.Price);
    const discountPrice = has("discountPrice")
      ? toNumOrNull(b.discountPrice)
      : cur.DiscountPrice === null
      ? null
      : Number(cur.DiscountPrice);
    checkDiscount(price, discountPrice);

    const categoryId = has("categoryId") ? toIntOrNull(b.categoryId) : cur.CategoryId;
    if (!categoryId) throw new ApiError(400, "Category select karein");
    const brandId = has("brandId") ? toIntOrNull(b.brandId) : cur.BrandId;
    await checkBrand(brandId, categoryId);

    imageResult = await withTransaction(async (tx) => {
      await txQuery(
        tx,
        `UPDATE dbo.Products
         SET Name = @name, Description = @description, Sku = @sku, Price = @price, DiscountPrice = @discountPrice,
             CategoryId = @categoryId, BrandId = @brandId,
             IsPublished = @isPublished, IsFeatured = @isFeatured, LowStockLimit = @lowStockLimit
         WHERE Id = @id`,
        {
          id,
          name,
          description: has("description") ? String(b.description).trim() || null : cur.Description,
          sku: has("sku") ? String(b.sku).trim() || null : cur.Sku,
          price,
          discountPrice,
          categoryId,
          brandId,
          isPublished: toBool(b.isPublished, cur.IsPublished),
          isFeatured: toBool(b.isFeatured, cur.IsFeatured),
          lowStockLimit: has("lowStockLimit") ? toIntOrNull(b.lowStockLimit) ?? cur.LowStockLimit : cur.LowStockLimit,
        }
      );
      return applyProductImages(tx, id, parseOrder(b.imageOrder), urls);
    });
  } catch (err) {
    await cleanup(urls);
    throw err;
  }

  await cleanup([...imageResult.removedUrls, ...imageResult.unusedUploads]);
  res.json(await getProductById(id));
});

// DELETE /api/admin/products/:id
export const deleteProduct = asyncHandler(async (req, res) => {
  const id = getId(req);
  const found = await query("SELECT ImageUrl FROM dbo.Products WHERE Id = @id", { id });
  const cur = found.recordset[0];
  if (!cur) throw new ApiError(404, "Product nahi mila");

  const images = await getProductImages(id);
  const urls = [...new Set([cur.ImageUrl, ...images.map((i) => i.ImageUrl)].filter(Boolean))];

  try {
    await query("DELETE FROM dbo.Products WHERE Id = @id", { id });
  } catch (err) {
    if (err.number === 547) {
      throw new ApiError(409, "Is product ki stock ya order history maujood hai, isliye delete nahi ho sakta. Isay Unpublish kar dein.");
    }
    throw err;
  }

  await cleanup(urls);
  res.json({ message: "Product delete ho gaya" });
});