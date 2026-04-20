"use client";

import { useState } from "react";
import { Star, Send } from "lucide-react";

const FEEDBACK_TAGS = [
  "Pomoglo mi je",
  "Odličan razgovor",
  "Kratko je bilo",
  "Nije bilo hemije",
  "Sagovornik je bio grub",
];

interface RatingCardProps {
  onSubmit: (score: number, tags?: string[], freeText?: string) => void;
  onSkip: () => void;
}

export default function RatingCard({ onSubmit, onSkip }: RatingCardProps) {
  const [hovered, setHovered] = useState(0);
  const [selected, setSelected] = useState(0);
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [freeText, setFreeText] = useState("");

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleRatingNext = () => {
    if (selected > 0) setStep(2);
  };

  const handleSubmitFeedback = () => {
    onSubmit(selected, selectedTags.length > 0 ? selectedTags : undefined, freeText.trim() || undefined);
  };

  const handleSkipFeedback = () => {
    onSubmit(selected);
  };

  if (step === 1) {
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
            onClick={handleRatingNext}
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

  return (
    <div className="border-t border-glass-border p-6 text-center glass-card animate-slide-up">
      <p className="text-sm text-muted mb-3">Imaš još nešto da kažeš?</p>

      {/* Feedback tags */}
      <div className="flex flex-wrap justify-center gap-2 mb-4">
        {FEEDBACK_TAGS.map((tag) => (
          <button
            key={tag}
            onClick={() => toggleTag(tag)}
            className={`glass-card rounded-lg px-3 py-1.5 text-xs transition-all ${
              selectedTags.includes(tag)
                ? "border-accent text-accent font-medium"
                : "text-muted hover:text-foreground hover:border-accent/30"
            }`}
          >
            {tag}
          </button>
        ))}
      </div>

      {/* Free text */}
      <textarea
        value={freeText}
        onChange={(e) => setFreeText(e.target.value.slice(0, 200))}
        maxLength={200}
        placeholder="Napiši komentar (opciono)..."
        rows={2}
        className="w-full max-w-md mx-auto rounded-xl border border-surface-light bg-background/50 px-4 py-2.5 text-sm text-foreground placeholder-muted/40 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent transition-colors resize-none"
      />
      <p className="text-[10px] text-muted/50 mt-1">{freeText.length}/200</p>

      {/* Actions */}
      <div className="flex gap-3 justify-center mt-3">
        <button
          onClick={handleSubmitFeedback}
          className="rounded-xl bg-accent px-6 py-2 font-medium text-white hover:bg-accent-hover transition-colors inline-flex items-center gap-2"
        >
          <Send className="w-4 h-4" /> Pošalji
        </button>
        <button
          onClick={handleSkipFeedback}
          className="text-sm text-muted hover:text-foreground transition-colors px-4 py-2"
        >
          Preskoči
        </button>
      </div>
    </div>
  );
}
