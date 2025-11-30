"use server";

import { db0, db1, db2 } from "../db";
import { execWrite } from "../lib/query";

export async function case1() {
}

export async function case2() {
  // Node0 writes to a specific data item
  // Node1 and Node2 read the same data item concurrently
  const c0 = await db0.getConnection();
  const c1 = await db1.getConnection();
  const c2 = await db2.getConnection();

  c0.query(`START TRANSACTION`);
  c1.query(`START TRANSACTION`);
  c2.query(`START TRANSACTION`);

  // TENTATIVE
  await execWrite(0, c0, c1, c2, {}, `UPDATE titles SET primaryTitle='Updated Title' WHERE tconst='tt0000001'`);
}

export async function case3() {
  // Node0 updates a data item and Node1 deletes the same data item concurrently
}