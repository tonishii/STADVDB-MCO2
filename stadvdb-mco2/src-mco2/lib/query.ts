import { PoolConnection } from "mysql2/promise";
import { Titles } from "./schema";

export async function execWrite(
  node: 0 | 1 | 2,
  c0: PoolConnection,
  c1: PoolConnection,
  c2: PoolConnection,
  title: Titles,
  query: string
) {
  let res: string = "";

  try {
    if (node === 1) {
      c1.query(query);
      res += `Executing write on Node 1...`;
    } else if (node === 2) {
      c2.query(query);
      res += `Executing write on Node 2...`;
    }

    if (node === 0) {
      c0.query(query);
      res += `Executing write on Node 0...`;

      if (title.startYear > 1915) {
        c2.query(query);
        res += `Replicating write to Node 2...`;
      } else {
        c1.query(query);
        res += `Replicating write to Node 1...`;
      }
    }

  } catch (err) {
    console.error("Failed to execute write", err);
    res += `Failed to execute write on Node ${node}`;
  }

  return res;
}