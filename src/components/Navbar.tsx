"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

export default function Navbar() {
  const { data: session } = useSession();

  return (
    <nav className="border-b border-surface-light bg-surface/80 backdrop-blur-sm">
      <div className="mx-auto max-w-5xl flex items-center justify-between px-6 py-4">
        <Link href="/" className="text-xl font-bold text-accent">
          reklamacija na život
        </Link>
        <div className="flex items-center gap-4">
          {session ? (
            <>
              <Link
                href="/dashboard"
                className="text-muted hover:text-foreground transition-colors"
              >
                Početna
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="rounded-lg bg-surface-light px-4 py-2 text-sm text-muted hover:text-foreground transition-colors"
              >
                Odjavi se
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-muted hover:text-foreground transition-colors"
              >
                Prijava
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/80 transition-colors"
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
