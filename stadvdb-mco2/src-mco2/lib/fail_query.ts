import { PoolConnection } from "mysql2/promise";
import { Titles } from "./schema";
import { addLog } from "../utils/add_log";
import { db0, db1, db2 } from "../db";
import { logger } from "../utils/add_log_transaction";
import { error } from "console";

export async function execFailWrite(
  node: 0 | 1 | 2,
  c0: PoolConnection,
  c1: PoolConnection,
  c2: PoolConnection,
  title: Titles,
  query: string,
  transactionId: string,
  operation: "UPDATE" | "INSERT" | "DELETE",
  updatedString: string
): Promise<string[]> {
  const logs: string[] = [];

  try {
    if (node === 1) {
      addLog(logs, `Executing write on Node 1...`);
      await c1.query(query);
      logger(
        transactionId,
        "1",
        operation,
        { ...title, primaryTitle: updatedString },
        title,
        true,
        "1",
        "0"
      );

      addLog(logs, `Attempting replication to Node 0...`);

      try {
        await c0.query(query.replace("node1_titles", "node0_titles"));
        logger(
          transactionId,
          "0",
          operation,
          { ...title, primaryTitle: updatedString },
          title,
          true,
          "1",
          "0"
        );
        addLog(logs, `Replication to Node 0 successful.`);
      } catch (repErr) {
        addLog(logs, `Replication to Node 0 failed — Node 0 unavailable.`);
      }
    }

    if (node === 2) {
      addLog(logs, `Executing write on Node 2...`);
      await c2.query(query);
      logger(
        transactionId,
        "2",
        operation,
        { ...title, primaryTitle: updatedString },
        title,
        true,
        "2",
        "0"
      );

      addLog(logs, `Attempting replication to Node 0...`);
      try {
        await c0.query(query.replace("node2_titles", "node0_titles"));
        logger(
          transactionId,
          "0",
          operation,
          { ...title, primaryTitle: updatedString },
          title,
          true,
          "2",
          "0"
        );
        addLog(logs, `Replication to Node 0 successful.`);
      } catch (repErr) {
        addLog(logs, `Replication to Node 0 failed — Node 0 unavailable.`);
      }
    }
  } catch (err) {
    console.error("Failed to execute write", err);
    addLog(logs, `Failed to execute write on Node ${node}`);
  }

  return logs;
}

export async function execFailWriteCase3(
  c0: PoolConnection,
  c1: PoolConnection,
  c2: PoolConnection,
  title: Titles,
  query: string,
  transactionId: string,
  operation: "UPDATE" | "INSERT" | "DELETE",
  updatedString: string
): Promise<string[]> {
  const logs: string[] = [];

  try {
    addLog(logs, `Executing write on Node 0 (Central)...`);
    await c0.query(query);

    await logger(
      transactionId,
      "0",
      operation,
      { ...title, primaryTitle: updatedString },
      title
    );

    if (title.startYear > 1915) {
      addLog(logs, `Attempting replication to Node 2...`);
      try {
        throw new Error("Node 2 unavailable");
      } catch (repErr) {
        addLog(logs, `Replication to Node 2 failed — Node 2 unavailable.`);
        await logger(
          transactionId,
          "2",
          operation,
          { ...title, primaryTitle: updatedString },
          title,
          true,
          "0",
          "2"
        );
      }
    } else {
      addLog(logs, `Attempting replication to Node 1...`);
      try {
        throw new Error("Node 1 unavailable");
      } catch (repErr) {
        addLog(logs, `Replication to Node 1 failed — Node 1 unavailable.`);
        await logger(
          transactionId,
          "1",
          operation,
          { ...title, primaryTitle: updatedString },
          title,
          true,
          "0",
          "1"
        );
      }
    }
  } catch (err) {
    console.error("Failed to execute write", err);
    addLog(logs, `Failed to execute write on Node 0`);
  }

  return logs;
}
