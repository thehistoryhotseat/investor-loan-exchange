-- ILX lender backend schema - Supabase project ilx-lenders (test mode, test data only)
-- Apply in the dashboard SQL editor. Idempotent.

create extension if not exists pgcrypto;

create table if not exists public.lenders (
  id uuid primary key default gen_random_uuid(),
  company text not null,
  contact_name text,
  email text unique,
  phone text,
  lender_type text,
  nmls_id text,
  updated_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.lender_guidelines (
  id uuid primary key default gen_random_uuid(),
  lender_id uuid not null references public.lenders(id) on delete cascade,
  version integer not null,
  products text[] not null default '{}',
  property_types text[] not null default '{}',
  states text[] not null default '{}',
  max_ltv_pct numeric,
  min_loan_usd numeric,
  max_loan_usd numeric,
  min_fico integer,
  notes text,
  pdf_path text,
  created_at timestamptz not null default now(),
  unique (lender_id, version)
);

create table if not exists public.lender_users (
  auth_user_id uuid primary key references auth.users(id) on delete cascade,
  lender_id uuid not null references public.lenders(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.lender_interest (
  id uuid primary key default gen_random_uuid(),
  record jsonb not null,
  created_at timestamptz not null default now()
);

-- Private bucket for guideline PDFs (created via dashboard; this is a no-op if present)
insert into storage.buckets (id, name, public)
values ('guidelines', 'guidelines', false)
on conflict (id) do nothing;
