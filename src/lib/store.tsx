'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  BrandProfile, 
  Draft, 
  Finding, 
  AuditLogEntry, 
  DraftComment, 
  UserRole, 
  ReviewStatus 
} from '@/types';
import { 
  INITIAL_BRAND_PROFILE, 
  INITIAL_DRAFTS, 
  INITIAL_AUDIT_LOGS, 
  INITIAL_COMMENTS 
} from './mock-data';

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
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
  comments: DraftComment[];
  addComment: (draftId: string, content: string) => void;
  auditLogs: AuditLogEntry[];
  activeFindingId: string | null;
  setActiveFindingId: (id: string | null) => void;
  resetToDefaults: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

const STORAGE_KEYS = {
  BRAND: 'brandsutra_profile',
  DRAFTS: 'brandsutra_drafts',
  CURRENT_DRAFT: 'brandsutra_curr_draft',
  ROLE: 'brandsutra_role',
  COMMENTS: 'brandsutra_comments',
  AUDIT: 'brandsutra_audit'
};

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [brand, setBrand] = useState<BrandProfile>(INITIAL_BRAND_PROFILE);
  const [drafts, setDrafts] = useState<Draft[]>(INITIAL_DRAFTS);
  const [currentDraftId, setCurrentDraftId] = useState<string>(INITIAL_DRAFTS[0].id);
  const [userRole, setUserRole] = useState<UserRole>('creator');
  const [comments, setComments] = useState<DraftComment[]>(INITIAL_COMMENTS);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(INITIAL_AUDIT_LOGS);
  const [activeFindingId, setActiveFindingId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Hydrate from localStorage on client mount
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
    } catch {
      // Fallback to initial defaults if parsing fails
    }
    setIsLoaded(true);
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
    } catch {
      // Storage error safeguard
    }
  }, [brand, drafts, currentDraftId, userRole, comments, auditLogs, isLoaded]);

  const currentDraft = drafts.find(d => d.id === currentDraftId) || drafts[0];

  const updateBrand = (updated: BrandProfile) => {
    setBrand(updated);
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
    setDrafts(prev => prev.map(d => {
      if (d.id !== id) return d;
      return {
        ...d,
        reviewStatus: newStatus,
        reviewerId: userRole === 'reviewer' ? 'user-reviewer-1' : d.reviewerId,
        reviewerName: userRole === 'reviewer' ? 'Divyansh Chandra (Brand Lead)' : d.reviewerName,
        updatedAt: new Date().toISOString()
      };
    }));

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

    setDrafts(prev => prev.map(d => {
      if (d.id !== draftId) return d;
      return {
        ...d,
        content: updatedContent,
        findings: updatedFindings,
        updatedAt: new Date().toISOString()
      };
    }));

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
    localStorage.clear();
    setBrand(INITIAL_BRAND_PROFILE);
    setDrafts(INITIAL_DRAFTS);
    setCurrentDraftId(INITIAL_DRAFTS[0].id);
    setUserRole('creator');
    setComments(INITIAL_COMMENTS);
    setAuditLogs(INITIAL_AUDIT_LOGS);
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
        userRole,
        setUserRole,
        comments,
        addComment,
        auditLogs,
        activeFindingId,
        setActiveFindingId,
        resetToDefaults
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
