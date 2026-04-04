"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import ChatWindow from "@/components/ChatWindow";
import ChatInput from "@/components/ChatInput";

interface Message {
  id: string;
  pseudonym: string;
  message: string;
  timestamp: number;
  isOwn: boolean;
}

export default function ChatPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatState, setChatState] = useState<
    "connecting" | "waiting" | "matched" | "ended"
  >("connecting");
  const [myPseudonym, setMyPseudonym] = useState("");
  const [partnerPseudonym, setPartnerPseudonym] = useState("");
  const [partnerTyping, setPartnerTyping] = useState(false);
  const roomIdRef = useRef<string>("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user) return;

    const newSocket = io({
      path: "/api/socketio",
    });

    newSocket.on("connect", () => {
      setChatState("waiting");
      newSocket.emit(
        "find-match",
        (session.user as { id: string }).id
      );
    });

    newSocket.on("waiting", () => {
      setChatState("waiting");
    });

    newSocket.on(
      "matched",
      (data: {
        roomId: string;
        myPseudonym: string;
        partnerPseudonym: string;
      }) => {
        roomIdRef.current = data.roomId;
        setMyPseudonym(data.myPseudonym);
        setPartnerPseudonym(data.partnerPseudonym);
        setChatState("matched");
        setMessages([]);
      }
    );

    newSocket.on(
      "receive-message",
      (data: { pseudonym: string; message: string; timestamp: number }) => {
        setMessages((prev) => [
          ...prev,
          {
            id: `${data.timestamp}_${Math.random()}`,
            pseudonym: data.pseudonym,
            message: data.message,
            timestamp: data.timestamp,
            isOwn: false,
          },
        ]);
      }
    );

    newSocket.on("partner-typing", () => {
      setPartnerTyping(true);
    });

    newSocket.on("partner-stop-typing", () => {
      setPartnerTyping(false);
    });

    newSocket.on("partner-left", () => {
      setChatState("ended");
      setPartnerTyping(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [status, session]);

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
    socket.emit("find-match", (session.user as { id: string }).id);
  }, [socket, session]);

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
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-6 animate-bounce">🔍</div>
          <h2 className="text-2xl font-bold mb-2">Tražimo sagovornika...</h2>
          <p className="text-muted mb-8">
            Čekamo da se neko pojavi. Neće dugo!
          </p>
          <div className="flex gap-1 justify-center">
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

  return (
    <div className="flex flex-1 flex-col max-w-3xl mx-auto w-full">
      {/* Chat header */}
      <div className="border-b border-surface-light px-6 py-3 flex items-center justify-between bg-surface/50">
        <div>
          <span className="text-sm text-muted">Razgovaraš sa </span>
          <span className="font-semibold text-accent-blue">
            {partnerPseudonym}
          </span>
          {chatState === "ended" && (
            <span className="ml-2 text-xs text-red-400">
              (napustio/la chat)
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {chatState === "ended" ? (
            <button
              onClick={findNewMatch}
              className="rounded-lg bg-accent px-4 py-1.5 text-sm font-medium text-white hover:bg-accent/80 transition-colors"
            >
              🔍 Novi razgovor
            </button>
          ) : (
            <button
              onClick={leaveChat}
              className="rounded-lg bg-surface-light px-4 py-1.5 text-sm text-muted hover:text-foreground transition-colors"
            >
              Napusti chat
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <ChatWindow
        messages={messages}
        myPseudonym={myPseudonym}
        partnerTyping={partnerTyping}
        partnerPseudonym={partnerPseudonym}
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
        <div className="border-t border-surface-light p-4 text-center">
          <p className="text-muted text-sm mb-3">
            Sagovornik je napustio chat
          </p>
          <button
            onClick={findNewMatch}
            className="rounded-lg bg-accent px-6 py-2 font-medium text-white hover:bg-accent/80 transition-colors"
          >
            🔍 Nađi novog sagovornika
          </button>
        </div>
      )}
    </div>
  );
}
