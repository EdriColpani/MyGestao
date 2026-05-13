/** Erro de configuração / ambiente — mensagem segura para o cliente (sem segredos). */
export class ApiConfigError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode = 503) {
    super(message);
    this.name = "ApiConfigError";
    this.statusCode = statusCode;
  }
}
