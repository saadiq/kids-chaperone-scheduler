# Kids Activity Scheduler Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Next.js dashboard that connects to Google Calendar, displays events needing adult assignments, and enables batch-assigning adults via calendar invitations.

**Architecture:** Server-rendered Next.js app with NextAuth for Google OAuth. Dashboard fetches events via API route, computes assignment status client-side grouping, and batch-assigns by patching events through Google Calendar API.

**Tech Stack:** Next.js 14 (App Router), NextAuth.js, googleapis, Tailwind CSS, TypeScript, Bun

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tailwind.config.ts`
- Create: `postcss.config.js`
- Create: `next.config.js`
- Create: `.env.example`
- Create: `.gitignore`

**Step 1: Initialize Next.js project with Tailwind**

Run:
```bash
bunx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*" --use-bun
```

When prompted, accept defaults. This creates the full project scaffold.

**Step 2: Verify project runs**

Run:
```bash
bun dev
```

Expected: Server starts at http://localhost:3000, shows Next.js welcome page.

**Step 3: Create .env.example**

```bash
cat > .env.example << 'EOF'
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALENDAR_ID=
ADULT_EMAILS=adult1@gmail.com,adult2@gmail.com,caregiver@gmail.com
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000
EOF
```

**Step 4: Update .gitignore to include .env.local**

Verify `.env.local` and `.env*.local` are in `.gitignore` (create-next-app should have added this).

**Step 5: Install additional dependencies**

Run:
```bash
bun add next-auth googleapis
bun add -d @types/node
```

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js project with Tailwind and dependencies"
```

---

## Task 2: NextAuth Google OAuth Setup

**Files:**
- Create: `lib/auth.ts`
- Create: `app/api/auth/[...nextauth]/route.ts`
- Modify: `app/layout.tsx`

**Step 1: Create auth configuration**

Create `lib/auth.ts`:

```typescript
import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "openid email profile https://www.googleapis.com/auth/calendar.events",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string;
      return session;
    },
  },
};
```

**Step 2: Create NextAuth API route**

Create `app/api/auth/[...nextauth]/route.ts`:

```typescript
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
```

**Step 3: Create types for session extension**

Create `types/next-auth.d.ts`:

```typescript
import "next-auth";

declare module "next-auth" {
  interface Session {
    accessToken?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
  }
}
```

**Step 4: Create SessionProvider wrapper**

Create `app/providers.tsx`:

```typescript
"use client";

import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
```

**Step 5: Update layout to use providers**

Modify `app/layout.tsx` to wrap children with Providers:

```typescript
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Kids Activity Scheduler",
  description: "Manage kids activity assignments",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: add NextAuth Google OAuth configuration"
```

---

## Task 3: Google Calendar Library

**Files:**
- Create: `lib/google-calendar.ts`
- Create: `lib/types.ts`

**Step 1: Create shared types**

Create `lib/types.ts`:

```typescript
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
```

**Step 2: Create Google Calendar helper**

Create `lib/google-calendar.ts`:

```typescript
import { google } from "googleapis";
import { CalendarEvent, AssignmentStatus } from "./types";

const ADULT_EMAILS = (process.env.ADULT_EMAILS || "").split(",").map((e) => e.trim().toLowerCase());

function getAssignmentStatus(
  attendees: { email?: string; responseStatus?: string }[] | undefined
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

    return {
      id: event.id!,
      title: event.summary || "Untitled Event",
      start: event.start?.dateTime || event.start?.date || "",
      end: event.end?.dateTime || event.end?.date || "",
      allDay: isAllDay,
      status,
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
```

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: add Google Calendar API helpers"
```

---

## Task 4: API Routes

**Files:**
- Create: `app/api/events/route.ts`
- Create: `app/api/assign/route.ts`

**Step 1: Create events API route**

Create `app/api/events/route.ts`:

```typescript
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { getEvents } from "@/lib/google-calendar";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const events = await getEvents(session.accessToken);
    return NextResponse.json(events);
  } catch (error) {
    console.error("Failed to fetch events:", error);
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 }
    );
  }
}
```

**Step 2: Create assign API route**

Create `app/api/assign/route.ts`:

```typescript
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { assignAdultToEvents } from "@/lib/google-calendar";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { eventIds, adultEmail } = await request.json();

    if (!eventIds?.length || !adultEmail) {
      return NextResponse.json(
        { error: "eventIds and adultEmail are required" },
        { status: 400 }
      );
    }

    await assignAdultToEvents(session.accessToken, eventIds, adultEmail);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to assign adult:", error);
    return NextResponse.json(
      { error: "Failed to assign adult" },
      { status: 500 }
    );
  }
}
```

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: add events and assign API routes"
```

