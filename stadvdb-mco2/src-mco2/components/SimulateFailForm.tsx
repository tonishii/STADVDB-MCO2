"use client";

import { useActionState } from "react";
import OutputLogBox from "./OutputLogBox";

interface SimulateFailFormProps {
  actionFn: (
    prevState: { logs: string[] },
    formData: FormData
  ) => Promise<{ logs: string[] }>;
  caseNumber: number;
}

export default function SimulateFailForm({
  actionFn,
  caseNumber,
}: SimulateFailFormProps) {
  const [state, action, pending] = useActionState(actionFn, { logs: [] });

  return (
    <div className="w-full bg-neutral-900/50 p-6 rounded-xl border border-neutral-800">
      <h2 className="text-xl font-semibold text-white mb-4 glow-white">
        Simulate Case {caseNumber}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <form action={action} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Tconst</label>
            <input
              name="tconst"
              type="text"
              required
              placeholder="Insert Tconst"
              className="w-full rounded bg-neutral-800 border border-neutral-700 text-white px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Primary Title
            </label>
            <input
              name="primaryTitle"
              type="text"
              required
              placeholder="Insert A Show/Movie Title"
              className="w-full rounded bg-neutral-800 border border-neutral-700 text-white px-3 py-2"
            />
          </div>
          <button
            type="submit"
            disabled={pending}
            className="w-full bg-green-600 hover:bg-green-500 text-white font-semibold py-2 rounded transition-colors disabled:opacity-50"
          >
            {pending
              ? "Processing Distributed Transaction..."
              : "Update Record"}
          </button>
        </form>

        <div className="h-full">
          <OutputLogBox logs={state.logs} />
        </div>
      </div>
    </div>
  );
}
