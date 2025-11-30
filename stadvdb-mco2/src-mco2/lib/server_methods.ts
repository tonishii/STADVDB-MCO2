import { db0 } from "../db";
import { Pool } from "mysql2/promise";

export async function getNodeStatus(pool: Pool): Promise<boolean> {
  let conn;
  try {
    conn = await pool.getConnection();
    await conn.query("SELECT 1");
    return true;
  } catch (err) {
    console.error("Failed to get node status", err);
    return false;
  } finally {
    if (conn) conn.release();
  }
}

export async function getIsolationLevel(): Promise<string> {
  let conn;
  try {
    conn = await db0.getConnection();
    const [rows] = await conn.query(
      "SELECT @@session.transaction_isolation AS isolation"
    ) as [{ isolation: string }[], unknown];
    return rows[0].isolation;
  } catch (err) {
    console.error("Failed to get isolation level", err);
    return "UNKNOWN";
  } finally {
    if (conn) conn.release();
  }
}

export async function getRows(pool: Pool, query: string) {
  let conn;
  try {
    conn = await pool.getConnection();
    const [rows] = await conn.query(query);
    return rows;
  } catch (err) {
    console.error("Failed to get rows", err);
    return [];
  } finally {
    if (conn) conn.release();
  }
}