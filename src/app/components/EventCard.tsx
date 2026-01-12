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

function StatusBadge({ status }: { status: CalendarEvent["status"] }) {
  switch (status) {
    case "needs-assignment":
      return (
        <span className="px-2 py-0.5 text-xs font-medium bg-rose-100 text-rose-800 rounded-lg flex items-center gap-1 whitespace-nowrap">
          <AlertCircle className="w-3 h-3 flex-shrink-0" />
          <span className="hidden sm:inline">Needs Assignment</span>
          <span className="sm:hidden">Unassigned</span>
        </span>
      );
    case "awaiting-response":
      return (
        <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-900 rounded-lg flex items-center gap-1 whitespace-nowrap">
          <Clock className="w-3 h-3 flex-shrink-0" />
          Pending
        </span>
      );
    case "confirmed":
      return (
        <span className="px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-800 rounded-lg flex items-center gap-1 whitespace-nowrap">
          <CheckCircle className="w-3 h-3 flex-shrink-0" />
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
      className={`p-3 border rounded-xl transition-all duration-200 ${
        selected
          ? "border-orange-500 bg-orange-50 ring-1 ring-orange-500"
          : "border-stone-200 bg-white hover:border-stone-300"
      }`}
    >
      {/* Mobile: stacked layout, Desktop: single row */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        {/* Top row on mobile: checkbox + title */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelect(event.id)}
            className="h-4 w-4 flex-shrink-0 text-orange-600 rounded accent-orange-500 focus:ring-2 focus:ring-orange-500 focus:ring-offset-1"
          />
          {/* Time - visible inline on desktop, part of metadata row on mobile */}
          <span className="hidden sm:block text-sm text-stone-600 w-16 flex-shrink-0">
            {formatTime(event.start, event.allDay)}
          </span>
          {/* Title - gets full width on mobile */}
          <span className="font-medium text-stone-900 min-w-0 break-words sm:truncate">
            {event.title}
          </span>
        </div>

        {/* Bottom row on mobile: time + assignee + status */}
        <div className="flex items-center gap-2 pl-7 sm:pl-0 sm:flex-shrink-0">
          {/* Time - mobile only */}
          <span className="sm:hidden text-xs text-stone-500">
            {formatTime(event.start, event.allDay)}
          </span>

          {event.assignedAdult && (
            <>
              <span className="sm:hidden text-stone-300">·</span>
              <span className="text-xs sm:text-sm text-stone-600 truncate max-w-24 sm:max-w-32">
                {event.assignedAdult.name}
              </span>
            </>
          )}

          <span className="sm:hidden flex-1" />

          {canAccept ? (
            <button
              onClick={() => onAccept(event.id)}
              className="px-2 py-0.5 text-xs font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-1 flex-shrink-0"
            >
              <CheckCircle className="w-3 h-3" />
              Accept
            </button>
          ) : (
            <StatusBadge status={event.status} />
          )}
        </div>
      </div>
    </div>
  );
}
