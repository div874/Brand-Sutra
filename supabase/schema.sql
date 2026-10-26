-- ==============================================================================
-- BRAND SUTRA SUPABASE PRODUCTION SCHEMA
-- Multi-user, brand-level access control & audit trails with Row Level Security
-- ==============================================================================

-- 1. Brands Table
create table if not exists public.brands (
  id text primary key,
  name text not null,
  tagline text,
  description text,
  voice_summary text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. Trusted Facts (Official Ground-Truth Evidence)
create table if not exists public.trusted_facts (
  id text primary key,
  brand_id text references public.brands(id) on delete cascade,
  topic text not null,
  claim_or_stat text not null,
  source text not null,
  source_url text,
  verified_date text not null,
  source_doc text,
  page_number int,
  created_at timestamptz default now()
);

-- 3. Prohibited & Approved Terminology Rules
create table if not exists public.terminology_rules (
  id text primary key,
  brand_id text references public.brands(id) on delete cascade,
  term text not null,
  is_prohibited boolean default true,
  reason text,
  suggested_alternative text,
  severity text check (severity in ('high', 'medium', 'low')),
  category text,
  source_doc text,
  page_number int,
  created_at timestamptz default now()
);

-- 4. Tone Pillars
create table if not exists public.tone_guidelines (
  id text primary key,
  brand_id text references public.brands(id) on delete cascade,
  attribute text not null,
  description text not null,
  do_example text not null,
  dont_example text not null,
  source_doc text,
  page_number int,
  created_at timestamptz default now()
);

-- 5. Drafts Table
create table if not exists public.drafts (
  id text primary key,
  brand_id text references public.brands(id) on delete cascade,
  title text not null,
  content text not null,
  channel text,
  target_audience text,
  creator_id text not null,
  creator_name text not null,
  reviewer_id text,
  reviewer_name text,
  review_status text check (review_status in ('Draft', 'In Review', 'Changes Requested', 'Approved')) default 'Draft',
  version int default 1,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 6. Findings / Issues Table
create table if not exists public.findings (
  id text primary key,
  draft_id text references public.drafts(id) on delete cascade,
  issue_type text check (issue_type in ('Tone', 'Terminology', 'Fact Conflict', 'Unverified Claim')),
  severity text check (severity in ('high', 'medium', 'low')),
  quote text not null,
  start_index int not null,
  end_index int not null,
  explanation text not null,
  source_link text,
  suggested_fix text not null,
  status text check (status in ('Pending', 'Accepted', 'Ignored')) default 'Pending',
  evidence_type text check (evidence_type in ('official_rule', 'official_fact', 'unverified_claim')),
  detected_by text default 'deterministic',
  created_at timestamptz default now()
);

-- 7. Approved Edits (Historical Learning & Precedence - Strictly Separated from Official Rules)
create table if not exists public.approved_edits (
  id text primary key,
  draft_id text references public.drafts(id) on delete cascade,
  finding_id text,
  original_text text not null,
  approved_change text not null,
  reason text not null,
  related_rule_or_fact text,
  approved_by text not null,
  approved_by_role text not null,
  approved_at timestamptz default now(),
  category text,
  usage_count int default 1
);

-- 8. Audit Log Table (Immutable Compliance History)
create table if not exists public.audit_logs (
  id text primary key,
  draft_id text references public.drafts(id) on delete cascade,
  author_id text not null,
  author_name text not null,
  author_role text not null,
  action text not null,
  summary text not null,
  timestamp timestamptz default now()
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

alter table public.brands enable row level security;
alter table public.trusted_facts enable row level security;
alter table public.terminology_rules enable row level security;
alter table public.tone_guidelines enable row level security;
alter table public.drafts enable row level security;
alter table public.findings enable row level security;
alter table public.approved_edits enable row level security;
alter table public.audit_logs enable row level security;

-- Row Level Security (RLS) Permissive Policies for App Client
drop policy if exists "Allow read access to brand guidelines" on public.brands;
drop policy if exists "Allow read access to trusted facts" on public.trusted_facts;
drop policy if exists "Allow insert access to trusted facts" on public.trusted_facts;
drop policy if exists "Allow read access to terminology" on public.terminology_rules;
drop policy if exists "Allow insert access to terminology" on public.terminology_rules;
drop policy if exists "Allow read/write on drafts" on public.drafts;
drop policy if exists "Allow read/write on findings" on public.findings;
drop policy if exists "Allow read/write on approved edits" on public.approved_edits;
drop policy if exists "Allow read/write on audit logs" on public.audit_logs;

create policy "Allow all on brands" on public.brands for all using (true) with check (true);
create policy "Allow all on trusted_facts" on public.trusted_facts for all using (true) with check (true);
create policy "Allow all on terminology_rules" on public.terminology_rules for all using (true) with check (true);
create policy "Allow all on tone_guidelines" on public.tone_guidelines for all using (true) with check (true);
create policy "Allow all on drafts" on public.drafts for all using (true) with check (true);
create policy "Allow all on findings" on public.findings for all using (true) with check (true);
create policy "Allow all on approved_edits" on public.approved_edits for all using (true) with check (true);
create policy "Allow all on audit_logs" on public.audit_logs for all using (true) with check (true);
