"use client";

import { useState } from "react";
import { X } from "lucide-react";

interface ReportModalProps {
  onSubmit: (reason: string, description?: string) => void;
  onClose: () => void;
}

const REASONS = [
  { id: "uvrede", label: "Uvrede ili govor mržnje" },
  { id: "pretnje", label: "Pretnje ili zastrašivanje" },
  { id: "spam", label: "Spam ili reklame" },
  { id: "ostalo", label: "Ostalo" },
];

export default function ReportModal({ onSubmit, onClose }: ReportModalProps) {
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="glass-card rounded-2xl p-6 w-full max-w-sm mx-4 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted hover:text-foreground transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-lg font-bold mb-1">Prijavi korisnika</h3>
        <p className="text-sm text-muted mb-4">Izaberi razlog prijave</p>

        <div className="space-y-2 mb-4">
          {REASONS.map((r) => (
            <label
              key={r.id}
              className={`flex items-center gap-3 rounded-xl p-3 cursor-pointer transition-all ${
                reason === r.id
                  ? "bg-accent/10 border border-accent/30"
                  : "bg-surface/50 border border-transparent hover:border-surface-light"
              }`}
            >
              <input
                type="radio"
                name="reason"
                value={r.id}
                checked={reason === r.id}
                onChange={() => setReason(r.id)}
                className="sr-only"
              />
              <div
                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  reason === r.id ? "border-accent" : "border-muted"
                }`}
              >
                {reason === r.id && <div className="w-2 h-2 rounded-full bg-accent" />}
              </div>
              <span className="text-sm">{r.label}</span>
            </label>
          ))}
        </div>

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Dodatni opis (opciono)"
          rows={2}
          className="w-full rounded-xl border border-surface-light bg-background/50 px-4 py-2.5 text-sm text-foreground placeholder-muted/40 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent transition-colors resize-none mb-4"
        />

        <div className="flex gap-3">
          <button
            onClick={() => { if (reason) onSubmit(reason, description || undefined); }}
            disabled={!reason}
            className="flex-1 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Prijavi
          </button>
          <button
            onClick={onClose}
            className="glass-card rounded-xl px-4 py-2.5 text-sm text-muted hover:text-foreground transition-all"
          >
            Otkaži
          </button>
        </div>
      </div>
    </div>
  );
}
