export type ReviewStatus = 'Draft' | 'In Review' | 'Changes Requested' | 'Approved';

export type IssueType = 'Tone' | 'Terminology' | 'Fact Conflict' | 'Unverified Claim';

export type IssueSeverity = 'high' | 'medium' | 'low';

export type FindingStatus = 'Pending' | 'Accepted' | 'Ignored';

export type UserRole = 'creator' | 'reviewer' | 'manager' | 'compliance';

/**
 * Brand Profile & Guidelines Schema
 */
export interface ToneGuideline {
  attribute: string;
  description: string;
  doExample: string;
  dontExample: string;
  sourceDoc?: string;
  pageNumber?: number;
}

export interface ProhibitedTerm {
  id: string;
  term: string;
  reason: string;
  suggestedAlternative: string;
  severity: IssueSeverity;
  sourceDoc?: string;
  pageNumber?: number;
}

export interface ApprovedTerm {
  id: string;
  term: string;
  preferredUsage: string;
  category?: string;
  sourceDoc?: string;
  pageNumber?: number;
}

export interface TrustedFact {
  id: string;
  topic: string;
  claimOrStat: string;
  source: string;
  sourceUrl?: string;
  verifiedDate: string;
  notes?: string;
  sourceDoc?: string;
  pageNumber?: number;
}

export interface BrandProfile {
  id: string;
  name: string;
  tagline: string;
  description: string;
  voiceSummary: string;
  toneGuidelines: ToneGuideline[];
  prohibitedTerms: ProhibitedTerm[];
  approvedTerms: ApprovedTerm[];
  trustedFacts: TrustedFact[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Evidence Citation Schema for RAG Pipeline
 */
export interface EvidenceCitation {
  id: string;
  type: 'rule' | 'fact' | 'historical_edit';
  title: string;
  sourceDoc?: string;
  pageNumber?: number;
  verifiedDate?: string;
  snippet: string;
  relevanceScore: number; // 0.0 to 1.0 ranking score
  reasoning?: string;
}

/**
 * Finding / Violation Schema
 */
export interface Finding {
  id: string;
  draftId: string;
  issueType: IssueType;
  severity: IssueSeverity;
  quote: string; // The exact snippet in the draft with issues
  startIndex: number;
  endIndex: number;
  explanation: string; // "Why it matters"
  sourceLink?: string; // Reference to approved rule or fact
  ruleId?: string; // ID of the violated rule or fact if applicable
  suggestedFix: string; // Focused surgical edit
  status: FindingStatus;
  detectedBy: 'deterministic' | 'ai';
  category?: string;
  evidenceType?: 'official_rule' | 'official_fact' | 'unverified_claim';
  evidence?: EvidenceCitation[]; // Structured ground-truth citations retrieved for this finding
  createdAt: string;
}

/**
 * Draft Schema
 */
export interface Draft {
  id: string;
  brandId: string;
  title: string;
  content: string;
  targetAudience?: string;
  channel?: string; // e.g., "Blog Post", "LinkedIn Update", "Product Launch"
  creatorId: string;
  creatorName: string;
  reviewerId?: string;
  reviewerName?: string;
  reviewStatus: ReviewStatus;
  findings: Finding[];
  version: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Comments & Decision Audit Log Schema
 */
export interface AuditLogEntry {
  id: string;
  draftId: string;
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  action: 'create_draft' | 'run_check' | 'apply_fix' | 'ignore_finding' | 'add_comment' | 'status_change';
  summary: string;
  details?: Record<string, unknown>;
  timestamp: string;
}

export interface DraftComment {
  id: string;
  draftId: string;
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  content: string;
  timestamp: string;
  resolved: boolean;
}

/**
 * Approved Edits Schema (Historical Review Decisions)
 */
export interface ApprovedEdit {
  id: string;
  brandId?: string;
  draftId: string;
  findingId?: string;
  originalText: string;
  approvedChange: string;
  reason: string;
  relatedRuleOrFact?: string;
  approvedBy: string;
  approvedByRole: UserRole;
  approvedAt: string;
  category?: IssueType;
  usageCount?: number;
}

