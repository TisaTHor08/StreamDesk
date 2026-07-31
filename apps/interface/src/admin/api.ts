import type {
  ActionDefinition,
  ConnectRecord,
  DataSourceDefinition,
  DeckPage,
  EventDefinition,
  InteractionVariable,
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

/** Separate from `request()`: a multipart upload must NOT force a JSON
 * content-type header — the browser needs to set its own `boundary`. */
async function uploadFile<T>(path: string, file: File): Promise<T> {
  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch(`/api${path}`, { method: "POST", body: formData });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error ?? `Upload failed with status ${response.status}`);
  }
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

  getSettings: () => request<{ defaultPageSlug: string }>("/settings"),
  updateSettings: (body: { defaultPageSlug: string }) =>
    request<{ defaultPageSlug: string }>("/settings", { method: "PUT", body: JSON.stringify(body) }),

  listVariables: () => request<InteractionVariable[]>("/variables"),
  createVariable: (body: { name: string; initialValue: string | number | boolean }) =>
    request<InteractionVariable>("/variables", { method: "POST", body: JSON.stringify(body) }),
  updateVariable: (id: string, body: { name?: string; initialValue?: string | number | boolean }) =>
    request<InteractionVariable>(`/variables/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  resetVariable: (id: string) => request<InteractionVariable>(`/variables/${id}/reset`, { method: "POST" }),
  deleteVariable: (id: string) => request<void>(`/variables/${id}`, { method: "DELETE" }),

  uploadIcon: (file: File) => uploadFile<{ assetId: string }>("/icons", file),
};
