// lib/apiClient.ts
// Central API client for all frontend API calls

function getApiBaseUrl(): string {
  const base = process.env.NEXT_PUBLIC_API_URL;
  if (!base) {
    throw new Error("NEXT_PUBLIC_API_URL is not set");
  }
  return base;
}

export async function apiFetch(path: string, options: RequestInit = {}): Promise<any> {
  const base = getApiBaseUrl();
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const fullUrl = `${base}${path}`;

  const res = await fetch(fullUrl, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    ...options,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message = data.error || data.message || "Request failed";
    throw new Error(message);
  }

  return data;
}

export { getApiBaseUrl };

