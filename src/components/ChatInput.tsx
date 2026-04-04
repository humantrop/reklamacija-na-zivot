"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";

const EmojiPicker = dynamic(() => import("emoji-picker-react"), {
  ssr: false,
  loading: () => null,
});

interface ChatInputProps {
  onSend: (message: string) => void;
  onTyping: () => void;
  onStopTyping: () => void;
}

export default function ChatInput({
  onSend,
  onTyping,
  onStopTyping,
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);

  const handleSend = useCallback(() => {
    if (!message.trim()) return;
    onSend(message);
    setMessage("");
    onStopTyping();
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    inputRef.current?.focus();
  }, [message, onSend, onStopTyping]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    onTyping();

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      onStopTyping();
    }, 2000);
  };

  const handleEmojiClick = (emojiData: { emoji: string }) => {
    setMessage((prev) => prev + emojiData.emoji);
    setShowEmoji(false);
    inputRef.current?.focus();
  };

  // Close emoji picker on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) {
        setShowEmoji(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="border-t border-surface-light p-4 relative">
      {showEmoji && (
        <div ref={emojiRef} className="absolute bottom-20 left-4 z-50">
          <EmojiPicker
            onEmojiClick={handleEmojiClick}
            theme={"dark" as unknown as undefined}
            width={320}
            height={400}
            searchPlaceholder="Pretraži emoji..."
            previewConfig={{ showPreview: false }}
          />
        </div>
      )}

      <div className="flex items-end gap-2 max-w-3xl mx-auto">
        <button
          onClick={() => setShowEmoji(!showEmoji)}
          className="flex-shrink-0 rounded-lg bg-surface-light p-3 text-lg hover:bg-surface transition-colors"
          title="Emoji"
        >
          😊
        </button>

        <textarea
          ref={inputRef}
          value={message}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Napiši poruku..."
          rows={1}
          className="flex-1 resize-none rounded-lg border border-surface-light bg-surface px-4 py-3 text-foreground placeholder-muted/50 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent max-h-32"
          style={{ minHeight: "48px" }}
        />

        <button
          onClick={handleSend}
          disabled={!message.trim()}
          className="flex-shrink-0 rounded-lg bg-accent p-3 text-white hover:bg-accent/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Pošalji"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-5 h-5"
          >
            <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
