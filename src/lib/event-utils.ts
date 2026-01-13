import { CalendarEvent, AssignmentStatus, KidName, DateFilterOption } from "./types";

export interface DayEvents {
  date: string;
  dateLabel: string;
  kidGroups: { kid: string; events: CalendarEvent[] }[];
}

export function detectKid(title: string, kidNames: string[]): KidName {
  const lowerTitle = title.toLowerCase();
  for (const kid of kidNames) {
    if (lowerTitle.includes(kid.toLowerCase())) {
      return kid;
    }
  }
  return null;
}

export function getAssignmentStatus(
  attendees: { email?: string | null; responseStatus?: string | null }[] | undefined,
  adultEmails: string[]
): { status: AssignmentStatus; assignedAdult: CalendarEvent["assignedAdult"] } {
  if (!attendees) {
    return { status: "needs-assignment", assignedAdult: null };
  }

  const normalizedEmails = adultEmails.map((e) => e.toLowerCase());
  const adultAttendee = attendees.find((a) =>
    normalizedEmails.includes(a.email?.toLowerCase() || "")
  );

  if (!adultAttendee) {
    return { status: "needs-assignment", assignedAdult: null };
  }

  const responseStatus = adultAttendee.responseStatus || "needsAction";

  let status: AssignmentStatus;
  if (responseStatus === "accepted") {
    status = "confirmed";
  } else if (responseStatus === "declined") {
    status = "needs-assignment";
  } else {
    status = "awaiting-response";
  }

  return {
    status,
    assignedAdult: {
      email: adultAttendee.email || "",
      name: adultAttendee.email?.split("@")[0] || "",
      responseStatus,
    },
  };
}

export function groupEventsByDayAndKid(events: CalendarEvent[]): DayEvents[] {
  const byDate = new Map<string, CalendarEvent[]>();

  for (const event of events) {
    const dateKey = event.start.split("T")[0];
    if (!byDate.has(dateKey)) {
      byDate.set(dateKey, []);
    }
    byDate.get(dateKey)!.push(event);
  }

  const result: DayEvents[] = [];

  for (const [date, dayEvents] of byDate) {
    const dateObj = new Date(date + "T12:00:00");
    const dateLabel = dateObj.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    });

    const kidMap = new Map<string, CalendarEvent[]>();
    for (const event of dayEvents) {
      const kidKey = event.kid || "Other";
      if (!kidMap.has(kidKey)) {
        kidMap.set(kidKey, []);
      }
      kidMap.get(kidKey)!.push(event);
    }

    const kidGroups = Array.from(kidMap.entries())
      .sort(([a], [b]) => {
        if (a === "Other") return 1;
        if (b === "Other") return -1;
        return a.localeCompare(b);
      })
      .map(([kid, evts]) => ({
        kid,
        events: evts.sort((a, b) => a.start.localeCompare(b.start)),
      }));

    result.push({ date, dateLabel, kidGroups });
  }

  return result.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Calculate date range for a filter option.
 *
 * Week semantics (US convention):
 * - Weeks run Sunday through Saturday
 * - "this-week" returns today through end of Sunday (remaining days in week)
 * - "next-week" returns next Monday through next Sunday
 *
 * All ranges start from today (not historical) since this is a scheduling app.
 */
export function getDateRange(filter: DateFilterOption): { start: Date; end: Date } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  function endOfDay(date: Date): Date {
    const result = new Date(date);
    result.setHours(23, 59, 59, 999);
    return result;
  }

  function addDays(base: Date, days: number): Date {
    const result = new Date(base);
    result.setDate(base.getDate() + days);
    return result;
  }

  const dayOfWeek = today.getDay();

  switch (filter) {
    case "this-week": {
      const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
      return { start: today, end: endOfDay(addDays(today, daysUntilSunday)) };
    }
    case "next-week": {
      const daysUntilNextMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
      const nextMonday = addDays(today, daysUntilNextMonday);
      return { start: nextMonday, end: endOfDay(addDays(nextMonday, 6)) };
    }
    case "this-month": {
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      return { start: today, end: endOfDay(endOfMonth) };
    }
    case "7-days":
      return { start: today, end: endOfDay(addDays(today, 6)) };
    case "14-days":
      return { start: today, end: endOfDay(addDays(today, 13)) };
    case "21-days":
      return { start: today, end: endOfDay(addDays(today, 20)) };
  }
}

/**
 * Check if an event falls within a date range.
 * Accepts either an event object or a pre-parsed Date for performance.
 */
export function isEventInDateRange(
  eventOrDate: CalendarEvent | Date,
  filter: DateFilterOption
): boolean {
  const { start, end } = getDateRange(filter);
  const eventDate = eventOrDate instanceof Date ? eventOrDate : new Date(eventOrDate.start);
  return eventDate >= start && eventDate <= end;
}

export function filterEvents(
  events: CalendarEvent[],
  statusFilter: "all" | AssignmentStatus,
  searchQuery: string,
  assigneeFilter: string = "all",
  dateFilter?: DateFilterOption
): CalendarEvent[] {
  return events.filter((event) => {
    if (statusFilter !== "all" && event.status !== statusFilter) {
      return false;
    }
    if (searchQuery && !event.title.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (assigneeFilter !== "all") {
      if (assigneeFilter === "unassigned") {
        if (event.assignedAdult !== null) return false;
      } else if (event.assignedAdult?.email !== assigneeFilter) {
        return false;
      }
    }
    if (dateFilter && !isEventInDateRange(event, dateFilter)) {
      return false;
    }
    return true;
  });
}
