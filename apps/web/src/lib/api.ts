const API_BASE = '/api/v1';

export async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || `API error ${res.status}`);
  }

  return res.json();
}

export const api = {
  // Database Seeder & Clean Admin Tools
  getDbStatus: () => fetchApi<{ [key: string]: any }>('/Admin/status'),
  seedDb: () => fetchApi<{ message: string; recordCounts: any }>('/Admin/seed', { method: 'POST' }),
  cleanDb: () => fetchApi<{ message: string }>('/Admin/clean', { method: 'POST' }),

  // Organization Management (Reporting Groups & Grades)
  getReportingGroups: () => fetchApi<any[]>('/Organization/groups'),
  createReportingGroup: (data: any) => fetchApi<any>('/Organization/groups', { method: 'POST', body: JSON.stringify(data) }),
  importReportingGroups: (rows: any[]) => fetchApi<any>('/Organization/groups/import', { method: 'POST', body: JSON.stringify(rows) }),
  deleteReportingGroup: (id: string) => fetchApi<any>(`/Organization/groups/${id}`, { method: 'DELETE' }),
  updateReportingGroup: (id: string, data: any) => fetchApi<any>(`/Organization/groups/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  getReportingGroupsSummary: () => fetchApi<any[]>('/Organization/groups/summary'),

  getGradeMappings: () => fetchApi<any[]>('/Organization/grades'),
  createGradeMapping: (data: any) => fetchApi<any>('/Organization/grades', { method: 'POST', body: JSON.stringify(data) }),
  importGradeMappings: (rows: any[]) => fetchApi<any>('/Organization/grades/import', { method: 'POST', body: JSON.stringify(rows) }),
  deleteGradeMapping: (id: string) => fetchApi<any>(`/Organization/grades/${id}`, { method: 'DELETE' }),

  // User Management
  getUsers: (search?: string) =>
    fetchApi<any[]>(`/Users${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  createUser: (data: any) =>
    fetchApi<any>('/Users', { method: 'POST', body: JSON.stringify(data) }),
  toggleUserStatus: (id: string) =>
    fetchApi<any>(`/Users/${id}/toggle-status`, { method: 'POST' }),
  unlockUser: (id: string) =>
    fetchApi<any>(`/Users/${id}/unlock`, { method: 'POST' }),
  resetUserPassword: (id: string) =>
    fetchApi<any>(`/Users/${id}/reset-password`, { method: 'POST' }),

  // Employees
  getEmployees: (params?: { group?: string; grade?: string; search?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return fetchApi<any[]>(`/Employees${query ? `?${query}` : ''}`);
  },
  importEmployees: (rows: any[]) =>
    fetchApi<any>('/Employees/import', { method: 'POST', body: JSON.stringify(rows) }),
  bulkUpdateAppraisers: (mappings: any[], actorSapId: string = 'PMW_ADMIN') =>
    fetchApi<any>('/Employees/bulk-update-appraisers', { method: 'POST', body: JSON.stringify({ mappings, actorSapId }) }),

  // Appraisal Cycles
  getCycles: () => fetchApi<any[]>('/Cycles'),
  createCycle: (data: any) => fetchApi<any>('/Cycles', { method: 'POST', body: JSON.stringify(data) }),
  openCycle: (id: string) => fetchApi<any>(`/Cycles/${id}/open`, { method: 'POST' }),
  suspendCycle: (id: string) => fetchApi<any>(`/Cycles/${id}/suspend`, { method: 'POST' }),
  closeCycle: (id: string) => fetchApi<any>(`/Cycles/${id}/close`, { method: 'POST' }),

  // My Appraisal Form, Objectives & Appraiser Self-Service Updates
  getMyAppraisal: (sapId: string = '84920') => fetchApi<any>(`/Appraisals/my-cycle?sapId=${sapId}`),
  getFormAuditHistory: (employeeCycleId: string) => fetchApi<any[]>(`/Appraisals/${employeeCycleId}/audit-history`),
  requestAppraiserUpdate: (employeeCycleId: string, data: { firstAppraiserSapId: string; secondAppraiserSapId: string; coAppraiserSapId?: string }) =>
    fetchApi<any>(`/Appraisals/${employeeCycleId}/request-appraiser-update`, { method: 'POST', body: JSON.stringify(data) }),
  saveObjectives: (employeeCycleId: string, objectives: any[]) =>
    fetchApi<any>(`/Appraisals/${employeeCycleId}/objectives`, {
      method: 'POST',
      body: JSON.stringify(objectives),
    }),
  submitSelfAssessment: (employeeCycleId: string, sapId: string = '84920') =>
    fetchApi<any>(`/Appraisals/${employeeCycleId}/submit?actorUserId=${sapId}&role=Employee`, { method: 'POST' }),
  recordDisagreement: (employeeCycleId: string, sapId: string, reason: string) =>
    fetchApi<any>(`/Appraisals/${employeeCycleId}/disagree`, {
      method: 'POST',
      body: JSON.stringify({ sapId, reason }),
    }),

  // Appraiser Team Reviews & Mapping Confirmations
  getTeamReviews: (appraiserSapId: string = '10004') =>
    fetchApi<any[]>(`/Appraisers/team-reviews?appraiserSapId=${appraiserSapId}`),
  confirmAppraiserMapping: (employeeCycleId: string, data: { firstAppraiserSapId: string; secondAppraiserSapId: string; actorSapId?: string }) =>
    fetchApi<any>(`/Appraisers/${employeeCycleId}/confirm-appraiser-mapping`, { method: 'POST', body: JSON.stringify(data) }),
  rejectAppraiserMapping: (employeeCycleId: string, data: { rejectionReason: string; actorSapId?: string }) =>
    fetchApi<any>(`/Appraisers/${employeeCycleId}/reject-appraiser-mapping`, { method: 'POST', body: JSON.stringify(data) }),

  // Development Review
  getDevelopmentReview: (employeeCycleId: string) =>
    fetchApi<any>(`/DevelopmentReviews/${employeeCycleId}`),
  saveDevelopmentReview: (data: any) =>
    fetchApi<any>('/DevelopmentReviews', { method: 'POST', body: JSON.stringify(data) }),

  // Bell Curve Calibration
  getBellCurveDistribution: (group: string, grade: string) =>
    fetchApi<any>(`/BellCurve/distribution?group=${encodeURIComponent(group)}&grade=${encodeURIComponent(grade)}`),
  saveBellCurvePolicy: (data: any) =>
    fetchApi<any>('/BellCurve/policy', { method: 'POST', body: JSON.stringify(data) }),
  approveBellCurveException: (data: { group: string; grade: string; rationale: string; actorUserId: string }) =>
    fetchApi<any>('/BellCurve/exceptions', { method: 'POST', body: JSON.stringify(data) }),

  // Disagreements
  getDisagreements: () => fetchApi<any[]>('/Disagreements'),
  resolveDisagreement: (id: string, notes: string, actorUserId: string = 'PMW_ADMIN') =>
    fetchApi<any>(`/Disagreements/${id}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ resolutionNotes: notes, actorUserId }),
    }),

  // Reminders & Notifications
  getReminderPreview: (group?: string, grade?: string) =>
    fetchApi<any[]>(`/Reminders/preview?group=${encodeURIComponent(group || '')}&grade=${encodeURIComponent(grade || '')}`),
  sendReminders: (data: { group: string; grade: string; subject: string; messageBody: string; actorUserId: string }) =>
    fetchApi<any>('/Reminders/send', { method: 'POST', body: JSON.stringify(data) }),

  // Audit Events
  getAuditEvents: (search?: string) =>
    fetchApi<any[]>(`/Audit${search ? `?search=${encodeURIComponent(search)}` : ''}`),
};
