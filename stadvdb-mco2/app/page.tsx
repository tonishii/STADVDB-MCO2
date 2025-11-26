"use server";

import { getIsolationLevel, getNodeStatus } from "@/src-mco2/lib/server_status";
import NodeStatus from "@/src-mco2/components/NodeStatus";
import Link from "next/link";

const node0_config = {
  host: process.env.DB_HOST || "",
  user: process.env.DB_USER || "",
  password: process.env.DB_PASS || "",
  database: process.env.DB_NAME || "",
  port: process.env.NODE0_PORT ? parseInt(process.env.NODE0_PORT) : 3306,
};

const node1_config = {
  host: process.env.DB_HOST || "",
  user: process.env.DB_USER || "",
  password: process.env.DB_PASS || "",
  database: process.env.DB_NAME || "",
  port: process.env.NODE1_PORT ? parseInt(process.env.NODE1_PORT) : 3306,
};

const node2_config = {
  host: process.env.DB_HOST || "",
  user: process.env.DB_USER || "",
  password: process.env.DB_PASS || "",
  database: process.env.DB_NAME || "",
  port: process.env.NODE2_PORT ? parseInt(process.env.NODE2_PORT) : 3306,
};

export default async function Home() {
  const node0_status = await getNodeStatus(node0_config);
  const node1_status = await getNodeStatus(node1_config);
  const node2_status = await getNodeStatus(node2_config);

  const isolation = await getIsolationLevel();

  return (
    <div className="flex min-h-screen items-center justify-center font-sans">
      <main className="flex min-h-screen w-full max-w-4xl flex-col items-center py-32 px-16 sm:items-start">
        <div className="flex flex-col w-full items-start space-y-4 mb-10">
          <Link href="/node0" className="hover:border-white border-transparent border-b-1 transition-colors duration-200"><NodeStatus name="Node 0" online={node0_status} last_tx={new Date()} /></Link>
          <Link href="/node1" className="hover:border-white border-transparent border-b-1 transition-colors duration-200"><NodeStatus name="Node 1" online={node1_status} last_tx={new Date()} /></Link>
          <Link href="/node2" className="hover:border-white border-transparent border-b-1 transition-colors duration-200"><NodeStatus name="Node 2" online={node2_status} last_tx={new Date()} /></Link>
        </div>

        <p>Current Isolation Level: <span className={isolation == "UNKNOWN" ? "text-red-500" : "text-green-500"}>{isolation}</span></p>
      </main>
    </div>
  );
}
