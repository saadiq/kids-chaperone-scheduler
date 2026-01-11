# Kids Activity Scheduler - Design Document

A webapp for managing kids' activity schedules, ensuring every event has an adult assigned.

## Problem

You and your wife share a Google Calendar for kids' activities. Every event needs an adult (you, wife, or caregiver) responsible for it. Currently there's no easy way to:
- See which events are missing an adult
- Track whether assigned adults have accepted
- Quickly assign adults to multiple events

## Solution

A dashboard app that connects to your Google Calendar, shows events needing attention, and lets you batch-assign adults via calendar invitations.

## Users

- **App users**: You and your wife (2 accounts, controlled via Google OAuth test mode)
- **Assignable adults**: You, your wife, caregiver (receive calendar invites, caregiver doesn't use the app)

## Core Features

### Dashboard View

Events grouped by status, problems first:

1. **Needs Assignment** (red) - No adult invited, or adult declined
2. **Awaiting Response** (yellow) - Adult invited, hasn't accepted
3. **Confirmed** (green, collapsed) - Adult accepted

Each event card shows: title, date/time, assigned adult (if any), response status, selection checkbox.

### Batch Assignment

1. Select multiple events via checkboxes
2. Sticky bar appears: "3 events selected"
3. Pick adult from dropdown (You / Wife / Caregiver)
4. Click "Assign" - adds adult as attendee to all selected events
5. Google sends calendar invites automatically

### Assignment Logic

- One adult per event is sufficient
- Assigning replaces any existing adult assignee
- Assignment = adding email to event attendees with `sendUpdates: 'all'`

## Technical Design

### Stack

- **Framework**: Next.js (App Router)
- **Auth**: NextAuth.js with Google OAuth
- **API**: Google Calendar API via `googleapis`
- **Styling**: Tailwind CSS
- **Deployment**: Vercel

### Environment Variables

```
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
GOOGLE_CALENDAR_ID=xxx
ADULT_EMAILS=you@gmail.com,wife@gmail.com,caregiver@gmail.com
NEXTAUTH_SECRET=xxx
```

### OAuth Scope

`https://www.googleapis.com/auth/calendar.events` - read and write calendar events

### Project Structure

```
kids-pickup-mgr/
├── app/
│   ├── layout.tsx              # Root layout with auth provider
│   ├── page.tsx                # Dashboard
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts
│   │   ├── events/route.ts     # GET: fetch events
│   │   └── assign/route.ts     # POST: assign adult to events
│   └── components/
│       ├── EventCard.tsx
│       ├── EventGroup.tsx
│       ├── BatchActionBar.tsx
│       └── AssignDropdown.tsx
├── lib/
│   ├── google-calendar.ts
│   └── auth.ts
├── .env.local
├── package.json
└── tailwind.config.js
```

### API Routes

**GET /api/events**
- Fetches events from configured calendar (next 30 days)
- Returns events with assignment status computed

**POST /api/assign**
- Body: `{ eventIds: string[], adultEmail: string }`
- Patches each event to add adult as attendee
- Returns updated events

### Assignment Status Logic

```
For each event, check attendees against ADULT_EMAILS:
- No adult in attendees → "Needs Assignment"
- Adult found, responseStatus = "needsAction" | "tentative" → "Awaiting Response"
- Adult found, responseStatus = "accepted" → "Confirmed"
- Adult found, responseStatus = "declined" → "Needs Assignment"
```

### Error Handling

- **Token expiry**: NextAuth handles refresh; redirect to sign-in if refresh fails
- **API errors**: Toast notification with retry option
- **Rate limits**: Unlikely with 2 users; show friendly message if hit

### Edge Cases

- **Recurring events**: Each instance treated as separate event
- **All-day events**: Show date without time
- **Past events**: Filtered out, only show future events
- **Deleted events**: Disappear on next refresh

### Data Freshness

- Fetch fresh on each page load (no caching)
- Manual "Refresh" button available
- No real-time sync needed for 2 users

## Access Control

Google OAuth in test mode restricts authentication to only the test users configured in Google Cloud Console. No additional whitelist needed in the app.

## Non-Goals

- Mobile app (responsive web is sufficient)
- Push notifications
- Multiple calendars
- Role-based permissions
- Audit log of assignments
