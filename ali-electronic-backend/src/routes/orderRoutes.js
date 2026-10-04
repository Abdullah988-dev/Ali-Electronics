import { Router } from "express";
import { protect } from "../middleware/auth.js";
import { orderLimiter } from "../middleware/rateLimit.js";
import { placeOrder, myOrders, getMyOrder, cancelMyOrder } from "../controllers/orderController.js";

const router = Router();

// Sab orders ke liye login zaroori hai
router.use(protect);

router.post("/", orderLimiter, placeOrder);
router.get("/mine", myOrders); // "/:id" se pehle aana zaroori hai
router.get("/:id", getMyOrder);
router.put("/:id/cancel", cancelMyOrder);

export default router;