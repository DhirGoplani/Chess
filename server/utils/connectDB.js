import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import dotenv from "dotenv";

dotenv.config();

neonConfig.webSocketConstructor = ws;

const pool = new Pool({
  connectionString: process.env.NEON_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

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