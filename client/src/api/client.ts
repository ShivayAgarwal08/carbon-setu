import axios from 'axios';
import {
  User,
  UserProfile,
  GovernmentRecord,
  IntakeSession,
  AdminStats,
  SavedRecordItem,
  FeedbackReport,
} from '../types';

function resolveApiBase(): string {
  const envUrl = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '').trim();
  if (!envUrl) {
    return '/api';
  }
  const cleanUrl = envUrl.replace(/\/+$/, '');
  return cleanUrl.endsWith('/api') ? cleanUrl : `${cleanUrl}/api`;
}

const API_BASE = resolveApiBase();

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Set Authorization header from localStorage token if available
const storedToken = localStorage.getItem('cs_token');
if (storedToken) {
  api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
}

export function setAuthToken(token: string | null) {
  if (token) {
    localStorage.setItem('cs_token', token);
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    localStorage.removeItem('cs_token');
    delete api.defaults.headers.common['Authorization'];
  }
}

// ── Auth API ──
export const authApi = {
  login: async (email: string, password: string) => {
    const res = await api.post<{ success: boolean; data: { user: User; token: string } }>('/auth/login', {
      email,
      password,
    });
    if (res.data.data?.token) {
      setAuthToken(res.data.data.token);
    }
    return res.data;
  },

  register: async (name: string, email: string, password: string, preferredLang: 'en' | 'hi' = 'en') => {
    const res = await api.post<{ success: boolean; data: { user: User; token: string } }>('/auth/register', {
      name,
      email,
      password,
      preferredLang,
    });
    if (res.data.data?.token) {
      setAuthToken(res.data.data.token);
    }
    return res.data;
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      setAuthToken(null);
    }
  },

  getMe: async () => {
    const res = await api.get<{ success: boolean; data: User }>('/auth/me');
    return res.data;
  },
};

// ── Records API ──
export interface RecordSearchParams {
  q?: string;
  category?: string;
  recordType?: string;
  state?: string;
  beneficiary?: string;
  sort?: 'relevance' | 'recent' | 'verified';
  page?: number;
  limit?: number;
}

