import type { Invoice } from "../db/schema.js";

/**
 * Convert invoices to CSV format.
 * Implements formula injection prevention: cells starting with =, +, -, @ are prefixed with a tab.
 * This prevents CSV formula injection in spreadsheet applications.
 */
export function invoicesToCsv(invoices: Invoice[]): string {
  const headers = [
    "invoice_id",
    "invoice_number",
    "customer_id",
    "amount_cents",
    "currency",
    "status",
    "issued_at",
    "due_date",
  ];

  const rows = invoices.map((inv) => [
    escapeCsvCell(inv.id),
    escapeCsvCell(inv.invoiceNumber),
    escapeCsvCell(inv.customerId),
    escapeCsvCell(inv.amountCents.toString()),
    escapeCsvCell(inv.currency),
    escapeCsvCell(inv.status),
    escapeCsvCell(inv.issuedAt?.toISOString() ?? ""),
    escapeCsvCell(inv.dueDate?.toISOString() ?? ""),
  ]);

  const lines = [headers.join(","), ...rows.map((r) => r.join(","))];
  return lines.join("\r\n");
}

/**
 * Escape a CSV cell value:
 * 1. Prevent formula injection (prefix dangerous starters with \t)
 * 2. Wrap in double quotes and escape embedded quotes
 */
function escapeCsvCell(value: string): string {
  // Formula injection prevention
  const dangerous = /^[=+\-@\t\r]/;
  let safe = value;
  if (dangerous.test(safe)) {
    safe = `\t${safe}`;
  }

  // Quote wrapping if necessary
  if (safe.includes(",") || safe.includes('"') || safe.includes("\n") || safe.includes("\r")) {
    safe = `"${safe.replace(/"/g, '""')}"`;
  }

  return safe;
}

export function buildExportFilename(tenantId: string): string {
  const date = new Date().toISOString().slice(0, 10);
  // tenantId is not included in the filename to avoid info leakage
  return `invoices-export-${date}.csv`;
}
