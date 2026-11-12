import { describe, it, expect } from "vitest";
import { invoicesToCsv, buildExportFilename } from "../src/services/invoice-export.js";
import type { Invoice } from "../src/db/schema.js";

const makeInvoice = (overrides: Partial<Invoice> = {}): Invoice => ({
  id: "inv-001",
  tenantId: "tenant-a",
  invoiceNumber: "INV-001",
  customerId: "cust-001",
  amountCents: 10000,
  currency: "USD",
  status: "paid",
  issuedAt: new Date("2026-01-01"),
  dueDate: new Date("2026-01-31"),
  paidAt: new Date("2026-01-15"),
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-15"),
  ...overrides,
});

describe("invoicesToCsv", () => {
  it("produces headers and one data row", () => {
    const csv = invoicesToCsv([makeInvoice()]);
    const lines = csv.split("\r\n");
    expect(lines[0]).toContain("invoice_id");
    expect(lines[0]).toContain("invoice_number");
    expect(lines[1]).toContain("INV-001");
    expect(lines[1]).toContain("USD");
  });

  it("escapes formula injection — cells starting with =", () => {
    const csv = invoicesToCsv([makeInvoice({ invoiceNumber: "=SUM(A1:A100)" })]);
    // The = should be prefixed with a tab to prevent formula injection
    expect(csv).not.toContain('"=SUM');
    expect(csv).toContain("\t=SUM");
  });

  it("escapes formula injection — cells starting with +", () => {
    const csv = invoicesToCsv([makeInvoice({ customerId: "+cmd|' /C calc'!A0" })]);
    expect(csv).toContain("\t+cmd");
  });

  it("escapes formula injection — cells starting with @", () => {
    const csv = invoicesToCsv([makeInvoice({ invoiceNumber: "@SUM(1+1)*cmd" })]);
    expect(csv).toContain("\t@SUM");
  });

  it("wraps cells with commas in double quotes", () => {
    const csv = invoicesToCsv([makeInvoice({ invoiceNumber: "INV,001" })]);
    expect(csv).toContain('"INV,001"');
  });

  it("handles empty invoice list", () => {
    const csv = invoicesToCsv([]);
    const lines = csv.split("\r\n").filter(Boolean);
    expect(lines).toHaveLength(1); // headers only
  });

  it("produces correct number of rows", () => {
    const invoices = Array.from({ length: 100 }, (_, i) =>
      makeInvoice({ id: `inv-${i}`, invoiceNumber: `INV-${String(i).padStart(3, "0")}` })
    );
    const csv = invoicesToCsv(invoices);
    const lines = csv.split("\r\n").filter(Boolean);
    expect(lines).toHaveLength(101); // 1 header + 100 data rows
  });
});

describe("buildExportFilename", () => {
  it("produces a date-based filename without tenant ID", () => {
    const filename = buildExportFilename("tenant-a");
    expect(filename).toMatch(/^invoices-export-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(filename).not.toContain("tenant-a");
  });
});
