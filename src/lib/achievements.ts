import { Sprout, MessageCircle, Star, Trophy, Crown, Flame, Ear, type LucideIcon } from "lucide-react";

export interface Achievement {
  id: string;
  name: string;
  icon: LucideIcon;
  requiredChats: number;
  color: string;
  special?: boolean; // non-chat-count badges (e.g. listener)
}

export const achievements: Achievement[] = [
  { id: "none", name: "Novajlija", icon: Sprout, requiredChats: 0, color: "#6b7280" },
  { id: "beginner", name: "Početnik", icon: MessageCircle, requiredChats: 20, color: "#10b981" },
  { id: "social", name: "Društvenjak", icon: Star, requiredChats: 50, color: "#3b82f6" },
  { id: "veteran", name: "Veteran", icon: Trophy, requiredChats: 120, color: "#f59e0b" },
  { id: "legend", name: "Legenda", icon: Crown, requiredChats: 250, color: "#8b5cf6" },
  { id: "master", name: "Vladar reklamacija", icon: Flame, requiredChats: 500, color: "#ef4444" },
];

export const listenerBadge: Achievement = {
  id: "listener", name: "Slušalac", icon: Ear, requiredChats: 0, color: "#10b981", special: true,
};

export function getCurrentAchievement(totalChats: number): Achievement {
  let current = achievements[0];
  for (const a of achievements) {
    if (totalChats >= a.requiredChats) {
      current = a;
    }
  }
  return current;
}

export function getNextAchievement(totalChats: number): Achievement | null {
  for (const a of achievements) {
    if (totalChats < a.requiredChats) {
      return a;
    }
  }
  return null;
}

export function getProgress(totalChats: number): number {
  const current = getCurrentAchievement(totalChats);
  const next = getNextAchievement(totalChats);
  if (!next) return 100;
  const range = next.requiredChats - current.requiredChats;
  const progress = totalChats - current.requiredChats;
  return Math.round((progress / range) * 100);
}
