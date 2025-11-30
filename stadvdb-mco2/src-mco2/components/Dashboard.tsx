"use client";

import { useState } from "react";
import { readTitleWithDelay } from "@/src-mco2/lib/transaction"; 

interface NodeDashboardProps {
  nodeName: string;
  headerAction: React.ReactNode; 
}

export default function NodeDashboard({ nodeName, headerAction }: NodeDashboardProps) {
  const [tconst, setTconst] = useState("");
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const addLog = (msg: string) => setLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);

  const handleRead = async () => {
    setLoading(true);
    addLog(`Starting Read Transaction on ${nodeName} (10s delay)...`);
    
    try {
      const result = await readTitleWithDelay(tconst, 10); 
      
      if (result.success) {
        addLog(`SUCCESS: Read '${result.data?.primaryTitle}' from ${result.node}`);
      } else {
        addLog(`ERROR: ${result.error}`);
      }
    } catch (e) {
      addLog("System Error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-10 font-mono">
      <header className="border-b border-gray-700 pb-5 mb-10 flex justify-between items-center">
        <div>
            <h1 className="text-3xl font-bold text-blue-400">{nodeName}</h1>
            <p className="text-gray-400">Distributed Transaction Manager</p>
        </div>
        
        <div>
            {headerAction}
        </div>
      </header>

      <main className="grid grid-cols-1 md:grid-cols-2 gap-10">
        <div className="space-y-6">
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
            <h2 className="text-xl font-bold mb-4 border-b border-gray-600 pb-2">Target Data</h2>
            <input 
              value={tconst} 
              onChange={(e) => setTconst(e.target.value)}
              className="w-full bg-gray-900 border border-gray-600 p-3 rounded text-lg focus:outline-none focus:border-blue-500"
              placeholder="Enter Movie ID"
            />
          </div>

          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
             <h2 className="text-xl font-bold mb-4 border-b border-gray-600 pb-2">Actions</h2>
             <div className="flex flex-col gap-4">
               <button 
                 onClick={handleRead}
                 disabled={loading}
                 className={`p-4 rounded font-bold text-center transition-colors ${loading ? 'bg-gray-600 cursor-wait' : 'bg-green-600 hover:bg-green-500'}`}
               >
                 {loading ? "Transaction In Progress..." : "Case #1: Read (10s Delay)"}
               </button>
             </div>
          </div>
        </div>

        <div className="bg-black p-6 rounded-lg border border-gray-700 h-[500px] overflow-y-auto font-mono text-sm">
          <h3 className="text-gray-500 mb-2 uppercase tracking-wider">Transaction Logs</h3>
          {logs.length === 0 && <p className="text-gray-700 italic">No logs yet...</p>}
          {logs.map((log, i) => (
            <div key={i} className="mb-2 border-l-2 border-blue-500 pl-3 py-1 text-gray-300">
              {log}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}