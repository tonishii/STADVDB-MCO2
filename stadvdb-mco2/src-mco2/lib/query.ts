import { PoolConnection } from "mysql2/promise";
import { Titles } from "./schema";
import { addLog } from "../utils/add_log";
import { db0, db1, db2 } from "../db";

export const NODES = {
  "NODE0": { pool: db0, tableName: "node0_titles", name: "Node 0 (Central)" },
  "NODE1": { pool: db1, tableName: "node1_titles", name: "Node 1 (1900 - 1915 Partition)" },
  "NODE2": { pool: db2, tableName: "node2_titles", name: "Node 2 (1916 - 1925 Partition)" }
};

export async function executeRead(
  nodeKey: keyof typeof NODES,
  tconst: string,
  delaySeconds: number,
) {
  const { pool, tableName, name } = NODES[nodeKey];
  let conn;

  try {
    conn = await pool.getConnection();

    await conn.query("START TRANSACTION");

    const [rows] = await conn.query(
      `SELECT *, SLEEP(?) as delay FROM ${tableName} WHERE tconst = ?`,
      [delaySeconds, tconst]
    ) as [Titles[], unknown];

    await conn.query("COMMIT");

    if (rows.length > 0) {
      return { found: true, data: rows[0], sourceNode: name };
    }
    return { found: false, error: null };

  } catch (err) {
    if (conn) await conn.query("ROLLBACK");
    console.error(`Error querying ${name}:`, err);
    return { found: false, error: err };
  } finally {
    if (conn) conn.release();
  }
}

export async function execWrite(
  node: 0 | 1 | 2,
  c0: PoolConnection,
  c1: PoolConnection,
  c2: PoolConnection,
  title: Titles,
  query: string
): Promise<string[]> {
  const logs: string[] = [];

  try {
    if (node === 1) {
      addLog(logs, `Executing write on Node 1...`);
      c1.query(query);

      // Replicate to Node 0
      addLog(logs, `Replicating write to Node 0...`);
      c0.query(query.replace("node1_titles", "node0_titles"));
    } else if (node === 2) {
      addLog(logs, `Executing write on Node 2...`);
      c2.query(query);

      // Replicate to Node 0
      addLog(logs, `Replicating write to Node 0...`);
      c0.query(query.replace("node2_titles", "node0_titles"));
    }

    if (node === 0) {
      addLog(logs, `Executing write on Node 0...`);
      c0.query(query);

      if (title.startYear > 1915) {
        addLog(logs, `Replicating write to Node 2...`);
        c2.query(query.replace("node0_titles", "node2_titles"));
      } else {
        addLog(logs, `Replicating write to Node 1...`);
        c1.query(query.replace("node0_titles", "node1_titles"));
      }
    }

  } catch (err) {
    console.error("Failed to execute write", err);
    addLog(logs, `Failed to execute write on Node ${node}`);
  }

  return logs;
}