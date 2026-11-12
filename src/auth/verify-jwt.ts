import type { FastifyRequest, FastifyReply } from "fastify";

export interface TenantClaims {
  tenantId: string;
  userId: string;
  email: string;
  roles: string[];
}

declare module "fastify" {
  interface FastifyRequest {
    tenant: TenantClaims;
  }
}

/**
 * Pre-handler hook that validates the JWT and extracts tenant claims.
 * Tenant identity comes ONLY from validated JWT claims — never from
 * query parameters, request headers, or request body.
 */
export async function requireTenantAuth(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    // @fastify/jwt populates request.user after verifying the token
    await request.jwtVerify();
    const payload = request.user as Record<string, unknown>;

    const tenantId = payload["tenantId"] as string | undefined;
    const userId = payload["sub"] as string | undefined;
    const email = payload["email"] as string | undefined;
    const roles = (payload["roles"] as string[] | undefined) ?? [];

    if (!tenantId || !userId) {
      return reply.status(401).send({
        error: "Unauthorized",
        message: "JWT missing tenantId or sub claim",
      });
    }

    request.tenant = { tenantId, userId, email: email ?? "", roles };
  } catch {
    return reply.status(401).send({
      error: "Unauthorized",
      message: "Invalid or expired JWT",
    });
  }
}
