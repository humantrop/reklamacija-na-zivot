"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Megaphone, Shield } from "lucide-react";

export default function Navbar() {
  const { data: session } = useSession();
  const role = session?.user ? (session.user as { role?: string }).role : undefined;

  return (
    <nav className="sticky top-0 z-50 border-b border-glass-border glass-card">
      <div className="mx-auto max-w-5xl flex items-center justify-between px-6 py-3.5">
        <Link href="/" className="flex items-center gap-2 group">
          <Megaphone className="w-5 h-5 text-accent" />
          <span className="text-lg font-bold tracking-tight gradient-text group-hover:opacity-80 transition-opacity">
            reklamacija
          </span>
        </Link>
        <div className="flex items-center gap-3">
          {session ? (
            <>
              {role === "ADMIN" && (
                <Link
                  href="/admin"
                  className="text-sm text-accent hover:text-accent-hover transition-colors inline-flex items-center gap-1"
                >
                  <Shield className="w-3.5 h-3.5" />
                  Admin
                </Link>
              )}
              <Link
                href="/dashboard"
                className="text-sm text-muted hover:text-foreground transition-colors"
              >
                Početna
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="glass-card rounded-lg px-4 py-1.5 text-sm text-muted hover:text-foreground transition-all hover:border-accent/30"
              >
                Odjavi se
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm text-muted hover:text-foreground transition-colors"
              >
                Prijava
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-accent px-4 py-1.5 text-sm font-medium text-white hover:bg-accent-hover transition-colors"
              >
                Registracija
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
