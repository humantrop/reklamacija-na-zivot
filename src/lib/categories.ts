import {
  Briefcase,
  Heart,
  User,
  Baby,
  Building2,
  Users,
  HeartPulse,
  Wallet,
  Handshake,
  MessageSquare,
  type LucideIcon,
} from "lucide-react";

export interface Category {
  id: string;
  label: string;
  icon: LucideIcon;
  color: string;
}

export const categories: Category[] = [
  { id: "sef", label: "Šef", icon: Briefcase, color: "#ef4444" },
  { id: "zena", label: "Žena", icon: Heart, color: "#ec4899" },
  { id: "muz", label: "Muž", icon: User, color: "#3b82f6" },
  { id: "dete", label: "Dete", icon: Baby, color: "#f59e0b" },
  { id: "posao", label: "Posao", icon: Building2, color: "#6366f1" },
  { id: "porodica", label: "Porodica", icon: Users, color: "#10b981" },
  { id: "zdravlje", label: "Zdravlje", icon: HeartPulse, color: "#14b8a6" },
  { id: "novac", label: "Novac", icon: Wallet, color: "#eab308" },
  { id: "prijatelji", label: "Prijatelji", icon: Handshake, color: "#8b5cf6" },
  { id: "ostalo", label: "Ostalo", icon: MessageSquare, color: "#64748b" },
];

export function getCategoryById(id: string): Category | undefined {
  return categories.find((c) => c.id === id);
}
