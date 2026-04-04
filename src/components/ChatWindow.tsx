"use client";

import { useEffect, useRef } from "react";

interface Message {
  id: string;
  pseudonym: string;
  message: string;
  timestamp: number;
  isOwn: boolean;
}

interface ChatWindowProps {
  messages: Message[];
  myPseudonym: string;
  partnerTyping: boolean;
  partnerPseudonym: string;
}

export default function ChatWindow({
  messages,
  myPseudonym,
  partnerTyping,
  partnerPseudonym,
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
    <div className="flex-1 overflow-y-auto chat-scroll p-6 space-y-4">
      {messages.length === 0 && !partnerTyping && (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="text-4xl mb-4">👋</div>
            <p className="text-muted">
              Spojeni ste! Ti si{" "}
              <span className="font-semibold text-accent">{myPseudonym}</span>.
              <br />
              Reci zdravo!
            </p>
          </div>
        </div>
      )}

      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`flex flex-col ${msg.isOwn ? "items-end" : "items-start"}`}
        >
          <span className={`text-xs mb-1 ${msg.isOwn ? "text-accent" : "text-accent-blue"}`}>
            {msg.pseudonym}
          </span>
          <div
            className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
              msg.isOwn
                ? "bg-accent text-white rounded-br-md"
                : "bg-surface-light text-foreground rounded-bl-md"
            }`}
          >
            <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
          </div>
          <span className="text-xs text-muted/50 mt-1">
            {formatTime(msg.timestamp)}
          </span>
        </div>
      ))}

      {partnerTyping && (
        <div className="flex flex-col items-start">
          <span className="text-xs mb-1 text-accent-blue">
            {partnerPseudonym}
          </span>
          <div className="bg-surface-light rounded-2xl rounded-bl-md px-4 py-3">
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-muted animate-pulse" />
              <div className="w-1.5 h-1.5 rounded-full bg-muted animate-pulse [animation-delay:0.2s]" />
              <div className="w-1.5 h-1.5 rounded-full bg-muted animate-pulse [animation-delay:0.4s]" />
            </div>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
