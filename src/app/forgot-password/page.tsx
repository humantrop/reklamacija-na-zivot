"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error);
    } else {
      setSent(true);
    }
  };

  return (
    <div className="relative flex flex-1 items-center justify-center px-6 overflow-hidden">
      <div className="bg-orb w-72 h-72 bg-accent top-[10%] left-[5%]" />
      <div className="bg-orb w-56 h-56 bg-accent-blue bottom-[10%] right-[10%]" />

      <div className="relative z-10 w-full max-w-md glass-card rounded-2xl p-8">
        {sent ? (
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-7 h-7 text-accent" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Proveri email</h1>
            <p className="text-muted text-sm mb-6 leading-relaxed">
              Ako nalog sa ovim emailom postoji, poslali smo link za promenu lozinke.
              Proveri i spam folder.
            </p>
            <Link
              href="/login"
              className="text-accent hover:text-accent-blue transition-colors text-sm"
            >
              ← Nazad na prijavu
            </Link>
          </div>
        ) : (
          <>
            <Link
              href="/login"
              className="text-sm text-muted hover:text-foreground transition-colors mb-6 inline-flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Nazad na prijavu
            </Link>

            <h1 className="text-2xl font-bold mb-2">Zaboravljena lozinka</h1>
            <p className="text-muted text-sm mb-8">
              Unesi email sa kojim si se registrovao/la i poslaćemo ti link za reset.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-muted mb-1.5">
                  Email
                </label>
                <div className="relative">
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full rounded-xl border border-surface-light bg-background/50 px-4 py-3 pl-11 text-foreground placeholder-muted/40 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent transition-colors"
                    placeholder="tvoj@email.com"
                  />
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted/40" />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="glow-button w-full rounded-xl bg-accent px-4 py-3 font-semibold text-white hover:bg-accent-hover transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Slanje..." : "Pošalji link za reset"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
