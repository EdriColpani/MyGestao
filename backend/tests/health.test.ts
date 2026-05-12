import { describe, it, expect, afterAll } from "vitest";
import { buildApp } from "../src/app";

describe("GET /health", () => {
  const app = buildApp();

  afterAll(async () => {
    await app.close();
  });

  it("retorna status ok", async () => {
    await app.ready();
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: "ok" });
  });
});
