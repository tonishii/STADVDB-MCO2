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
  const txs: TransactionLogEntry[] = readNodeLogs(node);

  const txMap = new Map<string, TransactionLogEntry[]>();
  for (const tx of txs) {
    if (!txMap.has(tx.id)) {
      txMap.set(tx.id, []);
    }
    txMap.get(tx.id)?.push(tx);
  }

  for (const [key, log] of txMap.entries()) {
    const committed = log.some(
      (t) => t.operation == "COMMIT" && t.status !== "COMPLETED"
    );
    if (committed) {
      const operations = log.filter((t) => {
        return ["INSERT", "UPDATE", "DELETE"].includes(t.operation);
      });
      for (const op of operations) {
        if (op.isReplication && op.targetNode) {
          const pool = nodePools[op.node];
          const redoPool = nodePools[op.targetNode];
          await redo(op, pool);
          await redo(op, redoPool);
          op.status = "REPLICATED";
        } else {
          const pool = nodePools[op.node];
          await redo(op, pool);
          op.status = "COMPLETED";
        }
        op.recoveryAction = "REDO";

        console.log("redo");
      }
    } else {
      const operations = log
        .filter((t) => {
          return ["INSERT", "UPDATE", "DELETE"].includes(t.operation);
        })
        .reverse();
      for (const op of operations) {
        if (op.isReplication && op.targetNode) {
          const pool = nodePools[op.node];
          const undoPool = nodePools[op.targetNode];
          await undo(op, undoPool);
          await undo(op, pool);
          op.status = "REPLICATED";
        } else {
          const pool = nodePools[op.node];
          await undo(op, pool);
          op.status = "ABORTED";
        }
        op.recoveryAction = "UNDO";
        console.log("undo");
      }
    }
  }
  fs.writeFileSync(
    path.join(logFilePath, `node${node}_transactions.json`),
    JSON.stringify(txs, null, 2)
  );
}
