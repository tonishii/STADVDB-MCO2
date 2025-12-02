import { TransactionLogEntry } from "../lib/schema";
import { logTransaction } from "../lib/transaction_logger";

export async function logger(
  transactionId: string,
  node: "0" | "1" | "2",
  operation: TransactionLogEntry["operation"],
  values?: TransactionLogEntry["values"],
  oldValues?: TransactionLogEntry["oldValues"],
  isReplication?: boolean,
  sourceNode?: "0" | "1" | "2",
  targetNode?: "0" | "1" | "2",
  status?: TransactionLogEntry["status"]
): Promise<void> {
  const logEntry: TransactionLogEntry = {
    id: crypto.randomUUID(),
    transactionId,
    timestamp: new Date().toISOString(),
    node,
    operation,
    status,
    isReplication,
    sourceNode,
    targetNode,
    values,
    oldValues,
  };

  await logTransaction(logEntry);
}
