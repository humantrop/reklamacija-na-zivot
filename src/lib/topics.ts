import {
  Clock,
  Compass,
  Lightbulb,
  HeartHandshake,
  Milestone,
  Flame,
  BookOpen,
  Users,
  Shield,
  Moon,
  MapPin,
  MessageCircle,
  Puzzle,
  ThumbsUp,
  Feather,
  Brain,
  Home,
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
  { id: "prijatelj", prompt: "Da li si ikad izgubio/la najboljeg prijatelja? Šta se desilo?", icon: Users, color: "#6366f1" },
  { id: "granica", prompt: "Koja granica ti je bilo najteže da postaviš?", icon: Shield, color: "#14b8a6" },
  { id: "noc", prompt: "Šta te drži budnim/om noću kad svi zaspe?", icon: Moon, color: "#7c3aed" },
  { id: "mesto", prompt: "Koje mesto te podseća na osobu koju pokušavaš da zaboraviš?", icon: MapPin, color: "#f97316" },
  { id: "cutanje", prompt: "Šta nikad nisi rekao/la osobi kojoj si trebao/la?", icon: MessageCircle, color: "#0ea5e9" },
  { id: "identitet", prompt: "Šta si morao/la da odglumis da bi se uklopio/la?", icon: Puzzle, color: "#d946ef" },
  { id: "pohvala", prompt: "Kad si poslednji put bio/la ponosan/na na sebe — i zašto?", icon: ThumbsUp, color: "#22c55e" },
  { id: "teret", prompt: "Koji teret nosiš a niko ne zna da ga imaš?", icon: Feather, color: "#64748b" },
  { id: "odluka", prompt: "Koja odluka ti je promenila sve, a doneo/la si je u sekundi?", icon: Brain, color: "#e11d48" },
  { id: "dom", prompt: "Šta za tebe znači 'dom' — i da li ga imaš?", icon: Home, color: "#a855f7" },
];

export function getTodaysTopic(): DailyTopic {
  // Rotate based on day of year
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now.getTime() - start.getTime()) / 86400000);
  return topics[dayOfYear % topics.length];
}
