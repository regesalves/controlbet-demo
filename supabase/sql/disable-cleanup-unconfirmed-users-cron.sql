-- Pausa/remove o cron automatico da cleanup-unconfirmed-users.
-- Nao altera a Edge Function e nao altera dados.

select cron.unschedule('cleanup-unconfirmed-users-dry-run-daily')
where exists (
    select 1
    from cron.job
    where jobname = 'cleanup-unconfirmed-users-dry-run-daily'
);

select
    jobid,
    jobname,
    schedule,
    active
from cron.job
where jobname = 'cleanup-unconfirmed-users-dry-run-daily';

