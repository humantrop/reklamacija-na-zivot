"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import {
  Users, MessageCircle, Send, ShieldX, UserSearch, UsersRound,
  Briefcase, Heart, User, Baby, Building2, HeartPulse, Wallet, Handshake, MessageSquare,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  sef: Briefcase,
  zena: Heart,
  muz: User,
  dete: Baby,
  posao: Building2,
  porodica: Users,
  zdravlje: HeartPulse,
  novac: Wallet,
  prijatelji: Handshake,
  ostalo: MessageSquare,
};

const CATEGORY_LABELS: Record<string, string> = {
  sef: "Šef", zena: "Žena", muz: "Muž", dete: "Dete", posao: "Posao",
  porodica: "Porodica", zdravlje: "Zdravlje", novac: "Novac",
  prijatelji: "Prijatelji", ostalo: "Ostalo",
};

const CATEGORY_COLORS: Record<string, string> = {
  sef: "#ef4444", zena: "#ec4899", muz: "#3b82f6", dete: "#f59e0b",
  posao: "#6366f1", porodica: "#10b981", zdravlje: "#14b8a6",
  novac: "#eab308", prijatelji: "#8b5cf6", ostalo: "#64748b",
};

interface CategoryStatItem {
  id: string;
  label: string;
  count: number;
}

interface AdminStats {
  totalUsers: number;
  totalChatsCreated: number;
  totalMessages: number;
  soloChats: number;
  groupChats: number;
  categoryStats: CategoryStatItem[];
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
          <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <ShieldX className="w-6 h-6 text-red-400" />
          </div>
          <p className="text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const topCards: { label: string; value: number; icon: LucideIcon; color: string }[] = [
    { label: "Korisnici", value: stats.totalUsers, icon: Users, color: "#8b5cf6" },
    { label: "Ukupno chatova", value: stats.totalChatsCreated, icon: MessageCircle, color: "#3b82f6" },
    { label: "Ukupno poruka", value: stats.totalMessages, icon: Send, color: "#10b981" },
  ];

  const maxCategoryCount = stats.categoryStats.length > 0
    ? Math.max(...stats.categoryStats.map((c) => c.count))
    : 0;

  return (
    <div className="relative flex flex-1 flex-col items-center px-6 py-12 overflow-hidden">
      <div className="bg-orb w-72 h-72 bg-accent top-[-5%] left-[-5%]" />
      <div className="bg-orb w-56 h-56 bg-accent-blue bottom-[5%] right-[-3%]" />

      <div className="relative z-10 w-full max-w-4xl space-y-6">
        <div className="mb-2">
          <h1 className="text-3xl font-bold">Admin Panel</h1>
          <p className="text-muted mt-1">Statistika u realnom vremenu — osvežava se svakih 10s</p>
        </div>

        {/* Top summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {topCards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="glass-card rounded-2xl p-6">
                <div className="flex items-center justify-between mb-3">
                  <Icon className="w-5 h-5" style={{ color: card.color }} />
                  <span className="text-xs text-muted font-medium uppercase tracking-wider">
                    {card.label}
                  </span>
                </div>
                <p className="text-4xl font-bold" style={{ color: card.color }}>
                  {card.value.toLocaleString()}
                </p>
              </div>
            );
          })}
        </div>

        {/* Solo vs Group breakdown */}
        <div className="glass-card rounded-2xl p-6">
          <h2 className="text-lg font-bold mb-4">Podela chatova</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl bg-surface/50 p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                <UserSearch className="w-6 h-6 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.soloChats.toLocaleString()}</p>
                <p className="text-sm text-muted">1 na 1</p>
              </div>
            </div>
            <div className="rounded-xl bg-surface/50 p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-accent-blue/10 flex items-center justify-center">
                <UsersRound className="w-6 h-6 text-accent-blue" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.groupChats.toLocaleString()}</p>
                <p className="text-sm text-muted">Grupni</p>
              </div>
            </div>
          </div>

          {/* Visual bar */}
          {stats.totalChatsCreated > 0 && (
            <div className="mt-4">
              <div className="h-3 rounded-full bg-surface-light overflow-hidden flex">
                <div
                  className="h-full rounded-l-full transition-all duration-500"
                  style={{
                    width: `${(stats.soloChats / stats.totalChatsCreated) * 100}%`,
                    background: "#8b5cf6",
                  }}
                />
                <div
                  className="h-full rounded-r-full transition-all duration-500"
                  style={{
                    width: `${(stats.groupChats / stats.totalChatsCreated) * 100}%`,
                    background: "#60a5fa",
                  }}
                />
              </div>
              <div className="flex justify-between mt-1.5 text-xs text-muted">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-accent inline-block" /> 1 na 1 ({stats.totalChatsCreated > 0 ? Math.round((stats.soloChats / stats.totalChatsCreated) * 100) : 0}%)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-accent-blue inline-block" /> Grupni ({stats.totalChatsCreated > 0 ? Math.round((stats.groupChats / stats.totalChatsCreated) * 100) : 0}%)
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Category usage */}
        <div className="glass-card rounded-2xl p-6">
          <h2 className="text-lg font-bold mb-4">Kategorije — popularnost</h2>
          {stats.categoryStats.length === 0 ? (
            <p className="text-muted text-sm">Još nema podataka o kategorijama.</p>
          ) : (
            <div className="space-y-3">
              {stats.categoryStats.map((cat) => {
                const Icon = CATEGORY_ICONS[cat.id] || MessageSquare;
                const label = CATEGORY_LABELS[cat.id] || cat.label;
                const color = CATEGORY_COLORS[cat.id] || "#64748b";
                const pct = maxCategoryCount > 0 ? (cat.count / maxCategoryCount) * 100 : 0;
                return (
                  <div key={cat.id} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}15` }}>
                      <Icon className="w-4 h-4" style={{ color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{label}</span>
                        <span className="text-sm font-bold" style={{ color }}>{cat.count}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-surface-light overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, background: color }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
