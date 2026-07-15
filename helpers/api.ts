// helpers/api.ts

// In-memory request deduplication — same URL within 300ms = same promise
const inflight = new Map<string, Promise<unknown>>();

export async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const isGet = !options?.method || options.method === "GET";

  if (isGet) {
    const existing = inflight.get(url);
    if (existing) return existing as Promise<T>;
  }

  const promise = fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
    // Next.js 15+ fetch cache — revalidate every 30s for GET
    ...(isGet ? { next: { revalidate: 30 } } : { cache: "no-store" }),
  }).then(async (res) => {
    const text = await res.text();
    let data;
    try { data = text ? JSON.parse(text) : {}; } 
    catch { data = { error: text }; }
    
    if (!res.ok) throw new Error(data.error || "Request gagal");
    return data as T;
  });

  if (isGet) {
    inflight.set(url, promise);
    // Clear after 300ms so rapid duplicate calls share the promise
    promise.finally(() => setTimeout(() => inflight.delete(url), 300));
  }

  return promise;
}

export const api = {
  get:    <T>(url: string)              => apiFetch<T>(url),
  post:   <T>(url: string, body: unknown) => apiFetch<T>(url, { method: "POST",   body: JSON.stringify(body) }),
  put:    <T>(url: string, body: unknown) => apiFetch<T>(url, { method: "PUT",    body: JSON.stringify(body) }),
  delete: <T>(url: string, body?: unknown) => apiFetch<T>(url, { method: "DELETE", ...(body ? { body: JSON.stringify(body) } : {}) }),
};