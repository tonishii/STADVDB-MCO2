export function addLog(logs: string[], message: string): void {
  logs.push(`[${new Date().toLocaleTimeString() }] ${message}`);
}