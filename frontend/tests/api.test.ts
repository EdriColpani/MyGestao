import { describe, it, expect, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { GET as healthGet } from "@/app/api/health/route";
import { POST as syncProfilePost } from "@/app/api/auth/sync-profile/route";
import { handleApiRequest } from "@/server/api-router";
import { prisma } from "@/server/prisma";

const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
const emailA = `user-a-${suffix}@test.mygestao.local`;
const emailB = `user-b-${suffix}@test.mygestao.local`;
const password = "testpass123";
const cardNameA = `Cartao-Isolamento-A-${suffix}`;

function jsonReq(method: string, pathname: string, body?: unknown, token?: string) {
  const url = new URL(pathname, "http://localhost");
  const headers = new Headers();
  if (body !== undefined) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return new NextRequest(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

describe("GET /api/health", () => {
  it("retorna status ok", async () => {
    const res = await healthGet();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
  });
});

describe("POST /api/auth/sync-profile", () => {
  it("sem Authorization retorna 401", async () => {
    const res = await syncProfilePost(jsonReq("POST", "/api/auth/sync-profile"));
    expect(res.status).toBe(401);
  });
});

describe("rotas protegidas", () => {
  it("GET /cards sem token retorna 401", async () => {
    const res = await handleApiRequest(jsonReq("GET", "/api/cards"), ["cards"]);
    expect(res.status).toBe(401);
  });
});

describe("isolamento multiusuario (API)", () => {
  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { in: [emailA, emailB] } },
    });
    await prisma.$disconnect();
  });

  it("usuario B nao ve cartoes do usuario A", async () => {
    const regA = await handleApiRequest(
      jsonReq("POST", "/api/auth/register", { name: "User A", email: emailA, password }),
      ["auth", "register"],
    );
    expect(regA.status).toBe(201);

    const regB = await handleApiRequest(
      jsonReq("POST", "/api/auth/register", { name: "User B", email: emailB, password }),
      ["auth", "register"],
    );
    expect(regB.status).toBe(201);

    const loginA = await handleApiRequest(
      jsonReq("POST", "/api/auth/login", { email: emailA, password }),
      ["auth", "login"],
    );
    expect(loginA.status).toBe(200);
    const tokenA = ((await loginA.json()) as { accessToken: string }).accessToken;

    const createCard = await handleApiRequest(
      jsonReq(
        "POST",
        "/api/cards",
        {
          name: cardNameA,
          invoiceDueDay: 10,
          limitAmount: 5000,
          brand: "Visa",
          issuingBank: "Banco Teste",
        },
        tokenA,
      ),
      ["cards"],
    );
    expect(createCard.status).toBe(201);

    const loginB = await handleApiRequest(
      jsonReq("POST", "/api/auth/login", { email: emailB, password }),
      ["auth", "login"],
    );
    expect(loginB.status).toBe(200);
    const tokenB = ((await loginB.json()) as { accessToken: string }).accessToken;

    const cardsB = await handleApiRequest(jsonReq("GET", "/api/cards", undefined, tokenB), ["cards"]);
    expect(cardsB.status).toBe(200);
    const list = (await cardsB.json()) as { name: string }[];
    expect(list.some((c) => c.name === cardNameA)).toBe(false);
  });
});
