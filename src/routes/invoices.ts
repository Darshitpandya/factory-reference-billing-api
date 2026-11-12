import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { listInvoices } from "../db/queries.js";
import { requireTenantAuth } from "../auth/verify-jwt.js";
import type { Invoice } from "../db/schema.js";

const ListInvoicesQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(["draft", "issued", "paid", "overdue", "cancelled"]).optional(),
});

export async function invoicesRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /v1/invoices
   *
   * STABLE CONTRACT — do not add required parameters.
   * This is the baseline against which the trusted verifier checks compatibility.
   * All parameters are OPTIONAL to preserve backward compatibility.
   */
  app.get(
    "/v1/invoices",
    { preHandler: [requireTenantAuth] },
    async (request, reply) => {
      const query = ListInvoicesQuery.safeParse(request.query);
      if (!query.success) {
        return reply.status(400).send({ error: "Invalid query", details: query.error.format() });
      }

      const pool = app.pg.pool;
      const result = await listInvoices(pool, {
        tenantId: request.tenant.tenantId, // ← always from JWT, never from query
        page: query.data.page,
        pageSize: query.data.pageSize,
        status: query.data.status,
      });

      return reply.send({
        invoices: result.invoices.map(formatInvoice),
        total: result.total,
        page: query.data.page,
        pageSize: query.data.pageSize,
      });
    }
  );
}

function formatInvoice(inv: Invoice): Record<string, unknown> {
  return {
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    customerId: inv.customerId,
    amountCents: inv.amountCents,
    currency: inv.currency,
    status: inv.status,
    issuedAt: inv.issuedAt?.toISOString() ?? null,
    dueDate: inv.dueDate?.toISOString() ?? null,
    paidAt: inv.paidAt?.toISOString() ?? null,
  };
}
