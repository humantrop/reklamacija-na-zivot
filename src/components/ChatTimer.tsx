"use client";

import { useEffect, useState } from "react";
import { Timer, Infinity } from "lucide-react";

interface ChatTimerProps {
  startedAt: number;
  timeLimitRemoved?: boolean;
}

const TIME_LIMIT_SECONDS = 5 * 60;

export default function ChatTimer({ startedAt, timeLimitRemoved }: ChatTimerProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const update = () => setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  const mins = Math.floor(elapsed / 60).toString().padStart(2, "0");
  const secs = (elapsed % 60).toString().padStart(2, "0");

  const remaining = TIME_LIMIT_SECONDS - elapsed;
  const isLow = !timeLimitRemoved && remaining <= 60 && remaining > 0;

  return (
    <span className={`text-xs inline-flex items-center gap-1 tabular-nums ${isLow ? "text-amber-400" : "text-muted"}`}>
      {timeLimitRemoved ? <Infinity className="w-3 h-3 text-accent" /> : <Timer className="w-3 h-3" />}
      {mins}:{secs}
    </span>
  );
}
