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
  // Database Seeder & Clean Admin Tools (Exclusively for PMW Super Admin)
  getDbStatus: () => fetchApi<{ [key: string]: any }>('/Admin/status'),
  seedDb: (role = 'PmwSuperAdmin') => fetchApi<{ message: string; recordCounts: any }>(`/Admin/seed?role=${encodeURIComponent(role)}`, { method: 'POST' }),
  cleanDb: (role = 'PmwSuperAdmin') => fetchApi<{ message: string }>(`/Admin/clean?role=${encodeURIComponent(role)}`, { method: 'POST' }),
  seedEntity: (entityKey: string, role = 'PmwSuperAdmin') => fetchApi<{ message: string; affectedCount: number }>(`/Admin/entities/${entityKey}/seed?role=${encodeURIComponent(role)}`, { method: 'POST' }),
  cleanEntity: (entityKey: string, role = 'PmwSuperAdmin') => fetchApi<{ message: string; affectedCount: number }>(`/Admin/entities/${entityKey}/clean?role=${encodeURIComponent(role)}`, { method: 'POST' }),
  migrateSchema: (role = 'PmwSuperAdmin') => fetchApi<{ message: string }>(`/Admin/schema/migrate?role=${encodeURIComponent(role)}`, { method: 'POST' }),

  // Organization Management (Reporting Groups & Grades)
  getReportingGroups: () => fetchApi<any[]>('/Organization/groups'),
  createReportingGroup: (data: any) => fetchApi<any>('/Organization/groups', { method: 'POST', body: JSON.stringify(data) }),
  importReportingGroups: (rows: any[]) => fetchApi<any>('/Organization/groups/import', { method: 'POST', body: JSON.stringify(rows) }),
  deleteReportingGroup: (id: string) => fetchApi<any>(`/Organization/groups/${id}`, { method: 'DELETE' }),
  updateReportingGroup: (id: string, data: any) => fetchApi<any>(`/Organization/groups/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  getReportingGroupsSummary: () => fetchApi<any[]>('/Organization/groups/summary'),

  getGradeMappings: () => fetchApi<any[]>('/Organization/grades'),
  createGradeMapping: (data: any) => fetchApi<any>('/Organization/grades', { method: 'POST', body: JSON.stringify(data) }),
  updateGradeMapping: (id: string, data: any) => fetchApi<any>(`/Organization/grades/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  importGradeMappings: (rows: any[]) => fetchApi<any>('/Organization/grades/import', { method: 'POST', body: JSON.stringify(rows) }),
  deleteGradeMapping: (id: string) => fetchApi<any>(`/Organization/grades/${id}`, { method: 'DELETE' }),

  // Auth
  login: (username: string, password: string) => 
    fetchApi<any>('/Auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  getMe: () => fetchApi<any>('/Auth/me'),
  changePassword: (currentPassword: string, newPassword: string) =>
    fetchApi<any>('/Auth/change-password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) }),
  forgotPassword: (emailOrSapId: string) =>
    fetchApi<any>('/Auth/forgot-password', { method: 'POST', body: JSON.stringify({ emailOrSapId }) }),
  resetPassword: (token: string, newPassword: string) =>
    fetchApi<any>('/Auth/reset-password', { method: 'POST', body: JSON.stringify({ token, newPassword }) }),
  getAvailableRoles: () => fetchApi<any[]>('/Users/roles'),

  // User Management
  getUsers: (search?: string) =>
    fetchApi<any[]>(`/Users${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  updateUser: (id: string, data: any) => fetchApi<any>(`/Users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
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
  searchEmployees: (query: string) => fetchApi<any[]>(`/Employees/search?query=${encodeURIComponent(query)}`),
  getEmployeeBySap: async (sapId: string): Promise<any> => {
    try {
      const res = await fetchApi<any[]>(`/Employees/search?query=${encodeURIComponent(sapId)}`);
      return Array.isArray(res) && res.length > 0 ? res[0] : null;
    } catch {
      return null;
    }
  },
  getEmployeeById: (id: string) => fetchApi<any>(`/Employees/${id}`),
  createEmployee: (data: any) =>
    fetchApi<any>('/Employees', { method: 'POST', body: JSON.stringify(data) }),
  updateEmployee: (id: string, data: any) =>
    fetchApi<any>(`/Employees/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteEmployee: (id: string, actorUserId: string = 'PMW_ADMIN') =>
    fetchApi<any>(`/Employees/${id}?actorUserId=${encodeURIComponent(actorUserId)}`, { method: 'DELETE' }),
  importEmployees: (rows: any[], cycleId?: string, actorUserId: string = 'PMW_SUPER_ADMIN', role: string = 'PmwSuperAdmin') =>
    fetchApi<any>(`/Employees/import?role=${encodeURIComponent(role)}&actorUserId=${encodeURIComponent(actorUserId)}${cycleId ? `&cycleId=${encodeURIComponent(cycleId)}` : ''}`, { method: 'POST', body: JSON.stringify(rows) }),
  bulkUpdateAppraisers: (mappings: any[], actorSapId: string = 'PMW_ADMIN') =>
    fetchApi<any>('/Employees/bulk-update-appraisers', { method: 'POST', body: JSON.stringify({ mappings, actorSapId }) }),

  // Appraisal Cycles & Snapshots
  getCycles: () => fetchApi<any[]>('/Cycles'),
  getCycleById: (id: string) => fetchApi<any>(`/Cycles/${id}`),
  getCycleStats: (id: string) => fetchApi<any>(`/Cycles/${id}/stats`),
  createCycle: (data: any) => fetchApi<any>('/Cycles', { method: 'POST', body: JSON.stringify(data) }),
  openCycle: (id: string, actorUserId?: string) =>
    fetchApi<any>(`/Cycles/${id}/open${actorUserId ? `?actorUserId=${encodeURIComponent(actorUserId)}` : ''}`, { method: 'POST' }),
  suspendCycle: (id: string, actorUserId?: string) =>
    fetchApi<any>(`/Cycles/${id}/suspend${actorUserId ? `?actorUserId=${encodeURIComponent(actorUserId)}` : ''}`, { method: 'POST' }),
  closeCycle: (id: string, actorUserId?: string) =>
    fetchApi<any>(`/Cycles/${id}/close${actorUserId ? `?actorUserId=${encodeURIComponent(actorUserId)}` : ''}`, { method: 'POST' }),
  
  // Cycle Snapshots (Groups, Grades & Employees)
  snapshotCycleOrg: (cycleId: string, actorUserId: string = 'PMW_ADMIN') =>
    fetchApi<any>(`/Cycles/${cycleId}/snapshot/organization?actorUserId=${encodeURIComponent(actorUserId)}`, { method: 'POST' }),
  snapshotCycleSelectiveOrg: (cycleId: string, data: { rpsaCodes?: string[]; esgCodes?: string[]; snapshotAllGroups?: boolean; snapshotAllGrades?: boolean; actorUserId?: string }) =>
    fetchApi<any>(`/Cycles/${cycleId}/snapshot/selective-org`, { method: 'POST', body: JSON.stringify(data) }),
  snapshotCycleEmployees: (cycleId: string, data: { rpsaCode?: string; actorUserId?: string }) =>
    fetchApi<any>(`/Cycles/${cycleId}/snapshot/employees`, { method: 'POST', body: JSON.stringify(data) }),
  getCycleSnapshotSummary: (cycleId: string) => fetchApi<any>(`/Cycles/${cycleId}/snapshot/summary`),
  getCycleSnapshotGroups: (cycleId: string) => fetchApi<any[]>(`/Cycles/${cycleId}/snapshot/groups`),
  createCycleSnapshotGroup: (cycleId: string, data: any) =>
    fetchApi<any>(`/Cycles/${cycleId}/snapshot/groups`, { method: 'POST', body: JSON.stringify(data) }),
  updateCycleSnapshotGroup: (cycleId: string, groupId: string, data: any) =>
    fetchApi<any>(`/Cycles/${cycleId}/snapshot/groups/${groupId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCycleSnapshotGroup: (cycleId: string, groupId: string, actorUserId: string = 'PMW_ADMIN') =>
    fetchApi<any>(`/Cycles/${cycleId}/snapshot/groups/${groupId}?actorUserId=${encodeURIComponent(actorUserId)}`, { method: 'DELETE' }),

  getCycleSnapshotGrades: (cycleId: string) => fetchApi<any[]>(`/Cycles/${cycleId}/snapshot/grades`),
  createCycleSnapshotGrade: (cycleId: string, data: any) =>
    fetchApi<any>(`/Cycles/${cycleId}/snapshot/grades`, { method: 'POST', body: JSON.stringify(data) }),
  updateCycleSnapshotGrade: (cycleId: string, gradeId: string, data: any) =>
    fetchApi<any>(`/Cycles/${cycleId}/snapshot/grades/${gradeId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCycleSnapshotGrade: (cycleId: string, gradeId: string, actorUserId: string = 'PMW_ADMIN') =>
    fetchApi<any>(`/Cycles/${cycleId}/snapshot/grades/${gradeId}?actorUserId=${encodeURIComponent(actorUserId)}`, { method: 'DELETE' }),

  snapshotCycleMultiGroupEmployees: (cycleId: string, data: { rpsaCodes: string[]; actorUserId?: string }) =>
    fetchApi<any>(`/Cycles/${cycleId}/snapshot/employees-multi-group`, { method: 'POST', body: JSON.stringify(data) }),

  // Cycle Employee Roster & Multi-Select Bulk Operations
  getCycleEmployees: (cycleId: string, params?: { group?: string; grade?: string; search?: string; formType?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return fetchApi<any[]>(`/Cycles/${cycleId}/employees${query ? `?${query}` : ''}`);
  },
  enrollCycleEmployees: (cycleId: string, data: any) =>
    fetchApi<any>(`/Cycles/${cycleId}/employees/enroll`, { method: 'POST', body: JSON.stringify(data) }),
  updateCycleEmployeeSnapshot: (cycleId: string, employeeCycleId: string, data: any) =>
    fetchApi<any>(`/Cycles/${cycleId}/employees/${employeeCycleId}`, { method: 'PUT', body: JSON.stringify(data) }),
  removeCycleEmployee: (cycleId: string, employeeCycleId: string, actorUserId?: string) =>
    fetchApi<any>(`/Cycles/${cycleId}/employees/${employeeCycleId}${actorUserId ? `?actorUserId=${encodeURIComponent(actorUserId)}` : ''}`, { method: 'DELETE' }),
  bulkUnassignCycleEmployees: (cycleId: string, data: { employeeCycleIds?: string[]; rpsaCode?: string; esgCode?: string; formType?: string; searchTerm?: string; actorUserId?: string }) =>
    fetchApi<any>(`/Cycles/${cycleId}/employees/bulk-unassign`, { method: 'POST', body: JSON.stringify(data) }),
  bulkOverrideCycleFormType: (cycleId: string, data: { employeeCycleIds: string[]; formType: string; actorUserId?: string }) =>
    fetchApi<any>(`/Cycles/${cycleId}/employees/bulk-override-form-type`, { method: 'POST', body: JSON.stringify(data) }),
  bulkAssignCycleAppraisers: (cycleId: string, data: { employeeCycleIds: string[]; firstAppraiserSapId?: string; secondAppraiserSapId?: string; coAppraiserSapId?: string; actorUserId?: string }) =>
    fetchApi<any>(`/Cycles/${cycleId}/employees/bulk-assign-appraisers`, { method: 'POST', body: JSON.stringify(data) }),

  resetAppraisals: (clearObjectives: boolean = false) =>
    fetchApi<any>(`/Admin/reset-appraisals?clearObjectives=${clearObjectives}`, { method: 'POST' }),

  // My Appraisal Form, Objectives & Appraiser Self-Service Updates
  getMyCycles: (sapId: string = '84920') => fetchApi<any[]>(`/Appraisals/my-cycles?sapId=${encodeURIComponent(sapId)}`),
  getMyAppraisal: (sapId: string = '84920', cycleId?: string, employeeCycleId?: string) => {
    const params = new URLSearchParams({ sapId });
    if (cycleId) params.append('cycleId', cycleId);
    if (employeeCycleId) params.append('employeeCycleId', employeeCycleId);
    return fetchApi<any>(`/Appraisals/my-cycle?${params.toString()}`);
  },
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
  testAppraisalNotification: (employeeCycleId: string, stage: string = 'SelfAssessment', recipientEmail?: string) =>
    fetchApi<any>(`/Appraisals/${employeeCycleId}/test-notification?stage=${encodeURIComponent(stage)}${recipientEmail ? `&recipientEmail=${encodeURIComponent(recipientEmail)}` : ''}`, { method: 'POST' }),
  getAppraisalHistory: (sapId: string = '84920') => fetchApi<any[]>(`/Appraisals/history?sapId=${encodeURIComponent(sapId)}`),
  agreeAppraisal: (employeeCycleId: string, actorUserId: string = '84920') =>
    fetchApi<any>(`/Appraisals/${employeeCycleId}/agree?actorUserId=${encodeURIComponent(actorUserId)}`, { method: 'POST' }),
  recordDisagreement: (
    employeeCycleId: string,
    sapId: string,
    reason: string,
    attachment?: {
      fileName?: string;
      fileData?: string;
      fileSize?: number;
      fileType?: string;
    }
  ) =>
    fetchApi<any>(`/Appraisals/${employeeCycleId}/disagree`, {
      method: 'POST',
      body: JSON.stringify({
        sapId,
        reason,
        attachmentFileName: attachment?.fileName,
        attachmentFileData: attachment?.fileData,
        attachmentFileSizeBytes: attachment?.fileSize,
        attachmentFileType: attachment?.fileType,
      }),
    }),
  resolveAppraisalDisagreement: (employeeCycleId: string, data: { actorUserId: string; resolutionNotes: string }) =>
    fetchApi<any>(`/Appraisals/${employeeCycleId}/resolve-disagreement`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Appraiser Team Reviews & Mapping Confirmations
  getTeamReviews: (appraiserSapId: string = '10004') =>
    fetchApi<any[]>(`/Appraisers/team-reviews?appraiserSapId=${appraiserSapId}`),
  confirmAppraiserMapping: (employeeCycleId: string, data: { firstAppraiserSapId: string; secondAppraiserSapId: string; coAppraiserSapId?: string | null; actorSapId?: string }) =>
    fetchApi<any>(`/Appraisers/${employeeCycleId}/confirm-appraiser-mapping`, { method: 'POST', body: JSON.stringify(data) }),
  rejectAppraiserMapping: (employeeCycleId: string, data: { rejectionReason: string; actorSapId?: string }) =>
    fetchApi<any>(`/Appraisers/${employeeCycleId}/reject-appraiser-mapping`, { method: 'POST', body: JSON.stringify(data) }),
  unlockAppraiserLine: (employeeCycleId: string, actorSapId: string = 'admin') =>
    fetchApi<any>(`/Appraisers/${employeeCycleId}/unlock-appraiser-line`, { method: 'POST', body: JSON.stringify({ actorSapId }) }),
  resetAppraiserLine: (employeeCycleId: string, actorSapId: string = 'admin') =>
    fetchApi<any>(`/Appraisers/${employeeCycleId}/reset-appraiser-line`, { method: 'POST', body: JSON.stringify({ actorSapId }) }),
  evaluateAppraisal: (employeeCycleId: string, data: any) =>
    fetchApi<any>(`/Appraisers/${employeeCycleId}/evaluate`, { method: 'POST', body: JSON.stringify(data) }),
  bulkAcceptSecondAppraiser: (employeeCycleIds: string[], actorSapId: string = '10004') =>
    fetchApi<any>('/Appraisers/bulk-accept-second-appraiser', { method: 'POST', body: JSON.stringify({ employeeCycleIds, actorSapId }) }),

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
  getDisagreementAttachment: (id: string) => fetchApi<any>(`/Disagreements/${id}/attachment`),
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
  nudgeSupervisor: (data: {
    supervisorSapId: string;
    supervisorEmail?: string;
    supervisorName?: string;
    subject: string;
    messageBody: string;
    actorUserId?: string;
    groupCode?: string;
  }) => fetchApi<{ success: boolean; message: string; recipientEmail?: string; recipientName?: string }>('/Reminders/nudge-supervisor', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  nudgeSupervisorsBulk: (data: {
    supervisorSapIds: string[];
    subject: string;
    messageBody: string;
    actorUserId?: string;
    groupCode?: string;
  }) => fetchApi<{ success: boolean; message: string; count: number }>('/Reminders/nudge-supervisors-bulk', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // Audit Events
  getAuditEvents: (search?: string) =>
    fetchApi<any[]>(`/Audit${search ? `?search=${encodeURIComponent(search)}` : ''}`),

  // Email & Exchange Server Configuration
  getEmailConfig: () => fetchApi<any>('/EmailConfig'),
  saveEmailConfig: (data: any) =>
    fetchApi<any>('/EmailConfig', { method: 'POST', body: JSON.stringify(data) }),
  testEmailConfig: (data: any) =>
    fetchApi<any>('/EmailConfig/test', { method: 'POST', body: JSON.stringify(data) }),

  // Workflow Management Console & PMW Stage Override Mechanisms
  getWorkflowDashboard: (cycleId?: string, reportingGroup?: string) => {
    const params = new URLSearchParams();
    if (cycleId) params.append('cycleId', cycleId);
    if (reportingGroup) params.append('reportingGroup', reportingGroup);
    const qs = params.toString();
    return fetchApi<any>(`/Admin/workflow-dashboard${qs ? `?${qs}` : ''}`);
  },
  forceTransition: (employeeCycleId: string, data: { targetStatus: string; justification: string; actorSapId?: string }) =>
    fetchApi<any>(`/Admin/force-transition/${employeeCycleId}`, { method: 'POST', body: JSON.stringify(data) }),
  setWorkflowStage: (data: { employeeCycleId?: string; sapId?: string; cycleId?: string; targetStatus: string | number; justification: string; actorSapId?: string; resetObjectives?: boolean; resetRatings?: boolean }) =>
    fetchApi<any>('/Admin/set-workflow-stage', { method: 'POST', body: JSON.stringify(data) }),
  bulkSetWorkflowStage: (data: { employeeCycleIds?: string[]; sapIds?: string[]; targetStatus: string | number; justification: string; actorSapId?: string }) =>
    fetchApi<any>('/Admin/bulk-set-workflow-stage', { method: 'POST', body: JSON.stringify(data) }),
  getWorkflowAudit: (statusFilter?: string, limit?: number) =>
    fetchApi<any[]>(`/Admin/workflow-audit?${statusFilter ? `statusFilter=${encodeURIComponent(statusFilter)}&` : ''}limit=${limit || 200}`),
  getWorkflowNotifications: () =>
    fetchApi<any[]>('/Admin/workflow-notifications'),
  saveWorkflowNotifications: (configs: any[]) =>
    fetchApi<any>('/Admin/workflow-notifications', { method: 'POST', body: JSON.stringify(configs) }),
  testWorkflowNotification: (data: { transitionKey: string; recipientEmail: string; recipientName?: string }) =>
    fetchApi<any>('/Admin/workflow-notifications/test', { method: 'POST', body: JSON.stringify(data) }),
  getWorkflowNotificationLogs: (limit: number = 50) =>
    fetchApi<any[]>(`/Admin/workflow-notifications/logs?limit=${limit}`),
};

