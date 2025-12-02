"use client";

import { useState } from "react";
import { searchTitles } from "../actions/search_titles";
import { Titles } from "../lib/schema";
import TitlesTable from "./TitlesTable";

export default function SearchPanel() {
  const [rows, setRows] = useState<Titles[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (formData: FormData) => {
    setLoading(true);
    const result = await searchTitles(formData);
    if (result.success) {
      setRows(result.data);
    }
    setLoading(false);
  };

  return (
    <div className="w-full bg-neutral-900/50 p-6 rounded-xl border border-neutral-800 mt-8">
      <h2 className="text-xl font-semibold text-white mb-4 glow-white">View / Search Data Tables</h2>
      
      <form action={handleSearch} className="flex gap-4 mb-6 flex-wrap">
        <select 
          name="targetNode" 
          className="bg-neutral-800 border border-neutral-700 rounded px-3 py-2 text-sm text-white focus:border-blue-500 outline-none"
        >
          <option value="NODE0">Node 0 (Central - All)</option>
          <option value="NODE1">Node 1 (1900-1915)</option>
          <option value="NODE2">Node 2 (1916-1925)</option>
        </select>

        <input
          name="tconst"
          type="text"
          placeholder="Search ID (e.g. tt00001)"
          className="rounded bg-neutral-800 border border-neutral-700 text-white px-3 py-2 focus:border-blue-500 outline-none"
        />
        <input
          name="title"
          type="text"
          placeholder="Search Title..."
          className="rounded bg-neutral-800 border border-neutral-700 text-white px-3 py-2 focus:border-blue-500 outline-none grow"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded font-bold transition-colors disabled:opacity-50"
        >
          {loading ? "Searching..." : "View Records"}
        </button>
      </form>

      {rows.length > 0 ? (
        <TitlesTable rows={rows} title={`Search Results (${rows.length})`} />
      ) : (
        <div className="text-gray-500 italic text-center py-10 border border-dashed border-gray-800 rounded">
            No results found or no search performed.
        </div>
      )}
    </div>
  );
}