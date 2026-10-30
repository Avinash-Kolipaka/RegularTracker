const API_BASE = ((import.meta as any).env?.VITE_API_BASE as string) || '/api/v1';

class ApiClient {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor() {
    this.accessToken = localStorage.getItem('regulatrack_access_token');
    this.refreshToken = localStorage.getItem('regulatrack_refresh_token');
  }

  setTokens(access: string, refresh: string) {
    this.accessToken = access;
    this.refreshToken = refresh;
    localStorage.setItem('regulatrack_access_token', access);
    localStorage.setItem('regulatrack_refresh_token', refresh);
  }

  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    localStorage.removeItem('regulatrack_access_token');
    localStorage.removeItem('regulatrack_refresh_token');
  }

  getAccessToken() {
    return this.accessToken;
  }

  private async refreshAccessToken(): Promise<string | null> {
    if (!this.refreshToken) return null;
    try {
      const res = await fetch(`${API_BASE}/auth/token/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh: this.refreshToken }),
      });
      if (res.ok) {
        const data = await res.json();
        this.accessToken = data.access;
        localStorage.setItem('regulatrack_access_token', data.access);
        return data.access;
      } else {
        this.clearTokens();
        return null;
      }
    } catch {
      this.clearTokens();
      return null;
    }
  }

  async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
    const headers = new Headers(options.headers || {});

    if (this.accessToken && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${this.accessToken}`);
    }

    if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    let response = await fetch(url, { ...options, headers });

    // Handle token expiration & retry once
    if (response.status === 401 && this.refreshToken) {
      const newAccess = await this.refreshAccessToken();
      if (newAccess) {
        headers.set('Authorization', `Bearer ${newAccess}`);
        response = await fetch(url, { ...options, headers });
      }
    }

    if (response.status === 204) {
      return {} as T;
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('text/csv') || contentType.includes('application/octet-stream')) {
      return response.blob() as unknown as T;
    }

    const data = await response.json();
    if (!response.ok) {
      const errorMsg = data.detail || data.error || (typeof data === 'object' ? Object.values(data).flat().join(' ') : 'Request failed');
      throw new Error(errorMsg);
    }

    return data;
  }

  // Auth Endpoints
  async register(payload: any) {
    return this.request('/auth/register/', { method: 'POST', body: JSON.stringify(payload) });
  }

  async login(credentials: { email: string; password: string }) {
    const res = await this.request('/auth/login/', { method: 'POST', body: JSON.stringify(credentials) });
    if (res.access && res.refresh) {
      this.setTokens(res.access, res.refresh);
    }
    return res;
  }

  async getMe() {
    return this.request('/auth/me/');
  }

  async updateMe(payload: any) {
    return this.request('/auth/me/', { method: 'PATCH', body: JSON.stringify(payload) });
  }

  async requestPasswordReset(email: string) {
    return this.request('/auth/password-reset/', { method: 'POST', body: JSON.stringify({ email }) });
  }

  async confirmPasswordReset(payload: { uid: string; token: string; new_password: string }) {
    return this.request('/auth/password-reset/confirm/', { method: 'POST', body: JSON.stringify(payload) });
  }

  // Business Workspaces
  async getBusinesses() {
    return this.request('/businesses/');
  }

  async createBusiness(payload: any) {
    return this.request('/businesses/', { method: 'POST', body: JSON.stringify(payload) });
  }

  async getBusiness(id: string) {
    return this.request(`/businesses/${id}/`);
  }

  async updateBusinessProfile(id: string, payload: any) {
    return this.request(`/businesses/${id}/`, { method: 'PATCH', body: JSON.stringify(payload) });
  }

  async getBusinessMembers(businessId: string) {
    return this.request(`/businesses/${businessId}/members/`);
  }

  async updateMemberRole(businessId: string, memberId: string, role: string) {
    return this.request(`/businesses/${businessId}/members/${memberId}/`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
  }

  async removeMember(businessId: string, memberId: string) {
    return this.request(`/businesses/${businessId}/members/${memberId}/`, { method: 'DELETE' });
  }

  async getWorkspaceInvitations(businessId: string) {
    return this.request(`/businesses/${businessId}/invitations/`);
  }

  async sendWorkspaceInvitation(businessId: string, payload: { email: string; role: string }) {
    return this.request(`/businesses/${businessId}/invitations/`, { method: 'POST', body: JSON.stringify(payload) });
  }

  async acceptWorkspaceInvitation(token: string) {
    return this.request('/businesses/invitations/accept/', { method: 'POST', body: JSON.stringify({ token }) });
  }

  // Regulations & Library
  async getSources() {
    return this.request('/regulations/sources/');
  }

  async getRequirements(params?: { q?: string; jurisdiction?: string; industry?: string; verification_status?: string; source_id?: string }) {
    const query = new URLSearchParams(params as any).toString();
    return this.request(`/regulations/requirements/${query ? `?${query}` : ''}`);
  }

  async getRequirement(id: string) {
    return this.request(`/regulations/requirements/${id}/`);
  }

  async getBusinessRequirements(businessId: string, status?: string) {
    const query = status ? `?status=${status}` : '';
    return this.request(`/regulations/businesses/${businessId}/requirements/${query}`);
  }

  async linkRequirementToBusiness(businessId: string, requirementId: string, status?: string) {
    return this.request(`/regulations/businesses/${businessId}/requirements/`, {
      method: 'POST',
      body: JSON.stringify({ requirement_id: requirementId, status }),
    });
  }

  async evaluateApplicability(businessId: string) {
    return this.request(`/regulations/businesses/${businessId}/evaluate/`, { method: 'POST' });
  }

  async reviewBusinessRequirement(businessId: string, bizReqId: string, payload: { status: string; rationale: string }) {
    return this.request(`/regulations/businesses/${businessId}/requirements/${bizReqId}/review/`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Source Monitoring & Regulatory Updates
  async getMonitoringRuns(sourceId?: string) {
    const query = sourceId ? `?source_id=${sourceId}` : '';
    return this.request(`/monitoring/runs/${query}`);
  }

  async triggerMonitoringRun(sourceId: string) {
    return this.request(`/monitoring/sources/${sourceId}/trigger/`, { method: 'POST' });
  }

  async getRegulatoryChanges(status?: string) {
    const query = status ? `?review_status=${status}` : '';
    return this.request(`/monitoring/changes/${query}`);
  }

  async reviewRegulatoryChange(changeId: string, payload: { decision: 'ACCEPTED' | 'DISMISSED'; notes: string }) {
    return this.request(`/monitoring/changes/${changeId}/review/`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Tasks & Checklists
  async getTasks(businessId: string, params?: { status?: string; priority?: string; assigned_to_me?: boolean; q?: string }) {
    const query = new URLSearchParams(params as any).toString();
    return this.request(`/tasks/businesses/${businessId}/${query ? `?${query}` : ''}`);
  }

  async createTask(businessId: string, payload: any) {
    return this.request(`/tasks/businesses/${businessId}/`, { method: 'POST', body: JSON.stringify(payload) });
  }

  async getTask(businessId: string, taskId: string) {
    return this.request(`/tasks/businesses/${businessId}/${taskId}/`);
  }

  async updateTask(businessId: string, taskId: string, payload: any) {
    return this.request(`/tasks/businesses/${businessId}/${taskId}/`, { method: 'PATCH', body: JSON.stringify(payload) });
  }

  async deleteTask(businessId: string, taskId: string) {
    return this.request(`/tasks/businesses/${businessId}/${taskId}/`, { method: 'DELETE' });
  }

  async addTaskChecklist(businessId: string, taskId: string, title: string) {
    return this.request(`/tasks/businesses/${businessId}/${taskId}/checklists/`, {
      method: 'POST',
      body: JSON.stringify({ title }),
    });
  }

  async toggleTaskChecklist(businessId: string, taskId: string, itemId: string, isCompleted: boolean) {
    return this.request(`/tasks/businesses/${businessId}/${taskId}/checklists/${itemId}/`, {
      method: 'PATCH',
      body: JSON.stringify({ is_completed: isCompleted }),
    });
  }

  async getTaskComments(businessId: string, taskId: string) {
    return this.request(`/tasks/businesses/${businessId}/${taskId}/comments/`);
  }

  async addTaskComment(businessId: string, taskId: string, content: string) {
    return this.request(`/tasks/businesses/${businessId}/${taskId}/comments/`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  }

  // Compliance Deadlines & Calendar
  async getDeadlines(businessId: string, status?: string) {
    const query = status ? `?status=${status}` : '';
    return this.request(`/compliance/businesses/${businessId}/deadlines/${query}`);
  }

  async createDeadline(businessId: string, payload: any) {
    return this.request(`/compliance/businesses/${businessId}/deadlines/`, { method: 'POST', body: JSON.stringify(payload) });
  }

  async updateDeadline(businessId: string, deadlineId: string, payload: any) {
    return this.request(`/compliance/businesses/${businessId}/deadlines/${deadlineId}/`, { method: 'PATCH', body: JSON.stringify(payload) });
  }

  async deleteDeadline(businessId: string, deadlineId: string) {
    return this.request(`/compliance/businesses/${businessId}/deadlines/${deadlineId}/`, { method: 'DELETE' });
  }

  async getCalendarEvents(businessId: string) {
    return this.request(`/compliance/businesses/${businessId}/calendar/`);
  }

  async getDashboardMetrics(businessId: string) {
    return this.request(`/compliance/businesses/${businessId}/dashboard/`);
  }

  async getRenewals(businessId: string) {
    return this.request(`/compliance/businesses/${businessId}/renewals/`);
  }

  async createRenewal(businessId: string, payload: any) {
    return this.request(`/compliance/businesses/${businessId}/renewals/`, { method: 'POST', body: JSON.stringify(payload) });
  }

  async getInspections(businessId: string) {
    return this.request(`/compliance/businesses/${businessId}/inspections/`);
  }

  async createInspection(businessId: string, payload: any) {
    return this.request(`/compliance/businesses/${businessId}/inspections/`, { method: 'POST', body: JSON.stringify(payload) });
  }

  // Documents
  async getDocuments(businessId: string, params?: { category?: string; q?: string }) {
    const query = new URLSearchParams(params as any).toString();
    return this.request(`/documents/businesses/${businessId}/${query ? `?${query}` : ''}`);
  }

  async uploadDocument(businessId: string, formData: FormData) {
    return this.request(`/documents/businesses/${businessId}/`, {
      method: 'POST',
      body: formData,
    });
  }

  async getDocument(businessId: string, docId: string) {
    return this.request(`/documents/businesses/${businessId}/${docId}/`);
  }

  async updateDocument(businessId: string, docId: string, payload: any) {
    return this.request(`/documents/businesses/${businessId}/${docId}/`, { method: 'PATCH', body: JSON.stringify(payload) });
  }

  async archiveDocument(businessId: string, docId: string) {
    return this.request(`/documents/businesses/${businessId}/${docId}/`, { method: 'DELETE' });
  }

  getDocumentDownloadUrl(businessId: string, docId: string) {
    return `${API_BASE}/documents/businesses/${businessId}/${docId}/download/`;
  }

  // Notifications
  async getNotifications() {
    return this.request('/notifications/');
  }

  async markNotificationRead(id?: string, markAll: boolean = false) {
    return this.request('/notifications/', {
      method: 'PATCH',
      body: JSON.stringify({ notification_id: id, mark_all: markAll }),
    });
  }

  async getNotificationPreferences() {
    return this.request('/notifications/preferences/');
  }

  async updateNotificationPreferences(payload: any) {
    return this.request('/notifications/preferences/', { method: 'PATCH', body: JSON.stringify(payload) });
  }

  // Audit Logs
  async getAuditEvents(businessId: string, params?: { action?: string; q?: string }) {
    const query = new URLSearchParams(params as any).toString();
    return this.request(`/audit/businesses/${businessId}/${query ? `?${query}` : ''}`);
  }

  // Reports
  getReportExportUrl(businessId: string, reportType: string, format: 'CSV' | 'JSON' = 'CSV') {
    return `${API_BASE}/reports/businesses/${businessId}/export/?type=${reportType}&format=${format}`;
  }

  async exportReportJson(businessId: string, reportType: string) {
    return this.request(`/reports/businesses/${businessId}/export/?type=${reportType}&format=JSON`);
  }
}

export const api = new ApiClient();
