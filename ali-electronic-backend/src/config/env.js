import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const bool = (value, fallback = false) =>
  value === undefined || value === "" ? fallback : String(value).toLowerCase() === "true";

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT) || 5001,
  clientUrl: process.env.CLIENT_URL || "http://localhost:5172",
  jwtSecret: process.env.JWT_SECRET || "dev_secret_change_me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  lowStockLimit: Number(process.env.LOW_STOCK_LIMIT) || 5,
    cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || "",
    apiKey: process.env.CLOUDINARY_API_KEY || "",
    apiSecret: process.env.CLOUDINARY_API_SECRET || "",
  },
  admin: {
    name: process.env.ADMIN_NAME || "Ali Admin",
    email: (process.env.ADMIN_EMAIL || "admin@alielectronic.com").toLowerCase(),
    password: process.env.ADMIN_PASSWORD || "Admin@12345",
  },
  db: {
    // "windows" = Windows Authentication (LocalDB / local SQL Server)   |   "sql" = SQL login (user + password)
    auth: (process.env.DB_AUTH || "sql").toLowerCase(),
    server: process.env.DB_SERVER || "localhost",
    instance: process.env.DB_INSTANCE || "",
    port: Number(process.env.DB_PORT) || 1433,
    name: process.env.DB_NAME || "AliElectronicDB",
    user: process.env.DB_USER || "",
    password: process.env.DB_PASSWORD || "",
    encrypt: bool(process.env.DB_ENCRYPT, false),
    trustCert: bool(process.env.DB_TRUST_CERT, true),
    odbcDriver: process.env.DB_ODBC_DRIVER || "ODBC Driver 18 for SQL Server",
  },
};

// ---- Live (production) par kamzor settings ke saath server chalne hi nahi dena ----
if (env.nodeEnv === "production") {
  const WEAK_SECRETS = ["dev_secret_change_me", "ali_electronic_local_secret_change_before_live", "change_me", "secret"];
  const problems = [];

  if (WEAK_SECRETS.includes(env.jwtSecret) || env.jwtSecret.length < 32) {
    problems.push("JWT_SECRET kam az kam 32 characters ka mazboot random secret ho");
  }
  if (env.admin.password === "Admin@12345") problems.push("ADMIN_PASSWORD abhi default hai, badal dein");
  if (!env.clientUrl.startsWith("https://")) problems.push("CLIENT_URL https:// se shuru hona chahiye");

  if (problems.length) {
    console.error("\n❌ Live (production) ke liye ye settings theek karein:");
    problems.forEach((p) => console.error("   - " + p));
    console.error("");
    process.exit(1);
  }
}