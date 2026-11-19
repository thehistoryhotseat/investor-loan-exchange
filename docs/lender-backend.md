# Lender backend (Supabase)

Test-mode backend for lender onboarding. Nothing lender-facing is live; test data only.

## Project

- Project: `ilx-lenders`, ref `kknpnhpmgkghuerpnlyz`
- URL: `https://kknpnhpmgkghuerpnlyz.supabase.co`
- Org: "The Hub" (agent-operated Supabase account), Free plan
- Publishable API key (safe in a browser once RLS is on, which it is):
  `sb_publishable_gWJFQNaGgeIAXZ2JUDj_Sw_E-elPQAF`
- Database password: vault entry `ILX - Supabase DB password` (user `postgres`, generated)
- Secret API key: not vaulted yet; reveal it in the dashboard (Settings → API Keys)
  and save it to the vault when live-mode work begins.

## Schema (v1)

- `lenders` - one row per lender: company, contact, email (unique), phone,
  lender_type, nmls_id.
- `lender_guidelines` - versioned guideline records per lender: products[],
  property_types[], states[], max_ltv_pct, min/max loan, min_fico, notes,
  pdf_path, created_at. `unique (lender_id, version)`. A lender's "last
  updated" is the newest `created_at`; anything older than 90 days counts as
  stale (computed in the UI, not stored).
- `lender_users` - maps Supabase Auth users to lenders
  (auth_user_id -> lender_id), used by RLS.
- `lender_interest` - raw join-the-panel interest records (jsonb). No client
  access in test mode; service role only.
- Storage bucket `guidelines` - private, for guideline PDFs.

## Row-level security

RLS is enabled on all four tables. Policies let an authenticated lender read
and update only their own `lenders` row, and read/insert only their own
`lender_guidelines` versions, through the `lender_users` mapping. No anon
access anywhere. `lender_interest` has no policies (service role only) while
intake stays in test mode.

## Moving ownership to Aryeh's account later

1. Aryeh creates a free Supabase account (email signup, about a minute).
2. In the dashboard: Org "The Hub" → Settings → Members → invite his email
   as an owner.
3. He accepts; the project, tables, bucket and Auth users all come with the
   org, no migration needed. The agent-operated login can then be removed or
   kept as a maintenance member.
4. If a full move to his own org is preferred instead: export with
   `pg_dump` using the vaulted DB password, create a project in his org,
   restore, and update the URL + publishable key here and in the portal code.
