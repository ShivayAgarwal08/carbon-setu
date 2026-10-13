export type UserRole = 'CITIZEN' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  preferredLang: 'en' | 'hi';
  createdAt?: string;
}

export interface UserProfile {
  id?: string;
  age?: number | null;
  gender?: string | null;
  state?: string | null;
  district?: string | null;
  occupation?: string | null;
  casteCategory?: string | null;
  incomeAnnual?: number | null;
  isStudent?: boolean;
  isFarmer?: boolean;
  isBpl?: boolean;
  hasDisability?: boolean;
  minorityStatus?: boolean;
}

export interface Department {
  id: string;
  name: string;
  shortName?: string | null;
  websiteUrl?: string | null;
  contacts?: Array<{
    id: string;
    contactType: string;
    value: string;
    description?: string | null;
  }>;
}

export interface GovernmentRecord {
  id: string;
  title: string;
  slug: string;
  recordType: 'SCHEME' | 'SUBSIDY' | 'SCHOLARSHIP' | 'LOAN' | 'INSURANCE' | 'SERVICE';
  category:
    | 'AGRICULTURE'
    | 'EDUCATION'
    | 'HEALTHCARE'
    | 'HOUSING'
    | 'WOMEN_AND_CHILD'
    | 'FINANCIAL_SERVICES'
    | 'SKILL_DEVELOPMENT'
    | 'SOCIAL_WELFARE'
    | 'BUSINESS_AND_ENTREPRENEURSHIP'
    | 'PENSION_AND_INSURANCE'
    | 'PUBLIC_SERVICE';
  shortDescription: string;
  detailedDescription?: string;
  beneficiaries: string[];
  stateScope: string[];
  geographicScope?: string;
  eligibilityDetails?: string | null;
  benefits?: string | null;
  productTerms?: string | null;
  requiredDocuments?: string[];
  applicationProcess?: string | null;
  officialUrl?: string | null;
  applicationUrl?: string | null;
  departmentId?: string | null;
  department?: Department | null;
  status: 'DRAFT' | 'REVIEW' | 'VERIFIED' | 'PUBLISHED' | 'ARCHIVED' | 'STALE';
  lastVerifiedAt?: string | null;
  isSaved?: boolean;
  eligibilityRules?: Array<{
    id: string;
    ruleType: string;
    field: string;
    operator: string;
    value: string;
    description?: string | null;
  }>;
  sources?: Array<{
    id: string;
    sourceType: string;
    url: string;
    title?: string | null;
    isValid: boolean;
  }>;
}

export interface IntakeMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
  metadata?: any;
}

export interface Recommendation {
  id: string;
  recordId: string;
  relevanceScore: number;
  matchReason?: string | null;
  confidence?: string | null;
  category?: string | null;
  record: GovernmentRecord;
}

export interface IntakeSession {
  id: string;
  initialProblem: string;
  structuredProfile: Partial<UserProfile>;
  status: 'active' | 'completed' | 'abandoned';
  messages: IntakeMessage[];
  recommendations?: Recommendation[];
  createdAt: string;
}

export interface AdminStats {
  totalRecords: number;
  publishedRecords: number;
  draftRecords: number;
  staleRecords: number;
  pendingFeedback: number;
  totalUsers: number;
  totalSessions: number;
}

export interface SavedRecordItem {
  id: string;
  userId: string;
  recordId: string;
  notes?: string | null;
  status?: string;
  createdAt: string;
  record: GovernmentRecord;
}

export interface FeedbackReport {
  id: string;
  recordId?: string | null;
  issueType: string;
  description: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'rejected';
  createdAt: string;
}
