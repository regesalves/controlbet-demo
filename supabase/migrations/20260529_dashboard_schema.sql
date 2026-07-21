-- Dashboard persistence schema for ControlBet.
-- This migration keeps the current frontend contract:
-- client-generated numeric ids, user_id ownership, and numeric casa_id links.

create table if not exists public.houses (
    id bigint primary key,
    user_id uuid not null references auth.users (id) on delete cascade,
    nome text not null,
    banca_inicial numeric(14, 2) not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint houses_nome_not_blank check (length(trim(nome)) > 0),
    constraint houses_banca_inicial_non_negative check (banca_inicial >= 0)
);

create unique index if not exists houses_id_user_id_key
    on public.houses (id, user_id);

create index if not exists houses_user_id_idx
    on public.houses (user_id);

create table if not exists public.tickets (
    id bigint primary key,
    user_id uuid not null references auth.users (id) on delete cascade,
    casa_id bigint not null,
    data date not null,
    categoria text not null,
    odd numeric(10, 4) not null,
    stake numeric(14, 2) not null default 0,
    retorno numeric(14, 2) not null default 0,
    origem_stake text not null default 'Saldo',
    stake_saldo numeric(14, 2) not null default 0,
    stake_deposito numeric(14, 2) not null default 0,
    stake_bonus numeric(14, 2) not null default 0,
    resultado text not null default 'Pendente',
    observacoes text not null default '',
    lucro numeric(14, 2) not null default 0,
    stake_real numeric(14, 2) not null default 0,
    recovered_real numeric(14, 2) not null default 0,
    recovered_bonus numeric(14, 2) not null default 0,
    perda_real numeric(14, 2) not null default 0,
    perda_bonus numeric(14, 2) not null default 0,
    lucro_real numeric(14, 2) not null default 0,
    numero_bilhete integer not null default 0,
    nome_bilhete text not null default '',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint tickets_house_owner_fk
        foreign key (casa_id, user_id)
        references public.houses (id, user_id)
        on update cascade
        on delete cascade,
    constraint tickets_categoria_not_blank check (length(trim(categoria)) > 0),
    constraint tickets_odd_positive check (odd > 0),
    constraint tickets_stake_non_negative check (stake >= 0),
    constraint tickets_retorno_non_negative check (retorno >= 0),
    constraint tickets_stake_saldo_non_negative check (stake_saldo >= 0),
    constraint tickets_stake_deposito_non_negative check (stake_deposito >= 0),
    constraint tickets_stake_bonus_non_negative check (stake_bonus >= 0),
    constraint tickets_stake_real_non_negative check (stake_real >= 0),
    constraint tickets_recovered_real_non_negative check (recovered_real >= 0),
    constraint tickets_recovered_bonus_non_negative check (recovered_bonus >= 0),
    constraint tickets_perda_real_non_negative check (perda_real >= 0),
    constraint tickets_perda_bonus_non_negative check (perda_bonus >= 0),
    constraint tickets_lucro_real_non_negative check (lucro_real >= 0),
    constraint tickets_numero_bilhete_non_negative check (numero_bilhete >= 0),
    constraint tickets_resultado_allowed check (resultado in ('Pendente', 'Green', 'Red', 'Cash Out'))
);

create index if not exists tickets_user_id_idx
    on public.tickets (user_id);

create index if not exists tickets_user_id_data_idx
    on public.tickets (user_id, data desc);

create index if not exists tickets_user_id_casa_id_idx
    on public.tickets (user_id, casa_id);

create table if not exists public.movements (
    id bigint primary key,
    user_id uuid not null references auth.users (id) on delete cascade,
    casa_id bigint not null,
    data date not null,
    tipo text not null,
    valor numeric(14, 2) not null default 0,
    observacoes text not null default '',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint movements_house_owner_fk
        foreign key (casa_id, user_id)
        references public.houses (id, user_id)
        on update cascade
        on delete cascade,
    constraint movements_valor_non_negative check (valor >= 0),
    constraint movements_tipo_allowed check (tipo in ('Depósito', 'Saque'))
);

create index if not exists movements_user_id_idx
    on public.movements (user_id);

create index if not exists movements_user_id_data_idx
    on public.movements (user_id, data desc);

create index if not exists movements_user_id_casa_id_idx
    on public.movements (user_id, casa_id);

alter table public.houses enable row level security;
alter table public.tickets enable row level security;
alter table public.movements enable row level security;

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.houses to authenticated;
grant select, insert, update, delete on public.tickets to authenticated;
grant select, insert, update, delete on public.movements to authenticated;

revoke all on public.houses from anon;
revoke all on public.tickets from anon;
revoke all on public.movements from anon;

drop policy if exists houses_select_own on public.houses;
create policy houses_select_own
    on public.houses
    for select
    to authenticated
    using (auth.uid() = user_id);

drop policy if exists houses_insert_own on public.houses;
create policy houses_insert_own
    on public.houses
    for insert
    to authenticated
    with check (auth.uid() = user_id);

drop policy if exists houses_update_own on public.houses;
create policy houses_update_own
    on public.houses
    for update
    to authenticated
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

drop policy if exists houses_delete_own on public.houses;
create policy houses_delete_own
    on public.houses
    for delete
    to authenticated
    using (auth.uid() = user_id);

drop policy if exists tickets_select_own on public.tickets;
create policy tickets_select_own
    on public.tickets
    for select
    to authenticated
    using (auth.uid() = user_id);

drop policy if exists tickets_insert_own on public.tickets;
create policy tickets_insert_own
    on public.tickets
    for insert
    to authenticated
    with check (auth.uid() = user_id);

drop policy if exists tickets_update_own on public.tickets;
create policy tickets_update_own
    on public.tickets
    for update
    to authenticated
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

drop policy if exists tickets_delete_own on public.tickets;
create policy tickets_delete_own
    on public.tickets
    for delete
    to authenticated
    using (auth.uid() = user_id);

drop policy if exists movements_select_own on public.movements;
create policy movements_select_own
    on public.movements
    for select
    to authenticated
    using (auth.uid() = user_id);

drop policy if exists movements_insert_own on public.movements;
create policy movements_insert_own
    on public.movements
    for insert
    to authenticated
    with check (auth.uid() = user_id);

drop policy if exists movements_update_own on public.movements;
create policy movements_update_own
    on public.movements
    for update
    to authenticated
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

drop policy if exists movements_delete_own on public.movements;
create policy movements_delete_own
    on public.movements
    for delete
    to authenticated
    using (auth.uid() = user_id);
