# Habitly

Habitly is a minimal, responsive habit tracker for building consistency without visual noise. It combines a daily habit checklist, month navigation, progress summaries, a functional goals workspace, and a focus timer in one calm interface.

## Features

- Create, edit, and delete habits.
- Mark habits complete for today or any visible day in the weekly rhythm.
- Review monthly completion rate, current streak, weekly consistency, and daily completion trends.
- Navigate between months and return to the current month with one click.
- Create, edit, complete, filter, and delete goals.
- Start, switch, stop, and persist focus sessions for Study, Other, and Food categories.
- Responsive layouts for desktop and mobile screens.
- Accessible labels, keyboard-friendly controls, visible focus states, reduced-motion support, and installable PWA metadata.
- Browser-storage fallback for habits, logs, goals, and timer sessions when MongoDB is not configured.

## Tech stack

- Next.js 16 with the App Router and React 19
- TypeScript
- Tailwind CSS 4
- MongoDB with Mongoose for server persistence
- Recharts for completion and focus visualizations
- date-fns for calendar and date calculations
- Lucide React for interface icons

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Optional MongoDB configuration

The API routes use the `MONGODB_URI` environment variable. Create a local `.env.local` file when server-backed persistence is available:

```bash
MONGODB_URI=mongodb://127.0.0.1:27017/habit-tracker
```

If `MONGODB_URI` is not present, the app fails over gracefully to browser storage so the core experience remains usable during local development. Do not commit private connection values.

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Habit dashboard, monthly rhythm, progress summaries, and daily checklist |
| `/goals` | Persistent goal creation, editing, completion, filtering, and deletion |
| `/timer` | Focus timer with saved sessions and seven-day summary |

## API routes

| Endpoint | Purpose |
| --- | --- |
| `/api/habits` | Habit CRUD with validation and ordered results |
| `/api/logs` | Date-range log reads and per-habit completion upserts |
| `/api/timer` | Focus-session creation and range-based reads |

## Scripts

```bash
npm run dev
npm run build
npm start
npm run lint
```
