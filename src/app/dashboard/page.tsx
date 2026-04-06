"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { Search, Users, EyeOff, Lock } from "lucide-react";
import CategoryPicker from "@/components/CategoryPicker";
import AchievementToast from "@/components/AchievementToast";
import { getCurrentAchievement, getNextAchievement, getProgress } from "@/lib/achievements";
import type { Achievement } from "@/lib/achievements";

interface UserStats {
  totalChats: number;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [useCategoryMatch, setUseCategoryMatch] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [stats, setStats] = useState<UserStats>({ totalChats: 0 });
  const [newAchievement, setNewAchievement] = useState<Achievement | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/user/stats")
        .then((r) => r.json())
        .then((data) => {
          if (data.totalChats !== undefined) {
            setStats(data);
          }
        })
        .catch(() => {});
    }
  }, [status]);

  const startChat = useCallback(
    (mode: "solo" | "group") => {
      const params = new URLSearchParams({ mode });
      if (useCategoryMatch && selectedCategory) {
        params.set("category", selectedCategory);
      }
      router.push(`/chat?${params.toString()}`);
    },
    [router, useCategoryMatch, selectedCategory]
  );

  const handleCloseAchievement = useCallback(() => {
    setNewAchievement(null);
  }, []);

  if (status === "loading") {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-muted animate-pulse">Učitavanje...</div>
      </div>
    );
  }

  if (!session) return null;

  const currentBadge = getCurrentAchievement(stats.totalChats);
  const nextBadge = getNextAchievement(stats.totalChats);
  const progress = getProgress(stats.totalChats);
  const CurrentBadgeIcon = currentBadge.icon;
  const NextBadgeIcon = nextBadge?.icon;

  return (
    <div className="relative flex flex-1 flex-col items-center px-6 py-12 overflow-hidden">
      <div className="bg-orb w-80 h-80 bg-accent top-[-10%] right-[-5%]" />
      <div className="bg-orb w-64 h-64 bg-accent-blue bottom-[10%] left-[-5%]" />

      <AchievementToast achievement={newAchievement} onClose={handleCloseAchievement} />

      <div className="relative z-10 w-full max-w-2xl space-y-8">
        {/* Achievement card */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center badge-shimmer"
              style={{ backgroundColor: `${currentBadge.color}15` }}
            >
              <CurrentBadgeIcon className="w-7 h-7" style={{ color: currentBadge.color }} />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted font-medium uppercase tracking-wider">Tvoja značka</p>
                  <p className="text-lg font-bold" style={{ color: currentBadge.color }}>
                    {currentBadge.name}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">{stats.totalChats}</p>
                  <p className="text-xs text-muted">razgovora</p>
                </div>
              </div>
              {nextBadge && NextBadgeIcon && (
                <div className="mt-3">
                  <div className="flex justify-between items-center text-xs text-muted mb-1">
                    <span className="flex items-center gap-1">
                      Sledeća: <NextBadgeIcon className="w-3.5 h-3.5" style={{ color: nextBadge.color }} /> {nextBadge.name}
                    </span>
                    <span>{stats.totalChats}/{nextBadge.requiredChats}</span>
                  </div>
                  <div className="h-2 rounded-full bg-surface-light overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${progress}%`,
                        background: `linear-gradient(90deg, ${currentBadge.color}, ${nextBadge.color})`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Category toggle */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold">Sparivanje po kategoriji</h3>
              <p className="text-sm text-muted mt-0.5">Nađi nekog sa sličnim problemom</p>
            </div>
            <button
              onClick={() => {
                setUseCategoryMatch(!useCategoryMatch);
                if (useCategoryMatch) setSelectedCategory(null);
              }}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                useCategoryMatch ? "bg-accent" : "bg-surface-light"
              }`}
            >
              <div
                className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                  useCategoryMatch ? "translate-x-6" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>

          {useCategoryMatch && (
            <div className="animate-slide-up">
              <p className="text-xs text-muted mb-3">O čemu želiš da pričaš?</p>
              <CategoryPicker selected={selectedCategory} onSelect={setSelectedCategory} />
            </div>
          )}
        </div>

        {/* Chat buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={() => startChat("solo")}
            className="glow-button group glass-card rounded-2xl p-6 text-left transition-all duration-300 hover:-translate-y-1 hover:border-accent/40"
          >
            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Search className="w-6 h-6 text-accent" />
            </div>
            <h3 className="text-lg font-bold mb-1">Nađi sagovornika</h3>
            <p className="text-sm text-muted">
              1 na 1 razgovor sa nasumičnim strancem
            </p>
          </button>

          <button
            onClick={() => startChat("group")}
            className="glow-button group glass-card rounded-2xl p-6 text-left transition-all duration-300 hover:-translate-y-1 hover:border-accent-blue/40"
          >
            <div className="w-12 h-12 rounded-xl bg-accent-blue/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Users className="w-6 h-6 text-accent-blue" />
            </div>
            <h3 className="text-lg font-bold mb-1">Grupni razgovor</h3>
            <p className="text-sm text-muted">
              Razgovor sa 3-5 nasumičnih stranaca
            </p>
          </button>
        </div>

        {/* Info */}
        <div className="grid grid-cols-2 gap-3">
          <div className="glass-card rounded-xl p-4">
            <p className="text-sm text-muted flex items-center gap-2">
              <EyeOff className="w-4 h-4 text-foreground" />
              <span><span className="text-foreground font-medium">Anonimno</span> — tvoj email i ime su skriveni</span>
            </p>
          </div>
          <div className="glass-card rounded-xl p-4">
            <p className="text-sm text-muted flex items-center gap-2">
              <Lock className="w-4 h-4 text-foreground" />
              <span><span className="text-foreground font-medium">Nestaje</span> — ništa se ne čuva</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
