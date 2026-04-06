"use client";

import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useRef, useCallback, Suspense } from "react";
import { io, Socket } from "socket.io-client";
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
  const roomIdRef = useRef<string>("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user) return;

    const newSocket = io();

    newSocket.on("connect", () => {
      setChatState("waiting");
      newSocket.emit("find-match", {
        userId: (session.user as { id: string }).id,
        mode,
        category,
      });
    });

    newSocket.on("waiting", (data: { mode: string; category?: string; queueSize?: number }) => {
      setChatState("waiting");
      if (data.mode === "group") {
        setWaitingInfo(`Čekamo još ljudi za grupu (${data.queueSize || 1} u redu)...`);
      } else if (data.mode === "category") {
        const cat = getCategoryById(data.category || "");
        setWaitingInfo(`Tražimo nekog sa temom: ${cat?.icon || ""} ${cat?.label || data.category}...`);
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

    newSocket.on("partner-left", () => {
      setChatState("ended");
      setPartnerTyping(false);
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

  const findNewMatch = useCallback(() => {
    if (!socket || !session?.user) return;
    setChatState("waiting");
    setMessages([]);
    setPartnerTyping(false);
    socket.emit("find-match", {
      userId: (session.user as { id: string }).id,
      mode,
      category,
    });
  }, [socket, session, mode, category]);

  const leaveChat = useCallback(() => {
    if (socket && roomIdRef.current) {
      socket.emit("leave-chat", roomIdRef.current);
    }
    router.push("/dashboard");
  }, [socket, router]);

  if (status === "loading" || chatState === "connecting") {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">🔌</div>
          <p className="text-muted">Povezivanje...</p>
        </div>
      </div>
    );
  }

  if (chatState === "waiting") {
    const categoryInfo = category ? getCategoryById(category) : null;
    return (
      <div className="relative flex flex-1 items-center justify-center overflow-hidden">
        <div className="bg-orb w-64 h-64 bg-accent top-[20%] left-[20%]" />

        <div className="relative z-10 text-center">
          <div className="text-6xl mb-6 animate-gentle-pulse">
            {mode === "group" ? "👥" : "🔍"}
          </div>
          <h2 className="text-2xl font-bold mb-2">
            {waitingInfo || "Tražimo sagovornika..."}
          </h2>
          {categoryInfo && (
            <div className="inline-flex items-center gap-2 glass-card rounded-full px-4 py-1.5 mt-2 mb-4">
              <span>{categoryInfo.icon}</span>
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
          {categoryInfo && (
            <span
              className="flex-shrink-0 text-xs glass-card rounded-full px-2 py-0.5 font-medium"
              style={{ color: categoryInfo.color }}
            >
              {categoryInfo.icon} {categoryInfo.label}
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
          {chatState === "ended" && (
            <span className="flex-shrink-0 text-xs text-red-400">(završeno)</span>
          )}
        </div>
        <div className="flex gap-2 flex-shrink-0">
          {chatState === "ended" ? (
            <button
              onClick={findNewMatch}
              className="rounded-xl bg-accent px-4 py-1.5 text-sm font-medium text-white hover:bg-accent-hover transition-colors"
            >
              🔍 Novi
            </button>
          ) : (
            <button
              onClick={leaveChat}
              className="glass-card rounded-xl px-4 py-1.5 text-sm text-muted hover:text-foreground transition-all hover:border-accent/30"
            >
              Napusti
            </button>
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
          <button
            onClick={findNewMatch}
            className="rounded-xl bg-accent px-6 py-2 font-medium text-white hover:bg-accent-hover transition-colors"
          >
            🔍 Nađi novog sagovornika
          </button>
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
