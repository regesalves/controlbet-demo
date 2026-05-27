# cleanup-unconfirmed-users

Edge Function para a Fase 2 em modo seguro de auditoria/dry-run.

Esta versao nao executa delecao real. Mesmo se `DRY_RUN=false` for enviado ou configurado por engano, a funcao forca `dry_run: true` e apenas registra candidatos.

## Criterio

Um usuario entra como candidato quando:

- `email_confirmed_at` e `null`
- `created_at` e mais antigo que `CLEANUP_MIN_AGE_HOURS`, padrao `48`
- `last_sign_in_at` e `null`, quando `REQUIRE_NO_LAST_SIGN_IN=true`, padrao `true`

Antes de qualquer acao, a funcao revalida o usuario com `auth.admin.getUserById(user.id)`.

## Logs

Resumo:

- `run_id`
- `started_at`
- `finished_at`
- `dry_run`
- `candidate_count`
- `deleted_count`
- `skipped_count`
- `errors_count`

Por usuario:

- `user_id`
- `email`
- `created_at`
- `email_confirmed_at`
- `last_sign_in_at`
- `action_taken`
- `reason`

## Variaveis

Obrigatorias:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Recomendadas:

- `DRY_RUN=true`
- `MAX_DELETE_PER_RUN=25`
- `CLEANUP_MIN_AGE_HOURS=48`
- `REQUIRE_NO_LAST_SIGN_IN=true`
- `CLEANUP_RUN_SECRET=<secret-opcional-para-execucao-manual>`
- `REQUIRE_CLEANUP_RUN_SECRET=true`

O `SUPABASE_SERVICE_ROLE_KEY` deve existir apenas nos secrets da Edge Function. Nunca colocar em `.env.local`, `VITE_*` ou no frontend.

## Deploy

Com Supabase CLI:

```bash
supabase functions deploy cleanup-unconfirmed-users
```

Configurar secrets:

```bash
supabase secrets set DRY_RUN=true
supabase secrets set MAX_DELETE_PER_RUN=25
supabase secrets set CLEANUP_MIN_AGE_HOURS=48
supabase secrets set REQUIRE_NO_LAST_SIGN_IN=true
supabase secrets set CLEANUP_RUN_SECRET=<secret-forte>
supabase secrets set REQUIRE_CLEANUP_RUN_SECRET=true
```

## Teste manual

Sem cron nesta fase.

Checklist operacional completo:

- `docs/security/cleanup-unconfirmed-users-operational-validation.md`

```bash
curl -X POST "https://<project-ref>.supabase.co/functions/v1/cleanup-unconfirmed-users" \
  -H "Authorization: Bearer <service-role-ou-jwt-autorizado>" \
  -H "Content-Type: application/json" \
  -H "x-cleanup-secret: <secret-opcional>" \
  -d '{ "dry_run": true }'
```

Resposta esperada:

```json
{
  "dry_run": true,
  "deleted_count": 0,
  "users": []
}
```

## Cron

Cron em modo observacao:

- `docs/security/cleanup-unconfirmed-users-cron-observation.md`
- `supabase/sql/schedule-cleanup-unconfirmed-users-dry-run.sql`

Manter `DRY_RUN=true`.

## Rollback

Como esta versao e dry-run, rollback operacional e simples:

1. Remover/desabilitar a Edge Function no dashboard ou via CLI.
2. Remover secrets opcionais, se necessario.
3. Nao ha dados para restaurar, pois `deleted_count` deve permanecer `0`.

Antes de uma fase destrutiva futura, validar logs por alguns ciclos manuais e manter `MAX_DELETE_PER_RUN` baixo.
