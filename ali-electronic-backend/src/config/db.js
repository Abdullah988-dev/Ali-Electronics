import sql from "mssql";
import { env } from "./env.js";

export const buildConfig = (database = env.db.name) => {
  const config = {
    server: env.db.server,
    database,
    user: env.db.user,
    password: env.db.password,
    options: {
      encrypt: env.db.encrypt,
      trustServerCertificate: env.db.trustCert,
      enableArithAbort: true,
    },
    pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
    connectionTimeout: 15000,
    requestTimeout: 30000,
  };

  if (env.db.instance) config.options.instanceName = env.db.instance;
  else config.port = Number(env.db.port) || 1433;

  return config;
};

let poolPromise = null;

export const getPool = () => {
  if (!poolPromise) {
    poolPromise = new sql.ConnectionPool(buildConfig())
      .connect()
      .catch((err) => {
        poolPromise = null; 
        throw err;
      });
  }
  return poolPromise;
};

const bindParams = (request, params) => {
  for (const [key, value] of Object.entries(params)) request.input(key, value);
  return request;
};

export const query = async (text, params = {}) => {
  const pool = await getPool();
  return bindParams(pool.request(), params).query(text);
};

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