import { PoolConnection } from "mysql2/promise";
import { Titles } from "./schema";

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
      logs.push(`Executing write on Node 1...`);
      c1.query(query);
    } else if (node === 2) {
      logs.push(`Executing write on Node 2...`);
      c2.query(query);
    }

    if (node === 0) {
      logs.push(`Executing write on Node 0...`);
      c0.query(query);

      if (title.startYear > 1915) {
        logs.push(`Replicating write to Node 2...`);
        c2.query(query.replace("node0_titles", "node2_titles"));
      } else {
        logs.push(`Replicating write to Node 1...`);
        c1.query(query.replace("node0_titles", "node1_titles"));
      }
    }

  } catch (err) {
    console.error("Failed to execute write", err);
    logs.push(`Failed to execute write on Node ${node}`);
  }

  return logs;
}