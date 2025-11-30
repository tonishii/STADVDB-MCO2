import { Titles } from "../lib/schema";

interface TitlesTableProps {
  rows: Titles[];
  title: string;
}

export default function TitlesTable({ rows, title }: TitlesTableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-700">
      <table className="min-w-full text-sm text-neutral-200">
        <caption className="my-4 glow-white text-lg font-semibold text-neutral-100">
          {title}
        </caption>
        <thead className="bg-neutral-800/60 text-neutral-300 uppercase text-xs tracking-wide">
          <tr>
            <th className="px-4 py-3 text-left">Tconst</th>
            <th className="px-4 py-3 text-left">Primary Title</th>
            <th className="px-4 py-3 text-left">Start Year</th>
            <th className="px-4 py-3 text-left">Runtime Minutes</th>
            <th className="px-4 py-3 text-left">Genres</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-neutral-800">
          {rows.map((row) => (
            <tr
              key={row.tconst}
              className="hover:bg-neutral-800/40 transition-colors">
              <td className="px-4 py-3">{row.tconst}</td>
              <td className="px-4 py-3">{row.primaryTitle}</td>
              <td className="px-4 py-3">{row.startYear}</td>
              <td className="px-4 py-3">{row.runtimeMinutes}</td>
              <td className="px-4 py-3">{row.genres}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
