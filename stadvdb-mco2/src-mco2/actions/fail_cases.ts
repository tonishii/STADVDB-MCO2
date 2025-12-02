"use server";
import { Titles } from "../lib/schema";
import { db0, db1, db2 } from "../db";
import { addLog } from "../utils/add_log";
import { logger } from "../utils/add_log_transaction";
import { completeTransaction } from "../lib/transaction_logger";
import { recoverTransaction } from "../lib/recover_manager";

async function logUpdate(
  transactionId: string,
  node: "0" | "1" | "2",
  title: string,
  tconst: string,
  oldValues: Partial<Titles>,
  isReplication: boolean = false,
  targetNode?: "0" | "1" | "2"
) {
  await logger(
    transactionId,
    node,
    "UPDATE",
    { tconst, primaryTitle: title },
    oldValues,
    isReplication,
    node,
    targetNode
  );
}

export async function failCase1Write(
  _prevState: { logs: string[] },
  formData: FormData
): Promise<{ logs: string[] }> {
  const transactionId = crypto.randomUUID();
  const tconst = formData.get("tconst") as string;
  const title = formData.get("primaryTitle") as string;
  const logs: string[] = [];

  const [rows] = (await db0.query(
    "SELECT * FROM node0_titles WHERE tconst = ?",
    [tconst]
  )) as [Titles[], unknown];

  if (!rows || rows.length === 0) {
    addLog(logs, `Data item ${tconst} not found on Node 0`);
    return { logs };
  }
  const oldValues: Partial<Titles> = rows[0];
  const sourceNode = rows[0].startYear > 1915 ? "2" : "1";

  addLog(
    logs,
    `Starting Update Transaction ${transactionId} on Node ${sourceNode}`
  );
  await logger(transactionId, sourceNode, "START");

  const c0 = await db0.getConnection();
  const c1 = await db1.getConnection();
  const c2 = await db2.getConnection();

  try {
    const query = (table: string) => `
    UPDATE ${table}
    SET primaryTitle = ?
    WHERE tconst = ?
    `;

    if (sourceNode === "1") {
      await c1.query("START TRANSACTION");
      await c1.query(query("node1_titles"), [title, tconst]);
    } else {
      await c2.query("START TRANSACTION");
      await c2.query(query("node2_titles"), [title, tconst]);
    }
    addLog(logs, `Updating Title on Node ${sourceNode}`);
    await logUpdate(transactionId, sourceNode, title, tconst, oldValues);

    addLog(logs, `Attempting Replication on Master Node 0`);
    const shouldFailReplication = true;

    if (shouldFailReplication) {
      await logger(
        transactionId,
        sourceNode,
        "ABORT",
        undefined,
        undefined,
        true,
        sourceNode,
        "0",
        "PENDING"
      );
      throw new Error("Simulated failure when replicating to Node 0");
    }

    if (sourceNode === "1") {
      await c1.query("COMMIT");
    } else {
      await c2.query("COMMIT");
    }
    await logger(transactionId, sourceNode, "COMMIT");
    addLog(logs, `SUCCESS: Title updated successfully on Node ${sourceNode}`);
  } catch (error) {
    addLog(logs, `Error occurred during replication: ${error}`);

    if (sourceNode === "1") {
      await c1.query("ROLLBACK");
    } else {
      await c2.query("ROLLBACK");
    }
    addLog(logs, `Rolling back update to Node ${sourceNode}`);

    await logger(
      transactionId,
      sourceNode,
      "ABORT",
      undefined,
      undefined,
      false,
      sourceNode,
      undefined,
      "ABORTED"
    );
    await completeTransaction(transactionId, sourceNode);
  } finally {
    c0.release();
    c1.release();
    c2.release();
  }

  return { logs };
}

export async function failCase2Write(
  _prevState: { logs: string[] },
  formData: FormData
): Promise<{ logs: string[] }> {
  const transactionId = crypto.randomUUID();
  const tconst = formData.get("tconst") as string;
  const title = formData.get("primaryTitle") as string;
  const logs: string[] = [];

  const [rows] = (await db0.query(
    "SELECT * FROM node0_titles WHERE tconst = ?",
    [tconst]
  )) as [Titles[], unknown];

  if (!rows || rows.length === 0) {
    addLog(logs, `Data item ${tconst} not found on Node 0`);
    return { logs };
  }
  const oldValues: Partial<Titles> = rows[0];
  const sourceNode = rows[0].startYear > 1915 ? "2" : "1";

  addLog(
    logs,
    `Simulating pre-failure: Log COMMIT for ${transactionId} on Node 0 (Master)`
  );
  await logger(transactionId, "0", "START");
  await logger(
    transactionId,
    "0",
    "UPDATE",
    { tconst, primaryTitle: title },
    oldValues
  );
  await logger(transactionId, "0", "COMMIT");

  addLog(logs, `Master Node 0 has recovered. Starting automated recovery...`);

  try {
    await recoverTransaction(0);
    addLog(logs, `Automated Recovery on Node 0 completed.`);

    const [updatedRows] = (await db0.query(
      "SELECT * FROM node0_titles WHERE tconst = ?",
      [tconst]
    )) as [Titles[], unknown];
    if (updatedRows[0].primaryTitle === title) {
      addLog(
        logs,
        `REDO successful: Data item ${tconst} updated to '${title}' on Node 0.`
      );
    } else {
      addLog(
        logs,
        `REDO failed: Data item ${tconst} was NOT updated on Node 0.`
      );
    }
  } catch (error) {
    addLog(logs, `Recovery failed: ${error}`);
  }

  return { logs };
}

