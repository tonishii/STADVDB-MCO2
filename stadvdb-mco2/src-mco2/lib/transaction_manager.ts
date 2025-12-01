import fs from "fs";
import path from "path";
import { TransactionLogEntry } from "./schema";

export const logFilePath = path.join(process.cwd(), "/src-mco2/log/");

function ensureDirectory() {
  if (!fs.existsSync(logFilePath)) {
    fs.mkdirSync(logFilePath, { recursive: true });
  }
}

function getNodeLogPath(node: number) {
  ensureDirectory();
  return path.join(logFilePath, `node${node}_transactions.json`);
}

export async function createLogFilePath(node: number) {
  const filePath = getNodeLogPath(node);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, "[]");
  }
}

export async function logTransaction(tx: TransactionLogEntry) {
  const filePath = getNodeLogPath(Number(tx.node));

  const fileContents = fs.readFileSync(filePath, "utf-8");
  const transactions: TransactionLogEntry[] = JSON.parse(fileContents);

  tx.timestamp = new Date().toISOString();
  transactions.push(tx);

  fs.writeFileSync(filePath, JSON.stringify(transactions, null, 2));
}

export function readNodeLogs(node: number): TransactionLogEntry[] {
  const filePath = getNodeLogPath(node);
  if (!fs.existsSync(filePath)) return [];
  const data = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(data);
}
