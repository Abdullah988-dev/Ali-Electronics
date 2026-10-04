import app from "./app.js";
import { env } from "./config/env.js";
import { getPool } from "./config/db.js";

// Koi ghair mutawaqqe error aaye to saaf likha jaye
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
  process.exit(1);
});

const start = async () => {
  try {
    await getPool();
    console.log(`✅ SQL Server connected  (${env.db.server}${env.db.instance ? "\\" + env.db.instance : ""} / ${env.db.name})`);
  } catch (err) {
    console.error("❌ SQL Server connection failed:", err.message);
    console.error("   .env me DB_AUTH, DB_SERVER, DB_USER, DB_PASSWORD check karein aur 'npm run db:setup' chalayein.");
  }

  const server = app.listen(env.port, () => {
    console.log(`🚀 Ali Electronic API running on http://localhost:${env.port}  (${env.nodeEnv})`);
  });

  // Ctrl + C ya server band hone par saaf tareeqe se band ho
  const shutdown = (signal) => {
    console.log(`\n${signal}: server band ho raha hai...`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
};

start();