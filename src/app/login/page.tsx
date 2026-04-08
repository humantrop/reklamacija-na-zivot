"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Pogrešan email ili lozinka");
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <div className="relative flex flex-1 items-center justify-center px-6 overflow-hidden">
      <div className="bg-orb w-72 h-72 bg-accent top-[10%] left-[5%]" />
      <div className="bg-orb w-56 h-56 bg-accent-blue bottom-[10%] right-[10%]" />

      <div className="relative z-10 w-full max-w-md glass-card rounded-2xl p-8">
        <h1 className="text-2xl font-bold text-center mb-2">Dobrodošao nazad</h1>
        <p className="text-muted text-center text-sm mb-8">
          Prijavi se i nastavi gde si stao
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

          <div className="flex justify-end">
            <Link
              href="/forgot-password"
              className="text-xs text-muted hover:text-accent transition-colors"
            >
              Zaboravljena lozinka?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="glow-button w-full rounded-xl bg-accent px-4 py-3 font-semibold text-white hover:bg-accent-hover transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Prijavljivanje..." : "Prijavi se"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          Nemaš nalog?{" "}
          <Link href="/register" className="text-accent hover:text-accent-blue transition-colors">
            Registruj se
          </Link>
        </p>
      </div>
    </div>
  );
}
