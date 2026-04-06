"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";

interface AdminStats {
  totalUsers: number;
  totalChatsCreated: number;
  totalMessages: number;
  onlineUsers?: number;
  activeChats?: number;
  waitingUsers?: number;
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState("");

  const fetchStats = useCallback(async () => {
    const res = await fetch("/api/admin/stats");
    if (res.status === 403) {
      setError("Nemaš pristup ovoj stranici");
      return;
    }
    if (!res.ok) {
      setError("Greška pri učitavanju statistike");
      return;
    }
    const data = await res.json();
    setStats(data);
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
    if (status === "authenticated") {
      fetchStats();
      const interval = setInterval(fetchStats, 10000);
      return () => clearInterval(interval);
    }
  }, [status, router, fetchStats]);

  if (status === "loading") {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-muted animate-pulse">Učitavanje...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="glass-card rounded-2xl p-8 text-center">
          <div className="text-4xl mb-4">🚫</div>
          <p className="text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const cards = [
    { label: "Registrovani korisnici", value: stats.totalUsers, icon: "👥", color: "#8b5cf6" },
    { label: "Ukupno chatova", value: stats.totalChatsCreated, icon: "💬", color: "#3b82f6" },
    { label: "Ukupno poruka", value: stats.totalMessages, icon: "📨", color: "#10b981" },
  ];

  return (
    <div className="relative flex flex-1 flex-col items-center px-6 py-12 overflow-hidden">
      <div className="bg-orb w-72 h-72 bg-accent top-[-5%] left-[-5%]" />

      <div className="relative z-10 w-full max-w-3xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Admin Panel</h1>
          <p className="text-muted mt-1">Statistika aplikacije u realnom vremenu</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {cards.map((card) => (
            <div key={card.label} className="glass-card rounded-2xl p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-2xl">{card.icon}</span>
                <span className="text-xs text-muted font-medium uppercase tracking-wider">
                  {card.label}
                </span>
              </div>
              <p className="text-4xl font-bold" style={{ color: card.color }}>
                {card.value.toLocaleString()}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-4 glass-card rounded-2xl p-4">
          <p className="text-xs text-muted text-center">
            Statistika se automatski osvežava svakih 10 sekundi
          </p>
        </div>
      </div>
    </div>
  );
}
