import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";
import { env } from "./config/env.js";
import healthRoutes from "./routes/healthRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import managementRoutes from "./routes/managementRoutes.js";
import catalogRoutes from "./routes/catalogRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import { apiLimiter } from "./middleware/rateLimit.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const isProd = env.nodeEnv === "production";

// Live par server proxy (nginx / hosting) ke peeche hota hai, taake rate limit asli IP dekhe
if (isProd) app.set("trust proxy", 1);

// security headers (images doosre port se load ho saken is liye cross-origin allow)
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

// Sirf aap ki apni website is API ko browser se use kar sakti hai
const origins = [env.clientUrl];
if (!isProd) origins.push("http://127.0.0.1:5172");
app.use(cors({ origin: origins, credentials: true }));

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(morgan(isProd ? "combined" : "dev"));

// uploaded images (products, brands, categories, banners)
app.use("/uploads", express.static(path.resolve(__dirname, "../uploads")));

// ---- routes ----
app.use("/api", apiLimiter);
app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/management", managementRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api", catalogRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;