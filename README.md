# Kids Chaperone Scheduler

A webapp for managing kids' activity chaperone schedules. Connects to Google Calendar and ensures every event has an adult assigned.

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
