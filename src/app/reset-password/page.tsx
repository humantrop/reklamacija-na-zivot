"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Lock, CheckCircle, XCircle } from "lucide-react";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!token) {
    return (
      <div className="text-center">
        <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
          <XCircle className="w-7 h-7 text-red-400" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Nevažeći link</h1>
        <p className="text-muted text-sm mb-6">
          Ovaj link za reset lozinke nije ispravan.
        </p>
        <Link href="/forgot-password" className="text-accent hover:text-accent-blue transition-colors text-sm">
          Zatraži novi link
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Lozinke se ne poklapaju");
      return;
    }

    if (password.length < 6) {
      setError("Lozinka mora imati najmanje 6 karaktera");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error);
    } else {
      setSuccess(true);
    }
  };

  if (success) {
    return (
      <div className="text-center">
        <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-7 h-7 text-accent" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Lozinka promenjena</h1>
        <p className="text-muted text-sm mb-6">
          Tvoja lozinka je uspešno promenjena. Možeš se prijaviti sa novom lozinkom.
        </p>
        <Link
          href="/login"
          className="inline-block rounded-xl bg-accent px-6 py-2.5 font-semibold text-white hover:bg-accent-hover transition-colors"
        >
          Prijavi se
        </Link>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-2xl font-bold text-center mb-2">Nova lozinka</h1>
      <p className="text-muted text-center text-sm mb-8">
        Unesi novu lozinku za svoj nalog
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-muted mb-1.5">
            Nova lozinka
          </label>
          <div className="relative">
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-xl border border-surface-light bg-background/50 px-4 py-3 pl-11 text-foreground placeholder-muted/40 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent transition-colors"
              placeholder="••••••••"
            />
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted/40" />
          </div>
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-muted mb-1.5">
            Potvrdi novu lozinku
          </label>
          <div className="relative">
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full rounded-xl border border-surface-light bg-background/50 px-4 py-3 pl-11 text-foreground placeholder-muted/40 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent transition-colors"
              placeholder="••••••••"
            />
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted/40" />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="glow-button w-full rounded-xl bg-accent px-4 py-3 font-semibold text-white hover:bg-accent-hover transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Čuvanje..." : "Promeni lozinku"}
        </button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="relative flex flex-1 items-center justify-center px-6 overflow-hidden">
      <div className="bg-orb w-72 h-72 bg-accent top-[10%] left-[5%]" />
      <div className="bg-orb w-56 h-56 bg-accent-blue bottom-[10%] right-[10%]" />

      <div className="relative z-10 w-full max-w-md glass-card rounded-2xl p-8">
        <Suspense fallback={<div className="text-muted animate-pulse text-center">Učitavanje...</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
