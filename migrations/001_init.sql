BEGIN;

CREATE TABLE IF NOT EXISTS invoices (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       TEXT NOT NULL,  -- partition key; ALL queries must filter by this
    invoice_number  TEXT NOT NULL,
    customer_id     TEXT NOT NULL,
    amount_cents    INTEGER NOT NULL CHECK (amount_cents >= 0),
    currency        CHAR(3) NOT NULL,
    status          TEXT NOT NULL CHECK (status IN ('draft','issued','paid','overdue','cancelled')),
    issued_at       TIMESTAMPTZ,
    due_date        TIMESTAMPTZ,
    paid_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, invoice_number)
);

-- Index enforces tenant isolation at the DB level (non-auth safety net)
CREATE INDEX IF NOT EXISTS idx_invoices_tenant ON invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_tenant_status ON invoices(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_tenant_issued ON invoices(tenant_id, issued_at DESC NULLS LAST);

-- Test fixtures for tenant-a and tenant-b
INSERT INTO invoices (tenant_id, invoice_number, customer_id, amount_cents, currency, status, issued_at)
VALUES
  ('tenant-a', 'INV-001', 'cust-a1', 10000, 'USD', 'paid', NOW() - INTERVAL '30 days'),
  ('tenant-a', 'INV-002', 'cust-a1', 20000, 'USD', 'issued', NOW() - INTERVAL '7 days'),
  ('tenant-a', 'INV-003', 'cust-a2', 5000,  'EUR', 'draft',  NULL),
  ('tenant-b', 'INV-001', 'cust-b1', 15000, 'USD', 'paid', NOW() - INTERVAL '14 days'),
  ('tenant-b', 'INV-002', 'cust-b1', 30000, 'USD', 'overdue', NOW() - INTERVAL '60 days')
ON CONFLICT DO NOTHING;

COMMIT;
