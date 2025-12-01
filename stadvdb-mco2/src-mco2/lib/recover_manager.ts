"use server";

import fs from "fs";
import path from "path";
import { TransactionLogEntry } from "./schema";
import { logFilePath, readNodeLogs } from "./transaction_manager";
import { redo, undo } from "./recovery_operations";
import { db0, db1, db2 } from "../db";

const nodePools = {
  "0": db0,
  "1": db1,
  "2": db2,
};

export async function recoverTransaction(node: number) {
  const txs: TransactionLogEntry[] = await readNodeLogs(node);

  const txMap = new Map<string, TransactionLogEntry[]>();
  for (const tx of txs) {
    if (!txMap.has(tx.id)) {
      txMap.set(tx.id, []);
    }
    txMap.get(tx.id)?.push(tx);
  }

  for (const [key, log] of txMap.entries()) {
    const committed = log.some(
      (t) =>
        (t.operation === "COMMIT" && t.status !== "REPLICATED") ||
        t.status !== "COMPLETED"
    );
    if (committed) {
      const operations = log.filter((t) =>
        ["INSERT", "UPDATE", "DELETE"].includes(t.operation)
      );
      for (const op of operations) {
        const pool = nodePools[op.node];
        if (op.isReplication && op.targetNode) {
          const redoPool = nodePools[op.targetNode];
          await redo(op, pool, op.node);
          await redo(op, redoPool, op.targetNode);
          op.status = "REPLICATED";
        } else {
          await redo(op, pool, op.node);
          op.status = "COMPLETED";
        }

        op.recoveryAction = "REDO";
        console.log(`REDO: ${op.operation} on Node ${op.node}`);
      }
    } else {
      const operations = log
        .filter(
          (t) =>
            ["INSERT", "UPDATE", "DELETE"].includes(t.operation) &&
            t.status !== "ABORTED" &&
            t.status !== "REPLICATED"
        )
        .reverse();

      for (const op of operations) {
        const pool = nodePools[op.node];

        if (op.isReplication && op.targetNode) {
          const undoPool = nodePools[op.targetNode];
          await undo(op, undoPool, op.targetNode);
          await undo(op, pool, op.node);
          op.status = "REPLICATED";
        } else {
          await undo(op, pool, op.node);
          op.status = "ABORTED";
        }

        op.recoveryAction = "UNDO";
        console.log(`UNDO: ${op.operation} on Node ${op.node}`);
      }
    }
  }
  fs.writeFileSync(
    path.join(logFilePath, `node${node}_transactions.json`),
    JSON.stringify(txs, null, 2)
  );
}