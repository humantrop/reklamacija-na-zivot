"use client";

import { moods } from "@/lib/moods";

interface MoodPickerProps {
  selected: string | null;
  onSelect: (moodId: string | null) => void;
}

export default function MoodPicker({ selected, onSelect }: MoodPickerProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
      {moods.map((mood) => {
        const Icon = mood.icon;
        const isSelected = selected === mood.id;
        return (
          <button
            key={mood.id}
            onClick={() => onSelect(isSelected ? null : mood.id)}
            className={`glass-card rounded-xl p-3 text-center transition-all duration-200 hover:-translate-y-0.5 ${
              isSelected ? "border-2 scale-[1.02]" : "hover:border-accent/20"
            }`}
            style={
              isSelected
                ? { borderColor: mood.color, boxShadow: `0 0 20px ${mood.color}20` }
                : undefined
            }
          >
            <div className="flex justify-center mb-1.5">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${mood.color}15` }}
              >
                <Icon className="w-5 h-5" style={{ color: mood.color }} />
              </div>
            </div>
            <div className="text-xs font-medium" style={{ color: isSelected ? mood.color : undefined }}>
              {mood.label}
            </div>
            <div className="text-[10px] text-muted mt-0.5">{mood.description}</div>
          </button>
        );
      })}
    </div>
  );
}
