import { query } from "../config/db.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { toBool } from "../utils/parse.js";
import { getId } from "../utils/params.js";
import { requireFields } from "../validators/validate.js";
import {
  MANUAL_OUT_REASONS,
  listInventory,
  addStockIn,
  addStockOut,
  listStockIn,
  listStockOut,
  getReport,
  getManagementSummary,
} from "../services/stockService.js";

// GET /api/management/meta
export const meta = (req, res) => {
  res.json({ stockOutReasons: MANUAL_OUT_REASONS });
};

// GET /api/management/summary
export const summary = asyncHandler(async (req, res) => {
  res.json(await getManagementSummary());
});

// GET /api/management/inventory?search=&categoryId=&status=Low Stock
export const inventory = asyncHandler(async (req, res) => {
  res.json(await listInventory(req.query));
});

// GET /api/management/stock-in
export const stockInList = asyncHandler(async (req, res) => {
  res.json(await listStockIn(req.query));
});

// POST /api/management/stock-in   { productId, supplierId, quantity, costPrice, note }
export const stockInCreate = asyncHandler(async (req, res) => {
  const result = await addStockIn(req.body, req.user.Id);
  res.status(201).json(result);
});

// GET /api/management/stock-out
export const stockOutList = asyncHandler(async (req, res) => {
  res.json(await listStockOut(req.query));
});

// POST /api/management/stock-out   { productId, quantity, reason, salePrice, customerName, note }
export const stockOutCreate = asyncHandler(async (req, res) => {
  const result = await addStockOut(req.body, req.user.Id);
  res.status(201).json(result);
});

// GET /api/management/reports?from=2026-10-01&to=2026-10-31
export const report = asyncHandler(async (req, res) => {
  res.json(await getReport(req.query));
});

/* ---------------------------- Suppliers ---------------------------- */

const findSupplier = async (id) => {
  const result = await query("SELECT * FROM dbo.Suppliers WHERE Id = @id", { id });
  return result.recordset[0];
};

// GET /api/management/suppliers
export const supplierList = asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT s.Id, s.Name, s.Phone, s.Address, s.IsActive, s.CreatedAt,
            (SELECT ISNULL(SUM(si.Quantity), 0) FROM dbo.StockIn si WHERE si.SupplierId = s.Id) AS TotalSupplied
     FROM dbo.Suppliers s
     ORDER BY s.Name`
  );
  res.json(result.recordset);
});

// POST /api/management/suppliers
export const supplierCreate = asyncHandler(async (req, res) => {
  requireFields(req.body, ["name"]);
  const result = await query(
    `INSERT INTO dbo.Suppliers (Name, Phone, Address, IsActive)
     OUTPUT INSERTED.*
     VALUES (@name, @phone, @address, @isActive)`,
    {
      name: String(req.body.name).trim(),
      phone: req.body.phone ? String(req.body.phone).trim() : null,
      address: req.body.address ? String(req.body.address).trim() : null,
      isActive: toBool(req.body.isActive, true),
    }
  );
  res.status(201).json(result.recordset[0]);
});

// PUT /api/management/suppliers/:id
export const supplierUpdate = asyncHandler(async (req, res) => {
  const id = getId(req);
  const cur = await findSupplier(id);
  if (!cur) throw new ApiError(404, "Supplier nahi mila");

  const b = req.body;
  const name = b.name !== undefined ? String(b.name).trim() : cur.Name;
  if (!name) throw new ApiError(400, "Supplier ka naam likhein");

  await query(
    `UPDATE dbo.Suppliers SET Name = @name, Phone = @phone, Address = @address, IsActive = @isActive WHERE Id = @id`,
    {
      id,
      name,
      phone: b.phone !== undefined ? String(b.phone).trim() || null : cur.Phone,
      address: b.address !== undefined ? String(b.address).trim() || null : cur.Address,
      isActive: toBool(b.isActive, cur.IsActive),
    }
  );
  res.json(await findSupplier(id));
});

// DELETE /api/management/suppliers/:id
export const supplierDelete = asyncHandler(async (req, res) => {
  const id = getId(req);
  if (!(await findSupplier(id))) throw new ApiError(404, "Supplier nahi mila");

  try {
    await query("DELETE FROM dbo.Suppliers WHERE Id = @id", { id });
  } catch (err) {
    if (err.number === 547) {
      throw new ApiError(409, "Is supplier se maal aane ki entries judi hain, delete nahi ho sakta. Isay Inactive kar dein.");
    }
    throw err;
  }
  res.json({ message: "Supplier delete ho gaya" });
});