import { toast } from "sonner";

type ApiResult<T> = { data: T; error: null } | { data: null; error: string };

async function api<T = unknown>(
  url: string,
  options?: RequestInit,
): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });

    if (res.status === 401) {
      toast.error("登录已过期，请重新登录");
      window.location.href = "/login";
      return { data: null, error: "Unauthorized" };
    }

    const json = await res.json();

    if (!res.ok) {
      const errMsg = json?.error || `请求失败 (${res.status})`;
      return { data: null, error: errMsg };
    }

    return { data: json as T, error: null };
  } catch (err) {
    console.error("API request failed:", err instanceof Error ? err.message : err);
    return { data: null, error: "网络连接失败，请检查网络后重试" };
  }
}

export function apiGet<T = unknown>(url: string): Promise<ApiResult<T>> {
  return api<T>(url);
}

export function apiPost<T = unknown>(
  url: string,
  body: unknown,
): Promise<ApiResult<T>> {
  return api<T>(url, { method: "POST", body: JSON.stringify(body) });
}

export function apiPut<T = unknown>(
  url: string,
  body: unknown,
): Promise<ApiResult<T>> {
  return api<T>(url, { method: "PUT", body: JSON.stringify(body) });
}

export function apiDelete<T = unknown>(
  url: string,
  body?: unknown,
): Promise<ApiResult<T>> {
  return api<T>(url, {
    method: "DELETE",
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}
