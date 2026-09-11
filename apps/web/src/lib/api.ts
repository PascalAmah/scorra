import {
  AgreementMetrics,
  AuthResponse,
  AuthTokenPayload,
  ComparisonVerdict,
  DashboardSummary,
  Dataset,
  DatasetRow,
  DatasetVersion,
  DatasetVersionDiff,
  Evaluation,
  EvaluationTask,
  EvaluatorMetrics,
  Export,
  Invitation,
  InviteMemberRequest,
  ModelResponse,
  NextComparison,
  NextEvaluationItem,
  NextRanking,
  Organization,
  RankingResultItem,
  OrganizationMember,
  OrgUser,
  PaginatedResponse,
  PairwiseComparison,
  ScoringCriteria,
  TaskProgress,
  TaskScoreAnalytics,
  User,
} from '@scorra/types';

import { useAuthStore } from '@/store/auth-store';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

// Guard against concurrent refresh attempts — a single in-flight promise is
// shared so multiple 401s racing each other only trigger one refresh call.
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const { refreshToken, setSession, clearSession } = useAuthStore.getState();
      if (!refreshToken) {
        clearSession();
        return null;
      }

      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
        cache: 'no-store',
      });

      if (!res.ok) {
        clearSession();
        return null;
      }

      const data = await res.json();
      // The refresh endpoint returns { accessToken, refreshToken } without a
      // user — merge over the existing session so `user` is not clobbered with
      // undefined (which would log the user out on the next page load).
      const prev = useAuthStore.getState();
      setSession({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        user: data.user ?? prev.user,
      });
      return data.accessToken as string;
    } catch {
      useAuthStore.getState().clearSession();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

async function request<T>(path: string, options: RequestInit = {}, _retry = true): Promise<T> {
  const { accessToken, clearSession } = useAuthStore.getState();
  const headers: Record<string, string> = {};

  if (options.body) {
    headers['Content-Type'] = 'application/json';
  }

  if (options.headers) {
    Object.assign(headers, options.headers as Record<string, string>);
  }

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const url = `${API_URL}${path}`;
  const controller = new AbortController();
  const timeoutMs = 30000;
  const id = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(url, { ...options, headers, cache: 'no-store', signal: controller.signal });
  } finally {
    clearTimeout(id);
  }

  if (res.status === 204) return undefined as T;

  if (res.status === 401) {
    // Only attempt refresh in the browser — during SSR there is no token so a
    // 401 is expected and we must not wipe the client's persisted session.
    if (typeof window !== 'undefined' && _retry) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        // Replay the original request with the fresh access token.
        return request<T>(path, options, false);
      }
    } else if (typeof window !== 'undefined') {
      clearSession();
    }
    throw new Error('Unauthorized');
  }

  // Parse the response body — some endpoints (e.g. 201 created) may return
  // an empty body or a non-JSON payload, so we guard against parse failures.
  if (res.headers.get('content-length') === '0') {
    return undefined as T;
  }

  let body: unknown;
  const contentType = res.headers.get('content-type');
  if (contentType?.includes('application/json')) {
    try {
      body = await res.json();
    } catch {
      throw new Error(`Request failed: ${res.status} (invalid JSON response)`);
    }
  } else {
    // Non-JSON response — return the raw text for debugging.
    body = await res.text();
  }

  if (!res.ok) {
    const errBody = body as Record<string, unknown> | string;
    let message: string;
    if (typeof errBody === 'object' && errBody !== null) {
      const obj = errBody as Record<string, unknown>;
      message =
        (obj.error && typeof obj.error === 'object' && 'message' in obj.error
          ? String((obj.error as Record<string, unknown>).message)
          : undefined) ||
        (typeof obj.message === 'string' ? obj.message : undefined) ||
        `Request failed: ${res.status}`;
    } else if (typeof errBody === 'string') {
      message = errBody;
    } else {
      message = `Request failed: ${res.status}`;
    }
    throw new Error(message);
  }

  return body as T;
}

