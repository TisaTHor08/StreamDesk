import type { FastifyInstance } from "fastify";
import type { Runtime } from "../../core/runtime.js";

export async function registerDeviceRoutes(app: FastifyInstance, runtime: Runtime): Promise<void> {
  app.get("/api/interfaces", async () =>
    runtime.repos.interfaces.list().map((iface) => ({
      ...iface,
      online: runtime.connections.listInterfaceIds().includes(iface.interfaceId),
    })),
  );

  app.post<{ Params: { id: string } }>("/api/interfaces/:id/revoke", async (request, reply) => {
    runtime.repos.interfaces.revoke(request.params.id);
    return reply.code(204).send();
  });

  app.get("/api/connects", async () =>
    runtime.repos.connects.list().map((connect) => ({
      ...connect,
      online: runtime.connections.listConnectIds().includes(connect.connectId),
    })),
  );

  app.post<{ Params: { id: string } }>("/api/connects/:id/revoke", async (request, reply) => {
    runtime.repos.connects.revoke(request.params.id);
    return reply.code(204).send();
  });
}
