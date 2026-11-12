import type { Pool } from "pg";
import type { Invoice } from "./schema.js";

/**
 * EVERY query here MUST include tenantId in the WHERE clause.
 * Cross-tenant data access is forbidden and will be caught by test/tenant-isolation.test.ts.
 */

export interface ListInvoicesOpts {
  tenantId: string;
  page?: number;
  pageSize?: number;
  status?: string;
}

export async function listInvoices(
  pool: Pool,
  opts: ListInvoicesOpts
): Promise<{ invoices: Invoice[]; total: number }> {
  const { tenantId, page = 1, pageSize = 20, status } = opts;
  const offset = (page - 1) * pageSize;

  const whereClause = status
    ? "WHERE tenant_id = $1 AND status = $2"
    : "WHERE tenant_id = $1";
  const params: unknown[] = status ? [tenantId, status] : [tenantId];

  const countRes = await pool.query(
    `SELECT COUNT(*)::int AS total FROM invoices ${whereClause}`,
    params
  );

  const rows = await pool.query(
    `SELECT id, tenant_id, invoice_number, customer_id, amount_cents, currency,
            status, issued_at, due_date, paid_at, created_at, updated_at
     FROM invoices
     ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, pageSize, offset]
  );

  return {
    invoices: rows.rows.map(rowToInvoice),
    total: countRes.rows[0]?.total ?? 0,
  };
}

export interface ExportInvoicesOpts {
  tenantId: string;
  limit?: number;  // Max 10,000 per the acceptance criteria
  status?: string;
  fromDate?: string;
  toDate?: string;
}

export const EXPORT_MAX_ROWS = 10_000;

export async function getInvoicesForExport(
  pool: Pool,
  opts: ExportInvoicesOpts
): Promise<Invoice[]> {
  const { tenantId, limit = EXPORT_MAX_ROWS, status, fromDate, toDate } = opts;
  const safeLimit = Math.min(limit, EXPORT_MAX_ROWS);

  const conditions = ["tenant_id = $1"];
  const params: unknown[] = [tenantId];

  if (status) {
    params.push(status);
    conditions.push(`status = $${params.length}`);
  }
  if (fromDate) {
    params.push(fromDate);
    conditions.push(`issued_at >= $${params.length}`);
  }
  if (toDate) {
    params.push(toDate);
    conditions.push(`issued_at <= $${params.length}`);
  }

  params.push(safeLimit);
  const rows = await pool.query(
    `SELECT id, tenant_id, invoice_number, customer_id, amount_cents, currency,
            status, issued_at, due_date, paid_at, created_at, updated_at
     FROM invoices
     WHERE ${conditions.join(" AND ")}
     ORDER BY issued_at DESC NULLS LAST
     LIMIT $${params.length}`,
    params
  );

  return rows.rows.map(rowToInvoice);
}

function rowToInvoice(row: Record<string, unknown>): Invoice {
  return {
    id: row["id"] as string,
    tenantId: row["tenant_id"] as string,
    invoiceNumber: row["invoice_number"] as string,
    customerId: row["customer_id"] as string,
    amountCents: row["amount_cents"] as number,
    currency: row["currency"] as string,
    status: row["status"] as Invoice["status"],
    issuedAt: row["issued_at"] as Date | null,
    dueDate: row["due_date"] as Date | null,
    paidAt: row["paid_at"] as Date | null,
    createdAt: row["created_at"] as Date,
    updatedAt: row["updated_at"] as Date,
  };
}
