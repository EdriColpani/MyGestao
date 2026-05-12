import "@fastify/jwt";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: {
      sub: string;
      email: string;
      role: string;
      tokenUse?: "access" | "refresh";
    };
    user: {
      sub: string;
      email: string;
      role: string;
      tokenUse?: "access" | "refresh";
    };
  }
}
