"use server";

import { changeIsolationLevel } from "../actions/isolation_change";
import { cn } from "../lib/cn";

interface IsolationChangeBtnProps {
  currentLevel?: "READ-UNCOMMITTED" | "READ-COMMITTED" | "REPEATABLE-READ" | "SERIALIZABLE";
  className?: string;
  disable?: boolean;
}

export default async function IsolationChangeBtn({
  currentLevel,
  className,
  disable,
}: IsolationChangeBtnProps) {
  return (
    <form
      key={currentLevel}
      action={changeIsolationLevel}
      className={cn("flex flex-col space-y-2 items-end", className)} >
      <select
        name="isolation_level"
        defaultValue={currentLevel}
        disabled={disable}
        className="bg-gray-800 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors duration-200">
        <option value="READ-UNCOMMITTED">READ-UNCOMMITTED</option>
        <option value="READ-COMMITTED">READ-COMMITTED</option>
        <option value="REPEATABLE-READ">REPEATABLE-READ</option>
        <option value="SERIALIZABLE">SERIALIZABLE</option>
      </select>
      <button
        type="submit"
        className="w-fit bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-500 transition-colors duration-200">
        Set Isolation Level
      </button>
    </form>
  );
}