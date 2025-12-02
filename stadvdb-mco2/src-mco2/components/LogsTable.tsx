import { TransactionLogEntry } from "../lib/schema";

interface LogTableProps {
  rows: TransactionLogEntry[];
}

function groupLogs(rows: TransactionLogEntry[]) {
  const groupedLogs: Record<string, TransactionLogEntry[]> = {};

  rows.forEach((log) => {
    if (!groupedLogs[log.transactionId]) {
      groupedLogs[log.transactionId] = [];
    }
    groupedLogs[log.transactionId].push(log);
  });

  return groupedLogs;
}

export default function LogsTable({ rows }: LogTableProps) {
  const groupedLogs = groupLogs(rows);
  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-700">
      <table className="min-w-full text-sm text-neutral-200">
        <thead className="bg-neutral-800/60 text-neutral-300 uppercase text-xs tracking-wide">
          <tr>
            <th className="px-4 py-3 text-left">Transaction ID</th>
            <th className="px-4 py-3 text-left">Operations</th>
            <th className="px-4 py-3 text-left">Status</th>
            <th className="px-4 py-3 text-left">Timestamp</th>
            <th className="px-4 py-3 text-left">New Values</th>
            <th className="px-4 py-3 text-left">Old Values</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-800">
          {Object.entries(groupedLogs).length > 0 ? (
            Object.entries(groupedLogs).map(([transactionId, logs]) => {
              const firstLog = logs[0];

              return (
                <tr
                  key={transactionId}
                  className="hover:bg-neutral-800/40 transition-colors"
                >
                  <td className="px-4 py-2">{transactionId}</td>
                  <td className="px-4 py-2">
                    {logs.map((log) => (
                      <div key={log.id}>{log.operation}</div>
                    ))}
                  </td>
                  <td className="px-4 py-2">{firstLog.status} </td>
                  <td className="px-4 py-2">{firstLog.timestamp}</td>
                  <td className="px-4 py-2">
                    {logs.map((log) => (
                      <div key={log.id}>
                        {log.values ? (
                          <div>
                            <ul className="list-disc pl-5">
                              {Object.entries(log.values).map(
                                ([key, value]) => (
                                  <li key={key}>
                                    <strong>{key}:</strong>{" "}
                                    {JSON.stringify(value)}
                                  </li>
                                )
                              )}
                            </ul>
                          </div>
                        ) : (
                          ""
                        )}
                      </div>
                    ))}
                  </td>
                  <td className="px-4 py-2">
                    {logs.map((log) => (
                      <div key={log.id}>
                        {log.oldValues ? (
                          <div>
                            <ul className="list-disc pl-5">
                              {Object.entries(log.oldValues).map(
                                ([key, value]) => (
                                  <li key={key}>
                                    <strong>{key}:</strong>{" "}
                                    {JSON.stringify(value)}
                                  </li>
                                )
                              )}
                            </ul>
                          </div>
                        ) : (
                          ""
                        )}
                      </div>
                    ))}
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={4} className="text-center px-4 py-2 text-gray-500">
                No Logs
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
