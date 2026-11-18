-- COPILOTO FINANCEIRO 4.3
-- Saldo anterior conciliável, sem duplicar transações.
-- Execute uma vez no SQL Editor depois das migrações v4 e v4.2 MFA.
-- A migração é aditiva: não apaga nem reclassifica registros existentes.

begin;

alter table public.transactions add column if not exists entry_kind text default 'detailed';
alter table public.transactions add column if not exists card_key text;
alter table public.transactions add column if not exists statement_period date;

update public.transactions set entry_kind = 'detailed' where entry_kind is null;
alter table public.transactions alter column entry_kind set default 'detailed';
alter table public.transactions alter column entry_kind set not null;

alter table public.import_batches add column if not exists bank_name text;
alter table public.import_batches add column if not exists card_key text;
alter table public.import_batches add column if not exists card_label text;
alter table public.import_batches add column if not exists statement_month date;
alter table public.import_batches add column if not exists previous_period date;
alter table public.import_batches add column if not exists opening_balance numeric(14,2) default 0;
alter table public.import_batches add column if not exists new_purchases numeric(14,2) default 0;
alter table public.import_batches add column if not exists credits_payments numeric(14,2) default 0;
alter table public.import_batches add column if not exists statement_total numeric(14,2) default 0;
alter table public.import_batches add column if not exists statement_difference numeric(14,2) default 0;
alter table public.import_batches add column if not exists opening_explained numeric(14,2) default 0;
alter table public.import_batches add column if not exists opening_remaining numeric(14,2) default 0;
alter table public.import_batches add column if not exists detail_quality numeric(7,2) default 0;
alter table public.import_batches add column if not exists opening_status text default 'not_applicable';
alter table public.import_batches add column if not exists statement_status text default 'not_applicable';
alter table public.import_batches add column if not exists opening_adjustment_id uuid;

alter table public.transactions drop constraint if exists transactions_entry_kind_check;
alter table public.transactions add constraint transactions_entry_kind_check
  check (entry_kind in ('detailed','opening_balance'));

alter table public.import_batches drop constraint if exists import_batches_status_check;
alter table public.import_batches add constraint import_batches_status_check
  check (status in ('review','reconciled','pending_balance','divergent','failed'));

alter table public.import_batches drop constraint if exists import_batches_opening_status_check;
alter table public.import_batches add constraint import_batches_opening_status_check
  check (opening_status in ('not_applicable','pending','detailed','covered_consolidated','overrepresented'));

alter table public.import_batches drop constraint if exists import_batches_statement_status_check;
alter table public.import_batches add constraint import_batches_statement_status_check
  check (statement_status in ('not_applicable','reconciled','divergent'));

create index if not exists idx_transactions_card_period
  on public.transactions(user_id,card_key,statement_period);

-- Defesa adicional: apenas um opening_balance por usuário/cartão/período.
create unique index if not exists uq_transactions_opening_balance_card_period
  on public.transactions(user_id,card_key,statement_period)
  where entry_kind = 'opening_balance' and card_key is not null and statement_period is not null;

commit;

-- Verificação resumida.
select table_name,column_name,data_type
from information_schema.columns
where table_schema='public'
  and ((table_name='transactions' and column_name in ('entry_kind','card_key','statement_period'))
    or (table_name='import_batches' and column_name in ('opening_balance','opening_remaining','detail_quality','statement_difference','opening_status','statement_status')))
order by table_name,column_name;
