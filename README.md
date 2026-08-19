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
- Responsive layouts, accessible labels, keyboard-friendly controls, visible focus states, reduced-motion support, and installable PWA metadata.
- Account-scoped browser-storage fallback for local development when MongoDB is unavailable after authentication.

## Tech stack

- Next.js 16 with the App Router and React 19
- TypeScript
- Tailwind CSS 4
- MongoDB with Mongoose for server persistence
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

Authentication and server-backed persistence require both MongoDB and a strong session secret. Create a local `.env.local` file and never commit it:

```bash
MONGODB_URI=mongodb://127.0.0.1:27017/habit-tracker
AUTH_SECRET=replace-this-with-a-long-random-secret
```

`AUTH_SECRET` should be a long, randomly generated value in production. `JWT_SECRET` is also accepted for compatibility, but `AUTH_SECRET` is preferred.

When MongoDB is unavailable, authenticated client-side changes fall back to browser storage scoped by user ID. Authentication itself still requires MongoDB so account credentials are never stored only in the browser.

## Authentication and data isolation

Account creation and sign-in are available from the root route. Sessions use an HTTP-only, `SameSite=Lax` cookie containing a signed token. Passwords are stored as salted hashes rather than plaintext values.

Every habit, habit log, and timer log includes a `userId`. API reads, writes, updates, and deletes are constrained to the authenticated user, and habit-log uniqueness is scoped to the combination of user, habit, and date.

Existing records created before authentication do not have an owner and are intentionally excluded from authenticated queries. If the database already contains legacy records, migrate them to the correct user before enabling production access.

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Authenticated habit dashboard, monthly rhythm, progress summaries, and daily checklist |
| `/goals` | Authenticated goal creation, editing, completion, filtering, and deletion |
| `/timer` | Authenticated focus timer with saved sessions and seven-day summary |

## API routes

| Endpoint | Purpose |
| --- | --- |
| `/api/auth/register` | Create an account and start a session |
| `/api/auth/login` | Verify credentials and start a session |
| `/api/auth/me` | Restore the current authenticated user |
| `/api/auth/logout` | Clear the current session |
| `/api/habits` | Authenticated habit CRUD with account-scoped queries |
| `/api/logs` | Authenticated date-range reads and per-user completion upserts |
| `/api/timer` | Authenticated focus-session creation and range-based reads |

## Scripts

```bash
npm run dev
npm run build
npm start
npm run lint
```
