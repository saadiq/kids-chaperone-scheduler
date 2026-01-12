"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { CalendarEvent, Adult, AssignmentStatus, DateFilterOption } from "@/lib/types";
import { groupEventsByDayAndKid, filterEvents, isEventInDateRange } from "@/lib/event-utils";
import { EventCard } from "./EventCard";
import { BatchActionBar } from "./BatchActionBar";

const ADULTS: Adult[] = (process.env.NEXT_PUBLIC_ADULT_EMAILS || "")
  .split(",")
  .map((email) => email.trim())
  .filter(Boolean)
  .map((email) => ({
    email,
    name: email.split("@")[0],
  }));

type StatusFilter = "all" | AssignmentStatus;

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "needs-assignment", label: "Needs Assignment" },
  { value: "awaiting-response", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
];

const DATE_FILTER_OPTIONS: { value: DateFilterOption; label: string }[] = [
  { value: "this-week", label: "This Week" },
  { value: "next-week", label: "Next Week" },
  { value: "this-month", label: "This Month" },
  { value: "7-days", label: "7 Days" },
  { value: "14-days", label: "14 Days" },
  { value: "21-days", label: "21 Days" },
];

function FilterButton({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
        active
          ? "bg-blue-600 text-white"
          : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
      }`}
    >
      {label}
      <span className="ml-1 text-xs opacity-75">({count})</span>
    </button>
  );
}

export function Dashboard() {
  const { data: session, status } = useSession();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedAdult, setSelectedAdult] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState<DateFilterOption>("this-week");
  const hasInitializedDateFilter = useRef(false);

  const fetchEvents = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/events");
      if (!res.ok) throw new Error("Failed to fetch events");
      const data = await res.json();
      setEvents(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load events");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session?.accessToken) {
      fetchEvents();
    }
  }, [session, fetchEvents]);

  useEffect(() => {
    if (hasInitializedDateFilter.current || events.length === 0) return;
    hasInitializedDateFilter.current = true;

    const thisWeekCount = events.filter((e) => isEventInDateRange(e, "this-week")).length;
    if (thisWeekCount === 0) {
      setDateFilter("next-week");
    }
  }, [events]);

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleToggleKidGroup = (eventIds: string[]) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const allSelected = eventIds.every((id) => prev.has(id));
      if (allSelected) {
        eventIds.forEach((id) => next.delete(id));
      } else {
        eventIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const handleAssign = async () => {
    if (!selectedAdult || selectedIds.size === 0) return;

    setIsAssigning(true);
    try {
      const res = await fetch("/api/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventIds: Array.from(selectedIds),
          adultEmail: selectedAdult,
        }),
      });
      if (!res.ok) throw new Error("Failed to assign");
      setSelectedIds(new Set());
      setSelectedAdult("");
      await fetchEvents();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to assign adult");
    } finally {
      setIsAssigning(false);
    }
  };

  const handleClear = () => {
    setSelectedIds(new Set());
    setSelectedAdult("");
  };

  const handleAccept = async (eventId: string) => {
    try {
      const res = await fetch("/api/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId }),
      });
      if (!res.ok) throw new Error("Failed to accept invite");
      await fetchEvents();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to accept invite");
    }
  };

  const filteredEvents = useMemo(
    () => filterEvents(events, statusFilter, searchQuery, assigneeFilter, dateFilter),
    [events, statusFilter, searchQuery, assigneeFilter, dateFilter]
  );

  const groupedEvents = useMemo(
    () => groupEventsByDayAndKid(filteredEvents),
    [filteredEvents]
  );

  const statusCounts = useMemo(() => {
    const counts = { all: events.length, "needs-assignment": 0, "awaiting-response": 0, confirmed: 0 };
    for (const event of events) {
      counts[event.status]++;
    }
    return counts;
  }, [events]);

  const dateCounts = useMemo(() => {
    const counts: Record<DateFilterOption, number> = {
      "this-week": 0,
      "next-week": 0,
      "this-month": 0,
      "7-days": 0,
      "14-days": 0,
      "21-days": 0,
    };
    // Pre-parse dates once for performance
    const eventDates = events.map((e) => new Date(e.start));
    for (const option of DATE_FILTER_OPTIONS) {
      counts[option.value] = eventDates.filter((date) =>
        isEventInDateRange(date, option.value)
      ).length;
    }
    return counts;
  }, [events]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Kids Chaperone Scheduler</h1>
        <p className="text-gray-600">Sign in to manage activity assignments</p>
        <button
          onClick={() => signIn("google")}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
        >
          Sign in with Google
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Kids Chaperone Scheduler</h1>
          <div className="flex items-center gap-4">
            <button
              onClick={fetchEvents}
              disabled={isLoading}
              className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
            >
              {isLoading ? "Refreshing..." : "Refresh"}
            </button>
            <span className="text-sm text-gray-500">{session.user?.email}</span>
            <button
              onClick={() => signOut()}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-4 space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex gap-1">
            {STATUS_OPTIONS.map((opt) => (
              <FilterButton
                key={opt.value}
                active={statusFilter === opt.value}
                onClick={() => setStatusFilter(opt.value)}
                label={opt.label}
                count={statusCounts[opt.value]}
              />
            ))}
          </div>
          <select
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white"
          >
            <option value="all">All assignees</option>
            <option value="unassigned">Unassigned</option>
            {ADULTS.map((adult) => (
              <option key={adult.email} value={adult.email}>
                {adult.name}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Search events..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white flex-1 min-w-48"
          />
        </div>

        {/* Date Filter */}
        <div className="flex gap-1 flex-wrap">
          {DATE_FILTER_OPTIONS.map((opt) => (
            <FilterButton
              key={opt.value}
              active={dateFilter === opt.value}
              onClick={() => setDateFilter(opt.value)}
              label={opt.label}
              count={dateCounts[opt.value]}
            />
          ))}
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
            <button onClick={() => setError(null)} className="ml-2 underline">
              Dismiss
            </button>
          </div>
        )}

        {isLoading && events.length === 0 ? (
          <p className="text-center text-gray-500 py-12">Loading events...</p>
        ) : filteredEvents.length === 0 ? (
          <p className="text-center text-gray-500 py-12">
            {events.length === 0 ? "No upcoming events found" : "No events match filters"}
          </p>
        ) : (
          <div className="space-y-6">
            {groupedEvents.map((day) => (
              <div key={day.date} className="space-y-3">
                <h2 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">
                  {day.dateLabel}
                </h2>
                {day.kidGroups.map((group) => {
                  const groupEventIds = group.events.map((e) => e.id);
                  const allSelected = groupEventIds.every((id) => selectedIds.has(id));
                  const someSelected = groupEventIds.some((id) => selectedIds.has(id));
                  return (
                    <div key={group.kid} className="ml-2 space-y-1">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          ref={(el) => {
                            if (el) el.indeterminate = someSelected && !allSelected;
                          }}
                          onChange={() => handleToggleKidGroup(groupEventIds)}
                          className="h-4 w-4 text-blue-600 rounded"
                        />
                        <span className="text-sm font-medium text-gray-600">{group.kid}</span>
                      </label>
                      <div className="space-y-1">
                        {group.events.map((event) => (
                          <EventCard
                            key={event.id}
                            event={event}
                            selected={selectedIds.has(event.id)}
                            onToggleSelect={handleToggleSelect}
                            currentUserEmail={session.user?.email ?? undefined}
                            onAccept={handleAccept}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      <BatchActionBar
        selectedCount={selectedIds.size}
        adults={ADULTS}
        selectedAdult={selectedAdult}
        onSelectAdult={setSelectedAdult}
        onAssign={handleAssign}
        onClear={handleClear}
        isAssigning={isAssigning}
      />
    </div>
  );
}
