"use server";

import LogsTable from "@/src-mco2/components/LogsTable";
import { readNodeLogs } from "@/src-mco2/lib/transaction_manager";
import SimulateFailForm from "@/src-mco2/components/SimulateFailForm";
import {
  failCase1Write,
  failCase2Write,
  failCase3Write,
  failCase4Write,
} from "@/src-mco2/actions/fail_cases";

export default async function recoverPage() {
  const rows = readNodeLogs(0);
  return (
    <div className="flex min-h-screen items-center justify-center font-sans">
      <main className="flex min-h-screen w-full max-w-4xl flex-col space-y-20 items-center py-32 px-16 sm:items-start">
        <LogsTable rows={rows} />
        <SimulateFailForm actionFn={failCase1Write} />
        <SimulateFailForm actionFn={failCase2Write} />
        <SimulateFailForm actionFn={failCase3Write} />
        <SimulateFailForm actionFn={failCase4Write} />
      </main>
    </div>
  );
}
