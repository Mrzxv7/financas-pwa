-- COPILOTO FINANCEIRO 4.6
-- MFA opcional para uso comum; AAL2 permanece obrigatório para operações sensíveis.
-- Execute depois das migrações v4.2 e v4.5.
-- Não altera nem exclui dados.

begin;

-- Tabelas de uso comum: usuário autenticado em AAL1 ou AAL2 acessa somente seus dados.
do $$
declare
  t text;
begin
  foreach t in array array[
    'transactions',
    'budgets',
    'bills',
    'ideas',
    'import_batches',
    'category_rules',
    'cashflow_scenarios'
  ] loop
    execute format('alter table public.%I enable row level security', t);

    execute format('drop policy if exists %I_select_own on public.%I', t, t);
    execute format('drop policy if exists %I_insert_own on public.%I', t, t);
    execute format('drop policy if exists %I_update_own on public.%I', t, t);
    execute format('drop policy if exists %I_delete_own on public.%I', t, t);

    execute format(
      'create policy %I_select_own on public.%I for select to authenticated using ((select auth.uid()) = user_id)',
      t, t
    );
    execute format(
      'create policy %I_insert_own on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)',
      t, t
    );
    execute format(
      'create policy %I_update_own on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)',
      t, t
    );
    execute format(
      'create policy %I_delete_own on public.%I for delete to authenticated using ((select auth.uid()) = user_id)',
      t, t
    );
  end loop;
end $$;

-- Mapeamentos bancários reutilizáveis continuam sensíveis e exigem AAL2.
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

commit;

-- Verificação: tabelas comuns não devem conter condição aal2;
-- import_mappings deve manter quatro políticas com aal2.
select tablename,policyname,cmd,qual,with_check
from pg_policies
where schemaname='public'
  and tablename in (
    'transactions','budgets','bills','ideas','import_batches',
    'category_rules','cashflow_scenarios','import_mappings'
  )
order by tablename,policyname;
