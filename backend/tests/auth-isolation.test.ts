import { describe, it, expect, afterAll } from "vitest";
import { buildApp } from "../src/app";
import { prisma } from "../src/plugins/prisma";

const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
const emailA = `user-a-${suffix}@test.mygestao.local`;
const emailB = `user-b-${suffix}@test.mygestao.local`;
const password = "testpass123";
const cardNameA = `Cartao-Isolamento-A-${suffix}`;

describe("isolamento multiusuario (API)", () => {
  const app = buildApp();

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { in: [emailA, emailB] } },
    });
    await prisma.$disconnect();
    await app.close();
  });

  it("usuario B nao ve cartoes do usuario A", async () => {
    await app.ready();

    const regA = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { name: "User A", email: emailA, password },
    });
    expect(regA.statusCode).toBe(201);

    const regB = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { name: "User B", email: emailB, password },
    });
    expect(regB.statusCode).toBe(201);

    const loginA = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: emailA, password },
    });
    expect(loginA.statusCode).toBe(200);
    const tokenA = loginA.json().accessToken as string;

    const createCard = await app.inject({
      method: "POST",
      url: "/cards",
      headers: { authorization: `Bearer ${tokenA}` },
      payload: {
        name: cardNameA,
        invoiceDueDay: 10,
        limitAmount: 5000,
        brand: "Visa",
        issuingBank: "Banco Teste",
      },
    });
    expect(createCard.statusCode).toBe(201);

    const loginB = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: emailB, password },
    });
    expect(loginB.statusCode).toBe(200);
    const tokenB = loginB.json().accessToken as string;

    const cardsB = await app.inject({
      method: "GET",
      url: "/cards",
      headers: { authorization: `Bearer ${tokenB}` },
    });
    expect(cardsB.statusCode).toBe(200);
    const list = cardsB.json() as { name: string }[];
    expect(list.some((c) => c.name === cardNameA)).toBe(false);
  });
});
