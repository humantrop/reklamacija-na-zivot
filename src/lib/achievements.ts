export interface Achievement {
  id: string;
  name: string;
  icon: string;
  requiredChats: number;
  color: string;
}

export const achievements: Achievement[] = [
  { id: "none", name: "Novajlija", icon: "🌱", requiredChats: 0, color: "#6b7280" },
  { id: "beginner", name: "Početnik", icon: "💬", requiredChats: 1, color: "#10b981" },
  { id: "social", name: "Društvenjak", icon: "🌟", requiredChats: 5, color: "#3b82f6" },
  { id: "veteran", name: "Veteran", icon: "🏆", requiredChats: 15, color: "#f59e0b" },
  { id: "legend", name: "Legenda", icon: "👑", requiredChats: 50, color: "#8b5cf6" },
  { id: "master", name: "Vladar reklamacija", icon: "🔥", requiredChats: 100, color: "#ef4444" },
];

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
