"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { Search, Users, EyeOff, Lock, Link2, UserPlus, Sparkles, Ear, HelpCircle, X, Star, Shield, Clock, Heart, Flame, Handshake, Infinity } from "lucide-react";
import MoodPicker from "@/components/MoodPicker";
import AchievementToast from "@/components/AchievementToast";
import { getCurrentAchievement, getNextAchievement, getProgress, listenerBadge } from "@/lib/achievements";
import type { Achievement } from "@/lib/achievements";
import { getGuestId, isGuestId } from "@/lib/guest";
import { getTodaysTopic } from "@/lib/topics";

interface UserStats {
  totalChats: number;
  avgRating: number;
  canListen: boolean;
}

function DashboardContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [useMoodMatch, setUseMoodMatch] = useState(false);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [connectId, setConnectId] = useState("");
  const [stats, setStats] = useState<UserStats>({ totalChats: 0, avgRating: 0, canListen: false });
  const [newAchievement, setNewAchievement] = useState<Achievement | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  // Determine if guest: either came via ?guest=1 or has no session and has a guest ID
  const resolvedUserId = session?.user
    ? (session.user as { id: string }).id
    : getGuestId();
  const isGuest = isGuestId(resolvedUserId);

  // No redirect for guests — they can use the dashboard

  useEffect(() => {
    if (status === "authenticated" && !isGuest) {
      fetch("/api/user/stats")
        .then((r) => r.json())
        .then((data) => {
          if (data.totalChats !== undefined) {
            setStats(data);
          }
        })
        .catch(() => {});
    }
  }, [status, isGuest]);

  const startChat = useCallback(
    (mode: "solo" | "group") => {
      const params = new URLSearchParams({ mode });
      if (useMoodMatch && selectedMood) {
        params.set("mood", selectedMood);
      }
      router.push(`/chat?${params.toString()}`);
    },
    [router, useMoodMatch, selectedMood]
  );

  const topic = getTodaysTopic();
  const TopicIcon = topic.icon;

  const handleCloseAchievement = useCallback(() => {
    setNewAchievement(null);
  }, []);

  if (status === "loading" && !isGuest) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-muted animate-pulse">Učitavanje...</div>
      </div>
    );
  }

  if (!session && !isGuest) return null;

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

      {/* Help legend modal */}
      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowHelp(false)}>
          <div className="glass-card rounded-2xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold">Kako funkcioniše</h2>
              <button onClick={() => setShowHelp(false)} className="p-1 text-muted hover:text-foreground transition-colors"><X className="w-5 h-5" /></button>
            </div>

            <div className="space-y-5 text-sm">
              <div>
                <h3 className="font-semibold flex items-center gap-2 mb-1.5"><EyeOff className="w-4 h-4 text-accent" /> Anonimnost</h3>
                <p className="text-muted leading-relaxed">Tvoj identitet je potpuno skriven. Sagovornici vide samo nasumično generisan pseudonim. Poruke se ne čuvaju — kad razgovor završi, sve nestaje.</p>
              </div>

              <div>
                <h3 className="font-semibold flex items-center gap-2 mb-1.5"><Search className="w-4 h-4 text-accent" /> Sparivanje</h3>
                <p className="text-muted leading-relaxed">Možeš birati 1-na-1 ili grupni razgovor. Ako izabereš raspoloženje, sparujemo te sa nekim sličnim. "Hoću da saslušam" korisnici se automatski sparuju sa onima kojima treba razgovor.</p>
              </div>

              <div>
                <h3 className="font-semibold flex items-center gap-2 mb-1.5"><Clock className="w-4 h-4 text-amber-400" /> Vremenski limit</h3>
                <p className="text-muted leading-relaxed">Svaki razgovor traje maksimum 5 minuta. Na 4 minuta dobijaš upozorenje. Ako oba sagovornika kliknu "Zadržavanje u razgovoru" — limit se uklanja i možete pričati koliko hoćete.</p>
              </div>

              <div>
                <h3 className="font-semibold flex items-center gap-2 mb-1.5"><Heart className="w-4 h-4 text-accent" /> Zadržavanje</h3>
                <p className="text-muted leading-relaxed">Klikni "Zadržavanje u razgovoru" tokom chata. Ako i sagovornik klikne — dobijate 6-cifreni kod za ponovni susret. Koristi kod na početnoj u sekciji "Nađi po kodu".</p>
              </div>

              <div>
                <h3 className="font-semibold flex items-center gap-2 mb-2">
                  <Star className="w-4 h-4 text-amber-400" /> Značke
                </h3>
                <div className="space-y-1.5">
                  {[
                    { name: "Novajlija", chats: "0", color: "#6b7280" },
                    { name: "Početnik", chats: "20+", color: "#10b981" },
                    { name: "Društvenjak", chats: "50+", color: "#3b82f6" },
                    { name: "Veteran", chats: "120+", color: "#f59e0b" },
                    { name: "Legenda", chats: "250+", color: "#8b5cf6" },
                    { name: "Vladar reklamacija", chats: "500+", color: "#ef4444" },
                    { name: "Slušalac", chats: "ocena 4+ & 10+ razgovora", color: "#10b981" },
                  ].map((b) => (
                    <div key={b.name} className="flex items-center justify-between rounded-lg bg-surface/50 px-3 py-1.5">
                      <span className="font-medium" style={{ color: b.color }}>{b.name}</span>
                      <span className="text-xs text-muted">{b.chats} razgovora</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-semibold flex items-center gap-2 mb-1.5"><Ear className="w-4 h-4 text-emerald-400" /> Režim slušaoca</h3>
                <p className="text-muted leading-relaxed">Korisnici sa prosečnom ocenom 4+ i 10+ razgovora mogu aktivirati "Ovde sam da slušam". Slušaoci imaju prioritet u sparivanju i dobijaju posebnu značku u chatu.</p>
              </div>

              <div>
                <h3 className="font-semibold flex items-center gap-2 mb-1.5"><Sparkles className="w-4 h-4 text-amber-400" /> Tema dana</h3>
                <p className="text-muted leading-relaxed">Svaki dan nova tema za razgovor. Klikni "Pridruži se temi" da se sparuješ sa nekim ko želi da priča o istom.</p>
              </div>

              <div>
                <h3 className="font-semibold flex items-center gap-2 mb-1.5"><Shield className="w-4 h-4 text-red-400" /> Prijava i zaštita</h3>
                <p className="text-muted leading-relaxed">Ako neko krši pravila, klikni zastavu u chatu da prijaviš. Posle 5 prijava korisnik se automatski banuje. Poštuj druge — anonimnost ne znači bezobrazluk.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="relative z-10 w-full max-w-[1000px]">
        {/* Help legend button — top of dashboard */}
        <button
          onClick={() => setShowHelp(true)}
          className="w-full glass-card rounded-xl p-3 text-sm text-muted hover:text-foreground transition-colors flex items-center justify-center gap-2 mb-6"
        >
          <HelpCircle className="w-4 h-4" /> Kako funkcioniše aplikacija?
        </button>

        {/* Guest upgrade banner */}
        {isGuest && (
          <div className="glass-card rounded-2xl p-5 border-accent/20 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                <UserPlus className="w-6 h-6 text-accent" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Gost si</h3>
                <p className="text-sm text-muted mt-0.5">Napravi nalog za značke, statistiku i zadržavanje u razgovoru</p>
              </div>
              <button
                onClick={() => router.push("/register")}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover transition-colors flex-shrink-0"
              >
                Registracija
              </button>
            </div>
          </div>
        )}

        {/* Two-column layout */}
        <div className="flex flex-col lg:flex-row gap-6">

          {/* LEFT COLUMN — Badge & progress (sticky on desktop) */}
          {!isGuest && (
          <div className="lg:w-[300px] flex-shrink-0">
            <div className="lg:sticky lg:top-24 space-y-4">
              <div className="glass-card rounded-2xl p-6">
                {/* Large badge icon */}
                <div className="flex flex-col items-center text-center mb-5">
                  <div
                    className="w-20 h-20 rounded-2xl flex items-center justify-center badge-shimmer mb-3"
                    style={{ backgroundColor: `${currentBadge.color}15` }}
                  >
                    <CurrentBadgeIcon className="w-10 h-10" style={{ color: currentBadge.color }} />
                  </div>
                  <p className="text-xs text-muted font-medium uppercase tracking-wider">Tvoja značka</p>
                  <p className="text-xl font-bold mt-0.5" style={{ color: currentBadge.color }}>
                    {currentBadge.name}
                  </p>
                  {stats.canListen && (
                    <span className="mt-2 text-[10px] font-medium bg-emerald-500/10 text-emerald-400 rounded-full px-2.5 py-0.5 flex items-center gap-1">
                      <Ear className="w-3 h-3" /> Slušalac
                    </span>
                  )}
                </div>

                {/* Stats */}
                <div className="flex items-center justify-center gap-6 mb-5">
                  <div className="text-center">
                    <p className="text-2xl font-bold">{stats.totalChats}</p>
                    <p className="text-[10px] text-muted uppercase tracking-wider">razgovora</p>
                  </div>
                  {stats.avgRating > 0 && (
                    <div className="text-center">
                      <p className="text-2xl font-bold">{stats.avgRating}</p>
                      <p className="text-[10px] text-muted uppercase tracking-wider">ocena</p>
                    </div>
                  )}
                </div>

                {/* Progress bar */}
                {nextBadge && NextBadgeIcon && (
                  <div>
                    <div className="flex justify-between items-center text-xs text-muted mb-1.5">
                      <span className="flex items-center gap-1">
                        <NextBadgeIcon className="w-3.5 h-3.5" style={{ color: nextBadge.color }} /> {nextBadge.name}
                      </span>
                      <span>{stats.totalChats}/{nextBadge.requiredChats}</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-surface-light overflow-hidden">
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

              {/* Listener mode button */}
              {stats.canListen && (
                <button
                  onClick={() => router.push("/chat?mode=solo&mood=slusam&listener=1")}
                  className="glow-button w-full group glass-card rounded-2xl p-4 text-left transition-all duration-300 hover:-translate-y-1 hover:border-emerald-500/40"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0">
                      <Ear className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-emerald-400">Ovde sam da slušam</h3>
                      <p className="text-xs text-muted mt-0.5">Pomozi nekome danas</p>
                    </div>
                  </div>
                </button>
              )}

              {/* Info cards */}
              <div className="space-y-2">
                <div className="glass-card rounded-xl p-3">
                  <p className="text-xs text-muted flex items-center gap-2">
                    <EyeOff className="w-3.5 h-3.5 text-foreground flex-shrink-0" />
                    <span><span className="text-foreground font-medium">Anonimno</span> — identitet skriven</span>
                  </p>
                </div>
                <div className="glass-card rounded-xl p-3">
                  <p className="text-xs text-muted flex items-center gap-2">
                    <Lock className="w-3.5 h-3.5 text-foreground flex-shrink-0" />
                    <span><span className="text-foreground font-medium">Nestaje</span> — ništa se ne čuva</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
          )}

          {/* RIGHT COLUMN — Main content */}
          <div className="flex-1 space-y-5">
            {/* 1. Mood picker */}
            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold">Kako se osećaš?</h3>
                  <p className="text-sm text-muted mt-0.5">Sparujemo te sa nekim ko razume</p>
                </div>
                <button
                  onClick={() => {
                    setUseMoodMatch(!useMoodMatch);
                    if (useMoodMatch) setSelectedMood(null);
                  }}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    useMoodMatch ? "bg-accent" : "bg-surface-light"
                  }`}
                >
                  <div
                    className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                      useMoodMatch ? "translate-x-6" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>

              {useMoodMatch && (
                <div className="animate-slide-up">
                  <p className="text-xs text-muted mb-3">Izaberi raspoloženje — slušaoci se sparuju sa onima kojima treba razgovor</p>
                  <MoodPicker selected={selectedMood} onSelect={setSelectedMood} />
                </div>
              )}
            </div>

            {/* 2. Chat buttons */}
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

            {/* 3. Daily topic */}
            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${topic.color}15` }}>
                  <TopicIcon className="w-6 h-6" style={{ color: topic.color }} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <p className="text-xs text-muted font-medium uppercase tracking-wider">Tema dana</p>
                  </div>
                  <p className="text-lg font-semibold leading-snug" style={{ color: topic.color }}>{topic.prompt}</p>
                  <button
                    onClick={() => {
                      const params = new URLSearchParams({ mode: "solo", topic: topic.id });
                      router.push(`/chat?${params.toString()}`);
                    }}
                    className="mt-3 rounded-lg px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-all"
                    style={{ backgroundColor: topic.color }}
                  >
                    Pridruži se temi
                  </button>
                </div>
              </div>
            </div>

            {/* 4. Find by connection ID — only for registered users */}
            {!isGuest && (
            <div className="glass-card rounded-2xl p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent-pink/10 flex items-center justify-center flex-shrink-0">
                  <Link2 className="w-5 h-5 text-accent-pink" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold">Nađi po kodu</h3>
                  <p className="text-xs text-muted">Unesi kod koji si dobio/la od sagovornika</p>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <input
                  type="text"
                  value={connectId}
                  onChange={(e) => setConnectId(e.target.value.toUpperCase())}
                  maxLength={6}
                  placeholder="ABC123"
                  className="flex-1 rounded-xl border border-surface-light bg-background/50 px-4 py-2.5 text-sm text-foreground placeholder-muted/40 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent transition-colors tracking-widest font-bold text-center uppercase"
                />
                <button
                  onClick={() => {
                    if (connectId.length === 6) router.push(`/chat?mode=direct&connectionId=${connectId}`);
                  }}
                  disabled={connectId.length !== 6}
                  className="rounded-xl bg-accent-pink px-5 py-2.5 text-sm font-medium text-white hover:opacity-90 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Poveži se
                </button>
              </div>
            </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return <DashboardContent />;
}
