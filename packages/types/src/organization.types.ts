export enum OrganizationPlan {
  FREE = 'FREE',
  STARTER = 'STARTER',
  PRO = 'PRO',
  ENTERPRISE = 'ENTERPRISE',
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: OrganizationPlan;
  logoUrl: string | null;
  settings: OrganizationSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrganizationSettings {
  allowedDomains: string[];
  maxEvaluators: number;
  maxDatasetsPerMonth: number;
  aiAssistEnabled: boolean;
  exportFormats: string[];
}

export interface OrganizationMember {
  id: string;
  userId: string;
  organizationId: string;
  role: string;
  joinedAt: Date;
}

export interface CreateOrganizationRequest {
  name: string;
  slug?: string;
  plan?: OrganizationPlan;
}

export interface InviteMemberRequest {
  email: string;
  role: string;
}
