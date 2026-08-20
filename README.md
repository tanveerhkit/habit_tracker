# Habitly

Habitly is a minimal, responsive habit tracker for building consistency without visual noise. It combines a daily habit checklist, month navigation, progress summaries, a functional goals workspace, and a focus timer in one calm interface.

## Features

- Create, edit, and delete habits.
- Mark habits complete for today or any visible day in the weekly rhythm.
- Review monthly completion rate, current streak, weekly consistency, and daily completion trends.
- Navigate between months and return to the current month with one click.
- Create, edit, complete, filter, and delete goals.
- Start, switch, stop, and persist focus sessions for Study, Other, and Food categories.
- Create an account and sign in with email and password.
- Keep habits, completion logs, and focus sessions isolated per authenticated account.
- Use the light/dark mode toggle with a preference that persists across sessions.
- Export habits, check-ins, focus sessions, and goals as an account-scoped JSON backup.
- Import a JSON backup with validation, duplicate-safe merging, and automatic dashboard refresh.
- Responsive layouts, accessible labels, keyboard-friendly controls, visible focus states, reduced-motion support, and installable PWA metadata.
- Account-scoped browser-storage fallback for local development when the server database is unavailable after authentication.

## Tech stack

- Next.js 16 with the App Router and React 19
- TypeScript
- Tailwind CSS 4
- Supabase PostgreSQL with the server-only `@supabase/supabase-js` client
- `bcryptjs` for password hashing and `jose` for signed HTTP-only sessions
- Recharts for completion and focus visualizations
- date-fns for calendar and date calculations
- Lucide React for interface icons

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Required environment variables

Authentication and server-backed persistence require a Supabase project and a strong session secret. Create a local `.env.local` file and never commit it:

```bash
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-server-only-supabase-secret
AUTH_SECRET=replace-this-with-a-long-random-secret
```

`SUPABASE_SERVICE_ROLE_KEY` must remain server-only. Never expose it in client components or browser-exposed environment variables. `SUPABASE_SECRET_KEY` is accepted as a compatibility alias. `AUTH_SECRET` should be a long, randomly generated value in production; `JWT_SECRET` is also accepted for compatibility.

### Database schema

Apply [`supabase/schema.sql`](./supabase/schema.sql) to the project’s Supabase SQL Editor before using registration or server-backed data persistence. The schema creates the `users`, `habits`, `habit_logs`, and `timer_logs` tables, account-scoped indexes, and enables Row Level Security. Habitly uses the server-only Supabase secret for API routes, while every query still includes the authenticated account ID explicitly.

When the server database is unavailable, authenticated client-side changes fall back to browser storage scoped by user ID. Authentication itself still requires Supabase so account credentials are never stored only in the browser.

## Authentication and data isolation

Account creation and sign-in are available from the root route. Sessions use an HTTP-only, `SameSite=Lax` cookie containing a signed token. Passwords are stored as salted hashes rather than plaintext values.

Every habit, habit log, and timer log includes a `user_id`. API reads, writes, updates, deletes, exports, and imports are constrained to the authenticated user, and habit-log uniqueness is scoped to the combination of user, habit, and date.

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Authenticated habit dashboard, monthly rhythm, progress summaries, and daily checklist |
| `/goals` | Authenticated goal creation, editing, completion, filtering, and deletion |
| `/timer` | Authenticated focus timer with saved sessions and seven-day summary |

## API routes

| Endpoint | Purpose |
| --- | --- |
| `/api/auth/register` | Create an account in Supabase and start a session |
| `/api/auth/login` | Verify credentials from Supabase and start a session |
| `/api/auth/me` | Restore the current authenticated user |
| `/api/auth/logout` | Clear the current session |
| `/api/habits` | Authenticated habit CRUD with account-scoped Supabase queries |
| `/api/logs` | Authenticated date-range reads and per-user completion upserts |
| `/api/timer` | Authenticated focus-session creation and range-based reads |
| `/api/backup` | Authenticated JSON export and validated account-scoped import |

## Backup and restore

Use **Export** in the dashboard header to download a JSON file containing the current user’s habits, completion logs, timer sessions, and locally stored goals. Use the upload control to restore a backup. Imports merge into the signed-in account, update matching habit records, skip invalid records, avoid duplicate timer sessions, and refresh the dashboard after completion. Backup files are limited to 10 MB in the browser.

Backups are account-specific: the API never accepts a user ID from the file and always writes imported records under the currently authenticated account.

## Deployment

Habitly is configured for Netlify’s Next.js deployment flow and is connected to the GitHub repository. Configure these project environment variables for the production deploy context:

```bash
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-server-only-supabase-secret
AUTH_SECRET=your-long-random-session-secret
```

After changing environment variables, trigger a new Netlify deploy. Do not commit `.env.local`, Supabase secrets, or session secrets to Git.

## Scripts

```bash
npm run dev
npm run build
npm start
npm run lint
```
