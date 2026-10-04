import { Router } from "express";
import { getHome, getCategories, getBrands, getProducts, getProduct } from "../controllers/catalogController.js";

const router = Router();

// Ye sab public hain (login ki zarurat nahi)
router.get("/home", getHome);
router.get("/categories", getCategories);
router.get("/brands", getBrands);
router.get("/products", getProducts);
router.get("/products/:id", getProduct);

export default router;