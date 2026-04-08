"use client";

import { useEffect, useState } from "react";
import { Timer } from "lucide-react";

interface ChatTimerProps {
  startedAt: number;
}

export default function ChatTimer({ startedAt }: ChatTimerProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const update = () => setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  const mins = Math.floor(elapsed / 60).toString().padStart(2, "0");
  const secs = (elapsed % 60).toString().padStart(2, "0");

  return (
    <span className="text-xs text-muted inline-flex items-center gap-1 tabular-nums">
      <Timer className="w-3 h-3" />
      {mins}:{secs}
    </span>
  );
}
