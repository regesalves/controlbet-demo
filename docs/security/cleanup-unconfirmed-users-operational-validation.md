# Validacao Operacional: cleanup-unconfirmed-users

Esta validacao e somente dry-run. Nao ativar cron e nao habilitar delecao real.

## Status Local

O Supabase CLI foi validado via `npx`:

```powershell
npx.cmd supabase --version
```

Tentativa de deploy foi bloqueada por falta de autenticacao:

```text
Access token not provided.
Supply an access token by running supabase login or setting the SUPABASE_ACCESS_TOKEN environment variable.
```

## Deploy

### Opcao A: login interativo

```powershell
npx.cmd supabase login
```

Depois:

```powershell
$envFile = Get-Content -Path .env.local
$vars = @{}
foreach ($line in $envFile) {
  if ($line -match '^\s*([^#=]+)=(.*)$') {
    $vars[$matches[1].Trim()] = $matches[2].Trim()
  }
}
$projectRef = ([Uri]$vars['VITE_SUPABASE_URL']).Host.Split('.')[0]
npx.cmd supabase functions deploy cleanup-unconfirmed-users --project-ref $projectRef
```

### Opcao B: access token

```powershell
$env:SUPABASE_ACCESS_TOKEN = "<supabase-access-token>"
```

Depois:

```powershell
$envFile = Get-Content -Path .env.local
$vars = @{}
foreach ($line in $envFile) {
  if ($line -match '^\s*([^#=]+)=(.*)$') {
    $vars[$matches[1].Trim()] = $matches[2].Trim()
  }
}
$projectRef = ([Uri]$vars['VITE_SUPABASE_URL']).Host.Split('.')[0]
npx.cmd supabase functions deploy cleanup-unconfirmed-users --project-ref $projectRef
```

## Secrets

Configurar na Edge Function, nunca no frontend:

```powershell
npx.cmd supabase secrets set DRY_RUN=true --project-ref <project-ref>
npx.cmd supabase secrets set MAX_DELETE_PER_RUN=25 --project-ref <project-ref>
npx.cmd supabase secrets set CLEANUP_MIN_AGE_HOURS=48 --project-ref <project-ref>
npx.cmd supabase secrets set REQUIRE_NO_LAST_SIGN_IN=true --project-ref <project-ref>
npx.cmd supabase secrets set CLEANUP_RUN_SECRET="<secret-opcional>" --project-ref <project-ref>
```

`SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` normalmente estao disponiveis para Edge Functions no projeto Supabase. Se o projeto exigir configuracao manual, adicionar os dois como secrets da function.

## Invoke Manual

Sem cron nesta fase.

PowerShell:

```powershell
$supabaseUrl = "<https://project-ref.supabase.co>"
$serviceRole = "<service-role-key>"
$cleanupSecret = "<secret-opcional>"

Invoke-RestMethod `
  -Method Post `
  -Uri "$supabaseUrl/functions/v1/cleanup-unconfirmed-users" `
  -Headers @{
    Authorization = "Bearer $serviceRole"
    "Content-Type" = "application/json"
    "x-cleanup-secret" = $cleanupSecret
  } `
  -Body '{ "dry_run": true }'
```

curl:

```bash
curl -X POST "https://<project-ref>.supabase.co/functions/v1/cleanup-unconfirmed-users" \
  -H "Authorization: Bearer <service-role-key>" \
  -H "Content-Type: application/json" \
  -H "x-cleanup-secret: <secret-opcional>" \
  -d '{ "dry_run": true }'
```

## Resposta Esperada

```json
{
  "run_id": "uuid",
  "started_at": "2026-05-26T00:00:00.000Z",
  "finished_at": "2026-05-26T00:00:01.000Z",
  "dry_run": true,
  "candidate_count": 2,
  "deleted_count": 0,
  "skipped_count": 0,
  "errors_count": 0,
  "users": [
    {
      "user_id": "uuid",
      "email": "usuario@email.com",
      "created_at": "2026-05-23T00:00:00.000Z",
      "email_confirmed_at": null,
      "last_sign_in_at": null,
      "action_taken": "dry_run",
      "reason": "candidate_would_be_deleted_by_admin_delete_user"
    }
  ]
}
```

Confirmar obrigatoriamente:

- `dry_run = true`
- `deleted_count = 0`
- `candidate_count` coerente com auditoria SQL
- `skipped_count` explicado pelos logs por usuario
- `errors_count = 0` ou erros investigados antes de prosseguir

## SQL de Auditoria Antes/Depois

Executar antes e depois do invoke. Os totais devem permanecer iguais nesta fase.

```sql
select
  count(*) as auth_unconfirmed_48h_count
from auth.users
where email_confirmed_at is null
  and created_at < now() - interval '48 hours';
```

```sql
select
  count(*) as auth_unconfirmed_48h_without_last_sign_in_count
from auth.users
where email_confirmed_at is null
  and created_at < now() - interval '48 hours'
  and last_sign_in_at is null;
```

```sql
select
  count(*) as matching_profiles_count
from auth.users u
join public.profiles p on p.id = u.id
where u.email_confirmed_at is null
  and u.created_at < now() - interval '48 hours'
  and u.last_sign_in_at is null;
```

Comparar detalhes com o retorno da function:

```sql
select
  u.id,
  u.email,
  u.created_at,
  u.email_confirmed_at,
  u.last_sign_in_at,
  p.id as profile_id,
  p.username as profile_username,
  p.phone as profile_phone
from auth.users u
left join public.profiles p on p.id = u.id
where u.email_confirmed_at is null
  and u.created_at < now() - interval '48 hours'
  and u.last_sign_in_at is null
order by u.created_at asc;
```

## Confirmacao de Nao Alteracao

Depois do invoke:

- repetir as queries acima;
- confirmar que os counts nao mudaram;
- confirmar que usuarios retornados continuam em `auth.users`;
- confirmar que `profile_id` continua existindo em `public.profiles`;
- confirmar que `deleted_count` retornou `0`.

## Ajustes Encontrados

- Deploy real nao foi executado neste ambiente porque o CLI nao tem `SUPABASE_ACCESS_TOKEN` nem sessao de `supabase login`.
- Nao foi necessario alterar logs da function: os campos exigidos ja existem no resumo e por usuario.
- A function esta travada em dry-run nesta fase, mesmo se alguem enviar `dry_run: false`.

## Rollback

Como nao ha cron e a function e dry-run:

1. Desabilitar/remover a Edge Function no dashboard, ou:

```powershell
npx.cmd supabase functions delete cleanup-unconfirmed-users --project-ref <project-ref>
```

2. Remover secrets opcionais, se necessario.
3. Nenhum dado precisa ser restaurado se `deleted_count = 0`.

