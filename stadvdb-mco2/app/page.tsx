"use server";

import Link from "next/link";

import { getIsolationLevel, getNodeStatus } from "@/src-mco2/lib/server_status";

import { cn } from "@/src-mco2/lib/cn";

import IsolationChangeBtn from "@/src-mco2/components/IsolationChangeBtn";
import NodeStatus from "@/src-mco2/components/NodeStatus";
import { db0, db1, db2 } from "@/src-mco2/db";

export default async function Home() {
  const node0_status = await getNodeStatus(db0);
  const node1_status = await getNodeStatus(db1);
  const node2_status = await getNodeStatus(db2);

  const isolation = await getIsolationLevel();

  return (
    <div className="flex min-h-screen items-center justify-center font-sans">
      <main className="flex min-h-screen w-full max-w-4xl flex-col space-y-20 items-center py-32 px-16 sm:items-start">
        <div className="">
          <div className="flex flex-col w-full items-start mb-1">
            <Link href="/node0" className="hover:border-white border-transparent border-b-1 transition-colors duration-200">
              <NodeStatus name="Node 0" online={node0_status} />
            </Link>
            <Link href="/node1" className="hover:border-white border-transparent border-b-1 transition-colors duration-200">
              <NodeStatus name="Node 1" online={node1_status} />
            </Link>
            <Link href="/node2" className="hover:border-white border-transparent border-b-1 transition-colors duration-200">
              <NodeStatus name="Node 2" online={node2_status} />
            </Link>
          </div>
          <p className="glow-white">Current Isolation Level: <span className={cn(isolation == "UNKNOWN" ? "text-red-500" : "text-green-500", "[text-shadow:none]")}>{isolation}</span></p>
        </div>

        <div className="">
          <h1 className="font-semibold text-xl glow-white">Concurrency Control and Consistency</h1>
          <ul className="list-disc list-inside space-y-2 text-gray-500">
            <li>Case #1: Concurrent transactions in two or more nodes are reading the same data item</li>
            <li>Case #2: At least one transaction in the three nodes is writing (update / delete) and the other concurrent transactions are reading the same data item</li>
            <li>Case #3: Concurrent transactions in two or more nodes are writing (update / delete) the same data item</li>
          </ul>
        </div>

        <div className="">
          <h1 className="font-semibold text-xl glow-white">Global Failure Recovery</h1>
          <ul className="list-disc list-inside space-y-2 text-gray-500">
            <li>Case #1: When attempting to replicate the transaction from Node 2 or Node 3 to the central node, the transaction fails in writing (insert / update) to the central node</li>
            <li>Case #2: The central node eventually recovers from failure (i.e., comes back online) and missed certain write (insert / update) transactions</li>
            <li>Case #3: When attempting to replicate the transaction from central node to either Node 2 or Node 3, the transaction fails in writing (insert / update) to Node 2 or Node 3</li>
            <li>Case #4: Node 2 or Node 3 is eventually recovers from failure (i.e., comes back online) and missed certain write (insert / update) transactions</li>
          </ul>
        </div>
      </main>

      <div className="fixed bottom-4 right-4 z-50">
        <IsolationChangeBtn
          currentLevel={isolation as "READ-UNCOMMITTED" | "READ-COMMITTED" | "REPEATABLE-READ" | "SERIALIZABLE"}
          disable={isolation == "UNKNOWN"}
          className="border border-gray-600 border-dashed rounded-md px-4 py-6" />
      </div>
    </div>
  );
}
