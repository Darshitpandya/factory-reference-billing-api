import type { FastifyInstance } from "fastify";

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get("/health", async (_, reply) => {
    let dbOk = false;
    try {
      await app.pg.pool.query("SELECT 1");
      dbOk = true;
    } catch {}

    const status = dbOk ? "ok" : "degraded";
    return reply
      .status(dbOk ? 200 : 503)
      .send({ status, db: dbOk ? "ok" : "error", version: "1.0.0" });
  });
}
