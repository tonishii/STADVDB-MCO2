"use server";

import { db0, db1, db2 } from "../db";
import { getIsolationLevel } from "../lib/server_methods";

const NODES = {
  "NODE0": { pool: db0, tableName: "node0_titles", name: "Node 0 (Central)" },
  "NODE1": { pool: db1, tableName: "node1_titles", name: "Node 1 (1900 - 1915 Partition)" },
  "NODE2": { pool: db2, tableName: "node2_titles", name: "Node 2 (1916 - 1925 Partition)" }
};

async function executeRead(
  nodeKey: keyof typeof NODES, 
  tconst: string, 
  delaySeconds: number,
  isolation: string
) {
  const { pool, tableName, name } = NODES[nodeKey];
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

    if (rows.length > 0) {
      return { found: true, data: rows[0], sourceNode: name };
    }
    return { found: false, error: null };

  } catch (err: any) {
    if (conn) await conn.query("ROLLBACK");
    console.error(`Error querying ${name}:`, err.message);
    return { found: false, error: err.message };
  } finally {
    if (conn) conn.release();
  }
}

export async function readTitleWithDelay(tconst: string, delaySeconds: number) {
  const isolation = await getIsolationLevel();
  const currentNodeEnv = process.env.NEXT_PUBLIC_CURRENT_NODE || "";
  
  let localKey: keyof typeof NODES = "NODE0";
  if (currentNodeEnv.includes("Node 1")) localKey = "NODE1";
  if (currentNodeEnv.includes("Node 2")) localKey = "NODE2";

  const localResult = await executeRead(localKey, tconst, delaySeconds, isolation);
  
  if (localResult.found) {
    return { success: true, data: localResult.data, node: `(Local Hit) ${localResult.sourceNode}` };
  }
  
  if (localKey !== "NODE0") {
    const centralResult = await executeRead("NODE0", tconst, delaySeconds, isolation);
    if (centralResult.found) {
      return { success: true, data: centralResult.data, node: `(Routed to) ${centralResult.sourceNode}` };
    }
  }

  let peerKey: keyof typeof NODES | null = null;
  if (localKey === "NODE1") peerKey = "NODE2";
  if (localKey === "NODE2") peerKey = "NODE1";

  if (peerKey) {
    const peerResult = await executeRead(peerKey, tconst, delaySeconds, isolation);
    if (peerResult.found) {
      return { success: true, data: peerResult.data, node: `(Routed to) ${peerResult.sourceNode}` };
    }
  }

  return { success: false, error: "Title not found in any available node." };
}