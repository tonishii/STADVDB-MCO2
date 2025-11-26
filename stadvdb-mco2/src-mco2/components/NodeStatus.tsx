"use client";

import { cn } from "../lib/cn";
import StatusIndicator from "./StatusIndicator";

interface NodeStatusProps {
  className?: string;
  name: string;
  online: boolean;
  last_tx: Date;
}

export default function NodeStatus({
  className,
  name,
  online,
  last_tx,
}: NodeStatusProps) {
  return (
    <div className={cn("flex items-center justify-center", className)}>
      [<span className="mx-1 min-w-fit">{name}: </span> {online ? "Online" : "Offline"} <StatusIndicator className="mx-1" online={online} />] Last Tx: { last_tx.toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" }) }
    </div>
  );
}