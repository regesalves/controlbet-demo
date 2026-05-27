-- FASE 1: Auditoria segura de contas nao confirmadas
-- Nao executar delecao automatica com este arquivo.
-- Objetivo: localizar contas que podem estar prendendo username/telefone
-- porque nunca confirmaram o e-mail.

-- Criterio recomendado:
-- - e-mail ainda nao confirmado
-- - conta criada ha mais de 48 horas
-- - LEFT JOIN para identificar se tambem existe public.profiles

select
    u.id,
    u.email,
    u.created_at,
    u.email_confirmed_at,
    u.last_sign_in_at,
    u.raw_user_meta_data ->> 'username' as metadata_username,
    u.raw_user_meta_data ->> 'phone' as metadata_phone,
    p.id as profile_id,
    p.username as profile_username,
    p.phone as profile_phone
from auth.users as u
left join public.profiles as p
    on p.id = u.id
where u.email_confirmed_at is null
    and u.created_at < now() - interval '48 hours'
order by u.created_at asc;

-- Inspecao antes de qualquer cleanup futuro:
-- Verifica FK de public.profiles para auth.users e se existe ON DELETE CASCADE.

select
    tc.constraint_name,
    kcu.table_schema,
    kcu.table_name,
    kcu.column_name,
    ccu.table_schema as foreign_table_schema,
    ccu.table_name as foreign_table_name,
    ccu.column_name as foreign_column_name,
    rc.delete_rule
from information_schema.table_constraints as tc
join information_schema.key_column_usage as kcu
    on tc.constraint_name = kcu.constraint_name
    and tc.constraint_schema = kcu.constraint_schema
join information_schema.constraint_column_usage as ccu
    on ccu.constraint_name = tc.constraint_name
    and ccu.constraint_schema = tc.constraint_schema
join information_schema.referential_constraints as rc
    on rc.constraint_name = tc.constraint_name
    and rc.constraint_schema = tc.constraint_schema
where tc.constraint_type = 'FOREIGN KEY'
    and kcu.table_schema = 'public'
    and kcu.table_name = 'profiles'
    and ccu.table_schema = 'auth'
    and ccu.table_name = 'users';

-- Verifica triggers relevantes em auth.users e public.profiles.

select
    event_object_schema,
    event_object_table,
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
from information_schema.triggers
where (event_object_schema = 'auth' and event_object_table = 'users')
    or (event_object_schema = 'public' and event_object_table = 'profiles')
order by event_object_schema, event_object_table, trigger_name;
