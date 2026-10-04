import { query } from "../config/db.js";

const EFFECTIVE_PRICE = `CASE WHEN p.DiscountPrice IS NOT NULL AND p.DiscountPrice > 0 AND p.DiscountPrice < p.Price
                              THEN p.DiscountPrice ELSE p.Price END`;

const SELECT_FIELDS = `
  p.Id, p.Name, p.Description, p.Sku, p.Price, p.DiscountPrice, p.ImageUrl,
  p.IsPublished, p.IsFeatured, p.LowStockLimit, p.CreatedAt,
  p.CategoryId, c.Name AS CategoryName, c.Slug AS CategorySlug,
  p.BrandId, b.Name AS BrandName, b.IsLocal AS BrandIsLocal,
  s.TotalIn, s.TotalOut, s.StockQuantity,
  CASE WHEN s.StockQuantity > 0 THEN 1 ELSE 0 END AS InStock,
  (SELECT STRING_AGG(pi.ImageUrl, '|') WITHIN GROUP (ORDER BY pi.SortOrder, pi.Id)
     FROM dbo.ProductImages pi WHERE pi.ProductId = p.Id) AS ImageList`;

const FROM_SQL = `
  FROM dbo.Products p
  JOIN dbo.Categories c ON c.Id = p.CategoryId
  LEFT JOIN dbo.Brands b ON b.Id = p.BrandId
  JOIN dbo.vw_ProductStock s ON s.ProductId = p.Id`;

const SORTS = {
  newest: "p.Id DESC",
  price_asc: `${EFFECTIVE_PRICE} ASC, p.Id DESC`,
  price_desc: `${EFFECTIVE_PRICE} DESC, p.Id DESC`,
  name: "p.Name ASC",
};

const isTrue = (v) => v === "1" || v === "true" || v === true;
const isFalse = (v) => v === "0" || v === "false" || v === false;

// Gallery = card par mouse ghumane se badalne wali tasveerein (zyada se zyada 5)
const shape = ({ ImageList, ...row }) => ({
  ...row,
  InStock: row.InStock === 1,
  Gallery: ImageList ? ImageList.split("|").slice(0, 5) : row.ImageUrl ? [row.ImageUrl] : [],
});

/**
 * Products ki list (stock ke saath).
 * publicOnly = true  -> sirf wo products jo website par dikhne chahiyen (published + active category)
 */
export const listProducts = async (f = {}, { publicOnly = false } = {}) => {
  const where = [];
  const params = {};

  if (publicOnly) where.push("p.IsPublished = 1 AND c.IsActive = 1");

  if (f.search && String(f.search).trim()) {
    where.push("(p.Name LIKE @search OR b.Name LIKE @search OR c.Name LIKE @search OR p.Sku LIKE @search)");
    params.search = `%${String(f.search).trim()}%`;
  }
  if (f.categoryId) {
    where.push("p.CategoryId = @categoryId");
    params.categoryId = Number(f.categoryId);
  }
  if (f.categorySlug) {
    where.push("c.Slug = @categorySlug");
    params.categorySlug = String(f.categorySlug);
  }
  if (f.brandId) {
    where.push("p.BrandId = @brandId");
    params.brandId = Number(f.brandId);
  }
  if (isTrue(f.featured)) where.push("p.IsFeatured = 1");
  if (isTrue(f.published)) where.push("p.IsPublished = 1");
  if (isFalse(f.published)) where.push("p.IsPublished = 0");
  if (isTrue(f.inStock)) where.push("s.StockQuantity > 0");

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const orderSql = SORTS[f.sort] || SORTS.newest;

  const page = Math.max(parseInt(f.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(f.limit, 10) || 12, 1), 100);
  params.offset = (page - 1) * limit;
  params.limit = limit;

  const items = await query(
    `SELECT ${SELECT_FIELDS} ${FROM_SQL} ${whereSql}
     ORDER BY ${orderSql}
     OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`,
    params
  );
  const count = await query(`SELECT COUNT(*) AS total ${FROM_SQL} ${whereSql}`, params);

  const total = count.recordset[0].total;
  return {
    items: items.recordset.map(shape),
    total,
    page,
    limit,
    totalPages: Math.max(Math.ceil(total / limit), 1),
  };
};

/** Ek product (stock aur poori gallery ke saath). publicOnly = true ho to unpublished product nahi milta. */
export const getProductById = async (id, { publicOnly = false } = {}) => {
  const extra = publicOnly ? "AND p.IsPublished = 1 AND c.IsActive = 1" : "";
  const result = await query(`SELECT ${SELECT_FIELDS} ${FROM_SQL} WHERE p.Id = @id ${extra}`, { id });
  if (!result.recordset[0]) return null;

  const product = shape(result.recordset[0]);
  const images = await query(
    "SELECT Id, ImageUrl FROM dbo.ProductImages WHERE ProductId = @id ORDER BY SortOrder, Id",
    { id }
  );
  return { ...product, Images: images.recordset };
};