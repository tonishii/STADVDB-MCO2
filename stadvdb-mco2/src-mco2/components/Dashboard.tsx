"use client";

import { useState, useEffect } from "react";
import {
  readTitleWithDelay,
  updateAttributeWithDelay,
} from "@/src-mco2/actions/node_operations";
import InsertTitleForm from "./InsertTitleForm";
import ReportsPanel from "./ReportsPanel";
import { recoverTransaction } from "@/src-mco2/lib/recover_manager";
import {
  failCase1Write,
  failCase2Write,
  failCase3Write,
  failCase4Write,
} from "../actions/fail_cases";
import SearchPanel from "./SearchPanel";
import SimulateFailForm from "./SimulateFailForm";
import LogsTable from "./LogsTable";
import { readLogs } from "../lib/transaction_logger";
import { TransactionLogEntry } from "../lib/schema";

interface NodeDashboardProps {
  nodeName: string;
  currentIsolation: string;
  headerAction: React.ReactNode;
}

export default function NodeDashboard({
  nodeName,
  currentIsolation,
  headerAction,
}: NodeDashboardProps) {
  const [activeTab, setActiveTab] = useState<
    "tests" | "data" | "reports" | "recovery"
  >("tests");

  const [tconst, setTconst] = useState("");
  const [updateCol, setUpdateCol] = useState<
    "primaryTitle" | "runtimeMinutes" | "genres"
  >("primaryTitle");
  const [updateVal, setUpdateVal] = useState("");

  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const [logsData, setLogsData] = useState<TransactionLogEntry[]>([]);

  let currentNodeId: "0" | "1" | "2" = "0";

  if (nodeName.includes("Node 1")) {
    currentNodeId = "1";
  } else if (nodeName.includes("Node 2")) {
    currentNodeId = "2";
  }

  const fetchLogs = async () => {
    const logs = await readLogs(currentNodeId);
    setLogsData(logs);
  };

  useEffect(() => {
    const startupRoutine = async () => {
      await recoverTransaction(Number(currentNodeId));
      await fetchLogs();
    };
    startupRoutine();
  }, [currentNodeId]);

  const addLog = (msg: string) =>
    setLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);

  const handleRead = async () => {
    setLoading(true);
    addLog(`Running Read on ${tconst} (10s Delay)...`);
    const res = await readTitleWithDelay(tconst, 10);

    if (res.success && res.data) {
      addLog(`READ SUCCESS: Found '${res.data.primaryTitle}'`);
      addLog(`SOURCE: ${res.node}`);
    } else {
      addLog(`READ ERROR: ${res.error}`);
    }

    setLoading(false);
    fetchLogs();
  };

  const handleUpdate = async () => {
    if (!updateVal) {
      alert("Please enter a value to update");
      return;
    }
    setLoading(true);
    addLog(`Running Update on ${tconst} (10s Delay)...`);
    addLog(`Setting ${updateCol} = '${updateVal}'`);

    const res = await updateAttributeWithDelay(
      tconst,
      updateCol,
      updateVal,
      10
    );

    if (res.logs) {
      res.logs.forEach((l) => addLog(l));
    }
    setLoading(false);
    fetchLogs();
  };

  const handleRecovery = async () => {
    addLog("Starting Recovery Process...");
    const nodeId = nodeName.includes("Node 1")
      ? 1
      : nodeName.includes("Node 2")
      ? 2
      : 0;
    await recoverTransaction(nodeId);
    addLog("Recovery Scan Complete. Check Server Console for details.");
    fetchLogs();
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white font-mono">
      <header className="border-b border-gray-700 bg-gray-800 p-6 flex justify-between items-center sticky top-0 z-10">
        <div>
          <h1 className="text-2xl font-bold text-blue-400">{nodeName}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={`w-2 h-2 rounded-full bg-green-500 animate-pulse`}
            ></span>
            <span className="text-gray-400 text-sm">Online</span>
            <span className="text-purple-400 text-sm border border-purple-800 px-2 rounded bg-purple-900/30">
              {currentIsolation}
            </span>
          </div>
        </div>
        <div>{headerAction}</div>
      </header>

      <nav className="flex border-b border-gray-700 bg-gray-900">
        {[
          { id: "tests", label: "Concurrency Tests" },
          { id: "data", label: "Manage Data" },
          { id: "reports", label: "Global Reports" },
          { id: "recovery", label: "Failure Recovery" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as "tests" | "data" | "reports" | "recovery")}
            className={`px-6 py-4 hover:bg-gray-800 transition-colors ${
              activeTab === tab.id
                ? "border-b-2 border-blue-500 text-blue-400"
                : "text-gray-400"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <main className="p-8 max-w-7xl mx-auto">
        {/* concurrency stuff */}
        {activeTab === "tests" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                <label className="block text-gray-400 mb-2 text-sm">
                  Target Movie ID (Tconst)
                </label>
                <input
                  value={tconst}
                  onChange={(e) => setTconst(e.target.value)}
                  className="w-full bg-black border border-gray-600 p-3 rounded text-lg text-white"
                />
              </div>

              <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 space-y-4">
                <h3 className="text-lg font-bold text-gray-300 border-b border-gray-600 pb-2">
                  Simulation Actions
                </h3>

                <div className="p-3 bg-blue-900/20 border border-blue-800 rounded">
                  <h4 className="font-bold text-blue-400">
                    Case #1: Concurrent Read
                  </h4>
                  <p className="text-xs text-gray-400 mb-2">
                    Reads the row. Sleeps 10s. Doesn&apos;t block other readers.
                  </p>
                  <button
                    onClick={handleRead}
                    disabled={loading}
                    className="w-full bg-blue-700 hover:bg-blue-600 py-2 rounded text-sm font-bold"
                  >
                    {loading ? "Waiting..." : "Read (10s)"}
                  </button>
                </div>

                <div className="p-3 bg-orange-900/20 border border-orange-800 rounded">
                  <h4 className="font-bold text-orange-400">
                    Case #2 & #3: Write Update
                  </h4>
                  <p className="text-xs text-gray-400 mb-2">
                    Updates row. Sleeps 10s. Blocks reads (Case 2) & writes
                    (Case 3).
                  </p>

                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="col-span-1">
                      <label className="text-xs text-gray-500 block mb-1">
                        Attribute
                      </label>
                      <select
                        value={updateCol}
                        onChange={(e) => setUpdateCol(e.target.value as "primaryTitle" | "runtimeMinutes" | "genres")}
                        className="w-full bg-black border border-gray-600 p-2 rounded text-sm"
                      >
                        <option value="primaryTitle">Title</option>
                        <option value="runtimeMinutes">Runtime</option>
                        <option value="genres">Genres</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs text-gray-500 block mb-1">
                        New Value
                      </label>
                      <input
                        value={updateVal}
                        onChange={(e) => setUpdateVal(e.target.value)}
                        className="w-full bg-black border border-gray-600 p-2 rounded text-sm"
                        placeholder="Enter new value..."
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleUpdate}
                    disabled={loading}
                    className="w-full bg-orange-700 hover:bg-orange-600 py-2 rounded text-sm font-bold"
                  >
                    {loading ? "Waiting..." : "Update (10s)"}
                  </button>
                </div>
              </div>
            </div>

            {/* logs */}
            <div className="bg-black p-4 rounded-lg border border-gray-700 h-[500px] flex flex-col">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-gray-500 text-sm uppercase">
                  Transaction Logs
                </h3>
                <button
                  onClick={() => setLogs([])}
                  className="text-xs text-red-500 hover:text-red-400"
                >
                  Clear
                </button>
              </div>
              <div className="flex-1 overflow-y-auto font-mono text-sm space-y-2">
                {logs.map((log, i) => (
                  <div
                    key={i}
                    className="border-l-2 border-gray-600 pl-2 text-gray-300"
                  >
                    {log}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* db management */}
        {activeTab === "data" && (
          <div className="space-y-8">
            <InsertTitleForm />
            <SearchPanel />
          </div>
        )}

        {/* reports */}
        {activeTab === "reports" && <ReportsPanel />}

        {/* recovery */}
        {activeTab === "recovery" && (
          <div className="grid gap-4">
            <div className="bg-gray-800 p-8 rounded border border-gray-700">
              <button
                onClick={fetchLogs}
                className="bg-blue-700 hover:bg-blue-500 rounded-2xl py-2 px-3 transition-colors mb-3"
              >
                Refresh Logs
              </button>
              <LogsTable rows={logsData} />
            </div>
            <div className="bg-gray-800 p-8 rounded border border-gray-700 text-center">
              <h2 className="text-2xl font-bold text-red-500 mb-4">
                Node Failure Recovery
              </h2>
              <p className="text-gray-300 mb-8 max-w-xl mx-auto">
                This triggers the Transaction Log Manager to scan the local JSON
                logs. It will identify &quot;Pending&quot; transactions and attempt to
                REDO (if committed) or UNDO (if aborted) them to restore
                consistency.
              </p>
              <button
                onClick={handleRecovery}
                className="bg-red-600 hover:bg-red-500 text-white px-8 py-4 rounded-lg font-bold text-lg shadow-lg shadow-red-900/50"
              >
                Run Recovery Manager
              </button>
            </div>
            <div className="bg-gray-800 p-8 rounded border border-gray-700">
              <SimulateFailForm actionFn={failCase1Write} caseNumber={1} />
            </div>
            <div className="bg-gray-800 p-8 rounded border border-gray-700">
              <SimulateFailForm actionFn={failCase2Write} caseNumber={2} />
            </div>
            <div className="bg-gray-800 p-8 rounded border border-gray-700">
              <SimulateFailForm actionFn={failCase3Write} caseNumber={3} />
            </div>
            <div className="bg-gray-800 p-8 rounded border border-gray-700">
              <SimulateFailForm actionFn={failCase4Write} caseNumber={4} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
