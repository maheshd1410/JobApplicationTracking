# Job Application Tracker

A lightweight web app to capture every application, track status, and stay on top of follow-ups. Built with Next.js App Router and Supabase Postgres for a deployable setup.

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
- Supabase Postgres
- Tailwind CSS

## Getting Started

Install dependencies:

```bash
npm install
```

Create a `.env.local` file with:

```bash
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Run the development server:

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

## Database Setup (Supabase)

Run this SQL in the Supabase SQL editor:

```sql
create extension if not exists pgcrypto;

create table if not exists applications (
  id uuid primary key default gen_random_uuid(),
  company text not null,
  role_title text not null,
  location text,
  job_link text,
  source text,
  date_applied date not null,
  status text not null,
  follow_up_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_applications_date_applied
  on applications (date_applied);
create index if not exists idx_applications_status
  on applications (status);
create index if not exists idx_applications_source
  on applications (source);
create index if not exists idx_applications_follow_up_date
  on applications (follow_up_date);
create index if not exists idx_applications_company_role
  on applications (company, role_title);
```

## Deployment (Vercel)

1. Push the repo to GitHub (already done).
2. Import the repo into Vercel.
3. Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in Vercel environment variables.
4. Deploy.

## Notes

This MVP is designed for a single user and a single profile. Multi-user support can be added later by introducing authentication and row-level security.
