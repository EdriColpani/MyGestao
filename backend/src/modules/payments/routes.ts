import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../plugins/prisma";
import { requireAuth } from "../../middlewares/auth";
import { toMonthStart } from "../../shared/date";

export const paymentsRoutes = async (app: FastifyInstance): Promise<void> => {
  app.post("/payments/invoices/process", { preHandler: requireAuth }, async (request, reply) => {
    const bodySchema = z.object({
      cardId: z.string().uuid(),
      referenceMonth: z.string().regex(/^\d{4}-\d{2}$/),
      paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      installmentIds: z.array(z.string().uuid()).min(1),
    });
    const body = bodySchema.parse(request.body);

    const referenceMonth = toMonthStart(body.referenceMonth);

    const result = await prisma.$queryRaw<{ payment_id: string }[]>`
      SELECT fn_process_invoice_payment(
        ${request.user.sub}::uuid,
        ${body.cardId}::uuid,
        ${referenceMonth}::date,
        ${new Date(body.paymentDate)}::date,
        ${body.installmentIds}::uuid[]
      ) AS payment_id
    `;

    const paymentId = result[0]?.payment_id;
    if (!paymentId) {
      return reply.status(400).send({ message: "Pagamento nao processado" });
    }

    const payment = await prisma.cardInvoicePayment.findFirst({
      where: { id: paymentId, userId: request.user.sub },
      include: {
        items: true,
      },
    });

    return reply.send(payment);
  });
};
