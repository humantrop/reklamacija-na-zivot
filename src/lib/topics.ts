import {
  Clock,
  Compass,
  Lightbulb,
  HeartHandshake,
  Milestone,
  Flame,
  BookOpen,
  type LucideIcon,
} from "lucide-react";

export interface DailyTopic {
  id: string;
  prompt: string;
  icon: LucideIcon;
  color: string;
}

const topics: DailyTopic[] = [
  { id: "proslost", prompt: "Šta bi rekao/la sebi od pre 5 godina?", icon: Clock, color: "#8b5cf6" },
  { id: "strah", prompt: "Čega se najviše plašiš a nikad nisi rekao/la naglas?", icon: Compass, color: "#ef4444" },
  { id: "san", prompt: "Koji san si tiho odustao/la da juriš?", icon: Lightbulb, color: "#f59e0b" },
  { id: "oprostaj", prompt: "Kome bi oprostio/la kada bi mogao/la?", icon: HeartHandshake, color: "#ec4899" },
  { id: "prekretnica", prompt: "Koji trenutak ti je promenio život a nisi ga odmah prepoznao/la?", icon: Milestone, color: "#3b82f6" },
  { id: "bes", prompt: "Šta te najviše nervira a svi se prave da je normalno?", icon: Flame, color: "#ef4444" },
  { id: "lekcija", prompt: "Koja životna lekcija te je najskuplje koštala?", icon: BookOpen, color: "#10b981" },
];

export function getTodaysTopic(): DailyTopic {
  // Rotate based on day of year
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now.getTime() - start.getTime()) / 86400000);
  return topics[dayOfYear % topics.length];
}
