# Cron em Observacao: cleanup-unconfirmed-users

Esta etapa agenda a Edge Function `cleanup-unconfirmed-users` uma vez por dia em dry-run. Nao habilita delete real.

Baseado no padrao oficial do Supabase para Scheduling Edge Functions: `pg_cron` agenda o job e `pg_net` chama a Edge Function via HTTP. O Supabase tambem recomenda armazenar tokens/secrets no Vault.

Fontes:

- https://supabase.com/docs/guides/functions/schedule-functions
- https://supabase.com/docs/guides/cron

## Arquivos

- `supabase/sql/schedule-cleanup-unconfirmed-users-dry-run.sql`
- `supabase/sql/disable-cleanup-unconfirmed-users-cron.sql`
- `supabase/functions/cleanup-unconfirmed-users/index.ts`

## O que mudou na function

A function agora exige `CLEANUP_RUN_SECRET` por padrao, via:

- `REQUIRE_CLEANUP_RUN_SECRET=true`
- header `x-cleanup-secret`

Isso e importante porque a function esta com `verify_jwt = false` para permitir chamada segura via cron HTTP sem depender de sessao de usuario.

## Secrets da Edge Function

Confirmar:

```bash
supabase secrets set DRY_RUN=true
supabase secrets set REQUIRE_CLEANUP_RUN_SECRET=true
supabase secrets set CLEANUP_RUN_SECRET='<secret-forte>'
supabase secrets set MAX_DELETE_PER_RUN=25
supabase secrets set CLEANUP_MIN_AGE_HOURS=48
supabase secrets set REQUIRE_NO_LAST_SIGN_IN=true
```

## Secrets no Vault

No SQL Editor, criar os secrets usados pelo cron:

```sql
select vault.create_secret('https://<project-ref>.supabase.co', 'cleanup_unconfirmed_project_url');
select vault.create_secret('<mesmo CLEANUP_RUN_SECRET da function>', 'cleanup_unconfirmed_run_secret');
```

## Aplicar agendamento

Executar no SQL Editor:

```sql
-- arquivo:
-- supabase/sql/schedule-cleanup-unconfirmed-users-dry-run.sql
```

Agenda:

```text
0 3 * * *
```

Ou seja: todos os dias as 03:00 UTC.

## Monitorar execucoes

Ver jobs:

```sql
select
  jobid,
  jobname,
  schedule,
  active
from cron.job
where jobname = 'cleanup-unconfirmed-users-dry-run-daily';
```

Ver execucoes:

```sql
select
  jobid,
  runid,
  job_pid,
  database,
  username,
  command,
  status,
  return_message,
  start_time,
  end_time
from cron.job_run_details
where jobid = (
  select jobid
  from cron.job
  where jobname = 'cleanup-unconfirmed-users-dry-run-daily'
)
order by start_time desc
limit 20;
```

Ver requests HTTP disparados pelo `pg_net`:

```sql
select
  id,
  status_code,
  timed_out,
  error_msg,
  created
from net._http_response
order by created desc
limit 20;
```

Ver logs da Edge Function:

1. Supabase Dashboard
2. Edge Functions
3. `cleanup-unconfirmed-users`
4. Logs
5. Procurar pelo `event = cleanup_finished`

Campos esperados nos logs:

- `run_id`
- `started_at`
- `finished_at`
- `dry_run = true`
- `candidate_count`
- `deleted_count = 0`
- `skipped_count`
- `errors_count`

## Confirmacao de seguranca

Apos a primeira execucao automatica:

1. Confirmar `cron.job_run_details.status`.
2. Confirmar `net._http_response.status_code` 2xx.
3. Confirmar nos logs da Edge Function:
   - `dry_run = true`
   - `deleted_count = 0`
4. Rodar auditoria SQL antes/depois se necessario para confirmar que nenhum usuario/profile foi removido.

## Pausar ou desabilitar

Executar:

```sql
-- arquivo:
-- supabase/sql/disable-cleanup-unconfirmed-users-cron.sql
```

Ou diretamente:

```sql
select cron.unschedule('cleanup-unconfirmed-users-dry-run-daily');
```

## Rollback

Rollback desta fase:

1. Rodar `disable-cleanup-unconfirmed-users-cron.sql`.
2. Confirmar que o job nao aparece mais em `cron.job`.
3. Manter a Edge Function deployada para execucao manual, ou remover se quiser pausar totalmente.
4. Nao ha restauracao de dados, pois a function permanece em dry-run e `deleted_count` deve ser `0`.

