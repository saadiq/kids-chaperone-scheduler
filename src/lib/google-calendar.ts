import { google } from "googleapis";
import { CalendarEvent, AssignmentStatus, KidName } from "./types";

const ADULT_EMAILS = (process.env.ADULT_EMAILS || "").split(",").map((e) => e.trim().toLowerCase());
const KID_NAMES = (process.env.KID_NAMES || "").split(",").map((n) => n.trim()).filter(Boolean);

function detectKid(title: string): KidName {
  const lowerTitle = title.toLowerCase();
  for (const kid of KID_NAMES) {
    if (lowerTitle.includes(kid.toLowerCase())) {
      return kid;
    }
  }
  return null;
}

function getAssignmentStatus(
  attendees: { email?: string | null; responseStatus?: string | null }[] | undefined
): { status: AssignmentStatus; assignedAdult: CalendarEvent["assignedAdult"] } {
  if (!attendees) {
    return { status: "needs-assignment", assignedAdult: null };
  }

  const adultAttendee = attendees.find((a) =>
    ADULT_EMAILS.includes(a.email?.toLowerCase() || "")
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

export async function getEvents(accessToken: string): Promise<CalendarEvent[]> {
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });

  const calendar = google.calendar({ version: "v3", auth: oauth2Client });
  const calendarId = process.env.GOOGLE_CALENDAR_ID!;

  const now = new Date();
  const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const response = await calendar.events.list({
    calendarId,
    timeMin: now.toISOString(),
    timeMax: thirtyDaysLater.toISOString(),
    singleEvents: true,
    orderBy: "startTime",
  });

  const events = response.data.items || [];

  return events.map((event) => {
    const { status, assignedAdult } = getAssignmentStatus(event.attendees);
    const isAllDay = !event.start?.dateTime;
    const title = event.summary || "Untitled Event";

    return {
      id: event.id!,
      title,
      start: event.start?.dateTime || event.start?.date || "",
      end: event.end?.dateTime || event.end?.date || "",
      allDay: isAllDay,
      status,
      kid: detectKid(title),
      assignedAdult,
    };
  });
}

export async function assignAdultToEvents(
  accessToken: string,
  eventIds: string[],
  adultEmail: string
): Promise<void> {
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });

  const calendar = google.calendar({ version: "v3", auth: oauth2Client });
  const calendarId = process.env.GOOGLE_CALENDAR_ID!;

  for (const eventId of eventIds) {
    const event = await calendar.events.get({ calendarId, eventId });

    const existingAttendees = event.data.attendees || [];
    const filteredAttendees = existingAttendees.filter(
      (a) => !ADULT_EMAILS.includes(a.email?.toLowerCase() || "")
    );

    const updatedAttendees = [
      ...filteredAttendees,
      { email: adultEmail, responseStatus: "needsAction" },
    ];

    await calendar.events.patch({
      calendarId,
      eventId,
      sendUpdates: "all",
      requestBody: {
        attendees: updatedAttendees,
      },
    });
  }
}
