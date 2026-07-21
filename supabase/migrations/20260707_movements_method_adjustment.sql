alter table public.movements
    add column if not exists metodo text default 'PIX';

alter table public.movements
    drop constraint if exists movements_tipo_allowed;

alter table public.movements
    add constraint movements_tipo_allowed
    check (tipo in ('Depósito', 'Saque', 'Ajuste'));
