"use client";

import { useState } from "react";
import { generateReports, ReportData } from "../actions/generate_reports";

export default function ReportsPanel() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const result = await generateReports();
      setData(result);
      setIsVisible(true);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full bg-neutral-900/50 p-6 rounded-xl border border-neutral-800 mt-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-white glow-white">System Reports</h2>
        <div className="flex gap-3">
            {data && isVisible && (
                <button 
                    onClick={() => setIsVisible(false)}
                    className="bg-neutral-700 hover:bg-neutral-600 text-white px-4 py-2 rounded transition-colors"
                >
                    Hide Reports
                </button>
            )}
            
            {data && !isVisible && (
                <button 
                    onClick={() => setIsVisible(true)}
                    className="bg-neutral-700 hover:bg-neutral-600 text-white px-4 py-2 rounded transition-colors"
                >
                    Show Reports
                </button>
            )}

            <button 
                onClick={handleGenerate}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded transition-colors"
            >
                {loading ? "Analyzing Distributed System..." : "Generate New Report"}
            </button>
        </div>
      </div>

      {data && isVisible && (
        <div className="space-y-6 font-mono text-sm border-t border-neutral-800 pt-6 animate-in fade-in slide-in-from-top-4 duration-300">
          
          {/* Report 1: Consistency */}
          <div className="bg-black p-4 rounded border border-neutral-700">
            <h3 className="text-blue-400 font-bold mb-2 uppercase">Report 1: Global Consistency</h3>
            <div className="grid grid-cols-3 gap-4 text-center mb-4">
              <div className="bg-neutral-800 p-2 rounded">
                <span className="block text-gray-500 text-xs">Node 0 (Total)</span>
                <span className="text-xl text-white">{data.consistency.node0Count}</span>
              </div>
              <div className="bg-neutral-800 p-2 rounded">
                <span className="block text-gray-500 text-xs">Node 1 (1900-1915)</span>
                <span className="text-xl text-white">{data.consistency.node1Count}</span>
              </div>
              <div className="bg-neutral-800 p-2 rounded">
                <span className="block text-gray-500 text-xs">Node 2 (1916-1925)</span>
                <span className="text-xl text-white">{data.consistency.node2Count}</span>
              </div>
            </div>
            <div className={`p-2 text-center font-bold rounded ${data.consistency.isConsistent ? "bg-green-900/30 text-green-400" : "bg-red-900/30 text-red-400"}`}>
              Status: {data.consistency.isConsistent ? "CONSISTENT (N0 = N1 + N2)" : "INCONSISTENT (Sync Required)"}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Report 2: Distribution */}
            <div className="bg-black p-4 rounded border border-neutral-700">
              <h3 className="text-blue-400 font-bold mb-2 uppercase">Report 2: Load Distribution</h3>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-gray-400 mb-1">
                    <span>Node 1 Load</span>
                    <span>{data.distribution.node1Pct}%</span>
                  </div>
                  <div className="w-full bg-neutral-800 h-2 rounded overflow-hidden">
                    <div className="bg-purple-500 h-full" style={{ width: `${data.distribution.node1Pct}%` }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-gray-400 mb-1">
                    <span>Node 2 Load</span>
                    <span>{data.distribution.node2Pct}%</span>
                  </div>
                  <div className="w-full bg-neutral-800 h-2 rounded overflow-hidden">
                    <div className="bg-orange-500 h-full" style={{ width: `${data.distribution.node2Pct}%` }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Report 3: Genre Analysis */}
            <div className="bg-black p-4 rounded border border-neutral-700">
              <h3 className="text-blue-400 font-bold mb-2 uppercase">Report 3: Era Analysis</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-purple-400 block mb-2">Top Genres (1900-1915)</span>
                  <ul className="space-y-1 text-gray-300">
                    {data.genres.node1Top.map((g, i) => (
                      <li key={i}>{i+1}. {g.genre} ({g.count})</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <span className="text-xs text-orange-400 block mb-2">Top Genres (1916-1925)</span>
                  <ul className="space-y-1 text-gray-300">
                    {data.genres.node2Top.map((g, i) => (
                      <li key={i}>{i+1}. {g.genre} ({g.count})</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}