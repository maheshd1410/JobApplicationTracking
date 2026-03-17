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
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=https://your-domain/api/google/callback
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
  tags text[] default '{}'::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists opportunities (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  company text not null,
  location text,
  url text,
  source text,
  status text not null default 'New',
  match_score numeric,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists daily_inventory (
  id uuid primary key default gen_random_uuid(),
  inventory_date date not null unique,
  created_at timestamptz not null default now()
);

create table if not exists inventory_items (
  id uuid primary key default gen_random_uuid(),
  inventory_id uuid not null references daily_inventory(id) on delete cascade,
  opportunity_id uuid not null references opportunities(id) on delete cascade,
  decision text not null default 'Pending',
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  entity_type text not null,
  entity_id uuid,
  payload jsonb,
  created_at timestamptz not null default now()
);

create table if not exists integrations (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  email text,
  access_token text,
  refresh_token text,
  expiry timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_integrations_provider_email
  on integrations (provider, email);

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
create index if not exists idx_applications_tags
  on applications using gin (tags);
create index if not exists idx_opportunities_status
  on opportunities (status);
create index if not exists idx_opportunities_company
  on opportunities (company);
create index if not exists idx_inventory_date
  on daily_inventory (inventory_date);
create index if not exists idx_inventory_items_inventory
  on inventory_items (inventory_id);
create index if not exists idx_inventory_items_opportunity
  on inventory_items (opportunity_id);
```

If you already created the table earlier, run:

```sql
alter table applications
  add column if not exists tags text[] default '{}'::text[];

create index if not exists idx_applications_tags
  on applications using gin (tags);
```

If you already created Phase 1 tables, use these safe updates when needed:

```sql
alter table opportunities
  add column if not exists match_score numeric;

alter table inventory_items
  add column if not exists decision text default 'Pending';
```

For Gmail integration, run:

```sql
create table if not exists integrations (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  email text,
  access_token text,
  refresh_token text,
  expiry timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_integrations_provider_email
  on integrations (provider, email);
```

## Deployment (Vercel)

1. Push the repo to GitHub (already done).
2. Import the repo into Vercel.
3. Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in Vercel environment variables.
4. Deploy.

## Notes

This MVP is designed for a single user and a single profile. Multi-user support can be added later by introducing authentication and row-level security.
