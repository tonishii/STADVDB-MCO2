"use server";

import { setIsolationLevel } from "../utils/set_isolation";
import { db0, db1, db2 } from "../db";
import { revalidatePath } from "next/cache";

export async function changeIsolationLevel(formData: FormData) {
  let isolation_level = formData.get("isolation_level") as string;
  isolation_level = isolation_level.replace(/-/g, " ");

  await Promise.all([
    setIsolationLevel(db0, isolation_level),
    setIsolationLevel(db1, isolation_level),
    setIsolationLevel(db2, isolation_level),
  ]);

  revalidatePath("/");
}