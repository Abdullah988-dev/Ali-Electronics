// Usage: npm run seed:admin  -> .env wale ADMIN_EMAIL / ADMIN_PASSWORD se pehla admin banata hai
import bcrypt from "bcryptjs";
import { query } from "../src/config/db.js";
import { env } from "../src/config/env.js";

const run = async () => {
  const { name, email, password } = env.admin;
  const existing = await query("SELECT Id FROM dbo.Users WHERE Email = @email", { email });
  if (existing.recordset.length) {
    console.log(`ℹ Admin already exists: ${email}`);
    return;
  }
  const hash = await bcrypt.hash(password, 10);
  await query("INSERT INTO dbo.Users (Name, Email, PasswordHash, Role) VALUES (@name, @email, @hash, 'admin')", { name, email, hash });
  console.log(`✅ Admin created: ${email}  (password .env me ADMIN_PASSWORD hai)`);
};

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Admin seed failed:", err.message);
    process.exit(1);
  });
