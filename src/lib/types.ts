export type AssignmentStatus = "needs-assignment" | "awaiting-response" | "confirmed";

export type KidName = string | null;

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  status: AssignmentStatus;
  kid: KidName;
  assignedAdult: {
    email: string;
    name: string;
    responseStatus: string;
  } | null;
}

export interface Adult {
  email: string;
  name: string;
}
