/**
 * Ajusta DATABASE_URL para Prisma em serverless (Vercel) com Supabase pooler.
 * Sem `pgbouncer=true`, o Prisma costuma falhar com PgBouncer em modo transação.
 * @see https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/databases-connections/pgbouncer
 */

function isLikelySupabaseTransactionPooler(host: string, port: string): boolean {
  const h = host.toLowerCase();
  if (h.includes("pooler.supabase.com") && (port === "6543" || port === "5432")) return true;
  if (h.endsWith(".supabase.co") && port === "6543") return true;
  return false;
}

/** Reconstrói postgres:// a partir de URL parseada (http:// surrogate). */
function toPostgresUri(u: URL): string {
  let auth = "";
  if (u.username !== "" || u.password !== "") {
    if (u.username) {
      auth = encodeURIComponent(u.username);
      if (u.password !== "") {
        auth += `:${encodeURIComponent(u.password)}`;
      }
      auth += "@";
    }
  }
  const port = u.port ? `:${u.port}` : "";
  const path = u.pathname || "/";
  const q = u.search;
  return `postgresql://${auth}${u.hostname}${port}${path}${q}`;
}

/**
 * Garante parâmetros compatíveis com pooler + SSL a partir de Vercel.
 * Se não for pooler Supabase, devolve a string original (só trim).
 */
export function normalizePostgresUrlForServerless(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;

  let u: URL;
  try {
    u = new URL(trimmed.replace(/^postgres(ql)?:/i, "http:"));
  } catch {
    return trimmed;
  }

  const host = u.hostname;
  const port = u.port || "5432";
  const pooler = isLikelySupabaseTransactionPooler(host, port);
  const onVercel = Boolean(process.env.VERCEL);

  if (!pooler && !onVercel) {
    return trimmed;
  }

  const sp = new URLSearchParams(u.search);
  if (pooler) {
    if (!sp.has("pgbouncer")) sp.set("pgbouncer", "true");
    if (!sp.has("sslmode")) sp.set("sslmode", "require");
  }
  if (onVercel) {
    if (!sp.has("connection_limit")) sp.set("connection_limit", "1");
    if (!sp.has("connect_timeout")) sp.set("connect_timeout", "15");
    if (!sp.has("sslmode") && pooler) sp.set("sslmode", "require");
  }

  const qs = sp.toString();
  u.search = qs ? `?${qs}` : "";
  return toPostgresUri(u);
}
