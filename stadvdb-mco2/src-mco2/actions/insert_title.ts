"use server";

import { revalidatePath } from "next/cache";
import { db0, db1, db2 } from "../db";
import { addLog } from "../utils/add_log";
import { logger } from "../utils/add_log_transaction";
import { Titles } from "../lib/schema";
import { completeTransaction } from "../lib/transaction_logger";

export async function insertTitle(
  _prevState: { logs: string[] },
  formData: FormData
): Promise<{ logs: string[] }> {
  const logs: string[] = [];
  const transactionId = crypto.randomUUID();

  const primaryTitle = formData.get("primaryTitle") as string;
  const startYear = parseInt(formData.get("startYear") as string);
  const runtimeMinutes = parseInt(formData.get("runtimeMinutes") as string);
  const genres = formData.get("genres") as string;

  const tconst = `tt${Math.floor(Math.random() * 9000000) + 1000000}`;

  const newTitle: Titles = {
    tconst,
    primaryTitle,
    startYear,
    runtimeMinutes,
    genres,
  };

  addLog(
    logs,
    `Request received: Insert '${primaryTitle}' (${startYear}). Generated ID: ${tconst}`
  );

  let targetNodePool = null;
  let targetTableName = "";
  let targetNodeId: "1" | "2" | null = null;

  if (startYear >= 1900 && startYear <= 1915) {
    targetNodePool = db1;
    targetTableName = "node1_titles";
    targetNodeId = "1";
    addLog(
      logs,
      `Routing Logic: Year ${startYear} belongs to Partition 1 (Node 1).`
    );
  } else if (startYear >= 1916 && startYear <= 1925) {
    targetNodePool = db2;
    targetTableName = "node2_titles";
    targetNodeId = "2";
    addLog(
      logs,
      `Routing Logic: Year ${startYear} belongs to Partition 2 (Node 2).`
    );
  } else {
    addLog(
      logs,
      `ERROR: Year ${startYear} is out of scope for this distributed system (1900-1925).`
    );
    return { logs };
  }

  const c0 = await db0.getConnection();
  const cTarget = await targetNodePool.getConnection();

  try {
    addLog(logs, `Starting Distributed Transaction ${transactionId}...`);

    await Promise.all([
      logger(transactionId, "0", "START"),
      logger(transactionId, targetNodeId, "START"),
      c0.query("START TRANSACTION"),
      cTarget.query("START TRANSACTION"),
    ]);

    const insertSQL = (table: string) => `
      INSERT INTO ${table} (tconst, primaryTitle, startYear, runtimeMinutes, genres)
      VALUES (?, ?, ?, ?, ?)
    `;
    const params = [tconst, primaryTitle, startYear, runtimeMinutes, genres];

    addLog(logs, `Writing to Central Node (Node 0)...`);
    await c0.query(insertSQL("node0_titles"), params);
    await logger(
      transactionId,
      "0",
      "INSERT",
      newTitle,
      undefined,
      true,
      targetNodeId,
      "0"
    );

    addLog(logs, `Writing to Partition Node (Node ${targetNodeId})...`);
    await cTarget.query(insertSQL(targetTableName), params);
    await logger(
      transactionId,
      targetNodeId,
      "INSERT",
      newTitle,
      undefined,
      true,
      "0",
      targetNodeId
    );

    addLog(logs, `Committing transaction across nodes...`);
    await Promise.all([
      c0.query("COMMIT"),
      cTarget.query("COMMIT"),
      logger(transactionId, "0", "COMMIT"),
      logger(transactionId, targetNodeId, "COMMIT"),
      completeTransaction(transactionId, targetNodeId),
      completeTransaction(transactionId, "0"),
    ]);

    addLog(logs, `SUCCESS: Title inserted successfully.`);
  } catch (error: any) {
    addLog(logs, `ERROR: ${error.message}`);
    addLog(logs, `Rolling back transaction...`);
    await Promise.all([
      c0.query("ROLLBACK"),
      cTarget.query("ROLLBACK"),
      logger(transactionId, "0", "ABORT"),
      targetNodeId
        ? Promise.all([
            logger(transactionId, targetNodeId, "ABORT"),
            completeTransaction(transactionId, targetNodeId),
          ])
        : Promise.resolve(),
    ]);
    completeTransaction(transactionId, "0");
  } finally {
    c0.release();
    cTarget.release();
  }

  revalidatePath("/");
  return { logs };
}
