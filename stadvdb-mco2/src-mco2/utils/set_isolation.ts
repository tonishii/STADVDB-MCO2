import type { Pool } from "mysql2/promise";

export async function setIsolationLevel(pool: Pool, level: string) {
  const conn = await pool.getConnection();
  try {
    await conn.query(`SET SESSION TRANSACTION ISOLATION LEVEL ${level}`);
  } finally {
    conn.release();
  }
}