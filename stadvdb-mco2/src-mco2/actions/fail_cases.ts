"use server";
import { revalidatePath } from "next/cache";
import { RowDataPacket } from "mysql2";
import { Titles } from "../lib/schema";

import { db0, db1, db2 } from "../db";
import { execFailWrite, execFailWriteCase3 } from "../lib/fail_query";
import { TransactionLogEntry } from "../lib/schema";
import { logTransaction, readNodeLogs } from "../lib/transaction_manager";
import { redo, undo } from "../lib/recovery_operations";

import { addLog } from "../utils/add_log";
import { logger } from "../utils/add_log_transaction";

export async function failCase1(
  _prevState: { logs: string[] },
  formData: FormData
): Promise<{ logs: string[] }> {
  const transactionId = crypto.randomUUID();
  const tconst = formData.get("tconst") as string;
  const logs: string[] = [];

  const [rows] = (await db0.query(
    "SELECT * FROM node0_titles WHERE tconst = ?",
    [tconst]
  )) as [Titles[], unknown];

  if (!rows || rows.length === 0) {
    addLog(logs, `Data item ${tconst} not found on Node 0`);
    return { logs };
  }

  const sourceNode: 1 | 2 = rows[0].startYear > 1915 ? 2 : 1;
  const tableToWrite = sourceNode === 1 ? "node1_titles" : "node2_titles";

  const updatedString = "Updated Title for Case 1";
  const writeQuery = `UPDATE ${tableToWrite} 
                      SET primaryTitle='${updatedString}' 
                      WHERE tconst='${tconst}' AND SLEEP(5)=0`;

  const c0 = await db0.getConnection();
  const c1 = await db1.getConnection();
  const c2 = await db2.getConnection();

  try {
    addLog(logs, `Starting transaction on source Node ${sourceNode}.`);
    await Promise.all([
      logger(transactionId, "0", "START"),
      logger(transactionId, "1", "START"),
      logger(transactionId, "2", "START"),
    ]);

    await Promise.all([
      c0.query("START TRANSACTION"),
      c1.query("START TRANSACTION"),
      c2.query("START TRANSACTION"),
    ]);

    const writeLogs = await execFailWrite(
      sourceNode,
      c0,
      c1,
      c2,
      rows[0] as Titles,
      writeQuery,
      transactionId,
      "UPDATE",
      updatedString
    );
    logs.push(...writeLogs);

    if (sourceNode === 1) {
      await Promise.all([
        logger(transactionId, "1", "COMMIT"),
        c1.query("COMMIT"),
      ]);
    } else {
      await Promise.all([
        logger(transactionId, "2", "COMMIT"),
        c2.query("COMMIT"),
      ]);
    }

    addLog(logs, `Source Node ${sourceNode} committed locally.`);

    const [centralCheck] = (await c0.query(
      `SELECT primaryTitle FROM node0_titles WHERE tconst = ?`,
      [tconst]
    )) as [RowDataPacket[], unknown];
    const centralTitle = centralCheck?.[0]?.primaryTitle ?? null;

    if (centralTitle !== updatedString) {
      addLog(
        logs,
        `Replication to Node 0 failed — creating PENDING replication log on Node 0.`
      );

      const replicationLog: TransactionLogEntry = {
        id: crypto.randomUUID(),
        transactionId,
        timestamp: new Date().toISOString(),
        node: "0",
        operation: "UPDATE",
        status: "PENDING",
        isReplication: true,
        sourceNode: sourceNode.toString() as "1" | "2",
        targetNode: "0",
        values: { tconst, primaryTitle: updatedString },
        oldValues: { tconst, primaryTitle: rows[0].primaryTitle },
      };

      await logTransaction(replicationLog);

      addLog(
        logs,
        `Logged PENDING replication entry for Node 0 (txn ${transactionId}).`
      );
    } else {
      addLog(logs, `Replication to Node 0 succeeded immediately.`);
      await logger(transactionId, "0", "COMMIT");
      await c0.query("COMMIT");
    }

    addLog(
      logs,
      `Case 1 simulation finished - source committed, replication pending on Node 0.`
    );
  } catch (err) {
    addLog(logs, `Error occurred during failCase1 simulation: ${err}`);
    try {
      await Promise.all([
        c1.query("ROLLBACK"),
        c2.query("ROLLBACK"),
        c0.query("ROLLBACK"),
      ]);
    } catch (rollbackErr) {
      console.error("Rollback error", rollbackErr);
    }
    await Promise.all([
      logger(transactionId, "1", "ABORT"),
      logger(transactionId, "2", "ABORT"),
    ]);
  } finally {
    c0.release();
    c1.release();
    c2.release();
  }

  revalidatePath("/");
  return { logs };
}

