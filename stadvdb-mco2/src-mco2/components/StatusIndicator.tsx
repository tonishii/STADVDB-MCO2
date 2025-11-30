"use client";

import { cn } from "../utils/cn";

interface StatusIndicatorProps {
  className?: string;
  online: boolean;
}

export default function StatusIndicator({
  className,
  online,
}: StatusIndicatorProps) {
  return (
    <span
      className= {cn(
        `w-2 h-2 rounded-full ${online ? "bg-green-500" : "bg-red-500"}`,
        "animate-pulse",
        className)}
    > </span>
  );
}
