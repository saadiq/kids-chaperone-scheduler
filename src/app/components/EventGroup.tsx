"use client";

import { useState } from "react";
import { CalendarEvent } from "@/lib/types";
import { EventCard } from "./EventCard";

interface EventGroupProps {
  title: string;
  events: CalendarEvent[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  defaultCollapsed?: boolean;
  variant: "danger" | "warning" | "success";
}

const variantStyles = {
  danger: "border-red-200 bg-red-50",
  warning: "border-yellow-200 bg-yellow-50",
  success: "border-green-200 bg-green-50",
};

const headerStyles = {
  danger: "text-red-800",
  warning: "text-yellow-800",
  success: "text-green-800",
};

export function EventGroup({
  title,
  events,
  selectedIds,
  onToggleSelect,
  defaultCollapsed = false,
  variant,
}: EventGroupProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  if (events.length === 0) return null;

  return (
    <div className={`border rounded-lg overflow-hidden ${variantStyles[variant]}`}>
      <button
        onClick={() => setCollapsed(!collapsed)}
        className={`w-full px-4 py-3 flex items-center justify-between ${headerStyles[variant]}`}
      >
        <span className="font-semibold">
          {title} ({events.length})
        </span>
        <span className="text-lg">{collapsed ? "+" : "−"}</span>
      </button>
      {!collapsed && (
        <div className="p-4 space-y-3 bg-white">
          {events.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              selected={selectedIds.has(event.id)}
              onToggleSelect={onToggleSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}
