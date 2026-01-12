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
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 shadow-lg p-3 sm:p-4 pb-safe">
      <div className="max-w-4xl mx-auto">
        {/* Mobile: stacked, Desktop: inline */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <span className="text-sm font-medium text-stone-900">
            {selectedCount} event{selectedCount !== 1 ? "s" : ""} selected
          </span>
          <div className="flex items-center gap-2 sm:gap-3">
            <AssignDropdown
              adults={adults}
              selectedAdult={selectedAdult}
              onSelect={onSelectAdult}
            />
            <button
              onClick={onAssign}
              disabled={!selectedAdult || isAssigning}
              className="flex-1 sm:flex-none px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-orange-600 transition-colors"
            >
              {isAssigning ? "Assigning..." : "Assign"}
            </button>
            <button
              onClick={onClear}
              className="px-3 sm:px-4 py-2 text-stone-700 hover:text-stone-900 text-sm transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
