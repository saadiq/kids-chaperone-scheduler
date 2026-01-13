"use client";

import { ReactNode } from "react";
import { CalendarEvent } from "@/lib/types";
import { DayEvents } from "@/lib/event-utils";
import { EventCard } from "./EventCard";

interface KidGroupProps {
  group: { kid: string; events: CalendarEvent[] };
  selectedIds: Set<string>;
  onToggleKidGroup: (eventIds: string[]) => void;
  onToggleSelect: (id: string) => void;
  currentUserEmail?: string;
  onAccept: (eventId: string) => void;
}

function KidGroup({
  group,
  selectedIds,
  onToggleKidGroup,
  onToggleSelect,
  currentUserEmail,
  onAccept,
}: KidGroupProps): ReactNode {
  const groupEventIds = group.events.map((e) => e.id);
  const allSelected = groupEventIds.every((id) => selectedIds.has(id));
  const someSelected = groupEventIds.some((id) => selectedIds.has(id));

  return (
    <div className="ml-2 space-y-1">
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={allSelected}
          ref={(el) => {
            if (el) el.indeterminate = someSelected && !allSelected;
          }}
          onChange={() => onToggleKidGroup(groupEventIds)}
          className="h-4 w-4 text-orange-600 rounded accent-orange-500 focus:ring-2 focus:ring-orange-500 focus:ring-offset-1"
        />
        <span className="text-sm font-medium text-stone-700">{group.kid}</span>
      </label>
      <div className="space-y-1">
        {group.events.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            selected={selectedIds.has(event.id)}
            onToggleSelect={onToggleSelect}
            currentUserEmail={currentUserEmail}
            onAccept={onAccept}
          />
        ))}
      </div>
    </div>
  );
}

interface EventListProps {
  isLoading: boolean;
  events: CalendarEvent[];
  filteredEvents: CalendarEvent[];
  groupedEvents: DayEvents[];
  selectedIds: Set<string>;
  onToggleKidGroup: (eventIds: string[]) => void;
  onToggleSelect: (id: string) => void;
  currentUserEmail?: string;
  onAccept: (eventId: string) => void;
}

export function EventList({
  isLoading,
  events,
  filteredEvents,
  groupedEvents,
  selectedIds,
  onToggleKidGroup,
  onToggleSelect,
  currentUserEmail,
  onAccept,
}: EventListProps): ReactNode {
  if (isLoading && events.length === 0) {
    return <p className="text-center text-stone-600 py-12">Loading events...</p>;
  }

  if (filteredEvents.length === 0) {
    const message = events.length === 0 ? "No upcoming events found" : "No events match filters";
    return <p className="text-center text-stone-600 py-12">{message}</p>;
  }

  return (
    <div className="space-y-6">
      {groupedEvents.map((day) => (
        <div key={day.date} className="space-y-3">
          <h2 className="text-lg font-semibold text-stone-800 border-b border-stone-200 pb-2">
            {day.dateLabel}
          </h2>
          {day.kidGroups.map((group) => (
            <KidGroup
              key={group.kid}
              group={group}
              selectedIds={selectedIds}
              onToggleKidGroup={onToggleKidGroup}
              onToggleSelect={onToggleSelect}
              currentUserEmail={currentUserEmail}
              onAccept={onAccept}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
