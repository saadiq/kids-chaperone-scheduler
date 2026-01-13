"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import { CalendarEvent, Adult, DateFilterOption } from "@/lib/types";
import { groupEventsByDayAndKid, filterEvents, isEventInDateRange } from "@/lib/event-utils";
import { BatchActionBar } from "./BatchActionBar";
import { Header } from "./Header";
import { LoginScreen } from "./LoginScreen";
import { LoadingScreen } from "./LoadingScreen";
import { EventList } from "./EventList";
import {
  StatusFilterRow,
  DateFilterRow,
  SearchAndAssigneeFilter,
  DATE_FILTER_OPTIONS,
  StatusFilter,
} from "./FilterControls";

const ADULTS: Adult[] = (process.env.NEXT_PUBLIC_ADULT_EMAILS || "")
  .split(",")
  .map((email) => email.trim())
  .filter(Boolean)
  .map((email) => ({
    email,
    name: email.split("@")[0],
  }));

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
      if (res.status === 401) {
        signOut();
        return;
      }
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
    // Handle token refresh failure
    if (session?.error === "RefreshAccessTokenError") {
      signOut();
      return;
    }
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
      if (res.status === 401) {
        signOut();
        return;
      }
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
      if (res.status === 401) {
        signOut();
        return;
      }
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
    return <LoadingScreen />;
  }

  if (!session) {
    return <LoginScreen />;
  }

  return (
    <div className="min-h-screen bg-stone-50 pb-28 sm:pb-24">
      <Header
        userEmail={session.user?.email}
        isLoading={isLoading}
        onRefresh={fetchEvents}
        onSignOut={() => signOut()}
      />

      <div className="max-w-4xl mx-auto px-4 py-4 space-y-3 sm:space-y-4">
        <StatusFilterRow
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          statusCounts={statusCounts}
        />

        <SearchAndAssigneeFilter
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          assigneeFilter={assigneeFilter}
          onAssigneeFilterChange={setAssigneeFilter}
          adults={ADULTS}
        />

        <DateFilterRow
          dateFilter={dateFilter}
          onDateFilterChange={setDateFilter}
          dateCounts={dateCounts}
        />

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700">
            {error}
            <button onClick={() => setError(null)} className="ml-2 underline hover:no-underline transition-all">
              Dismiss
            </button>
          </div>
        )}

        <EventList
          isLoading={isLoading}
          events={events}
          filteredEvents={filteredEvents}
          groupedEvents={groupedEvents}
          selectedIds={selectedIds}
          onToggleKidGroup={handleToggleKidGroup}
          onToggleSelect={handleToggleSelect}
          currentUserEmail={session.user?.email ?? undefined}
          onAccept={handleAccept}
        />
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
