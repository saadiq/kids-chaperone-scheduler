import { describe, expect, test, beforeEach, afterEach, mock } from "bun:test";
import {
  detectKid,
  getAssignmentStatus,
  groupEventsByDayAndKid,
  filterEvents,
  getDateRange,
  isEventInDateRange,
} from "./event-utils";
import { CalendarEvent } from "./types";

describe("detectKid", () => {
  const kidNames = ["Asa", "Zola"];

  test("returns kid name when found in title", () => {
    expect(detectKid("Asa's Soccer Practice", kidNames)).toBe("Asa");
    expect(detectKid("Zola Dance Class", kidNames)).toBe("Zola");
  });

  test("is case insensitive", () => {
    expect(detectKid("ASA SWIMMING", kidNames)).toBe("Asa");
    expect(detectKid("zola piano", kidNames)).toBe("Zola");
  });

  test("returns null when no kid found", () => {
    expect(detectKid("Family Dinner", kidNames)).toBe(null);
    expect(detectKid("Parent Meeting", kidNames)).toBe(null);
  });

  test("returns first match when multiple kids in title", () => {
    expect(detectKid("Asa and Zola Birthday Party", kidNames)).toBe("Asa");
  });

  test("handles empty kid names array", () => {
    expect(detectKid("Asa's Soccer", [])).toBe(null);
  });
});

describe("getAssignmentStatus", () => {
  const adultEmails = ["parent1@gmail.com", "parent2@gmail.com"];

  test("returns needs-assignment when no attendees", () => {
    const result = getAssignmentStatus(undefined, adultEmails);
    expect(result.status).toBe("needs-assignment");
    expect(result.assignedAdult).toBe(null);
  });

  test("returns needs-assignment when no adult attendee", () => {
    const result = getAssignmentStatus(
      [{ email: "teacher@school.com", responseStatus: "accepted" }],
      adultEmails
    );
    expect(result.status).toBe("needs-assignment");
    expect(result.assignedAdult).toBe(null);
  });

  test("returns confirmed when adult accepted", () => {
    const result = getAssignmentStatus(
      [{ email: "parent1@gmail.com", responseStatus: "accepted" }],
      adultEmails
    );
    expect(result.status).toBe("confirmed");
    expect(result.assignedAdult?.email).toBe("parent1@gmail.com");
    expect(result.assignedAdult?.responseStatus).toBe("accepted");
  });

  test("returns awaiting-response when adult has needsAction", () => {
    const result = getAssignmentStatus(
      [{ email: "parent2@gmail.com", responseStatus: "needsAction" }],
      adultEmails
    );
    expect(result.status).toBe("awaiting-response");
  });

  test("returns needs-assignment when adult declined", () => {
    const result = getAssignmentStatus(
      [{ email: "parent1@gmail.com", responseStatus: "declined" }],
      adultEmails
    );
    expect(result.status).toBe("needs-assignment");
  });

  test("is case insensitive for email matching", () => {
    const result = getAssignmentStatus(
      [{ email: "PARENT1@GMAIL.COM", responseStatus: "accepted" }],
      adultEmails
    );
    expect(result.status).toBe("confirmed");
  });
});

