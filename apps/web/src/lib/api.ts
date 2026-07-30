import { AuthTokenPayload, AuthResponse } from '@scorra/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
const TOKEN_KEY = 'scorra_token';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(TOKEN_KEY, token);
  }
}

function clearToken() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_KEY);
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {};

  if (options.body) {
    headers['Content-Type'] = 'application/json';
  }

  if (options.headers) {
    Object.assign(headers, options.headers as Record<string, string>);
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_URL}${path}`;
  const res = await fetch(url, { ...options, headers });

  if (res.status === 401) {
    clearToken();
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error?.message || `Request failed: ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  get isAuthenticated() {
    return getToken() !== null;
  },

  // ── Auth ────────────────────────────────────────────────
  async login(email: string, password: string) {
    const res = await request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setToken(res.accessToken);
    return res;
  },

  async register(data: { email: string; password: string; name: string; organizationName?: string }) {
    const res = await request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    setToken(res.accessToken);
    return res;
  },

  async me() {
    return request<AuthTokenPayload>('/auth/me');
  },

  async logout(refreshToken?: string) {
    await request<void>('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
    clearToken();
  },

  // ── Organizations ─────────────────────────────────
  async getOrganizations() {
    return request<unknown[]>('/organizations');
  },

  async getOrganization(id: string) {
    return request<unknown>(`/organizations/${id}`);
  },

  async updateOrganization(id: string, data: Record<string, unknown>) {
    return request<unknown>(`/organizations/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
  },

  async getMembers(orgId: string) {
    return request<unknown[]>(`/organizations/${orgId}/members`);
  },

  async inviteMember(orgId: string, data: { email: string; role: string }) {
    return request<unknown>(`/organizations/${orgId}/invitations`, { method: 'POST', body: JSON.stringify(data) });
  },

  async removeMember(orgId: string, userId: string) {
    return request<unknown>(`/organizations/${orgId}/members/${userId}`, { method: 'DELETE' });
  },

  async changeMemberRole(orgId: string, userId: string, data: { role: string }) {
    return request<unknown>(`/organizations/${orgId}/members/${userId}`, { method: 'PATCH', body: JSON.stringify(data) });
  },

  // ── Users ─────────────────────────────────────────
  async getUserProfile() {
    return request<unknown>('/users/me');
  },

  async updateProfile(data: { name?: string; avatarUrl?: string }) {
    return request<unknown>('/users/me', { method: 'PATCH', body: JSON.stringify(data) });
  },

  // ── Datasets ────────────────────────────────────────────
  async getDatasets(params?: { page?: number; limit?: number; search?: string }) {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.search) query.set('search', params.search);
    const qs = query.toString();
    return request<{ data: unknown[]; pagination: unknown }>(`/datasets${qs ? `?${qs}` : ''}`);
  },

  async getDataset(id: string) {
    return request<unknown>(`/datasets/${id}`);
  },

  async createDataset(data: { name: string; format: string; description?: string; tags?: string[] }) {
    return request<unknown>('/datasets', { method: 'POST', body: JSON.stringify(data) });
  },

  async uploadDatasetFile(id: string, file: File) {
    const token = getToken();
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${API_URL}/datasets/${id}/upload`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error?.message || `Upload failed: ${res.status}`);
    }
    return res.json();
  },

  async getDatasetRows(id: string, params?: { page?: number; limit?: number }) {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    const qs = query.toString();
    return request<{ data: unknown[]; pagination: unknown }>(`/datasets/${id}/rows${qs ? `?${qs}` : ''}`);
  },

  async updateDataset(id: string, data: { name?: string; description?: string; tags?: string[] }) {
    return request<unknown>(`/datasets/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  },

  async cloneDataset(id: string, name?: string) {
    return request<unknown>(`/datasets/${id}/clone`, { method: 'POST', body: JSON.stringify({ name }) });
  },

  async archiveDataset(id: string) {
    return request<unknown>(`/datasets/${id}/archive`, { method: 'PATCH' });
  },

  async deleteDataset(id: string) {
    return request<unknown>(`/datasets/${id}`, { method: 'DELETE' });
  },

  // ── Exports ────────────────────────────────────────
  async getExports() {
    return request<unknown[]>('/exports');
  },

  async requestExport(data: { taskId: string; format: string; filters?: Record<string, unknown> }) {
    return request<unknown>('/exports', { method: 'POST', body: JSON.stringify(data) });
  },

  async getExportDownload(id: string) {
    return request<{ downloadUrl: string; format: string }>(`/exports/${id}/download`);
  },
};
