import { TransactionLogEntry } from "../lib/schema";
import { logTransaction } from "../lib/transaction_manager";

export async function logger(
  transactionId: string,
  node: "0" | "1" | "2",
  operation: TransactionLogEntry["operation"],
  values?: TransactionLogEntry["values"],
  oldValues?: TransactionLogEntry["oldValues"],
  isReplication?: boolean,
  sourceNode?: "0" | "1" | "2",
  targetNode?: "0" | "1" | "2"
): Promise<void> {
  const logEntry: TransactionLogEntry = {
    id: crypto.randomUUID(),
    transactionId,
    timestamp: new Date().toISOString(),
    node,
    operation,
    status: operation === "COMMIT" ? "COMPLETED" : "PENDING",
    isReplication,
    sourceNode,
    targetNode,
    values,
    oldValues,
  };

  await logTransaction(logEntry);
}