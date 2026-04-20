"use client";

import { useState } from "react";
import { Send, X } from "lucide-react";

const CATEGORIES = [
  { value: "BUG", label: "Bug / Greška" },
  { value: "PREDLOG", label: "Predlog" },
  { value: "POHVALA", label: "Pohvala" },
  { value: "OSTALO", label: "Ostalo" },
] as const;

interface AppFeedbackModalProps {
  onClose: () => void;
}

export default function AppFeedbackModal({ onClose }: AppFeedbackModalProps) {
  const [category, setCategory] = useState<string>("PREDLOG");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    if (!message.trim()) return;
    setSending(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, message: message.trim().slice(0, 500) }),
      });
      if (res.ok) {
        setSent(true);
        setTimeout(onClose, 1500);
      }
    } catch {
      // silently fail
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="glass-card rounded-2xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold">Predloži poboljšanje</h2>
          <button onClick={onClose} className="p-1 text-muted hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {sent ? (
          <div className="text-center py-8">
            <p className="text-accent font-medium">Hvala na povratnoj informaciji!</p>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <label className="text-xs text-muted font-medium uppercase tracking-wider mb-1.5 block">Kategorija</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-surface-light bg-background/50 px-4 py-2.5 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent transition-colors"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label className="text-xs text-muted font-medium uppercase tracking-wider mb-1.5 block">Poruka</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, 500))}
                maxLength={500}
                placeholder="Opiši šta bi poboljšao/la..."
                rows={4}
                className="w-full rounded-xl border border-surface-light bg-background/50 px-4 py-2.5 text-sm text-foreground placeholder-muted/40 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent transition-colors resize-none"
              />
              <p className="text-[10px] text-muted/50 mt-1">{message.length}/500</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSubmit}
                disabled={!message.trim() || sending}
                className="flex-1 rounded-xl bg-accent px-6 py-2.5 font-medium text-white hover:bg-accent-hover transition-colors disabled:opacity-30 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" /> {sending ? "Šalje se..." : "Pošalji"}
              </button>
              <button
                onClick={onClose}
                className="glass-card rounded-xl px-6 py-2.5 text-sm font-medium text-muted hover:text-foreground transition-all"
              >
                Otkaži
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
