-- COPILOTO FINANCEIRO 4.0
-- Migração idempotente: execute uma vez no SQL Editor do Supabase.
-- Mantém as tabelas existentes e adiciona conciliação, regras versionadas e cenários.

create extension if not exists pgcrypto;

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  transaction_date date not null,
  description text not null,
  category text not null default 'Outros',
  type text not null check (type in ('income','expense')),
  payment_method text,
  amount numeric(14,2) not null check (amount >= 0),
  source text default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  month date not null, amount numeric(14,2) not null check (amount >= 0),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(user_id,month)
);
create table if not exists public.bills (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  description text not null, amount numeric(14,2) not null check (amount >= 0), due_date date not null,
  status text not null default 'pending' check (status in ('pending','paid')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.ideas (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  text text not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

-- Metadados auditáveis das movimentações.
alter table public.transactions add column if not exists notes text;
alter table public.transactions add column if not exists original_description text;
alter table public.transactions add column if not exists original_amount numeric(14,2);
alter table public.transactions add column if not exists source_file text;
alter table public.transactions add column if not exists source_hash text;
alter table public.transactions add column if not exists source_line integer;
alter table public.transactions add column if not exists import_batch_id uuid;
alter table public.transactions add column if not exists reconciliation_status text default 'manual';
alter table public.transactions add column if not exists category_source text default 'manual';
alter table public.transactions add column if not exists rule_id uuid;
alter table public.transactions add column if not exists rule_version integer;

create table if not exists public.import_batches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  file_name text not null,
  file_hash text not null,
  total_found integer not null default 0 check (total_found >= 0),
  imported_count integer not null default 0 check (imported_count >= 0),
  duplicate_count integer not null default 0 check (duplicate_count >= 0),
  error_count integer not null default 0 check (error_count >= 0),
  status text not null default 'review' check (status in ('review','reconciled','divergent','failed')),
  created_at timestamptz not null default now(),
  unique(user_id,file_hash)
);

create table if not exists public.category_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  rule_group_id uuid not null,
  version integer not null check (version > 0),
  pattern text not null,
  match_type text not null default 'contains' check (match_type in ('contains','starts_with','exact')),
  category text not null,
  priority integer not null default 100,
  active boolean not null default true,
  is_current boolean not null default true,
  created_at timestamptz not null default now(),
  unique(user_id,rule_group_id,version)
);

create table if not exists public.cashflow_scenarios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  income_change numeric(7,2) not null default 0,
  expense_reduction numeric(7,2) not null default 0,
  history_months integer not null default 3 check (history_months in (1,3,6,12)),
  projection_months integer not null default 6 check (projection_months in (3,6,12)),
  category text not null default 'Todas',
  category_reduction numeric(7,2) not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_transactions_user_date on public.transactions(user_id,transaction_date desc);
create index if not exists idx_transactions_source_hash on public.transactions(user_id,source_hash,source_line);
create index if not exists idx_import_batches_user_created on public.import_batches(user_id,created_at desc);
create index if not exists idx_category_rules_current on public.category_rules(user_id,is_current,active,priority);
create index if not exists idx_scenarios_user_active on public.cashflow_scenarios(user_id,is_active);
create index if not exists idx_bills_user_due_date on public.bills(user_id,due_date);
create index if not exists idx_budgets_user_month on public.budgets(user_id,month);

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end; $$;

do $$
declare t text;
begin
  foreach t in array array['transactions','budgets','bills','ideas','cashflow_scenarios'] loop
    execute format('drop trigger if exists %I_updated_at on public.%I',t,t);
    execute format('create trigger %I_updated_at before update on public.%I for each row execute function public.set_updated_at()',t,t);
  end loop;
end $$;

alter table public.transactions enable row level security;
alter table public.budgets enable row level security;
alter table public.bills enable row level security;
alter table public.ideas enable row level security;
alter table public.import_batches enable row level security;
alter table public.category_rules enable row level security;
alter table public.cashflow_scenarios enable row level security;

-- Políticas por usuário. A publishable key não contorna RLS.
do $$
declare t text;
begin
  foreach t in array array['transactions','budgets','bills','ideas','import_batches','category_rules','cashflow_scenarios'] loop
    execute format('drop policy if exists %I_select_own on public.%I',t,t);
    execute format('drop policy if exists %I_insert_own on public.%I',t,t);
    execute format('drop policy if exists %I_update_own on public.%I',t,t);
    execute format('drop policy if exists %I_delete_own on public.%I',t,t);
    execute format('create policy %I_select_own on public.%I for select to authenticated using ((select auth.uid()) = user_id)',t,t);
    execute format('create policy %I_insert_own on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)',t,t);
    execute format('create policy %I_update_own on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)',t,t);
    execute format('create policy %I_delete_own on public.%I for delete to authenticated using ((select auth.uid()) = user_id)',t,t);
  end loop;
end $$;

-- Realtime continua habilitado nas tabelas financeiras e passa a incluir as novas tabelas.
do $$
declare t text;
begin
  foreach t in array array['transactions','budgets','bills','ideas','import_batches','category_rules','cashflow_scenarios'] loop
    if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=t) then
      execute format('alter publication supabase_realtime add table public.%I',t);
    end if;
  end loop;
end $$;

-- Verificação final: deve retornar as 7 tabelas com RLS = true.
select schemaname,tablename,rowsecurity
from pg_tables
where schemaname='public' and tablename in ('transactions','budgets','bills','ideas','import_batches','category_rules','cashflow_scenarios')
order by tablename;
