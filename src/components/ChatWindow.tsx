"use client";

import { useEffect, useRef } from "react";
import { ShieldAlert, Hand } from "lucide-react";

interface Message {
  id: string;
  pseudonym: string;
  message: string;
  timestamp: number;
  isOwn: boolean;
  color?: string;
}

interface ChatWindowProps {
  messages: Message[];
  myPseudonym: string;
  partnerTyping: boolean;
  partnerPseudonym: string;
  isGroup?: boolean;
}

const getInitials = (name: string) => {
  const parts = name.split(" ");
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
};

export default function ChatWindow({
  messages,
  myPseudonym,
  partnerTyping,
  partnerPseudonym,
  isGroup = false,
}: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, partnerTyping]);

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString("sr-RS", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="flex-1 overflow-y-auto chat-scroll p-6 space-y-3">
      {/* Privacy warning — always visible at top */}
      <div className="glass-card rounded-xl p-3 flex items-start gap-2.5 border-amber-500/20 bg-amber-500/5">
        <ShieldAlert className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-muted leading-relaxed">
          <span className="text-amber-400 font-medium">Tvoja bezbednost je važna.</span>{" "}
          Nemoj deliti lične podatke — ime, adresu, telefon, društvene mreže ili bilo šta
          po čemu te neko može identifikovati. Razgovor je anoniman, čuvaj to tako.
        </p>
      </div>

      {messages.length === 0 && !partnerTyping && (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
              <Hand className="w-7 h-7 text-accent" />
            </div>
            <p className="text-muted">
              {isGroup ? "Grupa je formirana!" : "Spojeni ste!"} Ti si{" "}
              <span className="font-semibold gradient-text">{myPseudonym}</span>.
              <br />
              Reci zdravo!
            </p>
          </div>
        </div>
      )}

      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`flex gap-2.5 animate-slide-up ${msg.isOwn ? "flex-row-reverse" : "flex-row"}`}
        >
          {/* Avatar */}
          <div
            className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold ${
              msg.isOwn
                ? "bg-accent/20 text-accent"
                : "text-white"
            }`}
            style={!msg.isOwn ? { backgroundColor: msg.color || "rgba(96, 165, 250, 0.2)", color: msg.color || "#60a5fa" } : undefined}
          >
            {getInitials(msg.pseudonym)}
          </div>

          <div className={`flex flex-col ${msg.isOwn ? "items-end" : "items-start"} max-w-[70%]`}>
            <span
              className="text-[11px] mb-0.5 font-medium"
              style={{ color: msg.isOwn ? "#3b82f6" : (msg.color || "#60a5fa") }}
            >
              {msg.pseudonym}
            </span>
            <div
              className={`rounded-2xl px-4 py-2.5 ${
                msg.isOwn
                  ? "bg-gradient-to-br from-accent to-accent-hover text-white rounded-tr-md"
                  : "glass-card rounded-tl-md"
              }`}
            >
              <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{msg.message}</p>
            </div>
            <span className="text-[10px] text-muted/40 mt-0.5">
              {formatTime(msg.timestamp)}
            </span>
          </div>
        </div>
      ))}

      {partnerTyping && (
        <div className="flex gap-2.5 animate-slide-up">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent-blue/20 flex items-center justify-center text-[10px] font-bold text-accent-blue">
            {getInitials(partnerPseudonym)}
          </div>
          <div className="flex flex-col items-start">
            <span className="text-[11px] mb-0.5 font-medium text-accent-blue">
              {partnerPseudonym}
            </span>
            <div className="glass-card rounded-2xl rounded-tl-md px-4 py-3">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-muted animate-pulse" />
                <div className="w-1.5 h-1.5 rounded-full bg-muted animate-pulse [animation-delay:0.2s]" />
                <div className="w-1.5 h-1.5 rounded-full bg-muted animate-pulse [animation-delay:0.4s]" />
              </div>
            </div>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
