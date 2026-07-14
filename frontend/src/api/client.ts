import { API_BASE } from "@/config";

interface ApiOptions extends RequestInit {
  data?: any;
  params?: Record<string, string>;
}

/**
 * Core API Client
 * Abstracting native fetch to automatically handle JSON, authentication tokens, and error handling.
 */
export const apiClient = async <T = any>(endpoint: string, options: ApiOptions = {}): Promise<T> => {
  const token = localStorage.getItem("token") || sessionStorage.getItem("token"); 
  
  const headers = new Headers(options.headers || {});
  
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (options.data && !headers.has("Content-Type")) {
    if (!(options.data instanceof FormData)) {
      headers.set("Content-Type", "application/json");
      options.body = JSON.stringify(options.data);
    } else {
      options.body = options.data;
    }
  }

  let url = `${API_BASE}${endpoint}`;
  if (options.params) {
    const searchParams = new URLSearchParams(options.params);
    url += `?${searchParams.toString()}`;
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let errorMsg = `API Error: ${res.status} ${res.statusText}`;
    try {
      const errData = await res.json();
      errorMsg = errData.detail || errData.message || JSON.stringify(errData);
    } catch (e) {
      // Not JSON
    }
    const error: any = new Error(errorMsg);
    error.status = res.status;
    error.response = res;
    throw error;
  }

  if (res.status === 204) return null as unknown as T;
  
  try {
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  } catch (err) {
    return null as unknown as T;
  }
};
