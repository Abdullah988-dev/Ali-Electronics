import { Router } from "express";
import { protect, authorize } from "../middleware/auth.js";
import {
  meta,
  summary,
  inventory,
  stockInList,
  stockInCreate,
  stockOutList,
  stockOutCreate,
  report,
  supplierList,
  supplierCreate,
  supplierUpdate,
  supplierDelete,
} from "../controllers/managementController.js";

const router = Router();

// Management system: admin aur staff (munshi/cashier) dono
router.use(protect, authorize("admin", "staff"));

router.get("/meta", meta);
router.get("/summary", summary);
router.get("/inventory", inventory);

router.get("/stock-in", stockInList);
router.post("/stock-in", stockInCreate);

router.get("/stock-out", stockOutList);
router.post("/stock-out", stockOutCreate);

router.get("/suppliers", supplierList);
router.post("/suppliers", supplierCreate);
router.put("/suppliers/:id", supplierUpdate);
router.delete("/suppliers/:id", supplierDelete);

router.get("/reports", report);

export default router;