describe("groupEventsByDayAndKid", () => {
  const makeEvent = (
    id: string,
    title: string,
    start: string,
    kid: string | null
  ): CalendarEvent => ({
    id,
    title,
    start,
    end: start,
    allDay: false,
    status: "needs-assignment",
    kid,
    assignedAdult: null,
  });

  test("groups events by date", () => {
    const events = [
      makeEvent("1", "Event 1", "2024-01-15T10:00:00", "Asa"),
      makeEvent("2", "Event 2", "2024-01-16T10:00:00", "Asa"),
    ];
    const result = groupEventsByDayAndKid(events);
    expect(result.length).toBe(2);
    expect(result[0].date).toBe("2024-01-15");
    expect(result[1].date).toBe("2024-01-16");
  });

  test("groups events by kid within a day", () => {
    const events = [
      makeEvent("1", "Asa Soccer", "2024-01-15T10:00:00", "Asa"),
      makeEvent("2", "Zola Dance", "2024-01-15T14:00:00", "Zola"),
      makeEvent("3", "Asa Piano", "2024-01-15T16:00:00", "Asa"),
    ];
    const result = groupEventsByDayAndKid(events);
    expect(result.length).toBe(1);
    expect(result[0].kidGroups.length).toBe(2);
    expect(result[0].kidGroups[0].kid).toBe("Asa");
    expect(result[0].kidGroups[0].events.length).toBe(2);
    expect(result[0].kidGroups[1].kid).toBe("Zola");
  });

  test("sorts kid groups alphabetically with Other last", () => {
    const events = [
      makeEvent("1", "Family Event", "2024-01-15T10:00:00", null),
      makeEvent("2", "Zola Dance", "2024-01-15T14:00:00", "Zola"),
      makeEvent("3", "Asa Soccer", "2024-01-15T16:00:00", "Asa"),
    ];
    const result = groupEventsByDayAndKid(events);
    expect(result[0].kidGroups[0].kid).toBe("Asa");
    expect(result[0].kidGroups[1].kid).toBe("Zola");
    expect(result[0].kidGroups[2].kid).toBe("Other");
  });

  test("sorts events by start time within kid group", () => {
    const events = [
      makeEvent("1", "Asa Piano", "2024-01-15T16:00:00", "Asa"),
      makeEvent("2", "Asa Soccer", "2024-01-15T10:00:00", "Asa"),
    ];
    const result = groupEventsByDayAndKid(events);
    expect(result[0].kidGroups[0].events[0].id).toBe("2");
    expect(result[0].kidGroups[0].events[1].id).toBe("1");
  });

  test("sorts days chronologically", () => {
    const events = [
      makeEvent("1", "Event", "2024-01-20T10:00:00", "Asa"),
      makeEvent("2", "Event", "2024-01-15T10:00:00", "Asa"),
      makeEvent("3", "Event", "2024-01-18T10:00:00", "Asa"),
    ];
    const result = groupEventsByDayAndKid(events);
    expect(result[0].date).toBe("2024-01-15");
    expect(result[1].date).toBe("2024-01-18");
    expect(result[2].date).toBe("2024-01-20");
  });

  test("handles empty events array", () => {
    const result = groupEventsByDayAndKid([]);
    expect(result).toEqual([]);
  });
});

describe("filterEvents", () => {
  const events: CalendarEvent[] = [
    {
      id: "1",
      title: "Asa Soccer",
      start: "2024-01-15T10:00:00",
      end: "2024-01-15T11:00:00",
      allDay: false,
      status: "needs-assignment",
      kid: "Asa",
      assignedAdult: null,
    },
    {
      id: "2",
      title: "Zola Dance",
      start: "2024-01-15T14:00:00",
      end: "2024-01-15T15:00:00",
      allDay: false,
      status: "confirmed",
      kid: "Zola",
      assignedAdult: { email: "parent1@gmail.com", name: "parent1", responseStatus: "accepted" },
    },
    {
      id: "3",
      title: "Asa Piano",
      start: "2024-01-15T16:00:00",
      end: "2024-01-15T17:00:00",
      allDay: false,
      status: "awaiting-response",
      kid: "Asa",
      assignedAdult: { email: "parent2@gmail.com", name: "parent2", responseStatus: "needsAction" },
    },
  ];

  test("returns all events when filter is 'all' and no search", () => {
    const result = filterEvents(events, "all", "");
    expect(result.length).toBe(3);
  });

  test("filters by status", () => {
    expect(filterEvents(events, "needs-assignment", "").length).toBe(1);
    expect(filterEvents(events, "confirmed", "").length).toBe(1);
    expect(filterEvents(events, "awaiting-response", "").length).toBe(1);
  });

  test("filters by search query", () => {
    expect(filterEvents(events, "all", "soccer").length).toBe(1);
    expect(filterEvents(events, "all", "Asa").length).toBe(2);
  });

  test("search is case insensitive", () => {
    expect(filterEvents(events, "all", "SOCCER").length).toBe(1);
    expect(filterEvents(events, "all", "dance").length).toBe(1);
  });

  test("combines status and search filters", () => {
    expect(filterEvents(events, "needs-assignment", "Asa").length).toBe(1);
    expect(filterEvents(events, "confirmed", "Asa").length).toBe(0);
  });

  test("handles empty search with status filter", () => {
    expect(filterEvents(events, "confirmed", "").length).toBe(1);
    expect(filterEvents(events, "confirmed", "")[0].title).toBe("Zola Dance");
  });

  test("filters by assignee email", () => {
    expect(filterEvents(events, "all", "", "parent1@gmail.com").length).toBe(1);
    expect(filterEvents(events, "all", "", "parent1@gmail.com")[0].title).toBe("Zola Dance");
    expect(filterEvents(events, "all", "", "parent2@gmail.com").length).toBe(1);
    expect(filterEvents(events, "all", "", "parent2@gmail.com")[0].title).toBe("Asa Piano");
  });

  test("filters unassigned events", () => {
    expect(filterEvents(events, "all", "", "unassigned").length).toBe(1);
    expect(filterEvents(events, "all", "", "unassigned")[0].title).toBe("Asa Soccer");
  });

  test("returns all when assignee filter is 'all'", () => {
    expect(filterEvents(events, "all", "", "all").length).toBe(3);
  });

  test("combines assignee with other filters", () => {
    expect(filterEvents(events, "confirmed", "", "parent1@gmail.com").length).toBe(1);
    expect(filterEvents(events, "needs-assignment", "", "parent1@gmail.com").length).toBe(0);
    expect(filterEvents(events, "all", "Piano", "parent2@gmail.com").length).toBe(1);
  });
});

