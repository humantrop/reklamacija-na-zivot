"use client";

import { useEffect, useState } from "react";
import type { Achievement } from "@/lib/achievements";

interface AchievementToastProps {
  achievement: Achievement | null;
  onClose: () => void;
}

export default function AchievementToast({ achievement, onClose }: AchievementToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (achievement) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(onClose, 300);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [achievement, onClose]);

  if (!achievement) return null;

  const Icon = achievement.icon;

  return (
    <div
      className={`fixed top-20 right-4 z-50 glass-card rounded-2xl p-4 pr-6 transition-all duration-300 ${
        visible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-8"
      }`}
      style={{ borderColor: achievement.color, borderWidth: "1px" }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center badge-shimmer"
          style={{ backgroundColor: `${achievement.color}20` }}
        >
          <Icon className="w-6 h-6" style={{ color: achievement.color }} />
        </div>
        <div>
          <p className="text-xs text-muted font-medium uppercase tracking-wider">Nova značka!</p>
          <p className="text-base font-bold" style={{ color: achievement.color }}>
            {achievement.name}
          </p>
        </div>
      </div>
    </div>
  );
}