export const api = {
  get isAuthenticated() {
    return useAuthStore.getState().accessToken !== null;
  },

  // ── Auth ────────────────────────────────────────────────
  async login(email: string, password: string) {
    return request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  async register(data: { email: string; password: string; name: string; organizationName?: string }) {
    return request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async me() {
    return request<AuthTokenPayload>('/auth/me');
  },

  async switchOrg(orgId: string) {
    return request<AuthResponse>(`/auth/switch-org/${orgId}`, { method: 'POST' });
  },

  async logout(refreshToken?: string) {
    const token = refreshToken ?? useAuthStore.getState().refreshToken ?? undefined;
    await request<void>('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: token }),
    });
    useAuthStore.getState().clearSession();
  },

  async forgotPassword(email: string) {
    return request<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async resetPassword(token: string, newPassword: string) {
    return request<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    });
  },

  // ── Organizations ─────────────────────────────────
  async getOrganizations() {
    return request<Organization[]>('/organizations');
  },

  async getOrganization(id: string) {
    return request<Organization>(`/organizations/${id}`);
  },

  async updateOrganization(id: string, data: Record<string, unknown>) {
    return request<Organization>(`/organizations/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
  },

  async getMembers(orgId: string) {
    return request<OrganizationMember[]>(`/organizations/${orgId}/members`);
  },

  async inviteMember(orgId: string, data: InviteMemberRequest) {
    return request<Invitation>(`/organizations/${orgId}/invitations`, { method: 'POST', body: JSON.stringify(data) });
  },

  async getInvitations(orgId: string) {
    return request<Invitation[]>(`/organizations/${orgId}/invitations`);
  },

  async resendInvitation(orgId: string, invitationId: string) {
    return request<Invitation>(`/organizations/${orgId}/invitations/${invitationId}/resend`, { method: 'POST' });
  },

  async revokeInvitation(orgId: string, invitationId: string) {
    return request<void>(`/organizations/${orgId}/invitations/${invitationId}`, { method: 'DELETE' });
  },

  async getInvitation(token: string) {
    return request<{
      token: string;
      email: string;
      role: string;
      expiresAt: string;
      organizationId: string;
      organizationName: string;
      invitedByName: string;
    }>(`/organizations/invitations/${token}`);
  },

  async acceptInvitation(token: string) {
    return request<{ message: string; organizationId: string }>(
      `/organizations/invitations/${token}/accept`,
      { method: 'POST' },
    );
  },

  async removeMember(orgId: string, userId: string) {
    return request<void>(`/organizations/${orgId}/members/${userId}`, { method: 'DELETE' });
  },

  async changeMemberRole(orgId: string, userId: string, data: { role: string }) {
    return request<void>(`/organizations/${orgId}/members/${userId}`, { method: 'PATCH', body: JSON.stringify(data) });
  },

  // ── Users ─────────────────────────────────────────
  async getUserProfile() {
    return request<User>('/users/me');
  },

  async updateProfile(data: { name?: string; avatarUrl?: string }) {
    return request<User>('/users/me', { method: 'PATCH', body: JSON.stringify(data) });
  },

  async changePassword(data: { currentPassword: string; newPassword: string }) {
    return request<{ message: string }>('/auth/change-password', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  // ── Datasets ────────────────────────────────────────────
  async getDatasets(params?: { page?: number; limit?: number; search?: string }) {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.search) query.set('search', params.search);
    const qs = query.toString();
    return request<PaginatedResponse<Dataset>>(`/datasets${qs ? `?${qs}` : ''}`);
  },

  async getDataset(id: string) {
    return request<Dataset>(`/datasets/${id}`);
  },

  async createDataset(data: { name: string; format: string; description?: string; tags?: string[] }) {
    return request<Dataset>('/datasets', { method: 'POST', body: JSON.stringify(data) });
  },

  async uploadDatasetFile(id: string, file: File) {
    const { accessToken } = useAuthStore.getState();
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${API_URL}/datasets/${id}/upload`, {
      method: 'POST',
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
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
    return request<PaginatedResponse<DatasetRow>>(`/datasets/${id}/rows${qs ? `?${qs}` : ''}`);
  },

  async getDatasetRow(id: string, rowId: string) {
    return request<DatasetRow & { modelResponses: ModelResponse[] }>(
      `/datasets/${id}/rows/${rowId}`,
    );
  },

  async updateDataset(id: string, data: { name?: string; description?: string; tags?: string[] }) {
    return request<Dataset>(`/datasets/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  },

  async cloneDataset(id: string, name?: string) {
    return request<Dataset>(`/datasets/${id}/clone`, { method: 'POST', body: JSON.stringify({ name }) });
  },

  async archiveDataset(id: string) {
    return request<void>(`/datasets/${id}/archive`, { method: 'PATCH' });
  },

  async getDatasetVersions(id: string) {
    return request<DatasetVersion[]>(`/datasets/${id}/versions`);
  },

  async getDatasetVersionDiff(id: string, baseVersion: number, currentVersion: number) {
    return request<DatasetVersionDiff>(
      `/datasets/${id}/versions/diff?baseVersion=${baseVersion}&currentVersion=${currentVersion}`,
    );
  },

  async deleteDataset(id: string) {
    return request<void>(`/datasets/${id}`, { method: 'DELETE' });
  },

  async generateDatasetResponses(id: string) {
    return request<{ message: string; pending?: number; provider?: string; model?: string }>(
      `/datasets/${id}/generate-responses`,
      { method: 'POST' },
    );
  },

  // ── Exports ────────────────────────────────────────
  async getExports() {
    return request<Export[]>('/exports');
  },

  async requestExport(data: { taskId: string; format: string; filters?: Record<string, unknown> }) {
    return request<Export>('/exports', { method: 'POST', body: JSON.stringify(data) });
  },

  async downloadExport(id: string, filename?: string): Promise<void> {
    const { accessToken } = useAuthStore.getState();
    const res = await fetch(`${API_URL}/exports/${id}/download`, {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error?.message || `Download failed: ${res.status}`);
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename ?? 'export';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  },

  // ── Users (for assignments) ────────────────────────
  async getUsers() {
    return request<OrgUser[]>('/users');
  },

  // ── Evaluation Tasks ───────────────────────────────
  async getTasks(params?: { page?: number; limit?: number; search?: string }) {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.search) query.set('search', params.search);
    const qs = query.toString();
    return request<PaginatedResponse<EvaluationTask>>(`/evaluations/tasks${qs ? `?${qs}` : ''}`);
  },

  async getTask(taskId: string) {
    return request<EvaluationTask>(`/evaluations/tasks/${taskId}`);
  },

  async createTask(data: {
    datasetId: string;
    name: string;
    description?: string;
    type?: string;
    scoringCriteria?: ScoringCriteria[];
    evaluatorIds?: string[];
    dueDate?: string;
  }) {
    return request<EvaluationTask>('/evaluations/tasks', { method: 'POST', body: JSON.stringify(data) });
  },

  async activateTask(taskId: string) {
    return request<void>(`/evaluations/tasks/${taskId}/activate`, { method: 'PATCH' });
  },

  async pauseTask(taskId: string) {
    return request<void>(`/evaluations/tasks/${taskId}/pause`, { method: 'PATCH' });
  },

  async updateTask(taskId: string, data: { name?: string; description?: string; dueDate?: string }) {
    return request<EvaluationTask>(`/evaluations/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async getTaskProgress(taskId: string) {
    return request<TaskProgress>(`/evaluations/tasks/${taskId}/progress`);
  },

  // ── Evaluation workflow ────────────────────────────
  async getNextEvalItem(taskId: string) {
    return request<NextEvaluationItem>(`/evaluations/tasks/${taskId}/next`);
  },

  async submitEvaluation(data: {
    taskId: string;
    datasetRowId: string;
    scores: Array<{
      dimension: string;
      label: string;
      score: number;
      confidence?: number;
      note?: string;
    }>;
    overallScore?: number;
    comment?: string;
    tags?: string[];
    timeSpentSeconds?: number;
  }) {
    return request<void>('/evaluations/submit', { method: 'POST', body: JSON.stringify(data) });
  },

  async requestAISuggestions(evaluationId: string) {
    return request<void>(`/evaluations/${evaluationId}/ai-suggestions`, { method: 'POST' });
  },

  async getTaskResults(taskId: string, params?: { page?: number; limit?: number }) {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    const qs = query.toString();
    return request<PaginatedResponse<Evaluation>>(
      `/evaluations/tasks/${taskId}/results${qs ? `?${qs}` : ''}`,
    );
  },

  async getMyEvaluations(params?: { page?: number; limit?: number }) {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    const qs = query.toString();
    return request<PaginatedResponse<Evaluation>>(
      `/evaluations/my-evaluations${qs ? `?${qs}` : ''}`,
    );
  },

  // ── Comparisons (PAIRWISE) ─────────────────────────
  async getNextComparison(taskId: string) {
    return request<NextComparison>(`/comparisons/${taskId}/next`);
  },

  async submitComparison(data: {
    taskId: string;
    datasetRowId: string;
    responseAId: string;
    responseBId: string;
    verdict: ComparisonVerdict;
    confidenceScore?: number;
    reasoning?: string;
    dimensionVerdicts?: Array<{ dimension: string; verdict: string; note?: string }>;
    timeSpentSeconds?: number;
  }) {
    return request<void>('/comparisons', { method: 'POST', body: JSON.stringify(data) });
  },

  async getComparisonResults(taskId: string) {
    return request<PairwiseComparison[]>(`/comparisons/${taskId}/comparisons`);
  },

  async getRankingResults(taskId: string) {
    return request<RankingResultItem[]>(`/rankings/${taskId}/rankings`);
  },

  // ── Rankings (RANKING) ─────────────────────────────
  async getNextRanking(taskId: string) {
    return request<NextRanking>(`/rankings/${taskId}/next`);
  },
  async submitRanking(data: {
    taskId: string;
    datasetRowId: string;
    entries: Array<{ responseId: string; rank: number; score?: number }>;
    comment?: string;
  }) {
    return request<void>('/rankings', { method: 'POST', body: JSON.stringify(data) });
  },

  // ── Analytics ─────────────────────────────────────────
  async getAnalyticsDashboard() {
    return request<DashboardSummary>('/analytics/dashboard');
  },

  async getTaskAgreement(taskId: string) {
    return request<AgreementMetrics>(`/analytics/tasks/${taskId}/agreement`);
  },

  async getTaskScores(taskId: string) {
    return request<TaskScoreAnalytics>(`/analytics/tasks/${taskId}/scores`);
  },

  async getEvaluatorMetrics() {
    return request<EvaluatorMetrics[]>('/analytics/evaluators');
  },
};
