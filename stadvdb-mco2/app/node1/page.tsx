"use server";

import Link from "next/link";

import { db1 } from "@/src-mco2/db";
import { Titles } from "@/src-mco2/lib/schema";
import { getRows } from "@/src-mco2/lib/server_methods";

import TitlesTable from "@/src-mco2/components/TitlesTable";

export default async function Node1Page({
  searchParams,
}: { searchParams: { tconst?: string; title?: string }; }) {
  const { tconst, title } = await searchParams;

  let query = "SELECT * FROM node1_titles";
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

  query += " LIMIT 20;";

  const rows = await getRows(db1, { sql: query, params }) as Titles[];

  return (
    <div className="flex min-h-screen items-center justify-center font-sans">
      <main className="flex min-h-screen w-full max-w-4xl flex-col space-y-20 items-center py-32 px-16 sm:items-start">
        <Link href="/" className="hover:border-white border-transparent border-b-1 transition-colors duration-200">Back</Link>

        <form
          method="GET"
          className="flex space-x-2">
          <input
            name="tconst"
            type="text"
            placeholder="Search tconst..."
            className="rounded-md px-2 py-1 border border-neutral-700 w-fit" />
          <input
            name="title"
            type="text"
            placeholder="Search title..."
            className="rounded-md px-2 py-1 border border-neutral-700 w-fit" />
          <button
            className="w-fit bg-blue-600 text-white px-2 rounded-md hover:bg-blue-500 transition-colors duration-200">Search</button>
        </form>

        <TitlesTable rows={rows} title="Node 1 Rows" />
      </main>
    </div>
  );
}