describe("getDateRange", () => {
  // Mock Date to test with a known date (Wednesday, Jan 15, 2025)
  const mockDate = new Date(2025, 0, 15, 12, 0, 0); // Wednesday
  let originalDate: DateConstructor;

  beforeEach(() => {
    originalDate = global.Date;
    global.Date = class extends originalDate {
      constructor(...args: Parameters<DateConstructor>) {
        if (args.length === 0) {
          return new originalDate(mockDate);
        }
        // @ts-expect-error - spread with Date constructor
        return new originalDate(...args);
      }
      static now() {
        return mockDate.getTime();
      }
    } as DateConstructor;
  });

  afterEach(() => {
    global.Date = originalDate;
  });

  test("this-week returns today through end of Sunday", () => {
    const { start, end } = getDateRange("this-week");
    // Wednesday Jan 15 to Sunday Jan 19
    expect(start.getFullYear()).toBe(2025);
    expect(start.getMonth()).toBe(0);
    expect(start.getDate()).toBe(15);
    expect(end.getDate()).toBe(19); // Sunday
    expect(end.getHours()).toBe(23);
    expect(end.getMinutes()).toBe(59);
  });

  test("next-week returns next Monday through next Sunday", () => {
    const { start, end } = getDateRange("next-week");
    // Monday Jan 20 to Sunday Jan 26
    expect(start.getDate()).toBe(20); // Next Monday
    expect(start.getDay()).toBe(1); // Monday
    expect(end.getDate()).toBe(26); // Next Sunday
    expect(end.getDay()).toBe(0); // Sunday
  });

  test("this-month returns today through end of month", () => {
    const { start, end } = getDateRange("this-month");
    expect(start.getDate()).toBe(15);
    expect(end.getDate()).toBe(31); // Jan has 31 days
    expect(end.getMonth()).toBe(0);
  });

  test("7-days returns today plus 6 days", () => {
    const { start, end } = getDateRange("7-days");
    expect(start.getDate()).toBe(15);
    expect(end.getDate()).toBe(21); // 15 + 6
  });

  test("14-days returns today plus 13 days", () => {
    const { start, end } = getDateRange("14-days");
    expect(start.getDate()).toBe(15);
    expect(end.getDate()).toBe(28); // 15 + 13
  });

  test("21-days returns today plus 20 days", () => {
    const { start, end } = getDateRange("21-days");
    expect(start.getDate()).toBe(15);
    // 15 + 20 = 35, wraps to Feb 4
    expect(end.getMonth()).toBe(1); // February
    expect(end.getDate()).toBe(4);
  });

  test("start date has time set to midnight", () => {
    const { start } = getDateRange("7-days");
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
    expect(start.getSeconds()).toBe(0);
  });

  test("end date has time set to end of day", () => {
    const { end } = getDateRange("7-days");
    expect(end.getHours()).toBe(23);
    expect(end.getMinutes()).toBe(59);
    expect(end.getSeconds()).toBe(59);
    expect(end.getMilliseconds()).toBe(999);
  });
});

