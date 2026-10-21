const API_BASE = import.meta.env.VITE_API_URL || '/api';

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

export async function apiRequest<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { params, ...customConfig } = options;

  let url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  if (params) {
    const searchParams = new URLSearchParams();
    for (const [key, val] of Object.entries(params)) {
      if (val !== undefined && val !== null) {
        searchParams.append(key, String(val));
      }
    }
    const queryStr = searchParams.toString();
    if (queryStr) {
      url += `?${queryStr}`;
    }
  }

  const token = localStorage.getItem('routine_token');

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(customConfig.headers || {}),
  };

  const config: RequestInit = {
    ...customConfig,
    headers,
    credentials: 'include', // sends cookies
  };

  const response = await fetch(url, config);

  if (response.status === 204) {
    return {} as T;
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.message || `Request failed with status ${response.status}`;
    const error: any = new Error(errorMsg);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data as T;
}

export const api = {
  get: <T = any>(endpoint: string, params?: Record<string, any>) =>
    apiRequest<T>(endpoint, { method: 'GET', params }),
  post: <T = any>(endpoint: string, body?: any) =>
    apiRequest<T>(endpoint, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: <T = any>(endpoint: string, body?: any) =>
    apiRequest<T>(endpoint, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  patch: <T = any>(endpoint: string, body?: any) =>
    apiRequest<T>(endpoint, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: <T = any>(endpoint: string) =>
    apiRequest<T>(endpoint, { method: 'DELETE' }),
};

export default api;