export const recordsApi = {
  search: async (params: RecordSearchParams = {}) => {
    const res = await api.get<{
      success: boolean;
      data: GovernmentRecord[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>('/records', { params });
    return res.data;
  },

  getCategories: async () => {
    const res = await api.get<{
      success: boolean;
      data: Array<{ category: string; count: number }>;
    }>('/records/categories');
    return res.data;
  },

  getBySlug: async (slug: string) => {
    const res = await api.get<{ success: boolean; data: GovernmentRecord & { isSaved?: boolean } }>(
      `/records/${slug}`
    );
    return res.data;
  },
};

// ── Intake & AI Assistant API ──
export const intakeApi = {
  start: async (problem: string, profile?: Partial<UserProfile>, lang: 'en' | 'hi' = 'en') => {
    const res = await api.post<{
      success: boolean;
      data: {
        session: IntakeSession;
        classification: {
          categories: string[];
          beneficiaryType: string | null;
          missingFields: string[];
        };
        recommendations: any;
        aiExplanation: string | null;
        geminiAvailable: boolean;
      };
    }>('/intake/start', { problem, profile, lang });
    return res.data;
  },

  sendMessage: async (sessionId: string, message: string, lang: 'en' | 'hi' = 'en') => {
    const res = await api.post<{
      success: boolean;
      data: {
        session: IntakeSession;
        response: string;
        isComplete: boolean;
        recommendations: any;
        aiExplanation: string | null;
      };
    }>(`/intake/${sessionId}/message`, { message, lang });
    return res.data;
  },

  getSession: async (sessionId: string) => {
    const res = await api.get<{ success: boolean; data: IntakeSession }>(`/intake/${sessionId}`);
    return res.data;
  },

  getRecommendations: async (sessionId: string) => {
    const res = await api.post<{ success: boolean; data: any }>(`/intake/${sessionId}/recommend`);
    return res.data;
  },
};

// ── Profile API ──
export const profileApi = {
  get: async () => {
    const res = await api.get<{ success: boolean; data: UserProfile }>('/profile');
    return res.data;
  },

  update: async (data: Partial<UserProfile>) => {
    const res = await api.put<{ success: boolean; data: UserProfile }>('/profile', data);
    return res.data;
  },
};

// ── Saved Schemes API ──
export const savedApi = {
  getAll: async () => {
    const res = await api.get<{ success: boolean; data: SavedRecordItem[] }>('/saved/records');
    return res.data;
  },

  save: async (recordId: string, notes?: string) => {
    const res = await api.post<{ success: boolean; data: any }>(`/saved/records/${recordId}`, { notes });
    return res.data;
  },

  remove: async (recordId: string) => {
    const res = await api.delete<{ success: boolean; message: string }>(`/saved/records/${recordId}`);
    return res.data;
  },

  getPlans: async () => {
    const res = await api.get<{ success: boolean; data: any[] }>('/saved/plans');
    return res.data;
  },

  createPlan: async (data: { title: string; recordId?: string; plan: any; notes?: string }) => {
    const res = await api.post<{ success: boolean; data: any }>('/saved/plans', data);
    return res.data;
  },

  updatePlan: async (planId: string, data: any) => {
    const res = await api.put<{ success: boolean; data: any }>(`/saved/plans/${planId}`, data);
    return res.data;
  },

  deletePlan: async (planId: string) => {
    const res = await api.delete<{ success: boolean; message: string }>(`/saved/plans/${planId}`);
    return res.data;
  },
};

// ── Feedback API ──
export const feedbackApi = {
  submit: async (data: { recordId?: string; issueType: string; description: string }) => {
    const res = await api.post<{ success: boolean; data: FeedbackReport }>('/feedback', data);
    return res.data;
  },
};

// ── Admin API ──
export const adminApi = {
  getStats: async () => {
    const res = await api.get<{ success: boolean; data: AdminStats }>('/admin/stats');
    return res.data;
  },

  getRecords: async (params: { page?: number; limit?: number; status?: string; search?: string } = {}) => {
    const res = await api.get<{
      success: boolean;
      data: any[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>('/admin/records', { params });
    return res.data;
  },

  getRecord: async (id: string) => {
    const res = await api.get<{ success: boolean; data: any }>(`/admin/records/${id}`);
    return res.data;
  },

  createRecord: async (data: any) => {
    const res = await api.post<{ success: boolean; data: any }>('/admin/records', data);
    return res.data;
  },

  updateRecord: async (id: string, data: any) => {
    const res = await api.put<{ success: boolean; data: any }>(`/admin/records/${id}`, data);
    return res.data;
  },

  deleteRecord: async (id: string) => {
    const res = await api.delete<{ success: boolean; message: string }>(`/admin/records/${id}`);
    return res.data;
  },

  getAuditLogs: async () => {
    const res = await api.get<{ success: boolean; data: any[] }>('/admin/audit');
    return res.data;
  },

  getFeedback: async (params: { page?: number; limit?: number; status?: string } = {}) => {
    const res = await api.get<{
      success: boolean;
      data: FeedbackReport[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>('/admin/feedback', { params });
    return res.data;
  },

  updateFeedbackStatus: async (id: string, status: string, adminNotes?: string) => {
    const res = await api.patch<{ success: boolean; data: any }>(`/admin/feedback/${id}`, {
      status,
      adminNotes,
    });
    return res.data;
  },

  verifyRecord: async (id: string) => {
    const res = await api.post<{ success: boolean; data: any }>(`/admin/records/${id}/verify`);
    return res.data;
  },

  importRecords: async (records: any[], autoPublish = false) => {
    const res = await api.post<{
      success: boolean;
      data: { total: number; importedCount: number; skippedCount: number; imported: any[]; skipped: any[] };
    }>('/admin/records/import', { records, autoPublish });
    return res.data;
  },
};

// ── RTI & First Appeal Drafting API ──
export const rtiApi = {
  getAuthorities: async () => {
    const res = await api.get<{
      success: boolean;
      data: any[];
      statutoryNotice: any;
    }>('/rti/authorities');
    return res.data;
  },

  generate: async (data: any) => {
    const res = await api.post<{
      success: boolean;
      data: {
        type: 'RTI_REQUEST' | 'FIRST_APPEAL';
        title: string;
        draftText: string;
        savedDraftId?: string;
        statutoryReferences: string[];
        filingInstructions: string[];
        attachmentsChecklist: string[];
        officialPortalUrl: string;
        disclaimer: string;
      };
    }>('/rti/generate', data);
    return res.data;
  },

  getDrafts: async () => {
    const res = await api.get<{ success: boolean; data: any[] }>('/rti/drafts');
    return res.data;
  },

  getDraft: async (id: string) => {
    const res = await api.get<{ success: boolean; data: any }>(`/rti/drafts/${id}`);
    return res.data;
  },

  updateDraft: async (id: string, data: { title?: string; notes?: string; draftText?: string; steps?: any[] }) => {
    const res = await api.put<{ success: boolean; data: any }>(`/rti/drafts/${id}`, data);
    return res.data;
  },

  deleteDraft: async (id: string) => {
    const res = await api.delete<{ success: boolean; message: string }>(`/rti/drafts/${id}`);
    return res.data;
  },
};
