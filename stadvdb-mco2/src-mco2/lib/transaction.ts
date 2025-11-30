"use server";

import { db0, db1, db2 } from "../db";
import { getIsolationLevel } from "../lib/server_methods";

function getLocalPool() {
  const current = process.env.NEXT_PUBLIC_CURRENT_NODE || "";
  if (current.includes("Node 1")) return db1;
  if (current.includes("Node 2")) return db2;
  return db0;
}

function getTableName() {
  const current = process.env.NEXT_PUBLIC_CURRENT_NODE || "";
  if (current.includes("Node 1")) return "node1_titles";
  if (current.includes("Node 2")) return "node2_titles";
  return "node0_titles";
}

export async function readTitleWithDelay(tconst: string, delaySeconds: number) {
  const pool = getLocalPool();
  const tableName = getTableName();
  const isolation = await getIsolationLevel();

  let conn;
  try {
    conn = await pool.getConnection();
    await conn.query(`SET SESSION TRANSACTION ISOLATION LEVEL ${isolation.replace('-', ' ')}`);
    await conn.query("START TRANSACTION");

    const [rows] = await conn.query(
      `SELECT *, SLEEP(?) as delay FROM ${tableName} WHERE tconst = ?`, 
      [delaySeconds, tconst]
    ) as [any[], any];

    await conn.query("COMMIT");

    return { 
      success: true, 
      data: rows[0], 
      node: process.env.NEXT_PUBLIC_CURRENT_NODE 
    };
  } catch (err: any) {
    if (conn) await conn.query("ROLLBACK");
    return { success: false, error: err.message };
  } finally {
    if (conn) conn.release();
  }
}