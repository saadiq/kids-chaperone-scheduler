"use client";

import { CalendarEvent } from "@/lib/types";

interface EventCardProps {
  event: CalendarEvent;
  selected: boolean;
  onToggleSelect: (id: string) => void;
}

function formatTime(dateStr: string, allDay: boolean): string {
  if (allDay) return "All day";
  const date = new Date(dateStr);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function getStatusBadge(status: CalendarEvent["status"]) {
  switch (status) {
    case "needs-assignment":
      return (
        <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800 rounded">
          Needs Assignment
        </span>
      );
    case "awaiting-response":
      return (
        <span className="px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800 rounded">
          Pending
        </span>
      );
    case "confirmed":
      return (
        <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded">
          Confirmed
        </span>
      );
  }
}

export function EventCard({ event, selected, onToggleSelect }: EventCardProps) {
  return (
    <div
      className={`p-3 border rounded-lg flex items-center gap-3 ${
        selected ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white"
      }`}
    >
      <input
        type="checkbox"
        checked={selected}
        onChange={() => onToggleSelect(event.id)}
        className="h-4 w-4 text-blue-600 rounded"
      />
      <span className="text-sm text-gray-500 w-16 flex-shrink-0">
        {formatTime(event.start, event.allDay)}
      </span>
      <span className="font-medium text-gray-900 flex-1 truncate">
        {event.title}
      </span>
      {event.assignedAdult && (
        <span className="text-sm text-gray-500 truncate max-w-32">
          {event.assignedAdult.name}
        </span>
      )}
      {getStatusBadge(event.status)}
    </div>
  );
}
