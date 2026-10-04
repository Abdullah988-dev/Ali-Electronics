import { Router } from "express";
import { query } from "../config/db.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

// http://localhost:5001/api/health
router.get("/", (req, res) => {
  res.json({ status: "ok", shop: "Ali Electronic", time: new Date().toISOString() });
});

// http://localhost:5001/api/health/db  -> SQL Server connection test
router.get(
  "/db",
  asyncHandler(async (req, res) => {
    const result = await query("SELECT DB_NAME() AS databaseName, @@SERVERNAME AS serverName");
    res.json({ status: "connected", ...result.recordset[0] });
  })
);

export default router;
