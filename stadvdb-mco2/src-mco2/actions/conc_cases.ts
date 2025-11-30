"use server";

import { revalidatePath } from "next/cache";
import { db0, db1, db2 } from "../db";
import { execWrite } from "../lib/query";
import { Titles } from "../lib/schema";
import { RowDataPacket } from "mysql2";

export async function case1() {
}

export async function case2(prevState: { logs: string[] }, formData: FormData): Promise<{ logs: string[] }> {
  const tconst = formData.get("tconst") as string;
  const logs: string[] = [];

  const [rows] = await db0.query("SELECT * FROM node0_titles where tconst = ?", [tconst]) as [Titles[], unknown];

  if (!rows || (Array.isArray(rows) && rows.length === 0)) {
    logs.push(`Data item ${tconst} not found on Node 0`);
    return { logs };
  }

  // Node0 writes to a specific data item
  // Node1 and Node2 read the same data item concurrently
  const c0 = await db0.getConnection();
  const c1 = await db1.getConnection();
  const c2 = await db2.getConnection();

  try {
    logs.push(`Starting transaction...`);
    await Promise.all([
      c0.query("START TRANSACTION"),
      c1.query("START TRANSACTION"),
      c2.query("START TRANSACTION"),
    ]);

    const writePromise = execWrite(
      0, c0, c1, c2,
      rows[0] as Titles,
      `UPDATE node0_titles SET primaryTitle='Updated Title' WHERE tconst='${tconst}'`
    ).then((writeLogs) => {
      logs.push(...writeLogs);
    });

    if (rows[0].startYear > 1915) {
      logs.push(`Data item is expected to be on Node 2 for reading...`);
    } else {
      logs.push(`Data item is expected to be on Node 1 for reading...`);
    }

    const node1Promise = c1.query(`SELECT * FROM node1_titles WHERE tconst=?`, [tconst])
      .then(([rows]) => logs.push(`Node 1 read: ${((rows as RowDataPacket[])[0] as Titles)?.primaryTitle ?? "null"}...`));

    const node2Promise = c2.query(`SELECT * FROM node2_titles WHERE tconst=?`, [tconst])
      .then(([rows]) => logs.push(`Node 2 read: ${((rows as RowDataPacket[])[0] as Titles)?.primaryTitle ?? "null"}...`));

    await Promise.all([writePromise, node1Promise, node2Promise]);

    await Promise.all([
      c0.query("COMMIT"),
      c1.query("COMMIT"),
      c2.query("COMMIT"),
    ]);
  } catch (err) {
    logs.push(`Error: ${err}`);

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

export async function case3() {
  // Node0 updates a data item and Node1 deletes the same data item concurrently
}