"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { CalendarEvent, Adult } from "@/lib/types";
import { EventGroup } from "./EventGroup";
import { BatchActionBar } from "./BatchActionBar";

const ADULTS: Adult[] = (process.env.NEXT_PUBLIC_ADULT_EMAILS || "")
  .split(",")
  .map((email) => ({
    email: email.trim(),
    name: email.trim().split("@")[0],
  }));

export function Dashboard() {
  const { data: session, status } = useSession();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedAdult, setSelectedAdult] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        <h1 className="text-2xl font-bold text-gray-900">
          Kids Activity Scheduler
        </h1>
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

  const needsAssignment = events.filter((e) => e.status === "needs-assignment");
  const awaitingResponse = events.filter((e) => e.status === "awaiting-response");
  const confirmed = events.filter((e) => e.status === "confirmed");

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">
            Kids Activity Scheduler
          </h1>
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

      <main className="max-w-4xl mx-auto p-4 space-y-6">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-2 underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {isLoading && events.length === 0 ? (
          <p className="text-center text-gray-500 py-12">Loading events...</p>
        ) : events.length === 0 ? (
          <p className="text-center text-gray-500 py-12">
            No upcoming events found
          </p>
        ) : (
          <>
            <EventGroup
              title="Needs Assignment"
              events={needsAssignment}
              selectedIds={selectedIds}
              onToggleSelect={handleToggleSelect}
              variant="danger"
            />
            <EventGroup
              title="Awaiting Response"
              events={awaitingResponse}
              selectedIds={selectedIds}
              onToggleSelect={handleToggleSelect}
              variant="warning"
            />
            <EventGroup
              title="Confirmed"
              events={confirmed}
              selectedIds={selectedIds}
              onToggleSelect={handleToggleSelect}
              defaultCollapsed
              variant="success"
            />
          </>
        )}
      </main>

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
