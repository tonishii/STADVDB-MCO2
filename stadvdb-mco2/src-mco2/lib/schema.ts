export interface Titles {
  tconst: string;
  primaryTitle: string;
  startYear: number;
  runtimeMinutes: number | null;
  genres: string | null;
}

export interface TransactionLogEntry {
  id: string;
  transactionId: string;
  timestamp: string;
  node: "0" | "1" | "2";

  operation:
    | "START"
    | "INSERT"
    | "UPDATE"
    | "DELETE"
    | "READ"
    | "COMMIT"
    | "ABORT"
    | "READY";

  status?: "PENDING" | "COMPLETED" | "ABORTED" | "REPLICATED";

  isReplication?: boolean;
  sourceNode?: "0" | "1" | "2";
  targetNode?: "0" | "1" | "2";

  values?: Partial<Titles>;
  oldValues?: Partial<Titles>;

  recoveryAction?: "UNDO" | "REDO";
}