import { Pool } from "pg";
import "dotenv/config";

// Prefer a single DATABASE_URL; otherwise fall back to individual pieces
const connectionString = process.env.DATABASE_URL;

const pool = connectionString
  ? new Pool({ connectionString, ssl: connectionString.includes("railway") ? { rejectUnauthorized: false } : undefined })
  : new Pool({
      host: process.env.DB_HOST ?? "localhost",
      port: Number(process.env.DB_PORT ?? 5432),
      user: process.env.DB_USER ?? "flood_user",
      password: process.env.DB_PASSWORD ?? "flood_pass",
      database: process.env.DB_NAME ?? "flood_db",
    });

export default pool;
