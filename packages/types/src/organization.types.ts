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
  members?: OrganizationMember[];
  _count?: { members?: number; datasets?: number; tasks?: number };
}

export interface OrganizationSettings {
  allowedDomains: string[];
  maxEvaluators: number;
  maxDatasetsPerMonth: number;
  aiAssistEnabled: boolean;
  exportFormats: string[];
  timezone?: string;
  dateFormat?: string;
}

export interface OrganizationMember {
  id: string;
  userId: string;
  organizationId: string;
  role: string;
  joinedAt: Date;
  user: { id: string; name: string; email: string; avatarUrl: string | null; status: string };
}

/** A user that can be assigned to an evaluation task. */
export interface OrgUser {
  userId: string;
  user: { id: string; email: string; name: string; role: string };
}

export interface Invitation {
  id: string;
  email: string;
  organizationId: string;
  role: string;
  token: string;
  expiresAt: Date;
  acceptedAt: Date | null;
  createdById: string;
  createdAt: Date;
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
