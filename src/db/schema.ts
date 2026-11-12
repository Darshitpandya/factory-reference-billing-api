export interface Invoice {
  id: string;
  tenantId: string;      // Partition key — all queries MUST filter by this
  invoiceNumber: string;
  customerId: string;
  amountCents: number;
  currency: string;
  status: "draft" | "issued" | "paid" | "overdue" | "cancelled";
  issuedAt: Date | null;
  dueDate: Date | null;
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
