# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Kids Chaperone Scheduler - a Next.js 16 web app for managing kids' activity schedules. Connects to Google Calendar to ensure every event has an adult assigned and tracks assignment confirmations.

## Commands

```bash
# Development
bun install          # Install dependencies
bun dev              # Start dev server at localhost:3000

# Testing
bun test             # Run all tests
bun test --watch     # Watch mode

# Build & Deploy
bun run build        # Production build
bun run lint         # Run ESLint
bunx vercel          # Deploy to Vercel
```

## Architecture

### Authentication Flow
NextAuth with Google OAuth handles authentication. Access tokens are stored in JWT and auto-refreshed (60-second buffer). All API routes require authentication via `getServerSession()`.

### Data Flow
1. **GET /api/events** - Fetches 30-day calendar window from Google Calendar API
2. Events are enriched with assignment status by checking attendee list against `ADULT_EMAILS`
3. **POST /api/assign** - Adds adult as attendee to calendar event(s)
4. **POST /api/accept** - Accepts invitation on user's behalf

### Assignment Status Logic
- `needs-assignment` - No adult from `ADULT_EMAILS` is an attendee
- `awaiting-response` - Adult assigned but `responseStatus !== "accepted"`
- `confirmed` - Adult assigned and accepted

### Key Files
- `src/lib/auth.ts` - NextAuth config with token refresh logic
- `src/lib/google-calendar.ts` - Google Calendar API wrapper
- `src/lib/event-utils.ts` - Event filtering, grouping, date utilities (has tests)
- `src/lib/types.ts` - TypeScript interfaces for CalendarEvent, Adult, etc.
- `src/app/components/Dashboard.tsx` - Main UI component

### Environment Variables
Required in `.env.local` (see `.env.example`):
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` - OAuth credentials
- `GOOGLE_CALENDAR_ID` - Calendar to monitor
- `ADULT_EMAILS` / `NEXT_PUBLIC_ADULT_EMAILS` - Comma-separated assignable adults
- `KID_NAMES` - Comma-separated kid names for event matching
- `NEXTAUTH_SECRET`, `NEXTAUTH_URL` - NextAuth config

## Code Patterns

### Date Filtering
Week boundaries use US convention (Sunday-Saturday). See `getWeekBoundaries()` in `event-utils.ts` for implementation details.

### Event Grouping
Events are grouped by date string (YYYY-MM-DD) then by kid name for display. The `groupEventsByDateAndKid()` function handles this.
