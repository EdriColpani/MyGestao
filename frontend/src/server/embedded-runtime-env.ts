/**
 * Fallback de servidor quando o hosting não define variáveis (ex.: Vercel sem env vars).
 * - `DATABASE_URL`: ligação Postgres (pooler Supabase). Sensível — repo público = risco.
 * - `JWT_SECRET`: tokens do login legado (`/api/auth/login`). Se só usares Supabase Auth, ainda é exigido por `ensureApiRuntimeEnv` na Vercel.
 *
 * Preferência: `DATABASE_URL` e `JWT_SECRET` no painel do hosting ou no `.env` local.
 */
export const EMBEDDED_DATABASE_URL =
  "postgresql://postgres.lacijxefhflrtdsmngkx:M5Y4G0E9S1T7AO@aws-1-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require";

export const EMBEDDED_JWT_SECRET =
  "mygestao-embed-jwt-production-minimum-32-characters-x";
