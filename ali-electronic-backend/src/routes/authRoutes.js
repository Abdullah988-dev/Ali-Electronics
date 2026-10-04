import { Router } from "express";
import { register, login, me } from "../controllers/authController.js";
import { protect } from "../middleware/auth.js";
import { loginLimiter, registerLimiter } from "../middleware/rateLimit.js";

const router = Router();

router.post("/register", registerLimiter, register);
router.post("/login", loginLimiter, login);
router.get("/me", protect, me);

export default router;