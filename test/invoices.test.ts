import { describe, it, expect } from "vitest";
import Fastify from "fastify";
import fastifyJwt from "@fastify/jwt";
import { invoicesRoutes } from "../src/routes/invoices.js";
import type { Pool } from "pg";

// Unit-level tests with mocked DB — no live database required
describe("GET /v1/invoices", () => {
  it("returns 401 without a JWT", async () => {
    const app = Fastify();
    app.register(fastifyJwt, { secret: "test-secret" });

    // Mock pg plugin using type escape hatch for unit tests
    app.decorate("pg", {
      pool: {
        query: async () => ({ rows: [], rowCount: 0, command: "SELECT", oid: 0, fields: [] }),
      } as unknown as Pool,
    } as never);

    app.register(invoicesRoutes);
    await app.ready();

    const res = await app.inject({
      method: "GET",
      url: "/v1/invoices",
    });

    expect(res.statusCode).toBe(401);
    await app.close();
  });

  it("accepts optional pagination parameters", async () => {
    const app = Fastify();
    app.register(fastifyJwt, { secret: "test-secret" });

    app.decorate("pg", {
      pool: {
        query: async (sql: string) => {
          if (sql.includes("COUNT")) return { rows: [{ total: 0 }], rowCount: 1, command: "SELECT", oid: 0, fields: [] };
          return { rows: [], rowCount: 0, command: "SELECT", oid: 0, fields: [] };
        },
      } as unknown as Pool,
    } as never);

    app.register(invoicesRoutes);
    await app.ready();

    const token = app.jwt.sign({ sub: "user-1", tenantId: "tenant-unit-test", email: "u@test.com", roles: [] });

    const res = await app.inject({
      method: "GET",
      url: "/v1/invoices?page=2&pageSize=10",
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as { page: number; pageSize: number; total: number };
    expect(body.page).toBe(2);
    expect(body.pageSize).toBe(10);
    await app.close();
  });

  it("rejects invalid status value", async () => {
    const app = Fastify();
    app.register(fastifyJwt, { secret: "test-secret" });
    app.decorate("pg", { pool: { query: async () => ({ rows: [], command: "SELECT", rowCount: 0, oid: 0, fields: [] }) } as never } as never);
    app.register(invoicesRoutes);
    await app.ready();

    const token = app.jwt.sign({ sub: "user-1", tenantId: "t", email: "u@test.com", roles: [] });
    const res = await app.inject({
      method: "GET",
      url: "/v1/invoices?status=invalid_status",
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(400);
    await app.close();
  });
});
