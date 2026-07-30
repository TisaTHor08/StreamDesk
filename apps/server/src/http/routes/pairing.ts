import { networkInterfaces } from "node:os";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { Runtime } from "../../core/runtime.js";
import { createPairingService } from "../../security/pairing-service.js";

const bodySchema = z.object({
  role: z.enum(["interface", "connect"]),
  label: z.string().optional(),
  ttlMinutes: z.number().int().positive().max(60 * 24).default(30),
});

/**
 * Issues a short-lived pairing token an operator can embed in a QR code /
 * pairing URL for a new device. V1 does not yet enforce this token on
 * registration by default (documented in docs/architecture/security.md);
 * it is provided so the enforced flow can be turned on without a protocol
 * change.
 */
export async function registerPairingRoutes(app: FastifyInstance, runtime: Runtime): Promise<void> {
  const pairing = createPairingService(runtime.repos.pairing);

  app.post("/api/pairing-tokens", async (request, reply) => {
    const parsed = bodySchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "VALIDATION_FAILED", details: parsed.error.flatten() });

    const token = pairing.issuePairingToken(parsed.data.role, parsed.data.label, parsed.data.ttlMinutes);
    return reply.code(201).send({ token, expiresInMinutes: parsed.data.ttlMinutes });
  });

  /**
   * The Server's own LAN-reachable IPv4 addresses. The Admin "Vue
   * d'ensemble" page uses this to build the pairing URL/QR code instead of
   * `window.location.origin` — an operator opening the admin panel via
   * `localhost` would otherwise generate a QR code pointing at
   * `localhost`, which means nothing to a phone or tablet on the same
   * network. Loopback/internal interfaces are deliberately excluded.
   */
  app.get("/api/network/lan-addresses", async (_request, reply) => {
    const addresses: string[] = [];
    for (const ifaces of Object.values(networkInterfaces())) {
      for (const iface of ifaces ?? []) {
        if (iface.family === "IPv4" && !iface.internal) addresses.push(iface.address);
      }
    }
    return reply.send({ addresses });
  });
}