describe("getDateRange edge cases", () => {
  let originalDate: DateConstructor;

  afterEach(() => {
    if (originalDate) global.Date = originalDate;
  });

  test("this-week on Sunday returns just today", () => {
    // Sunday Jan 19, 2025
    const sundayMock = new Date(2025, 0, 19, 12, 0, 0);
    originalDate = global.Date;
    global.Date = class extends originalDate {
      constructor(...args: Parameters<DateConstructor>) {
        if (args.length === 0) return new originalDate(sundayMock);
        // @ts-expect-error - spread with Date constructor
        return new originalDate(...args);
      }
      static now() { return sundayMock.getTime(); }
    } as DateConstructor;

    const { start, end } = getDateRange("this-week");
    expect(start.getDate()).toBe(19);
    expect(end.getDate()).toBe(19); // Same day (Sunday)
  });

  test("next-week on Sunday starts tomorrow (Monday)", () => {
    // Sunday Jan 19, 2025
    const sundayMock = new Date(2025, 0, 19, 12, 0, 0);
    originalDate = global.Date;
    global.Date = class extends originalDate {
      constructor(...args: Parameters<DateConstructor>) {
        if (args.length === 0) return new originalDate(sundayMock);
        // @ts-expect-error - spread with Date constructor
        return new originalDate(...args);
      }
      static now() { return sundayMock.getTime(); }
    } as DateConstructor;

    const { start, end } = getDateRange("next-week");
    expect(start.getDate()).toBe(20); // Monday Jan 20
    expect(end.getDate()).toBe(26); // Sunday Jan 26
  });
});

describe("isEventInDateRange", () => {
  const mockDate = new Date(2025, 0, 15, 12, 0, 0); // Wednesday Jan 15
  let originalDate: DateConstructor;

  beforeEach(() => {
    originalDate = global.Date;
    global.Date = class extends originalDate {
      constructor(...args: Parameters<DateConstructor>) {
        if (args.length === 0) return new originalDate(mockDate);
        // @ts-expect-error - spread with Date constructor
        return new originalDate(...args);
      }
      static now() { return mockDate.getTime(); }
    } as DateConstructor;
  });

  afterEach(() => {
    global.Date = originalDate;
  });

  const makeEvent = (start: string): CalendarEvent => ({
    id: "1",
    title: "Test Event",
    start,
    end: start,
    allDay: false,
    status: "needs-assignment",
    kid: null,
    assignedAdult: null,
  });

  test("returns true for event within range", () => {
    // Jan 17 is within this-week (Jan 15-19)
    expect(isEventInDateRange(makeEvent("2025-01-17T10:00:00"), "this-week")).toBe(true);
  });

  test("returns false for event outside range", () => {
    // Jan 22 is outside this-week
    expect(isEventInDateRange(makeEvent("2025-01-22T10:00:00"), "this-week")).toBe(false);
  });

  test("returns true for event on start date", () => {
    expect(isEventInDateRange(makeEvent("2025-01-15T00:00:00"), "this-week")).toBe(true);
  });

  test("returns true for event on end date", () => {
    // Jan 19 is Sunday, end of this-week
    expect(isEventInDateRange(makeEvent("2025-01-19T23:59:00"), "this-week")).toBe(true);
  });

  // Note: isEventInDateRange also accepts pre-parsed Date objects for performance
  // (used by dateCounts in Dashboard to avoid parsing N dates per filter option)

  test("works with different filter options", () => {
    // Jan 22 is in next-week (Jan 20-26)
    expect(isEventInDateRange(makeEvent("2025-01-22T10:00:00"), "next-week")).toBe(true);
    // Jan 30 is in this-month
    expect(isEventInDateRange(makeEvent("2025-01-30T10:00:00"), "this-month")).toBe(true);
    // Jan 20 is in 7-days (Jan 15-21)
    expect(isEventInDateRange(makeEvent("2025-01-20T10:00:00"), "7-days")).toBe(true);
  });
});
