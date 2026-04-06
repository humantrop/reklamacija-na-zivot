"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

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

    if (!ageConfirmed) {
      setError("Moraš potvrditi da imaš 18 ili više godina");
      return;
    }

    if (!termsAccepted) {
      setError("Moraš prihvatiti uslove korišćenja");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error);
      setLoading(false);
      return;
    }

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Registracija uspešna, ali prijava nije uspela. Pokušaj da se prijaviš.");
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <div className="relative flex flex-1 items-center justify-center px-6 overflow-hidden">
      <div className="bg-orb w-72 h-72 bg-accent-pink top-[10%] right-[5%]" />
      <div className="bg-orb w-56 h-56 bg-accent bottom-[10%] left-[10%]" />

      <div className="relative z-10 w-full max-w-md glass-card rounded-2xl p-8">
        <h1 className="text-2xl font-bold text-center mb-2">Napravi nalog</h1>
        <p className="text-muted text-center text-sm mb-8">
          Tvoj identitet ostaje potpuno skriven od sagovornika
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
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-xl border border-surface-light bg-background/50 px-4 py-3 text-foreground placeholder-muted/40 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent transition-colors"
              placeholder="tvoj@email.com"
            />
            <p className="mt-1 text-xs text-muted/60">
              Samo za prijavu — nikad se ne prikazuje drugim korisnicima
            </p>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-muted mb-1.5">
              Lozinka
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-xl border border-surface-light bg-background/50 px-4 py-3 text-foreground placeholder-muted/40 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent transition-colors"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-muted mb-1.5">
              Potvrdi lozinku
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full rounded-xl border border-surface-light bg-background/50 px-4 py-3 text-foreground placeholder-muted/40 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent transition-colors"
              placeholder="••••••••"
            />
          </div>

          {/* Age confirmation */}
          <div className="glass-card rounded-xl p-4 space-y-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={ageConfirmed}
                onChange={(e) => setAgeConfirmed(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-surface-light accent-accent"
              />
              <span className="text-sm text-muted leading-relaxed">
                Potvrđujem da imam <span className="text-foreground font-semibold">18 ili više godina</span>.
                Ova aplikacija nije namenjena maloletnim licima.
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-surface-light accent-accent"
              />
              <span className="text-sm text-muted leading-relaxed">
                Prihvatam{" "}
                <Link href="/uslovi" className="text-accent hover:underline" target="_blank">
                  Uslove korišćenja
                </Link>{" "}
                i{" "}
                <Link href="/privatnost" className="text-accent hover:underline" target="_blank">
                  Politiku privatnosti
                </Link>
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading || !ageConfirmed || !termsAccepted}
            className="glow-button w-full rounded-xl bg-accent px-4 py-3 font-semibold text-white hover:bg-accent-hover transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Registracija..." : "Registruj se"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          Već imaš nalog?{" "}
          <Link href="/login" className="text-accent hover:text-accent-blue transition-colors">
            Prijavi se
          </Link>
        </p>
      </div>
    </div>
  );
}
