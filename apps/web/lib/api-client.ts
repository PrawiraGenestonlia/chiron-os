const BASE = "";

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(error.error ?? "Request failed");
  }

  return res.json();
}

export const api = {
  teams: {
    list: () => fetchJSON("/api/teams"),
    get: (id: string) => fetchJSON(`/api/teams/${id}`),
    create: (data: { name: string; goal?: string }) =>
      fetchJSON("/api/teams", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) =>
      fetchJSON(`/api/teams/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  },
  personas: {
    list: () => fetchJSON("/api/personas"),
    get: (id: string) => fetchJSON(`/api/personas/${id}`),
    create: (data: Record<string, unknown>) =>
      fetchJSON("/api/personas", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) =>
      fetchJSON(`/api/personas/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: string) =>
      fetchJSON(`/api/personas/${id}`, { method: "DELETE" }),
  },
  config: {
    get: () => fetchJSON("/api/config"),
    update: (data: Record<string, unknown>) =>
      fetchJSON("/api/config", { method: "PUT", body: JSON.stringify(data) }),
  },
};