---

## Task 5: UI Components - EventCard

**Files:**
- Create: `app/components/EventCard.tsx`

**Step 1: Create EventCard component**

Create `app/components/EventCard.tsx`:

```typescript
"use client";

import { CalendarEvent } from "@/lib/types";

interface EventCardProps {
  event: CalendarEvent;
  selected: boolean;
  onToggleSelect: (id: string) => void;
}

function formatDateTime(dateStr: string, allDay: boolean): string {
  const date = new Date(dateStr);
  if (allDay) {
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getStatusBadge(status: CalendarEvent["status"]) {
  switch (status) {
    case "needs-assignment":
      return (
        <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded">
          Needs Assignment
        </span>
      );
    case "awaiting-response":
      return (
        <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded">
          Awaiting Response
        </span>
      );
    case "confirmed":
      return (
        <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
          Confirmed
        </span>
      );
  }
}

export function EventCard({ event, selected, onToggleSelect }: EventCardProps) {
  return (
    <div
      className={`p-4 border rounded-lg flex items-start gap-4 ${
        selected ? "border-blue-500 bg-blue-50" : "border-gray-200"
      }`}
    >
      <input
        type="checkbox"
        checked={selected}
        onChange={() => onToggleSelect(event.id)}
        className="mt-1 h-4 w-4 text-blue-600 rounded"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-medium text-gray-900 truncate">{event.title}</h3>
          {getStatusBadge(event.status)}
        </div>
        <p className="text-sm text-gray-500 mt-1">
          {formatDateTime(event.start, event.allDay)}
        </p>
        {event.assignedAdult && (
          <p className="text-sm text-gray-600 mt-1">
            Assigned to: {event.assignedAdult.email}
          </p>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add -A
git commit -m "feat: add EventCard component"
```

---

## Task 6: UI Components - EventGroup

**Files:**
- Create: `app/components/EventGroup.tsx`

**Step 1: Create EventGroup component**

Create `app/components/EventGroup.tsx`:

```typescript
"use client";

import { useState } from "react";
import { CalendarEvent } from "@/lib/types";
import { EventCard } from "./EventCard";

interface EventGroupProps {
  title: string;
  events: CalendarEvent[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  defaultCollapsed?: boolean;
  variant: "danger" | "warning" | "success";
}

const variantStyles = {
  danger: "border-red-200 bg-red-50",
  warning: "border-yellow-200 bg-yellow-50",
  success: "border-green-200 bg-green-50",
};

const headerStyles = {
  danger: "text-red-800",
  warning: "text-yellow-800",
  success: "text-green-800",
};

export function EventGroup({
  title,
  events,
  selectedIds,
  onToggleSelect,
  defaultCollapsed = false,
  variant,
}: EventGroupProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  if (events.length === 0) return null;

  return (
    <div className={`border rounded-lg overflow-hidden ${variantStyles[variant]}`}>
      <button
        onClick={() => setCollapsed(!collapsed)}
        className={`w-full px-4 py-3 flex items-center justify-between ${headerStyles[variant]}`}
      >
        <span className="font-semibold">
          {title} ({events.length})
        </span>
        <span className="text-lg">{collapsed ? "+" : "−"}</span>
      </button>
      {!collapsed && (
        <div className="p-4 space-y-3 bg-white">
          {events.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              selected={selectedIds.has(event.id)}
              onToggleSelect={onToggleSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add -A
git commit -m "feat: add EventGroup component"
```

---

## Task 7: UI Components - BatchActionBar and AssignDropdown

**Files:**
- Create: `app/components/AssignDropdown.tsx`
- Create: `app/components/BatchActionBar.tsx`

**Step 1: Create AssignDropdown component**

Create `app/components/AssignDropdown.tsx`:

```typescript
"use client";

import { Adult } from "@/lib/types";

interface AssignDropdownProps {
  adults: Adult[];
  selectedAdult: string;
  onSelect: (email: string) => void;
}

export function AssignDropdown({
  adults,
  selectedAdult,
  onSelect,
}: AssignDropdownProps) {
  return (
    <select
      value={selectedAdult}
      onChange={(e) => onSelect(e.target.value)}
      className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm"
    >
      <option value="">Select adult...</option>
      {adults.map((adult) => (
        <option key={adult.email} value={adult.email}>
          {adult.name}
        </option>
      ))}
    </select>
  );
}
```

