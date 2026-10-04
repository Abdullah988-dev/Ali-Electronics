import { query, withTransaction, txQuery } from "../config/db.js";
import { ApiError } from "../utils/apiError.js";
import { effectivePrice } from "../utils/price.js";
import { round2 } from "../utils/parse.js";
import { STOCK_OUT_REASONS } from "../models/constants.js";

// "Online Order" sirf website khud likhti hai, haath se nahi
export const MANUAL_OUT_REASONS = STOCK_OUT_REASONS.filter((r) => r !== "Online Order");

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const localDate = (d) => d.toLocaleDateString("en-CA"); // YYYY-MM-DD
const statusOf = (remaining, limit) => (remaining <= 0 ? "Out of Stock" : remaining <= limit ? "Low Stock" : "In Stock");

const pageOf = (f) => {
  const page = Math.max(parseInt(f.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(f.limit, 10) || 20, 1), 100);
  return { page, limit, offset: (page - 1) * limit };
};

const dateFilter = (f, column, where, params) => {
  if (f.from && DATE_RE.test(f.from)) {
    where.push(`CAST(${column} AS DATE) >= @from`);
    params.from = f.from;
  }
  if (f.to && DATE_RE.test(f.to)) {
    where.push(`CAST(${column} AS DATE) <= @to`);
    params.to = f.to;
  }
};