export async function failCase3Write(
  _prevState: { logs: string[] },
  formData: FormData
): Promise<{ logs: string[] }> {
  const transactionId = crypto.randomUUID();
  const tconst = formData.get("tconst") as string;
  const title = formData.get("primaryTitle") as string;
  const logs: string[] = [];

  const [rows] = (await db0.query(
    "SELECT * FROM node0_titles WHERE tconst = ?",
    [tconst]
  )) as [Titles[], unknown];

  if (!rows || rows.length === 0) {
    addLog(logs, `Data item ${tconst} not found on Node 0`);
    return { logs };
  }
  const oldValues: Partial<Titles> = rows[0];
  const targetNode = rows[0].startYear > 1915 ? "2" : "1";

  addLog(logs, `Starting Update Transaction ${transactionId} on Master Node 0`);
  await logger(transactionId, "0", "START");

  const c0 = await db0.getConnection();
  const c1 = await db1.getConnection();
  const c2 = await db2.getConnection();

  try {
    const query = (table: string) => `
    UPDATE ${table}
    SET primaryTitle = ?
    WHERE tconst = ?
    `;

    await c0.query("START TRANSACTION");
    await c0.query(query("node0_titles"), [title, tconst]);
    addLog(logs, `Updating Title on Master Node 0`);
    await logUpdate(transactionId, "0", title, tconst, oldValues);

    addLog(logs, `Attempting Replication to Slave Node ${targetNode}`);

    await logUpdate(
      transactionId,
      targetNode,
      title,
      tconst,
      oldValues,
      true,
      "0"
    );

    const shouldFailReplication = true;
    if (shouldFailReplication) {
      throw new Error(
        "Simulated failure when replicating from Node 0 to Slave Node"
      );
    }
    await c0.query("COMMIT");
    await logger(transactionId, "0", "COMMIT");

    addLog(logs, `SUCCESS: Title updated successfully on Node 0`);
  } catch (error) {
    addLog(logs, `Error occurred during replication: ${error}`);

    await c0.query("ROLLBACK");
    addLog(logs, `Rolling back update to Node 0`);

    await logger(
      transactionId,
      "0",
      "ABORT",
      undefined,
      undefined,
      false,
      "0",
      undefined,
      "ABORTED"
    );
    await completeTransaction(transactionId, "0");
  } finally {
    c0.release();
    c1.release();
    c2.release();
  }

  return { logs };
}

export async function failCase4Write(
  _prevState: { logs: string[] },
  formData: FormData
): Promise<{ logs: string[] }> {
  const transactionId = crypto.randomUUID();
  const tconst = formData.get("tconst") as string;
  const title = formData.get("primaryTitle") as string;
  const logs: string[] = [];

  const [rows] = (await db0.query(
    "SELECT * FROM node0_titles WHERE tconst = ?",
    [tconst]
  )) as [Titles[], unknown];

  if (!rows || rows.length === 0) {
    addLog(logs, `Data item ${tconst} not found on Node 0`);
    return { logs };
  }
  const oldValues: Partial<Titles> = rows[0];
  const targetNode = rows[0].startYear > 1915 ? "2" : "1";

  addLog(
    logs,
    `Simulating pre-failure: Log UPDATE instruction on Slave Node ${targetNode}`
  );
  await logger(transactionId, targetNode, "START");
  await logUpdate(
    transactionId,
    targetNode,
    title,
    tconst,
    oldValues,
    true,
    "0"
  );

  addLog(
    logs,
    `Slave Node ${targetNode} has recovered. Starting automated recovery...`
  );

  try {
    await recoverTransaction(Number(targetNode));
    addLog(logs, `Automated Recovery on Node ${targetNode} completed.`);

    const db = targetNode === "1" ? db1 : db2;
    const table = targetNode === "1" ? "node1_titles" : "node2_titles";

    const [updatedRows] = (await db.query(
      `SELECT * FROM ${table} WHERE tconst = ?`,
      [tconst]
    )) as [Titles[], unknown];

    if (updatedRows && updatedRows[0].primaryTitle === title) {
      addLog(
        logs,
        `REDO successful: Data item ${tconst} updated to '${title}' on Node ${targetNode}.`
      );
    } else {
      addLog(
        logs,
        `REDO failed: Data item ${tconst} was NOT updated on Node ${targetNode}.`
      );
    }
  } catch (error) {
    addLog(logs, `Recovery failed: ${error}`);
  }

  return { logs };
}
