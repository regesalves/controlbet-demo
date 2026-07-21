-- Agenda automatico em modo observacao para cleanup-unconfirmed-users.
-- Nao habilita delecao real. A Edge Function permanece DRY_RUN=true.
--
-- Horario: 03:00 UTC, uma vez por dia.
--
-- Antes de executar:
-- 1. Confirmar que a Edge Function esta deployada.
-- 2. Confirmar secrets da function:
--    DRY_RUN=true
--    REQUIRE_CLEANUP_RUN_SECRET=true
--    CLEANUP_RUN_SECRET=<mesmo valor salvo no Vault abaixo>
-- 3. Substituir os placeholders de Vault no bloco "Secrets".

create extension if not exists pg_cron;
create extension if not exists pg_net;
create extension if not exists supabase_vault with schema vault;

-- Secrets usados somente pelo banco para invocar a Edge Function.
-- Rode uma vez, substituindo os placeholders.
-- Se o secret ja existir, atualize pelo Dashboard/Vault antes de reagendar.

-- select vault.create_secret('https://<project-ref>.supabase.co', 'cleanup_unconfirmed_project_url');
-- select vault.create_secret('<cleanup-run-secret>', 'cleanup_unconfirmed_run_secret');

-- Evita job duplicado com o mesmo nome ao reaplicar esta configuracao.
select cron.unschedule('cleanup-unconfirmed-users-dry-run-daily')
where exists (
    select 1
    from cron.job
    where jobname = 'cleanup-unconfirmed-users-dry-run-daily'
);

select cron.schedule(
    'cleanup-unconfirmed-users-dry-run-daily',
    '0 3 * * *',
    $$
    select net.http_post(
        url := (
            select decrypted_secret
            from vault.decrypted_secrets
            where name = 'cleanup_unconfirmed_project_url'
        ) || '/functions/v1/cleanup-unconfirmed-users',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'x-cleanup-secret', (
                select decrypted_secret
                from vault.decrypted_secrets
                where name = 'cleanup_unconfirmed_run_secret'
            )
        ),
        body := jsonb_build_object(
            'dry_run', true,
            'trigger', 'cron',
            'scheduled_at', now()
        )
    ) as request_id;
    $$
);

-- Verificar job criado.
select
    jobid,
    jobname,
    schedule,
    active,
    command
from cron.job
where jobname = 'cleanup-unconfirmed-users-dry-run-daily';
