import jwt from "jsonwebtoken";
import { getJwtSecret } from "./env";

export type JwtUserPayload = {
  sub: string;
  email: string;
  role: string;
  tokenUse?: "access" | "refresh";
};

export function signAccessToken(payload: JwtUserPayload): string {
  return jwt.sign(
    { sub: payload.sub, email: payload.email, role: payload.role, tokenUse: "access" },
    getJwtSecret(),
    { expiresIn: "15m", algorithm: "HS256" },
  );
}

export function signRefreshToken(payload: JwtUserPayload): string {
  return jwt.sign(
    { sub: payload.sub, email: payload.email, role: payload.role, tokenUse: "refresh" },
    getJwtSecret(),
    { expiresIn: "7d", algorithm: "HS256" },
  );
}

export function verifyToken(token: string): JwtUserPayload {
  const decoded = jwt.verify(token, getJwtSecret(), { algorithms: ["HS256"] });
  if (typeof decoded === "string" || !decoded || typeof decoded !== "object") {
    throw new Error("Token invalido");
  }
  const o = decoded as Record<string, unknown>;
  return {
    sub: String(o.sub),
    email: String(o.email),
    role: String(o.role),
    tokenUse: o.tokenUse as JwtUserPayload["tokenUse"],
  };
}
