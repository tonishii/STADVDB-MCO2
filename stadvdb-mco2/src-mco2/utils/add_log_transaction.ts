import { TransactionLogEntry } from "../lib/schema";
import { logTransaction } from "../lib/transaction_manager";

export async function logger(
  transactionId: string,
  node: "0" | "1" | "2",
  operation: TransactionLogEntry["operation"],
  values?: TransactionLogEntry["values"],
  oldValues?: TransactionLogEntry["oldValues"]
): Promise<void> {
  const logEntry: TransactionLogEntry = {
    id: crypto.randomUUID(),
    transactionId,
    timestamp: new Date().toISOString(),
    node,
    operation,
    status: operation === "COMMIT" ? "COMPLETED" : "PENDING",
    values,
    oldValues,
  };

  await logTransaction(logEntry);
}
