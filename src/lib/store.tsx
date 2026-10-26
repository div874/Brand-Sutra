'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  BrandProfile, 
  Draft, 
  Finding, 
  AuditLogEntry, 
  DraftComment, 
  ApprovedEdit,
  TrustedFact,
  ProhibitedTerm,
  ApprovedTerm,
  ToneGuideline,
  UserRole, 
  ReviewStatus 
} from '@/types';
import { 
  INITIAL_BRAND_PROFILE, 
  INITIAL_DRAFTS, 
  INITIAL_AUDIT_LOGS, 
  INITIAL_COMMENTS,
  INITIAL_APPROVED_EDITS
} from './mock-data';
import {
  checkSupabaseStatus,
  syncBrandToSupabase,
  syncDraftToSupabase,
  syncApprovedEditToSupabase,
  fetchRemoteStateFromSupabase,
  SupabaseSyncStatus
} from './supabase-sync';

interface AppContextType {
  brand: BrandProfile;
  updateBrand: (updated: BrandProfile) => void;
  drafts: Draft[];
  currentDraftId: string;
  currentDraft: Draft | undefined;
  setCurrentDraftId: (id: string) => void;
  createDraft: (draft: Partial<Draft>) => Draft;
  updateDraftContent: (id: string, content: string) => void;
  updateDraftStatus: (id: string, status: ReviewStatus, note?: string) => void;
  applyFindingFix: (draftId: string, findingId: string) => void;
  ignoreFinding: (draftId: string, findingId: string) => void;
  setDraftFindings: (draftId: string, findings: Finding[]) => void;
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
  comments: DraftComment[];
  addComment: (draftId: string, content: string) => void;
  auditLogs: AuditLogEntry[];
  approvedEdits: ApprovedEdit[];
  recordApprovedEdit: (edit: Omit<ApprovedEdit, 'id' | 'approvedAt'>) => void;
  importRules: (newRules: {
    trustedFacts?: TrustedFact[];
    prohibitedTerms?: ProhibitedTerm[];
    approvedTerms?: ApprovedTerm[];
    toneGuidelines?: ToneGuideline[];
  }) => void;
  activeFindingId: string | null;
  setActiveFindingId: (id: string | null) => void;
  resetToDefaults: () => void;
  supabaseStatus: SupabaseSyncStatus;
  refreshSupabaseStatus: () => Promise<SupabaseSyncStatus>;
  syncToCloud: () => Promise<{ success: boolean; message: string }>;
}

const AppContext = createContext<AppContextType | null>(null);

