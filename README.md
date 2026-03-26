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
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
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
  owner_id uuid not null,
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
  owner_id uuid not null,
  workspace_id uuid,
  title text not null,
  company text not null,
  location text,
  url text,
  source text,
  status text not null default 'New',
  match_score_actual numeric,
  match_score_resume numeric,
  rejection_reason text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists opportunity_content (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  opportunity_id uuid not null references opportunities(id) on delete cascade,
  type text not null,
  title text not null,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists opportunity_documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  opportunity_id uuid not null references opportunities(id) on delete cascade,
  name text not null,
  tag text not null default 'Other',
  note text,
  version integer not null default 1,
  is_latest boolean not null default true,
  file_path text not null,
  file_url text,
  mime_type text,
  size_bytes integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists opportunity_cvs (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references opportunities(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  photo_path text,
  photo_url text,
  pdf_path text,
  pdf_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists opportunity_events (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references opportunities(id) on delete cascade,
  status text not null,
  event_type text not null default 'status',
  created_at timestamptz not null default now()
);

create table if not exists daily_inventory (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  inventory_date date not null unique,
  created_at timestamptz not null default now()
);

create table if not exists inventory_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
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

create table if not exists profile_performance (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  entry_date date not null,
  impressions integer,
  searches integer,
  recruiter_actions integer,
  notes text,
  screenshot_path text,
  screenshot_url text,
  created_at timestamptz not null default now()
);

create table if not exists integrations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
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
create index if not exists idx_opportunity_content_type
  on opportunity_content (type);
create index if not exists idx_opportunity_content_opportunity
  on opportunity_content (opportunity_id);
create index if not exists idx_opportunity_documents_opportunity
  on opportunity_documents (opportunity_id);
create index if not exists idx_opportunity_cvs_opportunity
  on opportunity_cvs (opportunity_id);
create index if not exists idx_opportunity_events_opportunity
  on opportunity_events (opportunity_id);
create index if not exists idx_opportunity_events_date
  on opportunity_events (created_at);
create index if not exists idx_opportunity_documents_tag_latest
  on opportunity_documents (opportunity_id, tag, is_latest);

-- Backfill opportunity events for existing rows (one event per opportunity)
insert into opportunity_events (owner_id, workspace_id, opportunity_id, status, event_type, created_at)
select owner_id, workspace_id, id, status, 'status', created_at
from opportunities
where not exists (
  select 1 from opportunity_events e where e.opportunity_id = opportunities.id
);
create index if not exists idx_inventory_date
  on daily_inventory (inventory_date);
create index if not exists idx_inventory_items_inventory
  on inventory_items (inventory_id);
create index if not exists idx_inventory_items_opportunity
  on inventory_items (opportunity_id);
create index if not exists idx_profile_performance_date
  on profile_performance (entry_date);
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
  add column if not exists match_score_actual numeric;

alter table opportunities
  add column if not exists match_score_resume numeric;

alter table opportunities
  add column if not exists rejection_reason text;

-- Optional: migrate legacy match_score into match_score_actual
update opportunities
set match_score_actual = match_score
where match_score_actual is null
  and match_score is not null;

alter table inventory_items
  add column if not exists decision text default 'Pending';

alter table opportunity_documents
  add column if not exists tag text default 'Other';

alter table opportunity_documents
  add column if not exists note text;

alter table opportunity_documents
  add column if not exists version integer default 1;

alter table opportunity_documents
  add column if not exists is_latest boolean default true;

create index if not exists idx_opportunity_documents_tag_latest
  on opportunity_documents (opportunity_id, tag, is_latest);

create table if not exists opportunity_cvs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  opportunity_id uuid not null references opportunities(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  photo_path text,
  photo_url text,
  pdf_path text,
  pdf_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_opportunity_cvs_opportunity
  on opportunity_cvs (opportunity_id);

create table if not exists opportunity_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  workspace_id uuid,
  opportunity_id uuid not null references opportunities(id) on delete cascade,
  status text not null,
  event_type text not null default 'status',
  created_at timestamptz not null default now()
);

create table if not exists daily_plans (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  workspace_id uuid,
  plan_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists daily_tasks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  workspace_id uuid,
  plan_id uuid not null references daily_plans(id) on delete cascade,
  title text not null,
  category text not null default 'Execution',
  status text not null default 'Pending',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists prep_sessions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  opportunity_id uuid not null references opportunities(id) on delete cascade,
  topic text not null,
  category text not null default 'System Design',
  start_time timestamptz not null,
  end_time timestamptz not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_opportunity_events_opportunity
  on opportunity_events (opportunity_id);
create index if not exists idx_opportunity_events_date
  on opportunity_events (created_at);
create index if not exists idx_daily_plans_date
  on daily_plans (plan_date);
create index if not exists idx_daily_tasks_plan
  on daily_tasks (plan_id);
create index if not exists idx_prep_sessions_opportunity
  on prep_sessions (opportunity_id);

-- One-time backfill for existing opportunity_documents rows
with ranked as (
  select
    id,
    opportunity_id,
    coalesce(tag, 'Other') as tag,
    created_at,
    row_number() over (
      partition by opportunity_id, coalesce(tag, 'Other')
      order by created_at asc, id asc
    ) as version_rank,
    row_number() over (
      partition by opportunity_id, coalesce(tag, 'Other')
      order by created_at desc, id desc
    ) as latest_rank
  from opportunity_documents
)
update opportunity_documents d
set
  tag = ranked.tag,
  version = ranked.version_rank,
  is_latest = (ranked.latest_rank = 1),
  updated_at = now()
from ranked
where d.id = ranked.id;
```

Standalone backfill (use only after the new columns exist):

```sql
with ranked as (
  select
    id,
    opportunity_id,
    coalesce(tag, 'Other') as tag,
    created_at,
    row_number() over (
      partition by opportunity_id, coalesce(tag, 'Other')
      order by created_at asc, id asc
    ) as version_rank,
    row_number() over (
      partition by opportunity_id, coalesce(tag, 'Other')
      order by created_at desc, id desc
    ) as latest_rank
  from opportunity_documents
)
update opportunity_documents d
set
  tag = ranked.tag,
  version = ranked.version_rank,
  is_latest = (ranked.latest_rank = 1),
  updated_at = now()
from ranked
where d.id = ranked.id;
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

For profile performance tracking, run:

```sql
create table if not exists profile_performance (
  id uuid primary key default gen_random_uuid(),
  entry_date date not null,
  impressions integer,
  searches integer,
  recruiter_actions integer,
  notes text,
  screenshot_path text,
  screenshot_url text,
  created_at timestamptz not null default now()
);

create index if not exists idx_profile_performance_date
  on profile_performance (entry_date);
```

## Supabase Storage Setup

Create a public bucket named `naukri-screenshots` in Supabase Storage.
We store uploaded screenshots there and save the public URL in the database.

Create a public bucket named `opportunity-documents` in Supabase Storage.
We store shared documents per opportunity there and save the public URL.

Create a public bucket named `cv-photos` in Supabase Storage.
We store passport-size photos for CV rendering there.

Create a public bucket named `cv-pdfs` in Supabase Storage.
We store generated CV PDFs there.

## Multi-User Setup (Phase 1)

Add `owner_id` to all user-owned tables:

```sql
alter table opportunities add column if not exists owner_id uuid;
alter table opportunity_content add column if not exists owner_id uuid;
alter table opportunity_documents add column if not exists owner_id uuid;
alter table opportunity_cvs add column if not exists owner_id uuid;
alter table opportunity_events add column if not exists owner_id uuid;
alter table applications add column if not exists owner_id uuid;
alter table daily_inventory add column if not exists owner_id uuid;
alter table inventory_items add column if not exists owner_id uuid;
alter table profile_performance add column if not exists owner_id uuid;
alter table integrations add column if not exists owner_id uuid;
alter table daily_plans add column if not exists owner_id uuid;
alter table daily_tasks add column if not exists owner_id uuid;
```

Phase 2 (Shared Opportunities only):

```sql
create table if not exists workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member',
  created_at timestamptz not null default now()
);

alter table opportunities add column if not exists workspace_id uuid;
alter table opportunity_events add column if not exists workspace_id uuid;
alter table daily_plans add column if not exists workspace_id uuid;
alter table daily_tasks add column if not exists workspace_id uuid;
```

Backfill existing rows for your user (replace with your email):

```sql
update opportunities
set owner_id = (select id from auth.users where email = 'you@example.com')
where owner_id is null;
```

Set up a shared workspace for opportunities (example):

```sql
-- 1) Create workspace
insert into workspaces (name) values ('Family Workspace') returning id;

-- 2) Add both members
insert into workspace_members (workspace_id, user_id, role)
values
  ('YOUR_WORKSPACE_ID', (select id from auth.users where email = 'you@example.com'), 'owner'),
  ('YOUR_WORKSPACE_ID', (select id from auth.users where email = 'wife@example.com'), 'member');

-- 3) Backfill workspace_id for opportunities + events
update opportunities
set workspace_id = 'YOUR_WORKSPACE_ID'
where workspace_id is null;

update opportunity_events
set workspace_id = 'YOUR_WORKSPACE_ID'
where workspace_id is null;
```

Enable Row Level Security and add policies (repeat for each table):

```sql
alter table opportunities enable row level security;

create policy "owner_select" on opportunities
  for select using (owner_id = auth.uid());

create policy "owner_insert" on opportunities
  for insert with check (owner_id = auth.uid());

create policy "owner_update" on opportunities
  for update using (owner_id = auth.uid());

create policy "owner_delete" on opportunities
  for delete using (owner_id = auth.uid());
```

Shared opportunities policies (workspace-based):

```sql
alter table opportunities enable row level security;

create policy "workspace_select" on opportunities
  for select using (
    exists (
      select 1 from workspace_members wm
      where wm.workspace_id = opportunities.workspace_id
        and wm.user_id = auth.uid()
    )
  );

create policy "workspace_insert" on opportunities
  for insert with check (
    exists (
      select 1 from workspace_members wm
      where wm.workspace_id = opportunities.workspace_id
        and wm.user_id = auth.uid()
    )
  );

create policy "workspace_update" on opportunities
  for update using (
    exists (
      select 1 from workspace_members wm
      where wm.workspace_id = opportunities.workspace_id
        and wm.user_id = auth.uid()
    )
  );

create policy "workspace_delete" on opportunities
  for delete using (
    exists (
      select 1 from workspace_members wm
      where wm.workspace_id = opportunities.workspace_id
        and wm.user_id = auth.uid()
    )
  );
```

## Deployment (Vercel)

1. Push the repo to GitHub (already done).
2. Import the repo into Vercel.
3. Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in Vercel environment variables.
4. Deploy.

## Notes

This MVP is designed for a single user and a single profile. Multi-user support can be added later by introducing authentication and row-level security.
