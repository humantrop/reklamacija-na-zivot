import {
  Flame,
  CloudRain,
  Circle,
  Droplets,
  Ear,
  type LucideIcon,
} from "lucide-react";

export interface Mood {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  color: string;
  isListener: boolean; // "Hoću da saslušam" matches with talkers
}

export const moods: Mood[] = [
  { id: "besan", label: "Besan", description: "Moram da ispušem", icon: Flame, color: "#ef4444", isListener: false },
  { id: "tuzan", label: "Tužan", description: "Treba mi neko", icon: CloudRain, color: "#3b82f6", isListener: false },
  { id: "prazan", label: "Prazan", description: "Ne osećam ništa", icon: Circle, color: "#64748b", isListener: false },
  { id: "plakanje", label: "Hoću da se isplačem", description: "Samo pusti", icon: Droplets, color: "#8b5cf6", isListener: false },
  { id: "slusam", label: "Hoću da saslušam", description: "Tu sam za tebe", icon: Ear, color: "#10b981", isListener: true },
];

export function getMoodById(id: string): Mood | undefined {
  return moods.find((m) => m.id === id);
}

// Matching logic: listeners match with talkers, same mood matches with same mood
export function getMoodMatchType(mood: Mood): "listener" | "talker" {
  return mood.isListener ? "listener" : "talker";
}
