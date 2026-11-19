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

-- Case-insensitive unique email
create unique index if not exists lenders_email_lower_uniq
  on public.lenders (lower(email));

-- Value checks on guideline records
create or replace function public.valid_slugs(vals text[], allowed text[])
returns boolean language sql immutable as $$ select vals <@ allowed $$;

create or replace function public.valid_state_codes(vals text[])
returns boolean language sql immutable as
$$ select coalesce(bool_and(v ~ '^[A-Z]{2}$'), true) from unnest(vals) v $$;

alter table public.lender_guidelines drop constraint if exists guidelines_ltv_range;
alter table public.lender_guidelines add constraint guidelines_ltv_range
  check (max_ltv_pct is null or (max_ltv_pct >= 0 and max_ltv_pct <= 100));
alter table public.lender_guidelines drop constraint if exists guidelines_fico_range;
alter table public.lender_guidelines add constraint guidelines_fico_range
  check (min_fico is null or (min_fico between 300 and 850));
alter table public.lender_guidelines drop constraint if exists guidelines_loan_range;
alter table public.lender_guidelines add constraint guidelines_loan_range
  check (min_loan_usd is null or max_loan_usd is null or min_loan_usd <= max_loan_usd);
alter table public.lender_guidelines drop constraint if exists guidelines_products_valid;
alter table public.lender_guidelines add constraint guidelines_products_valid
  check (public.valid_slugs(products, array['bridge','ground_up_construction','fix_flip','dscr_rental','cash_out_refi','conforming_agency','home_equity']));
alter table public.lender_guidelines drop constraint if exists guidelines_property_types_valid;
alter table public.lender_guidelines add constraint guidelines_property_types_valid
  check (public.valid_slugs(property_types, array['single_family','2_4_unit','condo','townhome','small_multifamily_5','mixed_use','other']));
alter table public.lender_guidelines drop constraint if exists guidelines_states_valid;
alter table public.lender_guidelines add constraint guidelines_states_valid
  check (public.valid_state_codes(states));

-- Server-owned stamps: id and created_at are set by the database, never the client
create or replace function public.force_row_stamps() returns trigger
language plpgsql as $$
begin
  new.id := gen_random_uuid();
  new.created_at := now();
  return new;
end $$;

drop trigger if exists guidelines_force_stamps on public.lender_guidelines;
create trigger guidelines_force_stamps before insert on public.lender_guidelines
for each row execute function public.force_row_stamps();

-- Bucket: PDFs only, 10 MB cap
update storage.buckets
set allowed_mime_types = array['application/pdf'], file_size_limit = 10485760
where id = 'guidelines';
