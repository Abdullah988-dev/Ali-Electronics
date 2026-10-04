import { asyncHandler } from "../utils/asyncHandler.js";
import { getId } from "../utils/params.js";
import { createOrder, listMyOrders, getOrderForUser, cancelOrder } from "../services/orderService.js";

// POST /api/orders
export const placeOrder = asyncHandler(async (req, res) => {
  const order = await createOrder(req.user, req.body);
  res.status(201).json(order);
});

// GET /api/orders/mine
export const myOrders = asyncHandler(async (req, res) => {
  res.json(await listMyOrders(req.user.Id));
});

// GET /api/orders/:id
export const getMyOrder = asyncHandler(async (req, res) => {
  res.json(await getOrderForUser(getId(req), req.user));
});

// PUT /api/orders/:id/cancel
export const cancelMyOrder = asyncHandler(async (req, res) => {
  await cancelOrder(getId(req), req.user);
  res.json({ message: "Order cancel ho gaya" });
});