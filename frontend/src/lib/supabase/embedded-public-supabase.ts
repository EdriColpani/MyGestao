/**
 * Credenciais públicas do Supabase (equivalente a "anon" / publishable no painel).
 * Usadas quando `NEXT_PUBLIC_SUPABASE_*` não estão definidas no build (ex.: hosting sem env vars).
 * A proteção de dados é feita com RLS no Supabase, não com o segredo desta chave.
 *
 * Para ligar a outro projeto: altere estes valores e faça deploy.
 */
export const EMBEDDED_SUPABASE_PUBLIC_URL = "https://lacijxefhflrtdsmngkx.supabase.co";

export const EMBEDDED_SUPABASE_PUBLIC_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxhY2lqeGVmaGZscnRkc21uZ2t4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1NTE1OTgsImV4cCI6MjA5NDEyNzU5OH0.-OFwFINS4l_ApCNgOBDvIyayd2fxhcOROTEwYBchfeU";
