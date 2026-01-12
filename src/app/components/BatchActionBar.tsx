"use client";

import { Adult } from "@/lib/types";
import { AssignDropdown } from "./AssignDropdown";

interface BatchActionBarProps {
  selectedCount: number;
  adults: Adult[];
  selectedAdult: string;
  onSelectAdult: (email: string) => void;
  onAssign: () => void;
  onClear: () => void;
  isAssigning: boolean;
}

export function BatchActionBar({
  selectedCount,
  adults,
  selectedAdult,
  onSelectAdult,
  onAssign,
  onClear,
  isAssigning,
}: BatchActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg p-4">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
        <span className="text-sm font-medium text-gray-900">
          {selectedCount} event{selectedCount !== 1 ? "s" : ""} selected
        </span>
        <div className="flex items-center gap-3">
          <AssignDropdown
            adults={adults}
            selectedAdult={selectedAdult}
            onSelect={onSelectAdult}
          />
          <button
            onClick={onAssign}
            disabled={!selectedAdult || isAssigning}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700"
          >
            {isAssigning ? "Assigning..." : "Assign"}
          </button>
          <button
            onClick={onClear}
            className="px-4 py-2 text-gray-700 hover:text-gray-900 text-sm"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}
