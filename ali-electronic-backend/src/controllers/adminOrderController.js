import { asyncHandler } from "../utils/asyncHandler.js";
import { getId } from "../utils/params.js";
import { requireFields } from "../validators/validate.js";
import { listOrders, getOrder, updateOrderStatus, getSummary } from "../services/adminOrderService.js";

// GET /api/admin/orders?status=Pending&search=&page=1
export const listAdminOrders = asyncHandler(async (req, res) => {
  res.json(await listOrders(req.query));
});

// GET /api/admin/orders/:id
export const getAdminOrder = asyncHandler(async (req, res) => {
  res.json(await getOrder(getId(req)));
});

// PUT /api/admin/orders/:id/status   { status: "Confirmed" }
export const setAdminOrderStatus = asyncHandler(async (req, res) => {
  requireFields(req.body, ["status"]);
  res.json(await updateOrderStatus(getId(req), String(req.body.status)));
});

// GET /api/admin/summary
export const adminSummary = asyncHandler(async (req, res) => {
  res.json(await getSummary());
});