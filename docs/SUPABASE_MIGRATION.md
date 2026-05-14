# Migração C — Supabase (client + RLS), sair do Prisma + JWT + DATABASE_URL no servidor

Objetivo: dados e autenticação via **Supabase** (`@supabase/supabase-js` / `@supabase/ssr`), com **Row Level Security (RLS)** nas tabelas. O browser usa só chaves **públicas** (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`). Operações privilegiadas usam **`SUPABASE_SERVICE_ROLE_KEY` só em Edge/Route Handler** quando inevitável — ou evitam-se com RLS bem desenhada.

> Não existe app seguro com Postgres **sem** segredos em lado nenhum; o caminho C troca **connection string no servidor** por **chaves do modelo Supabase** (e RLS), alinhado com o que a Supabase e a Vercel documentam.

## Fase 0 — Projeto Supabase (uma vez)

1. Criar projeto em [supabase.com](https://supabase.com).
2. **Authentication → Providers**: ativar Email (substitui login com bcrypt + JWT atual).
3. **SQL**: criar tabelas equivalentes ao `frontend/prisma/schema.prisma` (`users` hoje não é `auth.users`; decidir se perfil fica em `public.profiles` ligado a `auth.users.id` ou migrar emails).
4. **RLS**: políticas `USING (auth.uid() = user_id)` (ou join a `profiles`) em cada tabela com `user_id`.

## Fase 1 — Já feito no repositório

- Dependências: `@supabase/supabase-js`, `@supabase/ssr`.
- Helpers: `frontend/src/lib/supabase/browser-client.ts`, `server-client.ts`.

## Fase 2 — Variáveis (Vercel ou .env local)

| Variável | Onde | Notas |
|----------|------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Build + browser | URL do projeto Supabase. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Build + browser | Chave anon (pública); segurança vem da RLS. |
| `SUPABASE_SERVICE_ROLE_KEY` | Só servidor | Opcional no início; evitar expor ao client. |

Copiar valores em **Project Settings → API** no painel Supabase.

## Fase 3 — Autenticação

- Substituir `LoginForm` / registo por `supabase.auth.signInWithPassword` / `signUp`.
- Remover `jwt`, `auth-storage` tokens customizados; usar sessão Supabase (cookies via `@supabase/ssr`).
- Migrar utilizadores existentes: script one-off (export users + `auth.admin.createUser` com service role) ou convite para redefinir password.

## Fase 4 — Dados

- Por ecrã: trocar `apiJson("/cards")` por queries `supabase.from("cards").select()` com políticas RLS.
- Relatórios agregados: **views** SQL no Supabase ou **RPC** `SECURITY DEFINER` controlado — evita service role no app.

## Fase 5 — Remoção do legado

- Apagar `api-router` + rotas `app/api/[[...path]]` quando não houver chamadas.
- Remover Prisma (`schema.prisma`, `postinstall` prisma generate, deps).
- Atualizar CI (sem Postgres para Prisma se só Supabase Cloud).

## Ordem sugerida das tabelas na migração

1. `profiles` + ligação a `auth.users`  
2. `categories`, `cards`  
3. `expense_purchases`, `expense_installments`  
4. `monthly_incomes`, `card_invoice_payments`, `card_invoice_payment_items`, `cash_flows`

## Referências

- [Supabase + Next.js (App Router)](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [RLS](https://supabase.com/docs/guides/auth/row-level-security)
