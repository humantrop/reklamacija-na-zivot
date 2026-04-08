"use client";

import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useRef, useCallback, Suspense } from "react";
import { io, Socket } from "socket.io-client";
import { Plug, Users, Search, LogOut, SkipForward, WifiOff, Flag, Heart, Copy, Check } from "lucide-react";
import ChatWindow from "@/components/ChatWindow";
import ChatInput from "@/components/ChatInput";
import ChatTimer from "@/components/ChatTimer";
import RatingCard from "@/components/RatingCard";
import ReportModal from "@/components/ReportModal";
import { getCategoryById } from "@/lib/categories";
import { getGuestId, isGuestId } from "@/lib/guest";

interface Message {
  id: string;
  pseudonym: string;
  message: string;
  timestamp: number;
  isOwn: boolean;
  color?: string;
}

interface Participant {
  pseudonym: string;
  color: string;
  isMe: boolean;
}

const SESSION_KEY = "rnz-active-chat";

function saveSession(data: { roomId: string; mode: string; category?: string }) {
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(data)); } catch {}
}
function loadSession(): { roomId: string; mode: string; category?: string } | null {
  try { const raw = sessionStorage.getItem(SESSION_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
function clearSession() {
  try { sessionStorage.removeItem(SESSION_KEY); } catch {}
}

function ChatContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode") || "solo";
  const category = searchParams.get("category") || undefined;
  const connectionIdParam = searchParams.get("connectionId") || undefined;

  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatState, setChatState] = useState<"connecting" | "waiting" | "matched" | "ended">("connecting");
  const [myPseudonym, setMyPseudonym] = useState("");
  const [partnerPseudonym, setPartnerPseudonym] = useState("");
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [typingName, setTypingName] = useState("");
  const [isGroup, setIsGroup] = useState(false);
  const [matchCategory, setMatchCategory] = useState<string | undefined>();
  const [waitingInfo, setWaitingInfo] = useState("");
  const [partnerDisconnected, setPartnerDisconnected] = useState(false);
  const [matchedAt, setMatchedAt] = useState<number>(0);

  // Rating
  const [showRating, setShowRating] = useState(false);
  const [ratingDone, setRatingDone] = useState(false);

  // Report
  const [showReport, setShowReport] = useState(false);

  // Keep talking
  const [keepTalkingClicked, setKeepTalkingClicked] = useState(false);
  const [partnerKeepTalking, setPartnerKeepTalking] = useState(false);
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  // Rate limit
  const [rateLimitMsg, setRateLimitMsg] = useState("");

  const roomIdRef = useRef<string>("");

  // Resolve userId: authenticated user OR guest UUID
  const resolvedUserId = session?.user
    ? (session.user as { id: string }).id
    : getGuestId();
  const isGuest = isGuestId(resolvedUserId);

  // No redirect for unauthenticated — guests are welcome

  useEffect(() => {
    if (status === "loading") return;
    // Wait for auth check to complete, then connect with either real or guest ID
    const userId = resolvedUserId;
    if (!userId) return;
    const newSocket = io();

    newSocket.on("connect", () => {
      const saved = loadSession();
      if (saved?.roomId) {
        newSocket.emit("rejoin", { userId, roomId: saved.roomId });
      } else {
        setChatState("waiting");
        newSocket.emit("find-match", { userId, mode, category, connectionId: connectionIdParam });
      }
    });

    newSocket.on("rejoin-success", (data: {
      roomId: string; isGroup: boolean; myPseudonym: string; myColor?: string;
      partnerPseudonym?: string; partnerConnected?: boolean; participants?: Participant[];
      category?: string; startedAt?: number;
    }) => {
      roomIdRef.current = data.roomId;
      setMyPseudonym(data.myPseudonym);
      setIsGroup(data.isGroup);
      setMatchCategory(data.category);
      setChatState("matched");
      setPartnerDisconnected(false);
      if (data.startedAt) setMatchedAt(data.startedAt);

      if (data.isGroup && data.participants) {
        setParticipants(data.participants);
        setPartnerPseudonym(data.participants.filter((p) => !p.isMe).map((p) => p.pseudonym).join(", "));
      } else {
        setPartnerPseudonym(data.partnerPseudonym || "");
        if (data.partnerConnected === false) setPartnerDisconnected(true);
      }
      setMessages([{
        id: "system_rejoin", pseudonym: "Sistem",
        message: "Ponovo si povezan/a. Prethodne poruke su obrisane, ali razgovor nastavlja.",
        timestamp: Date.now(), isOwn: false, color: "#64748b",
      }]);
    });

    newSocket.on("rejoin-failed", () => {
      clearSession();
      setChatState("waiting");
      newSocket.emit("find-match", { userId, mode, category, connectionId: connectionIdParam });
    });

    newSocket.on("waiting", (data: { mode: string; category?: string; queueSize?: number; connectionId?: string }) => {
      setChatState("waiting");
      if (data.mode === "direct") {
        setWaitingInfo("Čekamo da se tvoj sagovornik poveže...");
      } else if (data.mode === "group") {
        setWaitingInfo(`Čekamo još ljudi za grupu (${data.queueSize || 1} u redu)...`);
      } else if (data.mode === "category") {
        const cat = getCategoryById(data.category || "");
        setWaitingInfo(cat ? `Tražimo nekog sa temom: ${cat.label}...` : "Tražimo sagovornika...");
      } else {
        setWaitingInfo("Tražimo sagovornika...");
      }
    });

    newSocket.on("category-timeout", () => setWaitingInfo("Niko sa istom temom, tražimo bilo koga..."));

    newSocket.on("matched", (data: {
      roomId: string; isGroup: boolean; myPseudonym: string; myColor?: string;
      partnerPseudonym?: string; participants?: Participant[]; category?: string;
    }) => {
      roomIdRef.current = data.roomId;
      setMyPseudonym(data.myPseudonym);
      setIsGroup(data.isGroup);
      setMatchCategory(data.category);
      setChatState("matched");
      setMessages([]);
      setPartnerDisconnected(false);
      setMatchedAt(Date.now());
      setShowRating(false);
      setRatingDone(false);
      setKeepTalkingClicked(false);
      setPartnerKeepTalking(false);
      setConnectionId(null);
      setRateLimitMsg("");

      saveSession({ roomId: data.roomId, mode, category });

      if (data.isGroup && data.participants) {
        setParticipants(data.participants);
        setPartnerPseudonym(data.participants.filter((p) => !p.isMe).map((p) => p.pseudonym).join(", "));
      } else {
        setPartnerPseudonym(data.partnerPseudonym || "");
      }
    });

    newSocket.on("receive-message", (data: { pseudonym: string; color?: string; message: string; timestamp: number }) => {
      setMessages((prev) => [...prev, {
        id: `${data.timestamp}_${Math.random()}`, pseudonym: data.pseudonym,
        message: data.message, timestamp: data.timestamp, isOwn: false, color: data.color,
      }]);
    });

    newSocket.on("partner-typing", (data: { pseudonym: string }) => { setPartnerTyping(true); setTypingName(data.pseudonym); });
    newSocket.on("partner-stop-typing", () => setPartnerTyping(false));

    newSocket.on("partner-disconnected", (data: { pseudonym: string }) => {
      setPartnerDisconnected(true);
      setMessages((prev) => [...prev, {
        id: `system_disc_${Date.now()}`, pseudonym: "Sistem",
        message: `${data.pseudonym} se privremeno izgubio/la. Čekamo da se vrati...`,
        timestamp: Date.now(), isOwn: false, color: "#64748b",
      }]);
    });

    newSocket.on("partner-reconnected", (data: { pseudonym: string }) => {
      setPartnerDisconnected(false);
      setMessages((prev) => [...prev, {
        id: `system_recon_${Date.now()}`, pseudonym: "Sistem",
        message: `${data.pseudonym} se vratio/la!`,
        timestamp: Date.now(), isOwn: false, color: "#64748b",
      }]);
    });

    newSocket.on("partner-left", () => {
      setChatState("ended");
      setPartnerTyping(false);
      setPartnerDisconnected(false);
      setShowRating(true);
      clearSession();
    });

    newSocket.on("participant-left", (data: { pseudonym: string; remainingCount: number }) => {
      setMessages((prev) => [...prev, {
        id: `system_${Date.now()}`, pseudonym: "Sistem",
        message: `${data.pseudonym} je napustio/la razgovor. (ostalo ${data.remainingCount})`,
        timestamp: Date.now(), isOwn: false, color: "#64748b",
      }]);
      if (data.remainingCount <= 1) { setChatState("ended"); setShowRating(true); clearSession(); }
    });

    newSocket.on("rating-submitted", () => {});
    newSocket.on("report-submitted", () => {});

    newSocket.on("partner-keep-talking", (data: { pseudonym: string }) => {
      setPartnerKeepTalking(true);
      setMessages((prev) => [...prev, {
        id: `system_kt_${Date.now()}`, pseudonym: "Sistem",
        message: `${data.pseudonym} želi da nastavite razgovor!`,
        timestamp: Date.now(), isOwn: false, color: "#8b5cf6",
      }]);
    });

    newSocket.on("connection-created", (data: { connectionId: string }) => {
      setConnectionId(data.connectionId);
    });

    newSocket.on("rate-limited", (data: { type: string; waitSeconds?: number }) => {
      if (data.type === "chat") {
        setRateLimitMsg(`Previše chatova. Pokušaj ponovo za ${data.waitSeconds || 60}s.`);
      } else if (data.type === "message") {
        // Briefly show in messages
        setMessages((prev) => [...prev, {
          id: `system_rl_${Date.now()}`, pseudonym: "Sistem",
          message: "Polako! Sačekaj malo pre sledeće poruke.",
          timestamp: Date.now(), isOwn: false, color: "#f59e0b",
        }]);
      }
    });

    setSocket(newSocket);
    return () => { newSocket.disconnect(); };
  }, [status, resolvedUserId, mode, category, connectionIdParam]);

  const userId = resolvedUserId;

  const sendMessage = useCallback((message: string) => {
    if (!socket || !roomIdRef.current || !message.trim()) return;
    socket.emit("send-message", { roomId: roomIdRef.current, message: message.trim() });
    setMessages((prev) => [...prev, {
      id: `${Date.now()}_${Math.random()}`, pseudonym: myPseudonym,
      message: message.trim(), timestamp: Date.now(), isOwn: true,
    }]);
  }, [socket, myPseudonym]);

  const handleTyping = useCallback(() => { if (socket && roomIdRef.current) socket.emit("typing", roomIdRef.current); }, [socket]);
  const handleStopTyping = useCallback(() => { if (socket && roomIdRef.current) socket.emit("stop-typing", roomIdRef.current); }, [socket]);

  const leaveChat = useCallback(() => {
    if (socket && roomIdRef.current) socket.emit("leave-chat", { roomId: roomIdRef.current, userId });
    clearSession();
    router.push(isGuest ? "/" : "/dashboard");
  }, [socket, router, userId, isGuest]);

  const nextChat = useCallback(() => {
    if (!socket) return;
    if (roomIdRef.current) socket.emit("leave-chat", { roomId: roomIdRef.current, userId });
    clearSession();
    roomIdRef.current = "";
    setChatState("waiting");
    setMessages([]);
    setPartnerTyping(false);
    setPartnerDisconnected(false);
    setShowRating(false);
    setRatingDone(false);
    setKeepTalkingClicked(false);
    setPartnerKeepTalking(false);
    setConnectionId(null);
    setRateLimitMsg("");
    socket.emit("find-match", { userId, mode, category });
  }, [socket, userId, mode, category]);

  const submitRating = useCallback((score: number) => {
    if (socket && roomIdRef.current) socket.emit("submit-rating", { roomId: roomIdRef.current, score });
    setRatingDone(true);
    setShowRating(false);
  }, [socket]);

  const skipRating = useCallback(() => { setRatingDone(true); setShowRating(false); }, []);

  const submitReport = useCallback((reason: string, description?: string) => {
    if (socket && roomIdRef.current) socket.emit("report-user", { roomId: roomIdRef.current, reason, description });
    setShowReport(false);
  }, [socket]);

  const handleKeepTalking = useCallback(() => {
    if (socket && roomIdRef.current) {
      socket.emit("keep-talking", { roomId: roomIdRef.current });
      setKeepTalkingClicked(true);
    }
  }, [socket]);

  const copyConnectionId = useCallback(() => {
    if (connectionId) {
      navigator.clipboard.writeText(connectionId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  }, [connectionId]);

  // --- RENDER ---

  if ((status === "loading" && !isGuest) || chatState === "connecting") {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Plug className="w-6 h-6 text-accent" />
          </div>
          <p className="text-muted">Povezivanje...</p>
        </div>
      </div>
    );
  }

  if (chatState === "waiting") {
    const categoryInfo = category ? getCategoryById(category) : null;
    const CategoryIcon = categoryInfo?.icon;
    return (
      <div className="relative flex flex-1 items-center justify-center overflow-hidden">
        <div className="bg-orb w-64 h-64 bg-accent top-[20%] left-[20%]" />
        <div className="relative z-10 text-center">
          {rateLimitMsg ? (
            <>
              <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-6">
                <Timer className="w-7 h-7 text-amber-400" />
              </div>
              <h2 className="text-2xl font-bold mb-2 text-amber-400">{rateLimitMsg}</h2>
              <button onClick={leaveChat} className="mt-8 text-sm text-muted hover:text-foreground transition-colors">
                ← Nazad na početnu
              </button>
            </>
          ) : (
            <>
              <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-6 animate-gentle-pulse">
                {mode === "group" ? <Users className="w-7 h-7 text-accent" /> : <Search className="w-7 h-7 text-accent" />}
              </div>
              <h2 className="text-2xl font-bold mb-2">{waitingInfo || "Tražimo sagovornika..."}</h2>
              {categoryInfo && CategoryIcon && (
                <div className="inline-flex items-center gap-2 glass-card rounded-full px-4 py-1.5 mt-2 mb-4">
                  <CategoryIcon className="w-4 h-4" style={{ color: categoryInfo.color }} />
                  <span className="text-sm" style={{ color: categoryInfo.color }}>{categoryInfo.label}</span>
                </div>
              )}
              <p className="text-muted mb-8">Čekamo da se neko pojavi. Neće dugo!</p>
              <div className="flex gap-1.5 justify-center">
                <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                <div className="w-2 h-2 rounded-full bg-accent animate-pulse [animation-delay:0.2s]" />
                <div className="w-2 h-2 rounded-full bg-accent animate-pulse [animation-delay:0.4s]" />
              </div>
              <button onClick={leaveChat} className="mt-8 text-sm text-muted hover:text-foreground transition-colors">
                ← Nazad na početnu
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  const categoryInfo = matchCategory ? getCategoryById(matchCategory) : null;
  const MatchCategoryIcon = categoryInfo?.icon;

  return (
    <div className="flex flex-1 flex-col max-w-3xl mx-auto w-full">
      {/* Report modal */}
      {showReport && <ReportModal onSubmit={submitReport} onClose={() => setShowReport(false)} />}

      {/* Chat header */}
      <div className="border-b border-glass-border px-4 py-2.5 flex items-center justify-between glass-card">
        <div className="flex items-center gap-2 min-w-0">
          {isGroup && <span className="flex-shrink-0 text-xs glass-card rounded-full px-2 py-0.5 text-accent-blue font-medium">Grupa</span>}
          {categoryInfo && MatchCategoryIcon && (
            <span className="flex-shrink-0 text-xs glass-card rounded-full px-2 py-0.5 font-medium inline-flex items-center gap-1" style={{ color: categoryInfo.color }}>
              <MatchCategoryIcon className="w-3 h-3" /> {categoryInfo.label}
            </span>
          )}
          <div className="min-w-0">
            <span className="text-sm text-muted">{isGroup ? "Učesnici: " : ""}</span>
            <span className="font-semibold text-accent-blue truncate">{partnerPseudonym}</span>
          </div>
          {partnerDisconnected && (
            <span className="flex-shrink-0 text-xs text-amber-400 inline-flex items-center gap-1"><WifiOff className="w-3 h-3" /> offline</span>
          )}
          {chatState === "ended" && <span className="flex-shrink-0 text-xs text-red-400">(završeno)</span>}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {matchedAt > 0 && chatState === "matched" && <ChatTimer startedAt={matchedAt} />}
          {chatState === "matched" && (
            <>
              <button onClick={() => setShowReport(true)} className="p-1.5 text-muted hover:text-red-400 transition-colors" title="Prijavi korisnika">
                <Flag className="w-4 h-4" />
              </button>
              <button onClick={nextChat} className="glass-card rounded-lg px-2.5 py-1 text-xs text-muted hover:text-foreground transition-all hover:border-accent/30 inline-flex items-center gap-1">
                <SkipForward className="w-3 h-3" /> Sledeći
              </button>
              <button onClick={leaveChat} className="glass-card rounded-lg p-1.5 text-muted hover:text-red-400 transition-all hover:border-red-400/30" title="Napusti">
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </>
          )}
          {chatState === "ended" && ratingDone && (
            <>
              <button onClick={nextChat} className="rounded-lg bg-accent px-3 py-1 text-xs font-medium text-white hover:bg-accent-hover transition-colors inline-flex items-center gap-1">
                <SkipForward className="w-3 h-3" /> Sledeći
              </button>
              <button onClick={leaveChat} className="glass-card rounded-lg p-1.5 text-muted hover:text-foreground transition-all" title="Početna">
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Messages */}
      <ChatWindow
        messages={messages}
        myPseudonym={myPseudonym}
        partnerTyping={partnerTyping}
        partnerPseudonym={typingName || partnerPseudonym}
        isGroup={isGroup}
      />

      {/* Connection ID card */}
      {connectionId && chatState === "matched" && (
        <div className="border-t border-glass-border p-4 glass-card">
          <div className="glass-card rounded-xl p-4 border-accent/30 text-center">
            <p className="text-xs text-muted mb-2">Vaš kod za ponovni susret:</p>
            <div className="flex items-center justify-center gap-2">
              <span className="text-2xl font-bold tracking-widest text-accent">{connectionId}</span>
              <button onClick={copyConnectionId} className="p-1.5 text-muted hover:text-accent transition-colors">
                {copiedId ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-muted mt-2">Sačuvaj ovaj kod — koristi ga na početnoj da se ponovo povežeš.</p>
          </div>
        </div>
      )}

      {/* Keep talking button — hidden for guests */}
      {chatState === "matched" && !connectionId && !isGuest && (
        <div className="border-t border-glass-border px-4 py-2 glass-card flex items-center justify-between">
          <div className="flex items-center gap-2">
            {!keepTalkingClicked ? (
              <button
                onClick={handleKeepTalking}
                className="text-xs text-muted hover:text-accent transition-colors inline-flex items-center gap-1"
              >
                <Heart className="w-3.5 h-3.5" /> Još pričamo
              </button>
            ) : (
              <span className="text-xs text-accent inline-flex items-center gap-1">
                <Heart className="w-3.5 h-3.5" fill="#8b5cf6" /> Čekamo sagovornika...
              </span>
            )}
            {partnerKeepTalking && !keepTalkingClicked && (
              <span className="text-xs text-accent-pink animate-pulse">Sagovornik želi da nastavite!</span>
            )}
          </div>
          <span className="text-[10px] text-muted/50">Premium</span>
        </div>
      )}

      {/* Input */}
      {chatState === "matched" && (
        <ChatInput onSend={sendMessage} onTyping={handleTyping} onStopTyping={handleStopTyping} />
      )}

      {/* Rating card (after chat ends) */}
      {chatState === "ended" && showRating && !ratingDone && (
        <RatingCard onSubmit={submitRating} onSkip={skipRating} />
      )}

      {/* End footer (after rating) */}
      {chatState === "ended" && ratingDone && (
        <div className="border-t border-glass-border p-4 text-center glass-card">
          <p className="text-muted text-sm mb-3">{isGroup ? "Razgovor je završen" : "Sagovornik je napustio chat"}</p>
          <div className="flex gap-3 justify-center">
            <button onClick={nextChat} className="rounded-xl bg-accent px-6 py-2 font-medium text-white hover:bg-accent-hover transition-colors inline-flex items-center gap-2">
              <SkipForward className="w-4 h-4" /> Sledeći razgovor
            </button>
            <button onClick={leaveChat} className="glass-card rounded-xl px-6 py-2 font-medium text-muted hover:text-foreground transition-all inline-flex items-center gap-2">
              <LogOut className="w-4 h-4" /> Početna
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Need to import Timer for rate limit waiting screen
import { Timer } from "lucide-react";

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="flex flex-1 items-center justify-center"><div className="text-muted animate-pulse">Učitavanje...</div></div>}>
      <ChatContent />
    </Suspense>
  );
}
