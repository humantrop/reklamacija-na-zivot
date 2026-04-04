"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-muted">Učitavanje...</div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <div className="max-w-lg">
        <div className="text-6xl mb-6">🎭</div>
        <h1 className="text-3xl font-bold mb-4">Spreman za razgovor?</h1>
        <p className="text-muted mb-10 text-lg">
          Klikni dugme ispod i bićeš spojen sa nasumičnim strancem. Tvoj
          identitet je potpuno skriven — niko ne zna ko si.
        </p>

        <button
          onClick={() => router.push("/chat")}
          className="group relative rounded-2xl bg-accent px-10 py-5 text-xl font-bold text-white shadow-xl shadow-accent/25 hover:bg-accent/80 hover:shadow-accent/40 transition-all duration-300 hover:scale-105"
        >
          <span className="relative z-10">🔍 Nađi sagovornika</span>
        </button>

        <div className="mt-12 grid grid-cols-2 gap-4 text-left">
          <div className="rounded-xl bg-surface p-4">
            <p className="text-sm text-muted">
              <span className="text-foreground font-medium">Potpuno anonimno</span> — tvoj
              email i ime su skriveni
            </p>
          </div>
          <div className="rounded-xl bg-surface p-4">
            <p className="text-sm text-muted">
              <span className="text-foreground font-medium">Poruke nestaju</span> — ništa se
              ne čuva nakon razgovora
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
