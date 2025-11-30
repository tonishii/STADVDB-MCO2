"use server";

import Link from "next/link";

import { db0 } from "@/src-mco2/db";
import { Titles } from "@/src-mco2/lib/schema";
import { getRows } from "@/src-mco2/lib/server_methods";

import TitlesTable from "@/src-mco2/components/TitlesTable";

export default async function Node0Page() {
  const rows = await getRows(db0, "SELECT * FROM node0_titles LIMIT 20;") as Titles[];

  return (
    <div className="flex min-h-screen items-center justify-center font-sans">
      <main className="flex min-h-screen w-full max-w-4xl flex-col space-y-20 items-center py-32 px-16 sm:items-start">
        <Link href="/" className="hover:border-white border-transparent border-b-1 transition-colors duration-200">Back</Link>
        <TitlesTable rows={rows} title="Node 0 Rows" />
      </main>
    </div>
  );
}