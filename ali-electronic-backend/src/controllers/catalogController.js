import { query } from "../config/db.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getId } from "../utils/params.js";
import { listProducts, getProductById } from "../services/productService.js";

const fetchCategories = async () => {
  const result = await query(
    `SELECT c.Id, c.Name, c.Slug, c.Description, c.ImageUrl,
            (SELECT COUNT(*) FROM dbo.Products p WHERE p.CategoryId = c.Id AND p.IsPublished = 1) AS ProductCount
     FROM dbo.Categories c
     WHERE c.IsActive = 1
     ORDER BY c.Name`
  );
  return result.recordset;
};

const fetchBrands = async (categoryId) => {
  const params = {};
  let extra = "";
  if (categoryId) {
    extra = "AND b.CategoryId = @categoryId";
    params.categoryId = Number(categoryId);
  }
  const result = await query(
    `SELECT b.Id, b.Name, b.CategoryId, c.Name AS CategoryName, b.IsLocal, b.LogoUrl
     FROM dbo.Brands b
     JOIN dbo.Categories c ON c.Id = b.CategoryId
     WHERE b.IsActive = 1 AND c.IsActive = 1 ${extra}
     ORDER BY b.Name`,
    params
  );
  return result.recordset;
};

// GET /api/home  (home page ka saara data ek hi request me)
// sections = har category ke apne products (category ke hisaab se alag alag)
export const getHome = asyncHandler(async (req, res) => {
  const [categories, brands, featured] = await Promise.all([
    fetchCategories(),
    fetchBrands(),
    listProducts({ featured: "1", limit: 8 }, { publicOnly: true }),
  ]);

  const sections = (
    await Promise.all(
      categories.map(async (category) => {
        const result = await listProducts(
          { categoryId: category.Id, limit: 5, sort: "newest" },
          { publicOnly: true }
        );
        return { category, products: result.items, total: result.total };
      })
    )
  ).filter((section) => section.products.length > 0);

  res.json({ categories, brands, featured: featured.items, sections });
});

// GET /api/categories
export const getCategories = asyncHandler(async (req, res) => {
  res.json(await fetchCategories());
});

// GET /api/brands?categoryId=1
export const getBrands = asyncHandler(async (req, res) => {
  res.json(await fetchBrands(req.query.categoryId));
});

// GET /api/products?search=&categorySlug=&brandId=&sort=&inStock=1&page=1&limit=12
export const getProducts = asyncHandler(async (req, res) => {
  res.json(await listProducts(req.query, { publicOnly: true }));
});

// GET /api/products/:id
export const getProduct = asyncHandler(async (req, res) => {
  const product = await getProductById(getId(req), { publicOnly: true });
  if (!product) throw new ApiError(404, "Product nahi mila");
  res.json(product);
});