/* ------------------------------------------------------------------ */
/* Inventory: har product ka aaya / gaya / baaki                       */
/* ------------------------------------------------------------------ */
export const listInventory = async (f = {}) => {
  const where = [];
  const params = {};

  if (f.search && String(f.search).trim()) {
    where.push("(p.Name LIKE @search OR p.Sku LIKE @search OR b.Name LIKE @search OR c.Name LIKE @search)");
    params.search = `%${String(f.search).trim()}%`;
  }
  if (f.categoryId) {
    where.push("p.CategoryId = @categoryId");
    params.categoryId = Number(f.categoryId);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const result = await query(
    `SELECT p.Id, p.Name, p.Sku, p.ImageUrl, p.Price, p.DiscountPrice, p.IsPublished, p.LowStockLimit,
            c.Id AS CategoryId, c.Name AS CategoryName, b.Name AS BrandName,
            s.TotalIn, s.TotalOut, s.StockQuantity AS Remaining,
            (SELECT TOP 1 si.CostPrice FROM dbo.StockIn si WHERE si.ProductId = p.Id ORDER BY si.Id DESC) AS LastCost
     FROM dbo.Products p
     JOIN dbo.Categories c ON c.Id = p.CategoryId
     LEFT JOIN dbo.Brands b ON b.Id = p.BrandId
     JOIN dbo.vw_ProductStock s ON s.ProductId = p.Id
     ${whereSql}
     ORDER BY p.Name`,
    params
  );

  let items = result.recordset.map((r) => ({ ...r, StockStatus: statusOf(r.Remaining, r.LowStockLimit) }));
  if (["In Stock", "Low Stock", "Out of Stock"].includes(f.status)) {
    items = items.filter((i) => i.StockStatus === f.status);
  }

  const totals = {
    products: items.length,
    units: items.reduce((sum, i) => sum + Math.max(i.Remaining, 0), 0),
    stockValue: round2(items.reduce((sum, i) => sum + (i.Remaining > 0 ? i.Remaining * Number(i.LastCost || 0) : 0), 0)),
    lowStock: items.filter((i) => i.StockStatus === "Low Stock").length,
    outOfStock: items.filter((i) => i.StockStatus === "Out of Stock").length,
  };

  return { items, totals };
};

/* ------------------------------------------------------------------ */
/* Stock In: maal aaya                                                 */
/* ------------------------------------------------------------------ */
export const addStockIn = async (b = {}, userId) => {
  const productId = Number(b.productId);
  const quantity = Number(b.quantity);
  const costPrice = b.costPrice === undefined || b.costPrice === "" ? 0 : Number(b.costPrice);
  const supplierId = b.supplierId ? Number(b.supplierId) : null;
  const note = b.note ? String(b.note).trim().slice(0, 300) : null;

  if (!Number.isInteger(productId) || productId <= 0) throw new ApiError(400, "Product select karein");
  if (!Number.isInteger(quantity) || quantity <= 0 || quantity > 100000) {
    throw new ApiError(400, "Quantity 1 se zyada poora number honi chahiye");
  }
  if (!Number.isFinite(costPrice) || costPrice < 0) throw new ApiError(400, "Kharid rate 0 ya us se zyada ho");

  const product = (await query("SELECT Id, Name FROM dbo.Products WHERE Id = @id", { id: productId })).recordset[0];
  if (!product) throw new ApiError(404, "Product nahi mila");

  if (supplierId) {
    const supplier = (await query("SELECT Id FROM dbo.Suppliers WHERE Id = @id", { id: supplierId })).recordset[0];
    if (!supplier) throw new ApiError(400, "Supplier nahi mila");
  }

  await query(
    `INSERT INTO dbo.StockIn (ProductId, SupplierId, Quantity, CostPrice, Note, CreatedBy)
     VALUES (@productId, @supplierId, @quantity, @costPrice, @note, @createdBy)`,
    { productId, supplierId, quantity, costPrice, note, createdBy: userId }
  );

  const stock = await query("SELECT StockQuantity FROM dbo.vw_ProductStock WHERE ProductId = @id", { id: productId });
  return { productName: product.Name, quantity, remaining: stock.recordset[0].StockQuantity };
};

/* ------------------------------------------------------------------ */
/* Stock Out: maal gaya (shop sale, kharabi, supplier ko wapsi ...)    */
/* ------------------------------------------------------------------ */
export const addStockOut = async (b = {}, userId) => {
  const productId = Number(b.productId);
  const quantity = Number(b.quantity);
  const reason = b.reason ? String(b.reason) : "Shop Sale";
  const customerName = b.customerName ? String(b.customerName).trim().slice(0, 100) : null;
  const note = b.note ? String(b.note).trim().slice(0, 300) : null;

  if (!Number.isInteger(productId) || productId <= 0) throw new ApiError(400, "Product select karein");
  if (!Number.isInteger(quantity) || quantity <= 0 || quantity > 100000) {
    throw new ApiError(400, "Quantity 1 se zyada poora number honi chahiye");
  }
  if (!MANUAL_OUT_REASONS.includes(reason)) throw new ApiError(400, "Wajah ghalat hai");

  return withTransaction(async (tx) => {
    // product ko lock karo taake do log ek saath akhri piece na nikalen
    await txQuery(tx, "SELECT Id FROM dbo.Products WITH (UPDLOCK, HOLDLOCK) WHERE Id = @id", { id: productId });

    const found = await txQuery(
      tx,
      `SELECT p.Id, p.Name, p.Price, p.DiscountPrice, s.StockQuantity
       FROM dbo.Products p JOIN dbo.vw_ProductStock s ON s.ProductId = p.Id
       WHERE p.Id = @id`,
      { id: productId }
    );
    const p = found.recordset[0];
    if (!p) throw new ApiError(404, "Product nahi mila");

    if (p.StockQuantity < quantity) {
      throw new ApiError(
        409,
        p.StockQuantity <= 0
          ? `"${p.Name}" ka stock khatam hai`
          : `"${p.Name}" ke sirf ${p.StockQuantity} pieces maujood hain`
      );
    }

    // sale ki raqam sirf Shop Sale par khud product ki price se aati hai, baqi wajah par 0
    const defaultPrice = reason === "Shop Sale" ? effectivePrice(p) : 0;
    const salePrice = b.salePrice === undefined || b.salePrice === "" ? defaultPrice : Number(b.salePrice);
    if (!Number.isFinite(salePrice) || salePrice < 0) throw new ApiError(400, "Sale price 0 ya us se zyada ho");

    await txQuery(
      tx,
      `INSERT INTO dbo.StockOut (ProductId, Quantity, SalePrice, Reason, CustomerName, Note, CreatedBy)
       VALUES (@productId, @quantity, @salePrice, @reason, @customerName, @note, @createdBy)`,
      { productId, quantity, salePrice, reason, customerName, note, createdBy: userId }
    );

    return { productName: p.Name, quantity, remaining: p.StockQuantity - quantity };
  });
};

/* ------------------------------------------------------------------ */
/* History lists                                                       */
/* ------------------------------------------------------------------ */
export const listStockIn = async (f = {}) => {
  const where = [];
  const params = {};
  if (f.productId) {
    where.push("si.ProductId = @productId");
    params.productId = Number(f.productId);
  }
  if (f.supplierId) {
    where.push("si.SupplierId = @supplierId");
    params.supplierId = Number(f.supplierId);
  }
  dateFilter(f, "si.CreatedAt", where, params);
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const { page, limit, offset } = pageOf(f);
  params.offset = offset;
  params.limit = limit;

  const rows = await query(
    `SELECT si.Id, si.ProductId, p.Name AS ProductName, si.Quantity, si.CostPrice, si.Note, si.CreatedAt,
            s.Name AS SupplierName, u.Name AS CreatedByName
     FROM dbo.StockIn si
     JOIN dbo.Products p ON p.Id = si.ProductId
     LEFT JOIN dbo.Suppliers s ON s.Id = si.SupplierId
     LEFT JOIN dbo.Users u ON u.Id = si.CreatedBy
     ${whereSql}
     ORDER BY si.Id DESC
     OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`,
    params
  );
  const count = await query(`SELECT COUNT(*) AS total FROM dbo.StockIn si ${whereSql}`, params);
  const total = count.recordset[0].total;
  return { items: rows.recordset, total, page, limit, totalPages: Math.max(Math.ceil(total / limit), 1) };
};

export const listStockOut = async (f = {}) => {
  const where = [];
  const params = {};
  if (f.productId) {
    where.push("so.ProductId = @productId");
    params.productId = Number(f.productId);
  }
  if (f.reason && STOCK_OUT_REASONS.includes(f.reason)) {
    where.push("so.Reason = @reason");
    params.reason = f.reason;
  }
  dateFilter(f, "so.CreatedAt", where, params);
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const { page, limit, offset } = pageOf(f);
  params.offset = offset;
  params.limit = limit;

  const rows = await query(
    `SELECT so.Id, so.ProductId, p.Name AS ProductName, so.Quantity, so.SalePrice, so.Reason, so.OrderId,
            so.CustomerName, so.Note, so.CreatedAt, u.Name AS CreatedByName
     FROM dbo.StockOut so
     JOIN dbo.Products p ON p.Id = so.ProductId
     LEFT JOIN dbo.Users u ON u.Id = so.CreatedBy
     ${whereSql}
     ORDER BY so.Id DESC
     OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`,
    params
  );
  const count = await query(`SELECT COUNT(*) AS total FROM dbo.StockOut so ${whereSql}`, params);
  const total = count.recordset[0].total;
  return { items: rows.recordset, total, page, limit, totalPages: Math.max(Math.ceil(total / limit), 1) };
};

/* ------------------------------------------------------------------ */
/* Reports                                                             */
/* ------------------------------------------------------------------ */
export const getReport = async (f = {}) => {
  const today = new Date();
  const monthAgo = new Date();
  monthAgo.setDate(today.getDate() - 29);

  const from = f.from && DATE_RE.test(f.from) ? f.from : localDate(monthAgo);
  const to = f.to && DATE_RE.test(f.to) ? f.to : localDate(today);
  const params = { from, to };
  const range = (col) => `CAST(${col} AS DATE) >= @from AND CAST(${col} AS DATE) <= @to`;

  const result = await query(
    `SELECT p.Id AS ProductId, p.Name, c.Name AS CategoryName,
            ISNULL(i.QtyIn, 0) AS QtyIn, ISNULL(i.CostIn, 0) AS CostIn,
            ISNULL(o.QtyOut, 0) AS QtyOut, ISNULL(o.Revenue, 0) AS Revenue,
            ISNULL(a.AvgCost, 0) AS AvgCost,
            s.StockQuantity AS Remaining
     FROM dbo.Products p
     JOIN dbo.Categories c ON c.Id = p.CategoryId
     JOIN dbo.vw_ProductStock s ON s.ProductId = p.Id
     LEFT JOIN (
        SELECT ProductId, SUM(Quantity) AS QtyIn, SUM(Quantity * CostPrice) AS CostIn
        FROM dbo.StockIn WHERE ${range("CreatedAt")} GROUP BY ProductId
     ) i ON i.ProductId = p.Id
     LEFT JOIN (
        SELECT ProductId, SUM(Quantity) AS QtyOut, SUM(Quantity * SalePrice) AS Revenue
        FROM dbo.StockOut WHERE ${range("CreatedAt")} GROUP BY ProductId
     ) o ON o.ProductId = p.Id
     LEFT JOIN (
        SELECT ProductId, SUM(Quantity * CostPrice) / NULLIF(SUM(Quantity), 0) AS AvgCost
        FROM dbo.StockIn GROUP BY ProductId
     ) a ON a.ProductId = p.Id
     WHERE i.ProductId IS NOT NULL OR o.ProductId IS NOT NULL
     ORDER BY ISNULL(o.Revenue, 0) DESC, p.Name`,
    params
  );

  const products = result.recordset.map((r) => ({
    ...r,
    // andaza: sale - (bika hua maal x average kharid rate)
    Profit: round2(Number(r.Revenue) - Number(r.QtyOut) * Number(r.AvgCost)),
  }));

  const byReason = await query(
    `SELECT Reason, SUM(Quantity) AS Qty, SUM(Quantity * SalePrice) AS Revenue
     FROM dbo.StockOut WHERE ${range("CreatedAt")}
     GROUP BY Reason ORDER BY Qty DESC`,
    params
  );

  const sum = (key) => products.reduce((total, r) => total + Number(r[key] || 0), 0);
  return {
    from,
    to,
    totals: {
      qtyIn: sum("QtyIn"),
      costIn: round2(sum("CostIn")),
      qtyOut: sum("QtyOut"),
      revenue: round2(sum("Revenue")),
      profit: round2(sum("Profit")),
    },
    products,
    byReason: byReason.recordset,
  };
};

/* ------------------------------------------------------------------ */
/* Management dashboard                                                */
/* ------------------------------------------------------------------ */
export const getManagementSummary = async () => {
  const { items, totals } = await listInventory();

  const today = await query(
    `SELECT
       (SELECT ISNULL(SUM(Quantity), 0) FROM dbo.StockIn  WHERE CAST(CreatedAt AS DATE) = CAST(SYSDATETIME() AS DATE)) AS todayIn,
       (SELECT ISNULL(SUM(Quantity), 0) FROM dbo.StockOut WHERE CAST(CreatedAt AS DATE) = CAST(SYSDATETIME() AS DATE)) AS todayOut`
  );

  const recent = await query(
    `SELECT TOP 8 * FROM (
        SELECT 'in' AS Type, si.Id, p.Name AS ProductName, si.Quantity, CAST(NULL AS NVARCHAR(30)) AS Reason, si.CreatedAt
        FROM dbo.StockIn si JOIN dbo.Products p ON p.Id = si.ProductId
        UNION ALL
        SELECT 'out', so.Id, p.Name, so.Quantity, so.Reason, so.CreatedAt
        FROM dbo.StockOut so JOIN dbo.Products p ON p.Id = so.ProductId
     ) m
     ORDER BY CreatedAt DESC`
  );

  const lowItems = items
    .filter((i) => i.StockStatus !== "In Stock")
    .sort((a, b) => a.Remaining - b.Remaining)
    .slice(0, 8)
    .map((i) => ({ Id: i.Id, Name: i.Name, Remaining: i.Remaining, LowStockLimit: i.LowStockLimit, StockStatus: i.StockStatus }));

  return { ...totals, ...today.recordset[0], lowItems, recentMoves: recent.recordset };
};