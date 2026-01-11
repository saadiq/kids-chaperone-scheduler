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
      className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm"
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
