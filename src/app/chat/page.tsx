"use client";

import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useRef, useCallback, Suspense } from "react";
import { io, Socket } from "socket.io-client";
import { Plug, Users, Search, LogOut, SkipForward, WifiOff } from "lucide-react";
import ChatWindow from "@/components/ChatWindow";
import ChatInput from "@/components/ChatInput";
import { getCategoryById } from "@/lib/categories";

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
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(data));
  } catch {}
}

function loadSession(): { roomId: string; mode: string; category?: string } | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function clearSession() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {}
}

function ChatContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode") || "solo";
  const category = searchParams.get("category") || undefined;

  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatState, setChatState] = useState<
    "connecting" | "waiting" | "matched" | "ended"
  >("connecting");
  const [myPseudonym, setMyPseudonym] = useState("");
  const [partnerPseudonym, setPartnerPseudonym] = useState("");
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [typingName, setTypingName] = useState("");
  const [isGroup, setIsGroup] = useState(false);
  const [matchCategory, setMatchCategory] = useState<string | undefined>();
  const [waitingInfo, setWaitingInfo] = useState("");
  const [partnerDisconnected, setPartnerDisconnected] = useState(false);
  const roomIdRef = useRef<string>("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user) return;

    const userId = (session.user as { id: string }).id;
    const newSocket = io();

    newSocket.on("connect", () => {
      // Check if we have an active session to rejoin
      const saved = loadSession();
      if (saved?.roomId) {
        newSocket.emit("rejoin", { userId, roomId: saved.roomId });
      } else {
        setChatState("waiting");
        newSocket.emit("find-match", { userId, mode, category });
      }
    });

    newSocket.on("rejoin-success", (data: {
      roomId: string;
      isGroup: boolean;
      myPseudonym: string;
      myColor?: string;
      partnerPseudonym?: string;
      partnerConnected?: boolean;
      participants?: Participant[];
      category?: string;
    }) => {
      roomIdRef.current = data.roomId;
      setMyPseudonym(data.myPseudonym);
      setIsGroup(data.isGroup);
      setMatchCategory(data.category);
      setChatState("matched");
      setPartnerDisconnected(false);

      if (data.isGroup && data.participants) {
        setParticipants(data.participants);
        const others = data.participants.filter((p) => !p.isMe);
        setPartnerPseudonym(others.map((p) => p.pseudonym).join(", "));
      } else {
        setPartnerPseudonym(data.partnerPseudonym || "");
        if (data.partnerConnected === false) {
          setPartnerDisconnected(true);
        }
      }

      // Messages from before refresh are lost (ephemeral by design)
      // but the conversation continues
      setMessages([{
        id: "system_rejoin",
        pseudonym: "Sistem",
        message: "Ponovo si povezan/a. Prethodne poruke su obrisane, ali razgovor nastavlja.",
        timestamp: Date.now(),
        isOwn: false,
        color: "#64748b",
      }]);
    });

    newSocket.on("rejoin-failed", () => {
      clearSession();
      setChatState("waiting");
      newSocket.emit("find-match", { userId, mode, category });
    });

    newSocket.on("waiting", (data: { mode: string; category?: string; queueSize?: number }) => {
      setChatState("waiting");
      if (data.mode === "group") {
        setWaitingInfo(`Čekamo još ljudi za grupu (${data.queueSize || 1} u redu)...`);
      } else if (data.mode === "category") {
        const cat = getCategoryById(data.category || "");
        setWaitingInfo(cat ? `Tražimo nekog sa temom: ${cat.label}...` : `Tražimo nekog sa temom: ${data.category}...`);
      } else {
        setWaitingInfo("Tražimo sagovornika...");
      }
    });

    newSocket.on("category-timeout", () => {
      setWaitingInfo("Niko sa istom temom, tražimo bilo koga...");
    });

    newSocket.on("matched", (data: {
      roomId: string;
      isGroup: boolean;
      myPseudonym: string;
      myColor?: string;
      partnerPseudonym?: string;
      participants?: Participant[];
      category?: string;
    }) => {
      roomIdRef.current = data.roomId;
      setMyPseudonym(data.myPseudonym);
      setIsGroup(data.isGroup);
      setMatchCategory(data.category);
      setChatState("matched");
      setMessages([]);
      setPartnerDisconnected(false);

      // Save session for reconnect
      saveSession({ roomId: data.roomId, mode, category });

      if (data.isGroup && data.participants) {
        setParticipants(data.participants);
        const others = data.participants.filter((p) => !p.isMe);
        setPartnerPseudonym(others.map((p) => p.pseudonym).join(", "));
      } else {
        setPartnerPseudonym(data.partnerPseudonym || "");
      }
    });

    newSocket.on("receive-message", (data: {
      pseudonym: string;
      color?: string;
      message: string;
      timestamp: number;
    }) => {
      setMessages((prev) => [
        ...prev,
        {
          id: `${data.timestamp}_${Math.random()}`,
          pseudonym: data.pseudonym,
          message: data.message,
          timestamp: data.timestamp,
          isOwn: false,
          color: data.color,
        },
      ]);
    });

    newSocket.on("partner-typing", (data: { pseudonym: string }) => {
      setPartnerTyping(true);
      setTypingName(data.pseudonym);
    });

    newSocket.on("partner-stop-typing", () => {
      setPartnerTyping(false);
    });

    newSocket.on("partner-disconnected", (data: { pseudonym: string }) => {
      setPartnerDisconnected(true);
      setMessages((prev) => [
        ...prev,
        {
          id: `system_disc_${Date.now()}`,
          pseudonym: "Sistem",
          message: `${data.pseudonym} se privremeno izgubio/la. Čekamo da se vrati...`,
          timestamp: Date.now(),
          isOwn: false,
          color: "#64748b",
        },
      ]);
    });

    newSocket.on("partner-reconnected", (data: { pseudonym: string }) => {
      setPartnerDisconnected(false);
      setMessages((prev) => [
        ...prev,
        {
          id: `system_recon_${Date.now()}`,
          pseudonym: "Sistem",
          message: `${data.pseudonym} se vratio/la!`,
          timestamp: Date.now(),
          isOwn: false,
          color: "#64748b",
        },
      ]);
    });

    newSocket.on("partner-left", () => {
      setChatState("ended");
      setPartnerTyping(false);
      setPartnerDisconnected(false);
      clearSession();
    });

    newSocket.on("participant-left", (data: { pseudonym: string; remainingCount: number }) => {
      setMessages((prev) => [
        ...prev,
        {
          id: `system_${Date.now()}`,
          pseudonym: "Sistem",
          message: `${data.pseudonym} je napustio/la razgovor. (ostalo ${data.remainingCount})`,
          timestamp: Date.now(),
          isOwn: false,
          color: "#64748b",
        },
      ]);
      if (data.remainingCount <= 1) {
        setChatState("ended");
        clearSession();
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [status, session, mode, category]);

  const sendMessage = useCallback(
    (message: string) => {
      if (!socket || !roomIdRef.current || !message.trim()) return;

      socket.emit("send-message", {
        roomId: roomIdRef.current,
        message: message.trim(),
      });

      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}_${Math.random()}`,
          pseudonym: myPseudonym,
          message: message.trim(),
          timestamp: Date.now(),
          isOwn: true,
        },
      ]);
    },
    [socket, myPseudonym]
  );

  const handleTyping = useCallback(() => {
    if (socket && roomIdRef.current) {
      socket.emit("typing", roomIdRef.current);
    }
  }, [socket]);

  const handleStopTyping = useCallback(() => {
    if (socket && roomIdRef.current) {
      socket.emit("stop-typing", roomIdRef.current);
    }
  }, [socket]);

  const userId = session?.user ? (session.user as { id: string }).id : "";

  const leaveChat = useCallback(() => {
    if (socket && roomIdRef.current) {
      socket.emit("leave-chat", { roomId: roomIdRef.current, userId });
    }
    clearSession();
    router.push("/dashboard");
  }, [socket, router, userId]);

  const nextChat = useCallback(() => {
    if (!socket) return;
    // Leave current room and immediately find new match
    if (roomIdRef.current) {
      socket.emit("leave-chat", { roomId: roomIdRef.current, userId });
    }
    clearSession();
    roomIdRef.current = "";
    setChatState("waiting");
    setMessages([]);
    setPartnerTyping(false);
    setPartnerDisconnected(false);
    socket.emit("find-match", { userId, mode, category });
  }, [socket, userId, mode, category]);

  if (status === "loading" || chatState === "connecting") {
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
          <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-6 animate-gentle-pulse">
            {mode === "group" ? (
              <Users className="w-7 h-7 text-accent" />
            ) : (
              <Search className="w-7 h-7 text-accent" />
            )}
          </div>
          <h2 className="text-2xl font-bold mb-2">
            {waitingInfo || "Tražimo sagovornika..."}
          </h2>
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
          <button
            onClick={leaveChat}
            className="mt-8 text-sm text-muted hover:text-foreground transition-colors"
          >
            ← Nazad na početnu
          </button>
        </div>
      </div>
    );
  }

  const categoryInfo = matchCategory ? getCategoryById(matchCategory) : null;
  const MatchCategoryIcon = categoryInfo?.icon;

  return (
    <div className="flex flex-1 flex-col max-w-3xl mx-auto w-full">
      {/* Chat header */}
      <div className="border-b border-glass-border px-6 py-3 flex items-center justify-between glass-card">
        <div className="flex items-center gap-2 min-w-0">
          {isGroup && (
            <span className="flex-shrink-0 text-xs glass-card rounded-full px-2 py-0.5 text-accent-blue font-medium">
              Grupa
            </span>
          )}
          {categoryInfo && MatchCategoryIcon && (
            <span
              className="flex-shrink-0 text-xs glass-card rounded-full px-2 py-0.5 font-medium inline-flex items-center gap-1"
              style={{ color: categoryInfo.color }}
            >
              <MatchCategoryIcon className="w-3 h-3" /> {categoryInfo.label}
            </span>
          )}
          <div className="min-w-0">
            <span className="text-sm text-muted">
              {isGroup ? "Učesnici: " : "Razgovaraš sa "}
            </span>
            <span className="font-semibold text-accent-blue truncate">
              {partnerPseudonym}
            </span>
          </div>
          {partnerDisconnected && (
            <span className="flex-shrink-0 text-xs text-amber-400 inline-flex items-center gap-1">
              <WifiOff className="w-3 h-3" /> offline
            </span>
          )}
          {chatState === "ended" && (
            <span className="flex-shrink-0 text-xs text-red-400">(završeno)</span>
          )}
        </div>
        <div className="flex gap-2 flex-shrink-0">
          {chatState === "ended" ? (
            <button
              onClick={nextChat}
              className="rounded-xl bg-accent px-4 py-1.5 text-sm font-medium text-white hover:bg-accent-hover transition-colors inline-flex items-center gap-1.5"
            >
              <SkipForward className="w-3.5 h-3.5" /> Sledeći
            </button>
          ) : (
            <>
              <button
                onClick={nextChat}
                className="glass-card rounded-xl px-3 py-1.5 text-sm text-muted hover:text-foreground transition-all hover:border-accent/30 inline-flex items-center gap-1.5"
                title="Napusti i nađi sledećeg"
              >
                <SkipForward className="w-3.5 h-3.5" /> Sledeći
              </button>
              <button
                onClick={leaveChat}
                className="glass-card rounded-xl px-3 py-1.5 text-sm text-muted hover:text-red-400 transition-all hover:border-red-400/30 inline-flex items-center gap-1.5"
                title="Napusti razgovor"
              >
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

      {/* Input */}
      {chatState === "matched" && (
        <ChatInput
          onSend={sendMessage}
          onTyping={handleTyping}
          onStopTyping={handleStopTyping}
        />
      )}

      {chatState === "ended" && (
        <div className="border-t border-glass-border p-4 text-center glass-card">
          <p className="text-muted text-sm mb-3">
            {isGroup ? "Razgovor je završen" : "Sagovornik je napustio chat"}
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={nextChat}
              className="rounded-xl bg-accent px-6 py-2 font-medium text-white hover:bg-accent-hover transition-colors inline-flex items-center gap-2"
            >
              <SkipForward className="w-4 h-4" /> Sledeći razgovor
            </button>
            <button
              onClick={leaveChat}
              className="glass-card rounded-xl px-6 py-2 font-medium text-muted hover:text-foreground transition-all inline-flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" /> Početna
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center">
          <div className="text-muted animate-pulse">Učitavanje...</div>
        </div>
      }
    >
      <ChatContent />
    </Suspense>
  );
}