**Step 2: Create BatchActionBar component**

Create `app/components/BatchActionBar.tsx`:

```typescript
"use client";

import { Adult } from "@/lib/types";
import { AssignDropdown } from "./AssignDropdown";

interface BatchActionBarProps {
  selectedCount: number;
  adults: Adult[];
  selectedAdult: string;
  onSelectAdult: (email: string) => void;
  onAssign: () => void;
  onClear: () => void;
  isAssigning: boolean;
}

export function BatchActionBar({
  selectedCount,
  adults,
  selectedAdult,
  onSelectAdult,
  onAssign,
  onClear,
  isAssigning,
}: BatchActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg p-4">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
        <span className="text-sm font-medium text-gray-700">
          {selectedCount} event{selectedCount !== 1 ? "s" : ""} selected
        </span>
        <div className="flex items-center gap-3">
          <AssignDropdown
            adults={adults}
            selectedAdult={selectedAdult}
            onSelect={onSelectAdult}
          />
          <button
            onClick={onAssign}
            disabled={!selectedAdult || isAssigning}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700"
          >
            {isAssigning ? "Assigning..." : "Assign"}
          </button>
          <button
            onClick={onClear}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: add AssignDropdown and BatchActionBar components"
```

---

## Task 8: Dashboard Page

**Files:**
- Create: `app/components/Dashboard.tsx`
- Modify: `app/page.tsx`

**Step 1: Create Dashboard client component**

Create `app/components/Dashboard.tsx`:

```typescript
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
```

**Step 2: Update page.tsx**

Replace `app/page.tsx` with:

```typescript
import { Dashboard } from "./components/Dashboard";

export default function Home() {
  return <Dashboard />;
}
```

**Step 3: Update .env.example with public variable**

Add to `.env.example`:
```
NEXT_PUBLIC_ADULT_EMAILS=adult1@gmail.com,adult2@gmail.com,caregiver@gmail.com
```

**Step 4: Verify build**

Run:
```bash
bun run build
```

Expected: Build succeeds with no errors.

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add Dashboard page with full event management"
```

---

## Task 9: Final Cleanup and Documentation

**Files:**
- Modify: `README.md`
- Delete: unnecessary scaffolded files

**Step 1: Remove default Next.js page content**

Delete any unused default files from create-next-app (like `app/favicon.ico` if you want to replace it later, or default SVG files in public/).

**Step 2: Update README.md**

Replace `README.md` with:

```markdown
# Kids Activity Scheduler

A webapp for managing kids' activity schedules. Connects to Google Calendar and ensures every event has an adult assigned.

## Setup

1. Create a Google Cloud project and enable the Calendar API
2. Create OAuth 2.0 credentials (Web application type)
3. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
4. Add test users in OAuth consent screen (your email and partner's email)
5. Copy `.env.example` to `.env.local` and fill in values:

```bash
cp .env.example .env.local
```

Required environment variables:
- `GOOGLE_CLIENT_ID` - OAuth client ID
- `GOOGLE_CLIENT_SECRET` - OAuth client secret
- `GOOGLE_CALENDAR_ID` - Calendar ID to monitor (find in calendar settings)
- `ADULT_EMAILS` - Comma-separated list of adult emails who can be assigned
- `NEXT_PUBLIC_ADULT_EMAILS` - Same as above (for client-side)
- `NEXTAUTH_SECRET` - Generate with `openssl rand -base64 32`
- `NEXTAUTH_URL` - `http://localhost:3000` for local dev

## Development

```bash
bun install
bun dev
```

## Deployment

Deploy to Vercel:

```bash
bunx vercel
```

Set environment variables in Vercel dashboard.
```

**Step 3: Commit**

```bash
git add -A
git commit -m "docs: add setup instructions to README"
```

---

## Summary

After completing all tasks, you'll have:

1. A Next.js app with Google OAuth authentication
2. A dashboard showing events grouped by assignment status
3. Batch selection and assignment of adults to events
4. Automatic Google Calendar invitations sent when adults are assigned
5. Ready to deploy to Vercel

**Total files:** ~15 files, all under 150 lines each.
