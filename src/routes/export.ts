import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { getInvoicesForExport, EXPORT_MAX_ROWS } from "../db/queries.js";
import { invoicesToCsv, buildExportFilename } from "../services/invoice-export.js";
import { requireTenantAuth } from "../auth/verify-jwt.js";
import type { Pool } from "pg";

const ExportQuery = z.object({
  limit: z.coerce.number().int().min(1).max(EXPORT_MAX_ROWS).default(EXPORT_MAX_ROWS),
  status: z.enum(["draft", "issued", "paid", "overdue", "cancelled"]).optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
});

export async function exportRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /v1/invoices/export
   *
   * NEW endpoint — returns tenant-scoped invoices as CSV.
   * Does NOT modify GET /v1/invoices (backward compatible addition).
   * Tenant identity comes from JWT only.
   */
  app.get(
    "/v1/invoices/export",
    { preHandler: [requireTenantAuth] },
    async (request, reply) => {
      const query = ExportQuery.safeParse(request.query);
      if (!query.success) {
        return reply.status(400).send({ error: "Invalid query", details: query.error.format() });
      }

      const pool: Pool = app.pg.pool;
      const invoices = await getInvoicesForExport(pool, {
        tenantId: request.tenant.tenantId, // ← always from JWT
        limit: query.data.limit,
        status: query.data.status,
        fromDate: query.data.fromDate,
        toDate: query.data.toDate,
      });

      const csv = invoicesToCsv(invoices);
      const filename = buildExportFilename(request.tenant.tenantId);

      // Log audit event (without raw data)
      app.log.info({
        event: "invoice_export",
        tenantId: request.tenant.tenantId,
        userId: request.tenant.userId,
        count: invoices.length,
        filename,
        // Do NOT log raw invoice data
      });

      return reply
        .status(200)
        .header("Content-Type", "text/csv; charset=utf-8")
        .header("Content-Disposition", `attachment; filename="${filename}"`)
        .header("X-Export-Count", invoices.length.toString())
        .send(csv);
    }
  );
}
