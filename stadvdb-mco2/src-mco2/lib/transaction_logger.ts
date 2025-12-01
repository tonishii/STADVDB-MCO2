import fs from "fs";
import path from "path";

export interface TransactionLogEntry {
  id: string;
  transactionId: string;
  timestamp: string;
  node: "0" | "1" | "2";
  operation: "START" | "INSERT" | "UPDATE" | "DELETE" | "COMMIT" | "ABORT";
  targetNode?: "0" | "1" | "2";
  values?: any;
}

const logFilePath = path.join(process.cwd(), "src-mco2/logs");

function ensureDirectory() {
  if (!fs.existsSync(logFilePath)) {
    fs.mkdirSync(logFilePath, { recursive: true });
  }
}

export async function logTransaction(tx: TransactionLogEntry) {
  ensureDirectory();
  const file = path.join(logFilePath, `node${tx.node}.json`);
  
  let logs: TransactionLogEntry[] = [];
  if (fs.existsSync(file)) {
    logs = JSON.parse(fs.readFileSync(file, "utf-8"));
  }
  
  logs.push(tx);
  fs.writeFileSync(file, JSON.stringify(logs, null, 2));
}

export function readLogs(node: string) {
  const file = path.join(logFilePath, `node${node}.json`);
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file, "utf-8"));
}