interface OutputLogBoxProps {
  logs?: string[];
}

export default function OutputLogBox({ logs }: OutputLogBoxProps) {
  return (
    <div className="bg-black p-6 rounded-lg border border-neutral-900 h-[500px] overflow-y-auto font-mono text-sm">
      <h3 className="text-gray-500 mb-2 uppercase">Transaction Logs</h3>
      { !logs || logs.length === 0 ? (
        <p className="text-gray-700 italic">No logs to display...</p>
      ) : (
        logs.map((log, i) => (
          <div key={i} className="mb-2 border-l-2 border-blue-600 pl-3 py-1 text-gray-300">
            {log}
          </div>
        )
      ))}
    </div>
    // <div className="w-full max-w-4xl bg-neutral-900 rounded-md p-4 h-64 overflow-y-auto font-mono text-sm">
    //   {!logs || logs.length === 0 ? (
    //     <p className="text-gray-500">No logs to display.</p>
    //   ) : (
    //     logs.map((line, index) => (
    //       <p key={index} className="text-gray-300">
    //         {line}
    //       </p>
    //     ))
    //   )}
    // </div>
  );
}