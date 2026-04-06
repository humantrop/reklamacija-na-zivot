export interface Category {
  id: string;
  label: string;
  icon: string;
  color: string;
}

export const categories: Category[] = [
  { id: "sef", label: "Šef", icon: "👔", color: "#ef4444" },
  { id: "zena", label: "Žena", icon: "👩", color: "#ec4899" },
  { id: "muz", label: "Muž", icon: "👨", color: "#3b82f6" },
  { id: "dete", label: "Dete", icon: "👶", color: "#f59e0b" },
  { id: "posao", label: "Posao", icon: "💼", color: "#6366f1" },
  { id: "porodica", label: "Porodica", icon: "👨‍👩‍👧‍👦", color: "#10b981" },
  { id: "zdravlje", label: "Zdravlje", icon: "🏥", color: "#14b8a6" },
  { id: "novac", label: "Novac", icon: "💰", color: "#eab308" },
  { id: "prijatelji", label: "Prijatelji", icon: "🤝", color: "#8b5cf6" },
  { id: "ostalo", label: "Ostalo", icon: "💭", color: "#64748b" },
];

export function getCategoryById(id: string): Category | undefined {
  return categories.find((c) => c.id === id);
}
