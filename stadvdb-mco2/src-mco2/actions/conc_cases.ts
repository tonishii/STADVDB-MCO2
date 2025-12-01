"use server";

import { revalidatePath } from "next/cache";
import { RowDataPacket } from "mysql2";

import { executeRead, execWrite, NODES } from "../lib/query";
import { Titles } from "../lib/schema";
import { db0, db1, db2 } from "../db";
import { addLog } from "../utils/add_log";

export async function case1(_prevState: { logs: string[] }, formData: FormData): Promise<{ logs: string[] }>  {
  const tconst = formData.get("tconst") as string;
  const logs: string[] = [];

  const [rows] = await db0.query("SELECT * FROM node0_titles where tconst = ?", [tconst]) as [Titles[], unknown];

  if (!rows || rows.length === 0) {
    addLog(logs, `Data item ${tconst} not found on Node 0`);
    return { logs };
  }

  addLog(logs, `Starting Read Transaction on Node 0 (10s delay)...`);

  const currentNodeEnv = process.env.NEXT_PUBLIC_CURRENT_NODE || "";

  let localKey: keyof typeof NODES = "NODE0";
  if (currentNodeEnv.includes("Node 1")) localKey = "NODE1";
  if (currentNodeEnv.includes("Node 2")) localKey = "NODE2";

  const localResult = await executeRead(localKey, tconst, 10);

  if (localResult.found) {
    addLog(logs, `(Local Hit) ${localResult.sourceNode}`);
    addLog(logs, `SUCCESS: Read '${localResult.data?.primaryTitle}' from ${localResult.sourceNode}`);
    return { logs };
  }

  if (localKey !== "NODE0") {
    const centralResult = await executeRead("NODE0", tconst, 10);
    if (centralResult.found) {
      addLog(logs, `(Routed to) ${centralResult.sourceNode}`);
      addLog(logs, `SUCCESS: Read '${centralResult.data?.primaryTitle}' from ${centralResult.sourceNode}`);
      return { logs };
    }
  }

  let peerKey: keyof typeof NODES | null = null;
  if (localKey === "NODE1") peerKey = "NODE2";
  if (localKey === "NODE2") peerKey = "NODE1";

  if (peerKey) {
    const peerResult = await executeRead(peerKey, tconst, 10);
    if (peerResult.found) {
      addLog(logs, `(Routed to) ${peerResult.sourceNode}`);
      addLog(logs, `SUCCESS: Read '${peerResult.data?.primaryTitle}' from ${peerResult.sourceNode}`);
      return { logs };
    }
  }

  revalidatePath("/");
  return { logs };
}

export async function case2(_prevState: { logs: string[] }, formData: FormData): Promise<{ logs: string[] }> {
  const tconst = formData.get("tconst") as string;
  const logs: string[] = [];

  const [rows] = await db0.query("SELECT * FROM node0_titles where tconst = ?", [tconst]) as [Titles[], unknown];

  if (!rows || rows.length === 0) {
    addLog(logs, `Data item ${tconst} not found on Node 0`);
    return { logs };
  }

  // Node0 writes to a specific data item
  // Node1 and Node2 read the same data item concurrently
  const c0 = await db0.getConnection();
  const c1 = await db1.getConnection();
  const c2 = await db2.getConnection();

  try {
    addLog(logs, `Starting transaction.`);
    await Promise.all([
      c0.query("START TRANSACTION"),
      c1.query("START TRANSACTION"),
      c2.query("START TRANSACTION"),
    ]);

    const writePromise = execWrite(
      0, c0, c1, c2,
      rows[0] as Titles,
      `UPDATE node0_titles SET primaryTitle='Updated Title for Case 2' WHERE tconst='${tconst}' AND SLEEP(5)=0`
    ).then((writeLogs) => {
      logs.push(...writeLogs);
    });

    if (rows[0].startYear > 1915) {
      addLog(logs, `Data item is expected to be on Node 2 for reading.`);
    } else {
      addLog(logs, `Data item is expected to be on Node 1 for reading.`);
    }

    const node1Promise = c1.query(`SELECT * FROM node1_titles WHERE tconst=?`, [tconst])
      .then(([rows]) => addLog(logs, `Node 1 read: ${((rows as RowDataPacket[])[0] as Titles)?.primaryTitle ?? "null"}...`));

    const node2Promise = c2.query(`SELECT * FROM node2_titles WHERE tconst=?`, [tconst])
      .then(([rows]) => addLog(logs, `Node 2 read: ${((rows as RowDataPacket[])[0] as Titles)?.primaryTitle ?? "null"}...`));

    await Promise.all([writePromise, node1Promise, node2Promise]);

    await Promise.all([
      c0.query("COMMIT"),
      c1.query("COMMIT"),
      c2.query("COMMIT"),
    ]);
    addLog(logs, `Transaction committed successfully.`);
  } catch (err) {
    addLog(logs, `Error occured: ${err}`);

    await Promise.all([
      c0.query("ROLLBACK"),
      c1.query("ROLLBACK"),
      c2.query("ROLLBACK"),
    ]);
  } finally {
    c0.release();
    c1.release();
    c2.release();
  }

  revalidatePath("/");
  return { logs };
}

export async function case3(_prevState: { logs: string[] }, formData: FormData): Promise<{ logs: string[] }> {
  // Node0 updates a data item and Node1 deletes the same data item concurrently
  const tconst = formData.get("tconst") as string;
  const logs: string[] = [];

  const [rows] = await db0.query(
    "SELECT * FROM node0_titles WHERE tconst = ?",
    [tconst]
  ) as [Titles[], unknown];

  if (!rows || rows.length === 0) {
    addLog(logs, `Data item ${tconst} not found on Node 0`);
    return { logs };
  }

  // Node0 = update, Node1 = delete
  const c0 = await db0.getConnection();
  const c1 = await db1.getConnection();
  const c2 = await db2.getConnection();

  try {
    addLog(logs, `Starting transaction.`);

    await Promise.all([
      c0.query("START TRANSACTION"),
      c1.query("START TRANSACTION"),
      c2.query("START TRANSACTION"),
    ]);

    const updatePromise = execWrite(
      0, c0, c1, c2,
      rows[0] as Titles,
      `UPDATE node0_titles
       SET primaryTitle='Updated Title for Case 3'
       WHERE tconst='${tconst}' AND SLEEP(5)=0`,
    ).then((writeLogs) => {
      logs.push(...writeLogs);
    });

    const deletePromise = execWrite(
      1, c0, c1, c2,
      rows[0] as Titles,
      `DELETE FROM node1_titles
       WHERE tconst='${tconst}' AND SLEEP(3)=0`,
    ).then((writeLogs) => {
      addLog(logs, `Deleting data item on Node 1...`)
      logs.push(...writeLogs)
    });

    await Promise.all([updatePromise, deletePromise]);

    await Promise.all([
      c0.query("COMMIT"),
      c1.query("COMMIT"),
      c2.query("COMMIT"),
    ]);

    addLog(logs, `Transaction committed successfully.`);
  } catch (err) {
    addLog(logs, `Error occurred: ${err}`);

    await Promise.all([
      c0.query("ROLLBACK"),
      c1.query("ROLLBACK"),
      c2.query("ROLLBACK"),
    ]);

  } finally {
    c0.release();
    c1.release();
    c2.release();
  }

  revalidatePath("/");
  return { logs };
}