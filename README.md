# Habit Tracker

## Overview

Habit Tracker is a progressive Next.js application for recording daily habits, reviewing weekly consistency, setting goals, and tracking focused time. It combines an interactive dashboard with server routes and MongoDB persistence.

## Features

- Create and review daily habit records
- Weekly completion grid and statistics chart
- Goal-management page
- Focus timer and timer-log storage
- Installable web-app manifest with mobile icons
- Animated interface with Framer Motion

## Tech Stack

- Next.js 16 and React 19
- TypeScript and Tailwind CSS 4
- MongoDB with Mongoose
- Recharts, date-fns, Lucide icons, and next-pwa

## Getting Started

```bash
npm install
npm run dev
```

Open `http://localhost:3000` in a browser. The database connection is implemented in `lib/db.ts`; provide the required local environment configuration before using API-backed habit, log, or timer operations, and do not commit private connection values.

## Available Scripts

```bash
npm run dev
npm run build
npm start
npm run lint
```

## Usage

Use the dashboard to review habits and recent progress, the goals route to manage targets, and the timer route to record focused sessions. API handlers are located under `app/api/habits`, `app/api/logs`, and `app/api/timer`.