const STORAGE_KEYS = {
  BRAND: 'brandsutra_profile',
  DRAFTS: 'brandsutra_drafts',
  CURRENT_DRAFT: 'brandsutra_curr_draft',
  ROLE: 'brandsutra_role',
  COMMENTS: 'brandsutra_comments',
  AUDIT: 'brandsutra_audit',
  APPROVED_EDITS: 'brandsutra_approved_edits'
};

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [brand, setBrand] = useState<BrandProfile>(() => JSON.parse(JSON.stringify(INITIAL_BRAND_PROFILE)));
  const [drafts, setDrafts] = useState<Draft[]>(() => JSON.parse(JSON.stringify(INITIAL_DRAFTS)));
  const [currentDraftId, setCurrentDraftId] = useState<string>(INITIAL_DRAFTS[0].id);
  const [userRole, setUserRole] = useState<UserRole>('creator');
  const [comments, setComments] = useState<DraftComment[]>(() => JSON.parse(JSON.stringify(INITIAL_COMMENTS)));
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() => JSON.parse(JSON.stringify(INITIAL_AUDIT_LOGS)));
  const [approvedEdits, setApprovedEdits] = useState<ApprovedEdit[]>(() => JSON.parse(JSON.stringify(INITIAL_APPROVED_EDITS)));
  const [activeFindingId, setActiveFindingId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [supabaseStatus, setSupabaseStatus] = useState<SupabaseSyncStatus>({
    isConfigured: true,
    connected: false,
    tablesReady: false,
    message: 'Checking Supabase connection...'
  });

  const refreshSupabaseStatus = async (): Promise<SupabaseSyncStatus> => {
    const status = await checkSupabaseStatus();
    setSupabaseStatus(status);
    if (status.tablesReady) {
      const remote = await fetchRemoteStateFromSupabase();
      if (remote) {
        if (remote.brand) setBrand(remote.brand);
        if (remote.approvedEdits) setApprovedEdits(remote.approvedEdits);
        if (remote.drafts) setDrafts(remote.drafts);
        if (remote.auditLogs) setAuditLogs(remote.auditLogs);
      }
    }
    return status;
  };

  const syncToCloud = async (): Promise<{ success: boolean; message: string }> => {
    const status = await checkSupabaseStatus();
    setSupabaseStatus(status);
    if (!status.connected) {
      return { success: false, message: 'Could not connect to Supabase.' };
    }
    if (!status.tablesReady) {
      return { 
        success: false, 
        message: 'Supabase tables not found. Please execute the SQL in schema.sql in your Supabase SQL editor.' 
      };
    }
    try {
      await syncBrandToSupabase(brand);
      for (const d of drafts) {
        await syncDraftToSupabase(d);
      }
      for (const e of approvedEdits) {
        await syncApprovedEditToSupabase(e);
      }
      return { success: true, message: 'All brand rules, facts, drafts, and approved edits synced to Supabase.' };
    } catch (err) {
      return { success: false, message: err instanceof Error ? err.message : 'Sync failed' };
    }
  };

  // Hydrate from localStorage and Supabase on client mount
  useEffect(() => {
    try {
      const savedBrand = localStorage.getItem(STORAGE_KEYS.BRAND);
      if (savedBrand) setBrand(JSON.parse(savedBrand));

      const savedDrafts = localStorage.getItem(STORAGE_KEYS.DRAFTS);
      if (savedDrafts) setDrafts(JSON.parse(savedDrafts));

      const savedCurr = localStorage.getItem(STORAGE_KEYS.CURRENT_DRAFT);
      if (savedCurr) setCurrentDraftId(savedCurr);

      const savedRole = localStorage.getItem(STORAGE_KEYS.ROLE);
      if (savedRole) setUserRole(savedRole as UserRole);

      const savedComments = localStorage.getItem(STORAGE_KEYS.COMMENTS);
      if (savedComments) setComments(JSON.parse(savedComments));

      const savedAudit = localStorage.getItem(STORAGE_KEYS.AUDIT);
      if (savedAudit) setAuditLogs(JSON.parse(savedAudit));

      const savedEdits = localStorage.getItem(STORAGE_KEYS.APPROVED_EDITS);
      if (savedEdits) setApprovedEdits(JSON.parse(savedEdits));
    } catch {
      // Fallback to initial defaults if parsing fails
    }
    setIsLoaded(true);
    refreshSupabaseStatus();
  }, []);

  // Sync state changes to localStorage
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(STORAGE_KEYS.BRAND, JSON.stringify(brand));
      localStorage.setItem(STORAGE_KEYS.DRAFTS, JSON.stringify(drafts));
      localStorage.setItem(STORAGE_KEYS.CURRENT_DRAFT, currentDraftId);
      localStorage.setItem(STORAGE_KEYS.ROLE, userRole);
      localStorage.setItem(STORAGE_KEYS.COMMENTS, JSON.stringify(comments));
      localStorage.setItem(STORAGE_KEYS.AUDIT, JSON.stringify(auditLogs));
      localStorage.setItem(STORAGE_KEYS.APPROVED_EDITS, JSON.stringify(approvedEdits));
    } catch {
      // Storage error safeguard
    }
  }, [brand, drafts, currentDraftId, userRole, comments, auditLogs, approvedEdits, isLoaded]);

  const currentDraft = drafts.find(d => d.id === currentDraftId) || drafts[0];

  const updateBrand = (updated: BrandProfile) => {
    setBrand(updated);
    syncBrandToSupabase(updated).catch(() => {});
  };

  const importRules = (newRules: {
    trustedFacts?: import('@/types').TrustedFact[];
    prohibitedTerms?: import('@/types').ProhibitedTerm[];
    approvedTerms?: import('@/types').ApprovedTerm[];
    toneGuidelines?: import('@/types').ToneGuideline[];
  }) => {
    const updatedBrand: BrandProfile = {
      ...brand,
      trustedFacts: [...(newRules.trustedFacts || []), ...brand.trustedFacts],
      prohibitedTerms: [...(newRules.prohibitedTerms || []), ...brand.prohibitedTerms],
      approvedTerms: [...(newRules.approvedTerms || []), ...brand.approvedTerms],
      toneGuidelines: [...(newRules.toneGuidelines || []), ...brand.toneGuidelines],
      updatedAt: new Date().toISOString()
    };
    setBrand(updatedBrand);
    syncBrandToSupabase(updatedBrand).catch(() => {});

    const totalCount =
      (newRules.trustedFacts?.length || 0) +
      (newRules.prohibitedTerms?.length || 0) +
      (newRules.approvedTerms?.length || 0) +
      (newRules.toneGuidelines?.length || 0);

    const log: AuditLogEntry = {
      id: `audit-${Date.now()}`,
      draftId: currentDraftId,
      authorId: userRole === 'reviewer' ? 'user-reviewer-1' : 'user-creator-1',
      authorName: userRole === 'reviewer' ? 'Divyansh Chandra' : 'Aarav Sharma',
      authorRole: userRole,
      action: 'status_change',
      summary: `Imported ${totalCount} new rules from external document into brand knowledge base`,
      timestamp: new Date().toISOString()
    };
    setAuditLogs(prev => [log, ...prev]);
  };

  const createDraft = (draftInput: Partial<Draft>): Draft => {
    const newDraft: Draft = {
      id: `draft-${Date.now()}`,
      brandId: brand.id,
      title: draftInput.title || 'Untitled Draft',
      content: draftInput.content || '',
      channel: draftInput.channel || 'Blog Post',
      targetAudience: draftInput.targetAudience || 'General Audience',
      creatorId: 'user-creator-1',
      creatorName: 'Aarav Sharma (Copywriter)',
      reviewStatus: 'Draft',
      findings: [],
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...draftInput
    };

    setDrafts(prev => [newDraft, ...prev]);
    setCurrentDraftId(newDraft.id);

    const log: AuditLogEntry = {
      id: `audit-${Date.now()}`,
      draftId: newDraft.id,
      authorId: 'user-creator-1',
      authorName: 'Aarav Sharma',
      authorRole: 'creator',
      action: 'create_draft',
      summary: `Created new draft "${newDraft.title}"`,
      timestamp: new Date().toISOString()
    };
    setAuditLogs(prev => [log, ...prev]);

    return newDraft;
  };

  const updateDraftContent = (id: string, newContent: string) => {
    setDrafts(prev => prev.map(d => {
      if (d.id !== id) return d;
      return {
        ...d,
        content: newContent,
        updatedAt: new Date().toISOString(),
        version: d.version + 1
      };
    }));
  };

  const updateDraftStatus = (id: string, newStatus: ReviewStatus, note?: string) => {
    let updatedDraftForSync: Draft | null = null;
    setDrafts(prev => prev.map(d => {
      if (d.id !== id) return d;
      const updated = {
        ...d,
        reviewStatus: newStatus,
        reviewerId: userRole === 'reviewer' ? 'user-reviewer-1' : d.reviewerId,
        reviewerName: userRole === 'reviewer' ? 'Divyansh Chandra (Brand Lead)' : d.reviewerName,
        updatedAt: new Date().toISOString()
      };
      updatedDraftForSync = updated;
      return updated;
    }));

    if (updatedDraftForSync) {
      syncDraftToSupabase(updatedDraftForSync).catch(() => {});
    }

    const log: AuditLogEntry = {
      id: `audit-${Date.now()}`,
      draftId: id,
      authorId: userRole === 'reviewer' ? 'user-reviewer-1' : 'user-creator-1',
      authorName: userRole === 'reviewer' ? 'Divyansh Chandra' : 'Aarav Sharma',
      authorRole: userRole,
      action: 'status_change',
      summary: `Changed status to "${newStatus}"${note ? `: ${note}` : ''}`,
      timestamp: new Date().toISOString()
    };
    setAuditLogs(prev => [log, ...prev]);

    if (note) {
      addComment(id, `[Status update to ${newStatus}] ${note}`);
    }
  };

  const setDraftFindings = (draftId: string, newFindings: Finding[]) => {
    setDrafts(prev => prev.map(d => {
      if (d.id !== draftId) return d;
      const updated = {
        ...d,
        findings: newFindings,
        updatedAt: new Date().toISOString()
      };
      syncDraftToSupabase(updated).catch(() => {});
      return updated;
    }));
  };

  const applyFindingFix = (draftId: string, findingId: string) => {
    const draft = drafts.find(d => d.id === draftId);
    if (!draft) return;

    const finding = draft.findings.find(f => f.id === findingId);
    if (!finding) return;

    // Surgical replacement: replace exact quote with suggestedFix
    let updatedContent = draft.content;
    if (updatedContent.includes(finding.quote)) {
      updatedContent = updatedContent.replace(finding.quote, finding.suggestedFix);
    }

    const updatedFindings = draft.findings.map(f => 
      f.id === findingId ? { ...f, status: 'Accepted' as const } : f
    );

    const updatedDraft = {
      ...draft,
      content: updatedContent,
      findings: updatedFindings,
      updatedAt: new Date().toISOString()
    };

    setDrafts(prev => prev.map(d => d.id === draftId ? updatedDraft : d));
    syncDraftToSupabase(updatedDraft).catch(() => {});

    const log: AuditLogEntry = {
      id: `audit-${Date.now()}`,
      draftId,
      authorId: userRole === 'reviewer' ? 'user-reviewer-1' : 'user-creator-1',
      authorName: userRole === 'reviewer' ? 'Divyansh Chandra' : 'Aarav Sharma',
      authorRole: userRole,
      action: 'apply_fix',
      summary: `Accepted fix: "${finding.quote}" -> "${finding.suggestedFix}"`,
      timestamp: new Date().toISOString()
    };
    setAuditLogs(prev => [log, ...prev]);

    // Record this approved edit into historical Rules & Facts knowledge base
    const approvedEditRecord: ApprovedEdit = {
      id: `edit-${Date.now()}-${finding.id}`,
      draftId,
      findingId,
      originalText: finding.quote,
      approvedChange: finding.suggestedFix,
      reason: finding.explanation,
      relatedRuleOrFact: finding.sourceLink || 'Brand Guideline',
      approvedBy: userRole === 'reviewer' ? 'Divyansh Chandra (Brand Lead)' : 'Aarav Sharma (Creator)',
      approvedByRole: userRole,
      approvedAt: new Date().toISOString(),
      category: finding.issueType,
      usageCount: 1
    };
    setApprovedEdits(prev => [
      approvedEditRecord, 
      ...prev.filter(e => e.originalText.toLowerCase() !== finding.quote.toLowerCase())
    ]);
    syncApprovedEditToSupabase(approvedEditRecord).catch(() => {});
  };

  const recordApprovedEdit = (editInput: Omit<ApprovedEdit, 'id' | 'approvedAt'>) => {
    const newEdit: ApprovedEdit = {
      ...editInput,
      id: `edit-${Date.now()}`,
      approvedAt: new Date().toISOString()
    };
    setApprovedEdits(prev => [newEdit, ...prev]);
    syncApprovedEditToSupabase(newEdit).catch(() => {});
  };

  const ignoreFinding = (draftId: string, findingId: string) => {
    setDrafts(prev => prev.map(d => {
      if (d.id !== draftId) return d;
      return {
        ...d,
        findings: d.findings.map(f => f.id === findingId ? { ...f, status: 'Ignored' as const } : f),
        updatedAt: new Date().toISOString()
      };
    }));

    const log: AuditLogEntry = {
      id: `audit-${Date.now()}`,
      draftId,
      authorId: userRole === 'reviewer' ? 'user-reviewer-1' : 'user-creator-1',
      authorName: userRole === 'reviewer' ? 'Divyansh Chandra' : 'Aarav Sharma',
      authorRole: userRole,
      action: 'ignore_finding',
      summary: `Dismissed suggestion for issue: ${findingId}`,
      timestamp: new Date().toISOString()
    };
    setAuditLogs(prev => [log, ...prev]);
  };

  const addComment = (draftId: string, content: string) => {
    const newComment: DraftComment = {
      id: `comm-${Date.now()}`,
      draftId,
      authorId: userRole === 'reviewer' ? 'user-reviewer-1' : 'user-creator-1',
      authorName: userRole === 'reviewer' ? 'Divyansh Chandra (Brand Lead)' : 'Aarav Sharma (Creator)',
      authorRole: userRole,
      content,
      timestamp: new Date().toISOString(),
      resolved: false
    };

    setComments(prev => [newComment, ...prev]);

    const log: AuditLogEntry = {
      id: `audit-${Date.now()}`,
      draftId,
      authorId: newComment.authorId,
      authorName: newComment.authorName,
      authorRole: userRole,
      action: 'add_comment',
      summary: `Added review comment: "${content.slice(0, 40)}..."`,
      timestamp: new Date().toISOString()
    };
    setAuditLogs(prev => [log, ...prev]);
  };

  const resetToDefaults = () => {
    try {
      localStorage.clear();
    } catch {}
    setBrand(JSON.parse(JSON.stringify(INITIAL_BRAND_PROFILE)));
    setDrafts(JSON.parse(JSON.stringify(INITIAL_DRAFTS)));
    setCurrentDraftId(INITIAL_DRAFTS[0].id);
    setUserRole('creator');
    setComments(JSON.parse(JSON.stringify(INITIAL_COMMENTS)));
    setAuditLogs(JSON.parse(JSON.stringify(INITIAL_AUDIT_LOGS)));
    setApprovedEdits(JSON.parse(JSON.stringify(INITIAL_APPROVED_EDITS)));
    setActiveFindingId(null);
  };

  return (
    <AppContext.Provider
      value={{
        brand,
        updateBrand,
        drafts,
        currentDraftId,
        currentDraft,
        setCurrentDraftId,
        createDraft,
        updateDraftContent,
        updateDraftStatus,
        applyFindingFix,
        ignoreFinding,
        setDraftFindings,
        userRole,
        setUserRole,
        comments,
        addComment,
        auditLogs,
        approvedEdits,
        recordApprovedEdit,
        importRules,
        activeFindingId,
        setActiveFindingId,
        resetToDefaults,
        supabaseStatus,
        refreshSupabaseStatus,
        syncToCloud
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
