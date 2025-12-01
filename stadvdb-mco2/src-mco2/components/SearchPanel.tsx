"use client";

import { useState } from "react";
import { searchMovies } from "../actions/search_titles";
import { Titles } from "../lib/schema";
import TitlesTable from "./TitlesTable";

export default function SearchPanel() {
  const [rows, setRows] = useState<Titles[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (formData: FormData) => {
    setLoading(true);
    const result = await searchMovies(formData);
    if (result.success) {
      setRows(result.data);
    }
    setLoading(false);
  };

  return (
    <div className="w-full bg-neutral-900/50 p-6 rounded-xl border border-neutral-800 mt-8">
      <h2 className="text-xl font-semibold text-white mb-4 glow-white">Search Central Database</h2>
      
      <form action={handleSearch} className="flex gap-4 mb-6 flex-wrap">
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
          {loading ? "Searching..." : "Search"}
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