"use server";

import { db0 } from "../db";
import { Titles } from "../lib/schema";

export async function searchMovies(formData: FormData) {
  const tconst = formData.get("tconst") as string;
  const title = formData.get("title") as string;

  let query = "SELECT * FROM node0_titles";
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
  } else {
    query += " ORDER BY startYear DESC"; 
  }

  query += " LIMIT 20";

  try {
    const [rows] = await db0.query(query, params) as [Titles[], any];
    return { success: true, data: rows };
  } catch (error) {
    console.error("Search failed:", error);
    return { success: false, data: [] };
  }
}