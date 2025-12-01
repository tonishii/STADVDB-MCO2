"use server";

import { db0, db1, db2 } from "../db";
import { RowDataPacket } from "mysql2";

export type ReportData = {
  consistency: {
    node0Count: number;
    node1Count: number;
    node2Count: number;
    isConsistent: boolean;
  };
  distribution: {
    node1Pct: string;
    node2Pct: string;
  };
  genres: {
    node1Top: { genre: string; count: number }[];
    node2Top: { genre: string; count: number }[];
  };
};

export async function generateReports(): Promise<ReportData> {
  const [r0] = await db0.query("SELECT COUNT(*) as c FROM node0_titles") as [RowDataPacket[], unknown];
  const [r1] = await db1.query("SELECT COUNT(*) as c FROM node1_titles") as [RowDataPacket[], unknown];
  const [r2] = await db2.query("SELECT COUNT(*) as c FROM node2_titles") as [RowDataPacket[], unknown];

  const c0 = r0[0].c;
  const c1 = r1[0].c;
  const c2 = r2[0].c;

  // Top Genres Query  
  const genreQuery = (table: string) => `
    SELECT genres, COUNT(*) as count 
    FROM ${table} 
    WHERE genres IS NOT NULL 
    GROUP BY genres 
    ORDER BY count DESC 
    LIMIT 3
  `;

  const [g1] = await db1.query(genreQuery("node1_titles")) as [RowDataPacket[], unknown];
  const [g2] = await db2.query(genreQuery("node2_titles")) as [RowDataPacket[], unknown];

  return {
    consistency: {
      node0Count: c0,
      node1Count: c1,
      node2Count: c2,
      isConsistent: c0 === (c1 + c2),
    },
    distribution: {
      node1Pct: ((c1 / c0) * 100).toFixed(2),
      node2Pct: ((c2 / c0) * 100).toFixed(2),
    },
    genres: {
      node1Top: g1.map((r: any) => ({ genre: r.genres, count: r.count })),
      node2Top: g2.map((r: any) => ({ genre: r.genres, count: r.count })),
    }
  };
}