export async function failCase2(_prevState: {
  logs: string[];
}): Promise<{ logs: string[] }> {
  const logs: string[] = [];
  addLog(logs, `Starting Node 0 recovery process...`);

  const centralLogs = await readNodeLogs(0);

  const pendingTxns = centralLogs.filter(
    (entry) =>
      entry.status === "PENDING" &&
      entry.isReplication === true &&
      entry.targetNode === "0"
  );

  if (pendingTxns.length === 0) {
    addLog(logs, `No pending replication entries found. Node 0 is up-to-date.`);
    return { logs };
  }

  addLog(
    logs,
    `Found ${pendingTxns.length} pending replication entries. Starting REDO...`
  );

  const c0 = await db0.getConnection();

  try {
    await c0.query("START TRANSACTION");

    for (const entry of pendingTxns) {
      const { values, transactionId } = entry;

      addLog(
        logs,
        `Applying missed write from transaction ${transactionId} to Node 0...`
      );

      await c0.query(
        `UPDATE node0_titles SET primaryTitle = ? WHERE tconst = ?`,
        [values?.primaryTitle, values?.tconst]
      );

      entry.status = "COMPLETED";
      entry.recoveryAction = "REDO";
      await logTransaction(entry);

      addLog(
        logs,
        `Transaction ${transactionId} successfully REDO-applied on Node 0.`
      );
    }

    await c0.query("COMMIT");
    addLog(logs, `Node 0 recovery completed successfully!`);
  } catch (err) {
    await c0.query("ROLLBACK");
    addLog(logs, `Recovery failed, rolled back. Error: ${err}`);
  } finally {
    c0.release();
  }

  revalidatePath("/");
  return { logs };
}

export async function failCase3(
  _prevState: { logs: string[] },
  formData: FormData
): Promise<{ logs: string[] }> {
  const transactionId = crypto.randomUUID();
  const tconst = formData.get("tconst") as string;
  const logs: string[] = [];

  const [rows] = (await db0.query(
    "SELECT * FROM node0_titles WHERE tconst = ?",
    [tconst]
  )) as [Titles[], unknown];

  if (!rows || rows.length === 0) {
    addLog(logs, `Data item ${tconst} not found on Node 0`);
    return { logs };
  }

  const title = rows[0] as Titles;
  const c0 = await db0.getConnection();
  const c1 = await db1.getConnection();
  const c2 = await db2.getConnection();

  try {
    addLog(logs, `Starting transaction on Node 0`);
    await c0.query("START TRANSACTION");

    const writeLogs = await execFailWriteCase3(
      c0,
      c1,
      c2,
      title,
      `UPDATE node0_titles SET primaryTitle='Case3_Update' WHERE tconst='${tconst}'`,
      transactionId,
      "UPDATE",
      "Case3_Update"
    );
    logs.push(...writeLogs);

    await c0.query("COMMIT");
    addLog(logs, `Transaction committed on Node 0`);
  } catch (err) {
    await c0.query("ROLLBACK");
    addLog(logs, `Transaction on Node 0 failed`);
  } finally {
    c0.release();
    c1.release();
    c2.release();
  }

  revalidatePath("/");
  return { logs };
}

export async function failCase4(
  _prevState: { logs: string[] },
  formData: FormData
): Promise<{ logs: string[] }> {
  const logs: string[] = [];
  const node = 1;
  addLog(logs, `Starting recovery for Node ${node}...`);

  const logsSnapshot = await readNodeLogs(node);

  const pendingLogs = logsSnapshot.filter(
    (entry) =>
      entry.status === "PENDING" &&
      entry.targetNode === String(node) &&
      entry.isReplication === true
  );

  if (pendingLogs.length === 0) {
    addLog(logs, `No pending transactions for Node ${node}.`);
    return { logs };
  }

  addLog(logs, `Found ${pendingLogs.length} pending entries. Starting REDO...`);

  const conn =
    node === 1 ? await db1.getConnection() : await db2.getConnection();

  try {
    await conn.query("START TRANSACTION");

    for (const entry of pendingLogs) {
      const { values, transactionId } = entry;

      addLog(
        logs,
        `Applying missed transaction ${transactionId} to Node ${node}...`
      );

      await conn.query(
        `UPDATE node${node}_titles SET primaryTitle = ? WHERE tconst = ?`,
        [values?.primaryTitle, values?.tconst]
      );

      entry.status = "COMPLETED";
      entry.recoveryAction = "REDO";
      await logTransaction(entry);

      addLog(logs, `Transaction ${transactionId} successfully REDO-applied.`);
    }

    await conn.query("COMMIT");
    addLog(logs, `Node ${node} recovery completed!`);
  } catch (err) {
    await conn.query("ROLLBACK");
    addLog(logs, `Recovery failed for Node ${node}: ${err}`);
  } finally {
    conn.release();
  }

  revalidatePath("/");
  return { logs };
}
