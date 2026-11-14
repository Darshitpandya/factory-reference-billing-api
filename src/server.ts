import Fastify from "fastify";
import fastifyJwt from "@fastify/jwt";
import { Pool } from "pg";
import { invoicesRoutes } from "./routes/invoices.js";
import { exportRoutes } from "./routes/export.js";
import { healthRoutes } from "./observability/health.js";

const app = Fastify({ logger: true });

// JWT — tenant identity source of truth
app.register(fastifyJwt, {
  secret: process.env["JWT_SECRET"] ?? "REPLACE_WITH_REAL_SECRET_MIN_256_BITS",
  sign: { algorithm: "HS256" },
});

// PostgreSQL — added as a decorator (avoids @fastify/postgres version issues)
const pool = new Pool({
  connectionString: process.env["DATABASE_URL"] ?? "",
  ssl: (process.env["DATABASE_URL"] ?? "").includes(".railway.") ? { rejectUnauthorized: false } : false,
});
app.decorate("pg", { pool });

// Routes
app.register(invoicesRoutes);
app.register(exportRoutes);
app.register(healthRoutes);

// Start
const port = parseInt(process.env["PORT"] ?? process.env["BILLING_PORT"] ?? "3000");
const host = process.env["HOST"] ?? "0.0.0.0";

app.listen({ port, host }, (err) => {
  if (err) { app.log.error(err); process.exit(1); }
  app.log.info(`Billing API listening on ${host}:${port}`);
});

export default app;
