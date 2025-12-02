import fs from "fs";
import path from "path";
import { TransactionLogEntry } from "./schema";

export const logFilePath = path.join(process.cwd(), "src-mco2/logs");

function ensureDirectory() {
  if (!fs.existsSync(logFilePath)) {
    fs.mkdirSync(logFilePath, { recursive: true });
  }
}

function getNodeLogPath(node: string | number) {
  ensureDirectory();
  return path.join(logFilePath, `node${node}_transactions.json`);
}

export async function logTransaction(tx: TransactionLogEntry) {
  const file = getNodeLogPath(tx.node);
  
  let logs: TransactionLogEntry[] = [];
  
  try {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, "utf-8");
      if (content.trim()) {
        logs = JSON.parse(content);
      }
    }
  } catch (err) {
    console.error("Error reading log file, starting fresh:", err);
    logs = [];
  }
  
  logs.push(tx);
  fs.writeFileSync(file, JSON.stringify(logs, null, 2));
}

export async function readLogs(node: string | number): Promise<TransactionLogEntry[]> {
  const file = getNodeLogPath(node);
  if (!fs.existsSync(file)) return [];
  
  try {
    const content = fs.readFileSync(file, "utf-8");
    if (!content.trim()) return [];
    return JSON.parse(content);
  } catch (err) {
    console.error(`Error reading logs for node ${node}:`, err);
    return [];
  }
}