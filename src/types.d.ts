import type { Pool } from "pg";
import "@fastify/jwt";

declare module "fastify" {
  interface FastifyInstance {
    pg: { pool: Pool };
  }
}
