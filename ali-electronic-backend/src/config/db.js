import sqlTedious from "mssql";
import { env } from "./env.js";

const useWindowsAuth = env.db.auth === "windows";

// Windows Authentication / LocalDB ke liye msnodesqlv8 driver chahiye, SQL login ke liye normal driver.
let sql = sqlTedious;
if (useWindowsAuth) {
  try {
    const mod = await import("mssql/msnodesqlv8.js");
    sql = mod.default;
  } catch (err) {
    console.error("❌ msnodesqlv8 driver load nahi hua. Backend folder me 'npm install' dobara chalayein.");
    throw err;
  }
}

export const buildConfig = (database = env.db.name) => {
  const serverName = env.db.instance ? `${env.db.server}\\${env.db.instance}` : env.db.server;
  const common = {
    pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
    connectionTimeout: 15000,
    requestTimeout: 30000,
  };

  if (useWindowsAuth) {
    return {
      ...common,
      driver: "msnodesqlv8",
      server: serverName,
      database,
      connectionString:
        `Driver={${env.db.odbcDriver}};Server=${serverName};Database=${database};` +
        `Trusted_Connection=Yes;Encrypt=No;TrustServerCertificate=Yes;`,
      options: { trustedConnection: true },
    };
  }

  const config = {
    ...common,
    server: env.db.server,
    database,
    user: env.db.user,
    password: env.db.password,
    options: {
      encrypt: env.db.encrypt,
      trustServerCertificate: env.db.trustCert,
      enableArithAbort: true,
    },
  };
  if (env.db.instance) config.options.instanceName = env.db.instance;
  else config.port = env.db.port;
  return config;
};

let poolPromise = null;

export const getPool = () => {
  if (!poolPromise) {
    poolPromise = new sql.ConnectionPool(buildConfig())
      .connect()
      .catch((err) => {
        poolPromise = null; // allow retry on next request
        throw err;
      });
  }
  return poolPromise;
};

const bindParams = (request, params) => {
  for (const [key, value] of Object.entries(params)) request.input(key, value);
  return request;
};

/** Run a single query with named params: query("SELECT * FROM X WHERE Id=@id", { id: 1 }) */
export const query = async (text, params = {}) => {
  const pool = await getPool();
  return bindParams(pool.request(), params).query(text);
};

/** Run several statements atomically. fn receives a transaction; use txQuery(tx, ...) inside. */
export const withTransaction = async (fn) => {
  const pool = await getPool();
  const tx = new sql.Transaction(pool);
  await tx.begin();
  try {
    const result = await fn(tx);
    await tx.commit();
    return result;
  } catch (err) {
    try {
      await tx.rollback();
    } catch {
      /* already rolled back */
    }
    throw err;
  }
};

export const txQuery = (tx, text, params = {}) =>
  bindParams(new sql.Request(tx), params).query(text);

export { sql };
