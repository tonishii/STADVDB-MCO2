"use client";

import { cn } from "../lib/cn";
import StatusIndicator from "./StatusIndicator";

interface NodeStatusProps {
  className?: string;
  name: string;
  online: boolean;
}

export default function NodeStatus({
  className,
  name,
  online,
}: NodeStatusProps) {
  return (
    <div className={cn("flex items-center justify-center glow-white", className)}>
      [<span className="mx-1 min-w-fit">{name}: </span> {online ? "Online" : "Offline"} <StatusIndicator className="mx-1" online={online} />]
    </div>
  );
}