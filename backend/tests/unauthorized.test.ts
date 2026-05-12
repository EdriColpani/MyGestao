import { describe, it, expect, afterAll } from "vitest";
import { buildApp } from "../src/app";

describe("rotas protegidas", () => {
  const app = buildApp();

  afterAll(async () => {
    await app.close();
  });

  it("GET /cards sem token retorna 401", async () => {
    await app.ready();
    const res = await app.inject({ method: "GET", url: "/cards" });
    expect(res.statusCode).toBe(401);
  });
});
