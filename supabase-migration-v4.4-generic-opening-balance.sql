-- COPILOTO FINANCEIRO 4.4
-- Contrato genérico de opening_balance para PDF, CSV, TXT e parsers futuros.
-- Execute depois de supabase-migration-v4.3-opening-balance.sql.
-- Migração aditiva: não apaga dados nem altera valores financeiros.

begin;

alter table public.transactions add column if not exists account_key text;
alter table public.transactions add column if not exists account_label text;
alter table public.transactions add column if not exists source_parser text;

alter table public.import_batches add column if not exists account_key text;
alter table public.import_batches add column if not exists account_label text;
alter table public.import_batches add column if not exists account_scope text;
alter table public.import_batches add column if not exists parser_id text;
alter table public.import_batches add column if not exists opening_concept text;
alter table public.import_batches add column if not exists opening_evidence text;
alter table public.import_batches add column if not exists opening_confidence text;
alter table public.import_batches add column if not exists opening_source_ref text;

-- Compatibilidade com a 4.3: a antiga chave de cartão passa a ser uma forma de account_key.
update public.transactions
set account_key = card_key
where account_key is null and card_key is not null;

update public.import_batches
set account_key = card_key,
    account_label = coalesce(account_label, card_label),
    opening_concept = case when opening_balance > 0 then 'opening_balance' else opening_concept end,
    parser_id = coalesce(parser_id, case when bank_name = 'Bradesco' then 'bradesco-open-statement' else 'legacy-4.3' end)
where account_key is null or account_label is null or parser_id is null or opening_concept is null;

alter table public.import_batches drop constraint if exists import_batches_account_scope_check;
alter table public.import_batches add constraint import_batches_account_scope_check
  check (account_scope is null or account_scope in ('explicit','source'));

alter table public.import_batches drop constraint if exists import_batches_opening_concept_check;
alter table public.import_batches add constraint import_batches_opening_concept_check
  check (opening_concept is null or opening_concept = 'opening_balance');

alter table public.import_batches drop constraint if exists import_batches_opening_confidence_check;
alter table public.import_batches add constraint import_batches_opening_confidence_check
  check (opening_confidence is null or opening_confidence in ('high','medium'));

create index if not exists idx_transactions_account_period
  on public.transactions(user_id,account_key,statement_period);

-- A proteção genérica substitui a semântica exclusiva de cartão.
create unique index if not exists uq_transactions_opening_balance_account_period
  on public.transactions(user_id,account_key,statement_period)
  where entry_kind = 'opening_balance' and account_key is not null and statement_period is not null;

commit;

-- Verificação resumida.
select table_name,column_name,data_type
from information_schema.columns
where table_schema='public'
  and ((table_name='transactions' and column_name in ('account_key','account_label','source_parser'))
    or (table_name='import_batches' and column_name in ('account_key','account_label','account_scope','parser_id','opening_concept','opening_evidence','opening_confidence','opening_source_ref')))
order by table_name,column_name;
