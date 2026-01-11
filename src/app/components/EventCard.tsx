"use client";

import { CalendarEvent } from "@/lib/types";

interface EventCardProps {
  event: CalendarEvent;
  selected: boolean;
  onToggleSelect: (id: string) => void;
}

function formatDateTime(dateStr: string, allDay: boolean): string {
  const date = new Date(dateStr);
  if (allDay) {
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getStatusBadge(status: CalendarEvent["status"]) {
  switch (status) {
    case "needs-assignment":
      return (
        <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded">
          Needs Assignment
        </span>
      );
    case "awaiting-response":
      return (
        <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded">
          Awaiting Response
        </span>
      );
    case "confirmed":
      return (
        <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
          Confirmed
        </span>
      );
  }
}

export function EventCard({ event, selected, onToggleSelect }: EventCardProps) {
  return (
    <div
      className={`p-4 border rounded-lg flex items-start gap-4 ${
        selected ? "border-blue-500 bg-blue-50" : "border-gray-200"
      }`}
    >
      <input
        type="checkbox"
        checked={selected}
        onChange={() => onToggleSelect(event.id)}
        className="mt-1 h-4 w-4 text-blue-600 rounded"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-medium text-gray-900 truncate">{event.title}</h3>
          {getStatusBadge(event.status)}
        </div>
        <p className="text-sm text-gray-500 mt-1">
          {formatDateTime(event.start, event.allDay)}
        </p>
        {event.assignedAdult && (
          <p className="text-sm text-gray-600 mt-1">
            Assigned to: {event.assignedAdult.email}
          </p>
        )}
      </div>
    </div>
  );
}
