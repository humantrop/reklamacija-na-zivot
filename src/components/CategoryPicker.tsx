"use client";

import { categories } from "@/lib/categories";

interface CategoryPickerProps {
  selected: string | null;
  onSelect: (categoryId: string | null) => void;
}

export default function CategoryPicker({ selected, onSelect }: CategoryPickerProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
      {categories.map((cat) => {
        const Icon = cat.icon;
        return (
          <button
            key={cat.id}
            onClick={() => onSelect(selected === cat.id ? null : cat.id)}
            className={`glass-card rounded-xl p-3 text-center transition-all duration-200 hover:-translate-y-0.5 ${
              selected === cat.id
                ? "border-2 scale-[1.02]"
                : "hover:border-accent/20"
            }`}
            style={
              selected === cat.id
                ? { borderColor: cat.color, boxShadow: `0 0 20px ${cat.color}20` }
                : undefined
            }
          >
            <div className="flex justify-center mb-1">
              <Icon className="w-6 h-6" style={{ color: cat.color }} />
            </div>
            <div className="text-xs font-medium text-muted">{cat.label}</div>
          </button>
        );
      })}
    </div>
  );
}
