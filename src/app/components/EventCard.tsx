"use client";

import { CalendarEvent } from "@/lib/types";
import { AlertCircle, Clock, CheckCircle } from "lucide-react";

interface EventCardProps {
  event: CalendarEvent;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  currentUserEmail?: string;
  onAccept?: (eventId: string) => void;
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
        <span className="px-2 py-0.5 text-xs font-medium bg-rose-100 text-rose-800 rounded-lg flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          Needs Assignment
        </span>
      );
    case "awaiting-response":
      return (
        <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-900 rounded-lg flex items-center gap-1">
          <Clock className="w-3 h-3" />
          Pending
        </span>
      );
    case "confirmed":
      return (
        <span className="px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-800 rounded-lg flex items-center gap-1">
          <CheckCircle className="w-3 h-3" />
          Confirmed
        </span>
      );
  }
}

export function EventCard({
  event,
  selected,
  onToggleSelect,
  currentUserEmail,
  onAccept,
}: EventCardProps) {
  const canAccept =
    currentUserEmail &&
    onAccept &&
    event.status === "awaiting-response" &&
    event.assignedAdult?.email.toLowerCase() === currentUserEmail.toLowerCase();

  return (
    <div
      className={`p-3 border rounded-xl flex items-center gap-3 transition-all duration-200 ${
        selected
          ? "border-orange-500 bg-orange-50 ring-1 ring-orange-500"
          : "border-stone-200 bg-white hover:border-stone-300"
      }`}
    >
      <input
        type="checkbox"
        checked={selected}
        onChange={() => onToggleSelect(event.id)}
        className="h-4 w-4 text-orange-600 rounded accent-orange-500 focus:ring-2 focus:ring-orange-500 focus:ring-offset-1"
      />
      <span className="text-sm text-stone-600 w-16 flex-shrink-0">
        {formatTime(event.start, event.allDay)}
      </span>
      <span className="font-medium text-stone-900 flex-1 truncate">
        {event.title}
      </span>
      {event.assignedAdult && (
        <span className="text-sm text-stone-600 truncate max-w-32">
          {event.assignedAdult.name}
        </span>
      )}
      {canAccept ? (
        <button
          onClick={() => onAccept(event.id)}
          className="px-2 py-0.5 text-xs font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-1"
        >
          <CheckCircle className="w-3 h-3" />
          Accept
        </button>
      ) : (
        getStatusBadge(event.status)
      )}
    </div>
  );
}
