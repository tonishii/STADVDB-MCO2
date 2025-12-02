"use server";

import fs from "fs";
import path from "path";
import { TransactionLogEntry } from "./schema";
import { readLogs, completeTransaction } from "./transaction_logger";
import { redo, undo } from "./recovery_operations";
import { db0, db1, db2 } from "../db";

const nodePools = {
  "0": db0,
  "1": db1,
  "2": db2,
};

const logFilePath = path.join(process.cwd(), "src-mco2/logs");

export async function recoverTransaction(node: number) {
  const txs: TransactionLogEntry[] = await readLogs(node);

  const txMap = new Map<string, TransactionLogEntry[]>();
  for (const tx of txs) {
    if (!txMap.has(tx.transactionId)) {
      txMap.set(tx.transactionId, []);
    }
    txMap.get(tx.transactionId)?.push(tx);
  }

  for (const [, logEntries] of txMap.entries()) {
    const isFinalized = logEntries.some(
      (t) => t.status === "COMPLETED" || t.status === "ABORTED"
    );

    if (isFinalized) {
      continue;
    }

    const hasCommit = logEntries.some((t) => t.operation === "COMMIT");
    const recoveryAction = hasCommit ? "REDO" : "UNDO";

    const pendingDataOps = logEntries.filter((t) =>
      ["INSERT", "UPDATE", "DELETE"].includes(t.operation)
    );

    if (recoveryAction === "REDO") {
      for (const op of pendingDataOps) {
        if (!nodePools[op.node]) continue;

        if (op.isReplication && op.targetNode && nodePools[op.targetNode]) {
          const primaryPool = nodePools[op.node];
          const targetPool = nodePools[op.targetNode];

          await redo(op, primaryPool, op.node);

          await redo(op, targetPool, op.targetNode);

          op.recoveryAction = "REDO";
          op.status = "COMPLETED";
        } else {
          const primaryPool = nodePools[op.node];
          await redo(op, primaryPool, op.node);

          op.recoveryAction = "REDO";
          op.status = "COMPLETED";
        }
      }
      const startLog = logEntries.find((t) => t.operation === "START");
      const commitLog = logEntries.find((t) => t.operation === "COMMIT");

      if (startLog) {
        startLog.status = "COMPLETED";
      }
      if (commitLog) {
        commitLog.status = "COMPLETED";
      }
    } else {
      const reverseDataOps = pendingDataOps.reverse();

      for (const op of reverseDataOps) {
        if (!nodePools[op.node]) continue;

        if (op.isReplication && op.targetNode && nodePools[op.targetNode]) {
          const primaryPool = nodePools[op.node];
          const targetPool = nodePools[op.targetNode];

          await undo(op, targetPool, op.targetNode);

          await undo(op, primaryPool, op.node);

          op.recoveryAction = "UNDO";
          op.status = "ABORTED";
        } else {
          const primaryPool = nodePools[op.node];
          await undo(op, primaryPool, op.node);

          op.recoveryAction = "UNDO";
          op.status = "ABORTED";
        }
      }
      const startLog = logEntries.find((t) => t.operation === "START");
      const abortLog = logEntries.find((t) => t.operation === "ABORT");

      if (startLog) {
        startLog.status = "ABORTED";
      }
      if (abortLog) {
        abortLog.status = "ABORTED";
      }
    }
  }

  fs.writeFileSync(
    path.join(logFilePath, `node${node}_transactions.json`),
    JSON.stringify(txs, null, 2)
  );
}
