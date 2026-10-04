import { Router } from "express";
import { protect, authorize } from "../middleware/auth.js";
import { uploadImage, uploadImages } from "../middleware/upload.js";
import {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../controllers/adminCategoryController.js";
import { listBrands, createBrand, updateBrand, deleteBrand } from "../controllers/adminBrandController.js";
import {
  listAdminProducts,
  getAdminProduct,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../controllers/adminProductController.js";
import {
  listAdminOrders,
  getAdminOrder,
  setAdminOrderStatus,
  adminSummary,
} from "../controllers/adminOrderController.js";
import { listUsers, createUser, updateUser } from "../controllers/adminUserController.js";

const router = Router();

// Is poore admin section me sirf logged-in admin aa sakta hai
router.use(protect, authorize("admin"));

// Dashboard
router.get("/summary", adminSummary);

// Categories
router.get("/categories", listCategories);
router.post("/categories", uploadImage("categories"), createCategory);
router.put("/categories/:id", uploadImage("categories"), updateCategory);
router.delete("/categories/:id", deleteCategory);

// Brands
router.get("/brands", listBrands);
router.post("/brands", uploadImage("brands"), createBrand);
router.put("/brands/:id", uploadImage("brands"), updateBrand);
router.delete("/brands/:id", deleteBrand);

// Products
router.get("/products", listAdminProducts);
router.get("/products/:id", getAdminProduct);
router.post("/products", uploadImages("products", 6), createProduct);
router.put("/products/:id", uploadImages("products", 6), updateProduct);
router.delete("/products/:id", deleteProduct);

// Orders
router.get("/orders", listAdminOrders);
router.get("/orders/:id", getAdminOrder);
router.put("/orders/:id/status", setAdminOrderStatus);

// Users (customers, staff, admin)
router.get("/users", listUsers);
router.post("/users", createUser);
router.put("/users/:id", updateUser);

export default router;