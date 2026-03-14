# Job Application Tracker

A lightweight web app to capture every application, track status, and stay on top of follow-ups. Built with Next.js App Router and SQLite.

## MVP 1 Features

- Fast application capture with required fields
- Pipeline list with filters and search
- One-click status updates and notes
- Follow-up due view
- Daily target counter
- CSV export

## Tech Stack

- Next.js (App Router)
- React + TypeScript
- SQLite (file database via better-sqlite3)
- Tailwind CSS

## Getting Started

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

## Data Storage

SQLite database file is stored at:

```
./data/applications.db
```

The file is created automatically on first run. It is ignored by Git.

## Environment Variables (Optional)

- `DB_PATH` to override the database file location.

Example:

```bash
DB_PATH=C:\path\to\applications.db
```

## Scripts

- `npm run dev` - start dev server
- `npm run build` - production build
- `npm run start` - run production server

## Notes

This MVP is designed for a single user and a single profile. Multi-user support can be added later by introducing authentication and a `users` table.
