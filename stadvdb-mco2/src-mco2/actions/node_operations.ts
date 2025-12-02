"use server";

import { db0, db1, db2 } from "../db";
import { getIsolationLevel } from "../lib/server_methods";
import { logTransaction } from "../lib/transaction_logger";
import { completeTransaction } from "../lib/transaction_logger";

const NODES = {
  NODE0: {
    pool: db0,
    tableName: "node0_titles",
    id: "0",
    name: "Node 0 (Central)",
  },
  NODE1: {
    pool: db1,
    tableName: "node1_titles",
    id: "1",
    name: "Node 1 (1900-1915)",
  },
  NODE2: {
    pool: db2,
    tableName: "node2_titles",
    id: "2",
    name: "Node 2 (1916-1925)",
  },
};

function getTargetNode(year: number) {
  if (year >= 1900 && year <= 1915) return NODES["NODE1"];
  if (year >= 1916 && year <= 1925) return NODES["NODE2"];
  return null;
}

// read
export async function readTitleWithDelay(tconst: string, delaySeconds: number) {
  const isolation = await getIsolationLevel();
  const currentNodeEnv = process.env.NEXT_PUBLIC_CURRENT_NODE || "";

  let searchOrder = [NODES.NODE0, NODES.NODE1, NODES.NODE2];

  if (currentNodeEnv.includes("Node 1"))
    searchOrder = [NODES.NODE1, NODES.NODE0, NODES.NODE2];
  else if (currentNodeEnv.includes("Node 2"))
    searchOrder = [NODES.NODE2, NODES.NODE0, NODES.NODE1];

  for (const nodeConfig of searchOrder) {
    const { pool, tableName, name } = nodeConfig;
    let conn;

    try {
      conn = await pool.getConnection();

      await conn.query(
        `SET SESSION TRANSACTION ISOLATION LEVEL ${isolation.replace("-", " ")}`
      );
      await conn.query("START TRANSACTION");

      const [rows] = (await conn.query(
        `SELECT *, SLEEP(?) as delay FROM ${tableName} WHERE tconst = ?`,
        [delaySeconds, tconst]
      )) as [any[], any];

      await conn.query("COMMIT");

      if (rows.length > 0) {
        const locationTag = nodeConfig.name.includes(
          currentNodeEnv.split(" ")[1]
        )
          ? "(Local Hit)"
          : "(Routed)";

        return {
          success: true,
          data: rows[0],
          node: `${locationTag} ${name}`,
        };
      }
    } catch (e: any) {
      if (conn) await conn.query("ROLLBACK");
      console.error(`Read failed on ${name}:`, e.message);
    } finally {
      if (conn) conn.release();
    }
  }

  return { success: false, error: "Title not found in any available node." };
}

// write/update
export async function updateAttributeWithDelay(
  tconst: string,
  column: "primaryTitle" | "runtimeMinutes" | "genres",
  newValue: string | number,
  delaySeconds: number
) {
  const logs: string[] = [];
  const txId = crypto.randomUUID();

  const currentNode = process.env.NEXT_PUBLIC_CURRENT_NODE?.includes("Node 1")
    ? "1"
    : process.env.NEXT_PUBLIC_CURRENT_NODE?.includes("Node 2")
    ? "2"
    : "0";

  const [rows] = (await db0.query(
    "SELECT * FROM node0_titles WHERE tconst = ?",
    [tconst]
  )) as [any[], any];

  if (rows.length === 0)
    return { success: false, logs: ["Item not found in Central Directory"] };

  const item = rows[0];
  const target = getTargetNode(item.startYear);

  if (!target)
    return {
      success: false,
      logs: [`Item year ${item.startYear} is outside our partition range`],
    };

  const cCentral = await db0.getConnection();
  const cPartition = await target.pool.getConnection();

  try {
    logs.push(`Starting Distributed Update on ${tconst}...`);

    await logTransaction({
      id: crypto.randomUUID(),
      transactionId: txId,
      timestamp: new Date().toISOString(),
      node: currentNode as any,
      operation: "START",
    });

    await cCentral.query("START TRANSACTION");
    await cPartition.query("START TRANSACTION");

    const validColumns = ["primaryTitle", "runtimeMinutes", "genres"];
    if (!validColumns.includes(column)) throw new Error("Invalid column");

    const updateSQL = (table: string) =>
      `UPDATE ${table} SET ${column} = ? WHERE tconst = ? AND SLEEP(?) = 0`;

    logs.push(`Writing to Central Node...`);
    await cCentral.query(updateSQL("node0_titles"), [
      newValue,
      tconst,
      delaySeconds,
    ]);

    logs.push(`Writing to Partition Node (${target.name})...`);
    await cPartition.query(updateSQL(target.tableName), [newValue, tconst, 0]);

    await logTransaction({
      id: crypto.randomUUID(),
      transactionId: txId,
      timestamp: new Date().toISOString(),
      node: currentNode as any,
      operation: "UPDATE",
      values: { tconst, [column]: newValue },
    });

    await cCentral.query("COMMIT");
    await cPartition.query("COMMIT");

    await logTransaction({
      id: crypto.randomUUID(),
      transactionId: txId,
      timestamp: new Date().toISOString(),
      node: currentNode as any,
      operation: "COMMIT",
    });
    await completeTransaction(txId, currentNode);

    logs.push(`SUCCESS: Updated ${column} to '${newValue}'`);
    return { success: true, logs };
  } catch (err: any) {
    await cCentral.query("ROLLBACK");
    await cPartition.query("ROLLBACK");

    await logTransaction({
      id: crypto.randomUUID(),
      transactionId: txId,
      timestamp: new Date().toISOString(),
      node: currentNode as any,
      operation: "ABORT",
    });
    await completeTransaction(txId, currentNode);

    return { success: false, logs: [...logs, `ERROR: ${err.message}`] };
  } finally {
    cCentral.release();
    cPartition.release();
  }
}
