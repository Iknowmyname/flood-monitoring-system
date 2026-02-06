import { Pool } from "pg";
import fs from "node:fs";
import "dotenv/config";

// Prefer a single DATABASE_URL; otherwise fall back to individual pieces
const connectionString = process.env.DATABASE_URL;

const useSSL =
  process.env.DB_SSL === "true" ||
  (connectionString ? /rds\.amazonaws\.com/i.test(connectionString) : false) ||
  (connectionString ? /railway/i.test(connectionString) : false);

const ssl =
  useSSL
    ? {
        rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false",
        ca: process.env.DB_SSL_CA ? fs.readFileSync(process.env.DB_SSL_CA, "utf8") : undefined,
      }
    : undefined;

const pool = connectionString
  ? new Pool({ connectionString, ssl })
  : new Pool({
      host: process.env.DB_HOST ?? "localhost",
      port: Number(process.env.DB_PORT ?? 5432),
      user: process.env.DB_USER ?? "flood_user",
      password: process.env.DB_PASSWORD ?? "flood_pass",
      database: process.env.DB_NAME ?? "flood_db",
    });

export default pool;
