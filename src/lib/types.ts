export type AssignmentStatus = "needs-assignment" | "awaiting-response" | "confirmed";

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  status: AssignmentStatus;
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
