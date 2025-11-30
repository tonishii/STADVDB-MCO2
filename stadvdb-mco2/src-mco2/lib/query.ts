import { PoolConnection } from "mysql2/promise";
import { Titles } from "./schema";
import { addLog } from "../utils/add_log";

export async function execWrite(
  node: 0 | 1 | 2,
  c0: PoolConnection,
  c1: PoolConnection,
  c2: PoolConnection,
  title: Titles,
  query: string
): Promise<string[]> {
  const logs: string[] = [];

  try {
    if (node === 1) {
      addLog(logs, `Executing write on Node 1...`);
      c1.query(query);

      // Replicate to Node 0
      addLog(logs, `Replicating write to Node 0...`);
      c0.query(query.replace("node1_titles", "node0_titles"));
    } else if (node === 2) {
      addLog(logs, `Executing write on Node 2...`);
      c2.query(query);

      // Replicate to Node 0
      addLog(logs, `Replicating write to Node 0...`);
      c0.query(query.replace("node2_titles", "node0_titles"));
    }

    if (node === 0) {
      addLog(logs, `Executing write on Node 0...`);
      c0.query(query);

      if (title.startYear > 1915) {
        addLog(logs, `Replicating write to Node 2...`);
        c2.query(query.replace("node0_titles", "node2_titles"));
      } else {
        addLog(logs, `Replicating write to Node 1...`);
        c1.query(query.replace("node0_titles", "node1_titles"));
      }
    }

  } catch (err) {
    console.error("Failed to execute write", err);
    addLog(logs, `Failed to execute write on Node ${node}`);
  }

  return logs;
}