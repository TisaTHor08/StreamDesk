import type {
  ActionDefinition,
  ConnectRecord,
  DataSourceDefinition,
  DeckPage,
  EventDefinition,
  InterfaceRecord,
} from "@streamdesk/shared-types";
import type { InstalledPlugin } from "@streamdesk/plugin-manifest";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...init?.headers },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed with status ${response.status}`);
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export const api = {
  listPages: () => request<DeckPage[]>("/pages"),
  getPage: (id: string) => request<DeckPage>(`/pages/${id}`),
  createPage: (body: unknown) => request<DeckPage>("/pages", { method: "POST", body: JSON.stringify(body) }),
  updatePage: (id: string, body: unknown) =>
    request<DeckPage>(`/pages/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deletePage: (id: string) => request<void>(`/pages/${id}`, { method: "DELETE" }),

  listPlugins: () => request<InstalledPlugin[]>("/plugins"),
  setPluginEnabled: (id: string, enabled: boolean) =>
    request(`/plugins/${id}/state`, { method: "POST", body: JSON.stringify({ enabled }) }),

  listActions: () => request<ActionDefinition[]>("/actions"),
  listEvents: () => request<EventDefinition[]>("/events"),
  listDataSources: () => request<DataSourceDefinition[]>("/data-sources"),

  listInterfaces: () => request<(InterfaceRecord & { online: boolean })[]>("/interfaces"),
  revokeInterface: (id: string) => request<void>(`/interfaces/${id}/revoke`, { method: "POST" }),

  listConnects: () => request<(ConnectRecord & { online: boolean })[]>("/connects"),
  revokeConnect: (id: string) => request<void>(`/connects/${id}/revoke`, { method: "POST" }),

  lanAddresses: () => request<{ addresses: string[] }>("/network/lan-addresses"),
};
