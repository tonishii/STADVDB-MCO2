interface OutputLogBoxProps {
  logs?: string[];
}

export default function OutputLogBox({ logs }: OutputLogBoxProps) {
  return (
    <div className="w-full max-w-4xl bg-neutral-900 rounded-md p-4 h-64 overflow-y-auto font-mono text-sm">
      {!logs || logs.length === 0 ? (
        <p className="text-gray-500">No logs to display.</p>
      ) : (
        logs.map((line, index) => (
          <p key={index} className="text-gray-300">
            {line}
          </p>
        ))
      )}
    </div>
  );
}