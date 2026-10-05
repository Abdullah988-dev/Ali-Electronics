// Usage:  npm run db:setup
// 1) tables + views banata hai (Database pehle se Azure par majood hai)
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { env } from "../src/config/env.js";
import { sql, buildConfig } from "../src/config/db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const splitBatches = (text) => text.split(/^\s*GO\s*$/gim).map((s) => s.trim()).filter(Boolean);

const run = async () => {
  console.log(`\n▶ SQL Server: ${env.db.server}${env.db.instance ? "\\" + env.db.instance : ""}  |  Database: ${env.db.name}\n`);

  // Master DB connection aur naya Database banane wala code hata diya gaya hai
  console.log(`✔ Using existing database: ${env.db.name}`);

  const pool = await new sql.ConnectionPool(buildConfig()).connect();
  const dir = path.join(__dirname, "scripts");
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".sql") && !f.startsWith("00_")).sort();

  for (const file of files) {
    for (const batch of splitBatches(fs.readFileSync(path.join(dir, file), "utf8"))) {
      await pool.request().batch(batch);
    }
    console.log(`✔ ${file}`);
  }
  await pool.close();
  console.log("\n✅ Database setup complete.\n");
};

run().catch((err) => {
  console.error("\n❌ Setup failed:", err.message);
  console.error("   Check .env (DB_AUTH, DB_SERVER, DB_ODBC_DRIVER) aur SQL Server chal raha ho.\n");
  process.exit(1);
});