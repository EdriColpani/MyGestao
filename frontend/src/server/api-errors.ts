/**
 * Erro de configuração / ambiente.
 * `message` (herdado de Error) = texto curto para o cliente (UI).
 * `logDetail` = diagnóstico para consola / Vercel Logs (não enviar ao browser).
 */
export class ApiConfigError extends Error {
  readonly statusCode: number;
  readonly logDetail?: string;

  constructor(userMessage: string, statusCode = 503, logDetail?: string) {
    super(userMessage);
    this.name = "ApiConfigError";
    this.statusCode = statusCode;
    this.logDetail = logDetail;
  }
}
