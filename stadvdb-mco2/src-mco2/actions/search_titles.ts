"use server";

import { db0, db1, db2 } from "../db";
import { Titles } from "../lib/schema";

const NODES = {
  "NODE0": { pool: db0, tableName: "node0_titles", name: "Node 0 (Central)" },
  "NODE1": { pool: db1, tableName: "node1_titles", name: "Node 1 (1900-1915)" },
  "NODE2": { pool: db2, tableName: "node2_titles", name: "Node 2 (1916-1925)" }
};

export async function searchTitles(formData: FormData) {
  const tconst = formData.get("tconst") as string;
  const title = formData.get("title") as string;
  const targetNodeKey = formData.get("targetNode") as keyof typeof NODES || "NODE0";

  const limitInput = formData.get("limit");
  const limit = limitInput ? parseInt(limitInput as string) : 20;

  const { pool, tableName } = NODES[targetNodeKey];

  let query = `SELECT * FROM ${tableName}`;
  const conditions: string[] = [];
  const params: string[] = [];

  if (tconst) {
    conditions.push("tconst LIKE ?");
    params.push(`%${tconst}%`);
  }

  if (title) {
    conditions.push("primaryTitle LIKE ?");
    params.push(`%${title}%`);
  }

  if (conditions.length > 0) {
    query += " WHERE " + conditions.join(" AND ");
  }

  query += " ORDER BY startYear ASC"; 
  query += ` LIMIT ${limit}`;

  try {
    const [rows] = await pool.query(query, params) as [Titles[], any];
    return { success: true, data: rows };
  } catch (error) {
    console.error("Search failed:", error);
    return { success: false, data: [] };
  }
}