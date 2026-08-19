import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import dotenv from "dotenv";

dotenv.config();

neonConfig.webSocketConstructor = ws;

const pool = new Pool({
  connectionString: process.env.NEON_URL,
  max: 20,
  idleTimeoutMillis: 60000,
  connectionTimeoutMillis: 5000,
});

// Create database performance indexes on startup for instant login/search lookups
(async () => {
  try {
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_lower_email ON users (LOWER(email));
      CREATE INDEX IF NOT EXISTS idx_users_lower_username ON users (LOWER(username));
    `);
  } catch (err) {
    // Non-critical background index creation check
  }
})();

export const sql = async (strings, ...values) => {
  if (typeof strings === "string") {
    const result = await pool.query(strings, values);
    return result.rows;
  }
  let text = strings[0];
  for (let i = 1; i < strings.length; i++) {
    text += `$${i}` + strings[i];
  }
  const result = await pool.query(text, values);
  return result.rows;
};