"use client";

import Link from "next/link";
import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { ThumbsUp, Shield, MessageSquarePlus, Menu, X } from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import AppFeedbackModal from "./AppFeedbackModal";

export default function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const role = session?.user ? (session.user as { role?: string }).role : undefined;
  const [showFeedback, setShowFeedback] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isOnGuestPage = !session && (pathname.startsWith("/dashboard") || pathname.startsWith("/chat"));

  const closeMobile = () => setMobileOpen(false);

  return (
    <>
      <nav className="sticky top-0 z-50 border-b border-glass-border glass-card">
        <div className="mx-auto max-w-5xl flex items-center justify-between px-6 py-3.5">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group flex-shrink-0">
            <ThumbsUp className="w-5 h-5 text-accent" />
            <span className="text-lg font-bold tracking-tight gradient-text group-hover:opacity-80 transition-opacity">
              sve će biti ok
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden sm:flex items-center gap-3">
            <button
              onClick={() => setShowFeedback(true)}
              className="text-muted hover:text-foreground transition-colors p-1"
              title="Predloži poboljšanje"
            >
              <MessageSquarePlus className="w-4 h-4" />
            </button>
            <ThemeToggle />
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
            ) : isOnGuestPage ? (
              <>
                <Link
                  href="/register"
                  className="rounded-lg bg-accent px-4 py-1.5 text-sm font-medium text-white hover:bg-accent-hover transition-colors"
                >
                  Napravi nalog
                </Link>
                <Link
                  href="/login"
                  className="text-sm text-muted hover:text-foreground transition-colors"
                >
                  Prijava
                </Link>
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

          {/* Mobile: icons + hamburger */}
          <div className="flex sm:hidden items-center gap-2">
            <button
              onClick={() => setShowFeedback(true)}
              className="text-muted hover:text-foreground transition-colors p-1"
              title="Predloži poboljšanje"
            >
              <MessageSquarePlus className="w-4 h-4" />
            </button>
            <ThemeToggle />
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="text-muted hover:text-foreground transition-colors p-1"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {mobileOpen && (
          <div className="sm:hidden border-t border-glass-border px-6 py-4 space-y-3 animate-slide-up">
            {session ? (
              <>
                {role === "ADMIN" && (
                  <Link
                    href="/admin"
                    onClick={closeMobile}
                    className="flex items-center gap-2 text-sm text-accent hover:text-accent-hover transition-colors py-1"
                  >
                    <Shield className="w-4 h-4" />
                    Admin
                  </Link>
                )}
                <Link
                  href="/dashboard"
                  onClick={closeMobile}
                  className="block text-sm text-muted hover:text-foreground transition-colors py-1"
                >
                  Početna
                </Link>
                <button
                  onClick={() => { closeMobile(); signOut({ callbackUrl: "/" }); }}
                  className="w-full text-left text-sm text-muted hover:text-foreground transition-colors py-1"
                >
                  Odjavi se
                </button>
              </>
            ) : isOnGuestPage ? (
              <>
                <Link
                  href="/register"
                  onClick={closeMobile}
                  className="block rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white text-center hover:bg-accent-hover transition-colors"
                >
                  Napravi nalog
                </Link>
                <Link
                  href="/login"
                  onClick={closeMobile}
                  className="block text-sm text-muted hover:text-foreground transition-colors py-1 text-center"
                >
                  Prijava
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={closeMobile}
                  className="block text-sm text-muted hover:text-foreground transition-colors py-1 text-center"
                >
                  Prijava
                </Link>
                <Link
                  href="/register"
                  onClick={closeMobile}
                  className="block rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white text-center hover:bg-accent-hover transition-colors"
                >
                  Registracija
                </Link>
              </>
            )}
          </div>
        )}
      </nav>
      {showFeedback && <AppFeedbackModal onClose={() => setShowFeedback(false)} />}
    </>
  );
}
