"use client";

import { Adult } from "@/lib/types";

interface AssignDropdownProps {
  adults: Adult[];
  selectedAdult: string;
  onSelect: (email: string) => void;
}

export function AssignDropdown({
  adults,
  selectedAdult,
  onSelect,
}: AssignDropdownProps) {
  return (
    <select
      value={selectedAdult}
      onChange={(e) => onSelect(e.target.value)}
      className="flex-1 sm:flex-none px-3 py-2 border border-stone-300 rounded-lg bg-white text-sm text-stone-700 focus:ring-2 focus:ring-orange-500 focus:ring-offset-1 focus:outline-none focus:border-orange-500 transition-all duration-200"
    >
      <option value="">Select adult...</option>
      {adults.map((adult) => (
        <option key={adult.email} value={adult.email}>
          {adult.name}
        </option>
      ))}
    </select>
  );
}
