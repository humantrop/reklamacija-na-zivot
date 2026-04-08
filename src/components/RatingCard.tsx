"use client";

import { useState } from "react";
import { Star } from "lucide-react";

interface RatingCardProps {
  onSubmit: (score: number) => void;
  onSkip: () => void;
}

export default function RatingCard({ onSubmit, onSkip }: RatingCardProps) {
  const [hovered, setHovered] = useState(0);
  const [selected, setSelected] = useState(0);

  return (
    <div className="border-t border-glass-border p-6 text-center glass-card">
      <p className="text-sm text-muted mb-1">Kako bi ocenio/la ovaj razgovor?</p>
      <div className="flex justify-center gap-1 my-4">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            onClick={() => setSelected(star)}
            className="p-1 transition-transform hover:scale-110"
          >
            <Star
              className="w-8 h-8 transition-colors"
              fill={(hovered || selected) >= star ? "#f59e0b" : "transparent"}
              color={(hovered || selected) >= star ? "#f59e0b" : "#64748b"}
            />
          </button>
        ))}
      </div>
      <div className="flex gap-3 justify-center">
        <button
          onClick={() => { if (selected > 0) onSubmit(selected); }}
          disabled={selected === 0}
          className="rounded-xl bg-accent px-6 py-2 font-medium text-white hover:bg-accent-hover transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Oceni
        </button>
        <button
          onClick={onSkip}
          className="text-sm text-muted hover:text-foreground transition-colors px-4 py-2"
        >
          Preskoči
        </button>
      </div>
    </div>
  );
}
