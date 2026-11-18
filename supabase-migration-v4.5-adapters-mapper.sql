-- COPILOTO FINANCEIRO 4.5
-- Mapeamentos reutilizáveis para arquivos desconhecidos.
-- Execute depois das migrações v4, v4.2, v4.3 e v4.4.

begin;

create table if not exists public.import_mappings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  signature text not null,
  mode text not null check (mode in ('delimited','lines')),
  delimiter text,
  config jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id,signature)
);

create index if not exists idx_import_mappings_user_signature
  on public.import_mappings(user_id,signature)
  where active = true;

alter table public.import_mappings enable row level security;

drop policy if exists import_mappings_select_own on public.import_mappings;
drop policy if exists import_mappings_insert_own on public.import_mappings;
drop policy if exists import_mappings_update_own on public.import_mappings;
drop policy if exists import_mappings_delete_own on public.import_mappings;

create policy import_mappings_select_own on public.import_mappings
for select to authenticated
using ((select auth.uid()) = user_id and (select auth.jwt()->>'aal') = 'aal2');

create policy import_mappings_insert_own on public.import_mappings
for insert to authenticated
with check ((select auth.uid()) = user_id and (select auth.jwt()->>'aal') = 'aal2');

create policy import_mappings_update_own on public.import_mappings
for update to authenticated
using ((select auth.uid()) = user_id and (select auth.jwt()->>'aal') = 'aal2')
with check ((select auth.uid()) = user_id and (select auth.jwt()->>'aal') = 'aal2');

create policy import_mappings_delete_own on public.import_mappings
for delete to authenticated
using ((select auth.uid()) = user_id and (select auth.jwt()->>'aal') = 'aal2');

drop trigger if exists import_mappings_updated_at on public.import_mappings;
create trigger import_mappings_updated_at
before update on public.import_mappings
for each row execute function public.set_updated_at();

commit;

select policyname,cmd
from pg_policies
where schemaname='public' and tablename='import_mappings'
order by policyname;
