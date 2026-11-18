-- COPILOTO FINANCEIRO 4.2
-- MFA obrigatório também no banco: execute no SQL Editor após publicar a v4.2.
-- Esta migração não altera nem exclui dados.

begin;

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
      'create policy %I_select_own on public.%I for select to authenticated using ((select auth.uid()) = user_id and (select auth.jwt()->>''aal'') = ''aal2'')',
      t, t
    );
    execute format(
      'create policy %I_insert_own on public.%I for insert to authenticated with check ((select auth.uid()) = user_id and (select auth.jwt()->>''aal'') = ''aal2'')',
      t, t
    );
    execute format(
      'create policy %I_update_own on public.%I for update to authenticated using ((select auth.uid()) = user_id and (select auth.jwt()->>''aal'') = ''aal2'') with check ((select auth.uid()) = user_id and (select auth.jwt()->>''aal'') = ''aal2'')',
      t, t
    );
    execute format(
      'create policy %I_delete_own on public.%I for delete to authenticated using ((select auth.uid()) = user_id and (select auth.jwt()->>''aal'') = ''aal2'')',
      t, t
    );
  end loop;
end $$;

commit;

-- Verificação: cada tabela deve ter quatro políticas e todas devem conter aal2.
select
  schemaname,
  tablename,
  policyname,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename in (
    'transactions','budgets','bills','ideas',
    'import_batches','category_rules','cashflow_scenarios'
  )
order by tablename, policyname;
