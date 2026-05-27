# Fase 1: Auditoria de Contas Nao Confirmadas

Esta fase nao implementa delecao automatica, cron, Edge Function, mudanca de schema, RLS ou UI administrativa.

## SQL Produzido

Arquivo: `docs/security/unconfirmed-accounts-audit.sql`

A consulta principal lista contas em `auth.users` com:

- `email_confirmed_at is null`
- `created_at < now() - interval '48 hours'`
- `left join public.profiles on profiles.id = auth.users.id`

Campos retornados:

- `auth.users.id`
- `email`
- `created_at`
- `email_confirmed_at`
- `last_sign_in_at`
- `metadata_username`
- `metadata_phone`
- `profile_id`
- `profile_username`
- `profile_phone`

O mesmo arquivo inclui queries de inspecao para confirmar:

- FK entre `public.profiles.id` e `auth.users.id`
- regra `ON DELETE` dessa FK, incluindo se ha `CASCADE`
- triggers existentes em `auth.users` e `public.profiles`

## Achados do Schema

No repositorio nao ha migrations, schema SQL ou pasta `supabase` versionada. A investigacao local encontrou referencias de frontend a:

- tabela `public.profiles`
- RPC `check_profile_availability`
- campos `profiles.username`, `profiles.phone`, `profiles.scheduled_delete_at`
- metadados de cadastro `username` e `phone` enviados para `auth.signUp`

Por isso, a confirmacao definitiva de FK, cascade e triggers precisa ser feita no SQL Editor do Supabase usando as queries de inspecao do arquivo SQL.

## Estrategia Recomendada

Manter a politica principal em `48 horas`.

Motivo: `24h` pode ser agressivo para usuarios que demoraram a confirmar o e-mail; `7 dias` e conservador demais e mantem `username`/`telefone` presos por muito tempo. `48h` equilibra recuperacao de identificadores e tolerancia ao fluxo real de confirmacao.

## Cleanup Futuro

Arquitetura proposta, sem implementar nesta fase:

```text
Scheduled Function / Cron
-> Edge Function
-> service_role
-> auditoria dos candidatos
-> delete controlado
```

A Edge Function deve usar `service_role` apenas no servidor. Nunca expor `service_role` no frontend ou em variaveis `VITE_*`.

## Auth, Profile e Ordem Segura

Se a FK `public.profiles.id -> auth.users.id` existir com `ON DELETE CASCADE`, o cleanup futuro pode deletar o usuario via Admin Auth e deixar o banco remover o perfil automaticamente.

Se nao houver cascade, a ordem mais segura e:

1. Revalidar que `auth.users.email_confirmed_at is null`.
2. Revalidar que `auth.users.created_at < now() - interval '48 hours'`.
3. Deletar `public.profiles` do usuario candidato, se existir.
4. Deletar `auth.users` via `supabase.auth.admin.deleteUser(user.id)`.

Se existirem triggers relevantes em `auth.users` ou `public.profiles`, revisar seus efeitos antes de qualquer delecao automatica.

## Riscos

- Deletar apenas `auth.users` pode nao liberar `username`/`phone` se `public.profiles` nao tiver cascade.
- Deletar `public.profiles` antes de confirmar o estado atual do Auth pode afetar conta confirmada por corrida de tempo.
- Triggers podem recriar, bloquear ou propagar dados durante delecao.
- `raw_user_meta_data` e `profiles` podem divergir; a auditoria mostra os dois para comparacao.

## Proximo Passo Seguro

Executar apenas as queries de auditoria e inspecao no SQL Editor do Supabase, salvar os resultados e confirmar:

- volume de candidatos
- se todos estao realmente nao confirmados
- se ha `profile_id` para esses usuarios
- regra `delete_rule` da FK
- triggers ativos

Somente depois disso partir para Fase 2 com cleanup controlado em Edge Function.
