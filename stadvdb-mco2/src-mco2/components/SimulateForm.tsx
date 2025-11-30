"use client";

import { useActionState } from "react";
import OutputLogBox from "./OutputLogBox";

interface SimulateFormProps {
  actionFn: (prevState: { logs: string[] }, formData: FormData) => Promise<{ logs: string[] }>;
}

export default function SimulateForm({
  actionFn,
}: SimulateFormProps) {
  const [state, action, pending] = useActionState(actionFn, {
    logs: [],
  });

  return (
    <>
      <form
        className="flex space-x-2 w-full"
        action={action}>
        <input
          className="rounded-md px-2 py-1 border border-neutral-700 w-fit"
          type="text"
          placeholder="Enter tconst here..."
          name="tconst" />
        <button
          className="w-fit bg-blue-600 text-white px-2 rounded-md hover:bg-blue-500 transition-colors duration-200"
          type="submit"
          disabled={pending}>
          Simulate Case
        </button>
      </form>

      <OutputLogBox logs={state.logs}/>
    </>
  );
}