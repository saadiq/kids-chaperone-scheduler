export type AssignmentStatus = "needs-assignment" | "awaiting-response" | "confirmed";

export type DateFilterOption =
  | "this-week"
  | "next-week"
  | "this-month"
  | "7-days"
  | "14-days"
  | "21-days";

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
