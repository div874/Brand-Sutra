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
  NUVIA_BRAND_PROFILE,
  INITIAL_BRANDS,
  INITIAL_DRAFTS, 
  NUVIA_DRAFTS,
  INITIAL_AUDIT_LOGS, 
  INITIAL_COMMENTS,
  INITIAL_APPROVED_EDITS
} from './mock-data';
import {
  checkSupabaseStatus,
  syncBrandToSupabase,
  syncDraftToSupabase,
  syncApprovedEditToSupabase,
  syncKnowledgeEmbeddingsToSupabase,
  fetchRemoteStateFromSupabase,
  SupabaseSyncStatus
} from './supabase-sync';
import { supabase } from './supabase';

interface AppContextType {
  brands: BrandProfile[];
  brand: BrandProfile;
  selectedBrandId: string;
  selectBrand: (id: string) => void;
  createBrand: (input: { name: string; description?: string }) => BrandProfile;
  updateBrand: (updated: BrandProfile) => void;
  deleteBrand: (id: string) => boolean;
  drafts: Draft[];
  currentDraftId: string;
  currentDraft: Draft | undefined;
  setCurrentDraftId: (id: string) => void;
  createDraft: (draft: Partial<Draft>) => Draft;
  updateDraftContent: (id: string, content: string) => void;
  updateDraftStatus: (id: string, status: ReviewStatus, note?: string) => void;
  applyFindingFix: (draftId: string, findingId: string) => void;
  applyAllFindingFixes: (draftId: string) => number;
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
  restorePresetBrand: (preset: 'nuvia' | 'echostream') => BrandProfile;
}

const AppContext = createContext<AppContextType | null>(null);

const STORAGE_KEYS = {
  BRANDS: 'brandsutra_brands',
  SELECTED_BRAND_ID: 'brandsutra_selected_brand_id',
  BRAND: 'brandsutra_profile',
  DRAFTS: 'brandsutra_drafts',
  CURRENT_DRAFT: 'brandsutra_curr_draft',
  ROLE: 'brandsutra_role',
  COMMENTS: 'brandsutra_comments',
  AUDIT: 'brandsutra_audit',
  APPROVED_EDITS: 'brandsutra_approved_edits'
};

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [brands, setBrands] = useState<BrandProfile[]>(() => JSON.parse(JSON.stringify(INITIAL_BRANDS)));
  const [selectedBrandId, setSelectedBrandId] = useState<string>(INITIAL_BRAND_PROFILE.id);
  const [allDrafts, setAllDrafts] = useState<Draft[]>(() => JSON.parse(JSON.stringify(INITIAL_DRAFTS)));
  const [currentDraftId, setCurrentDraftId] = useState<string>(INITIAL_DRAFTS[0].id);
  const [userRole, setUserRole] = useState<UserRole>('creator');
  const [allComments, setAllComments] = useState<DraftComment[]>(() => JSON.parse(JSON.stringify(INITIAL_COMMENTS)));
  const [allAuditLogs, setAllAuditLogs] = useState<AuditLogEntry[]>(() => JSON.parse(JSON.stringify(INITIAL_AUDIT_LOGS)));
  const [allApprovedEdits, setAllApprovedEdits] = useState<ApprovedEdit[]>(() => JSON.parse(JSON.stringify(INITIAL_APPROVED_EDITS)));
  const [activeFindingId, setActiveFindingId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [supabaseStatus, setSupabaseStatus] = useState<SupabaseSyncStatus>({
    isConfigured: true,
    connected: false,
    tablesReady: false,
    message: 'Checking Supabase connection...'
  });

  // Derived current brand
  const brand = brands.find(b => b.id === selectedBrandId) || brands[0] || INITIAL_BRAND_PROFILE;

  // Derived drafts scoped strictly to current brand
  const drafts = allDrafts.filter(d => d.brandId === brand.id);
  const currentDraft = drafts.find(d => d.id === currentDraftId) || drafts[0];

  // Derived approved edits scoped to current brand (or global default if legacy)
  const approvedEdits = allApprovedEdits.filter(e => 
    e.brandId === brand.id || (!e.brandId && brand.id === INITIAL_BRAND_PROFILE.id)
  );

  // Derived comments & audit logs scoped to drafts of current brand
  const brandDraftIds = new Set(drafts.map(d => d.id));
  const comments = allComments.filter(c => brandDraftIds.has(c.draftId));
  const auditLogs = allAuditLogs.filter(a => brandDraftIds.has(a.draftId));

  const refreshSupabaseStatus = async (): Promise<SupabaseSyncStatus> => {
    const status = await checkSupabaseStatus();
    setSupabaseStatus(status);
    if (status.tablesReady) {
      const remote = await fetchRemoteStateFromSupabase();
      if (remote) {
        if (remote.brands && remote.brands.length > 0) {
          setBrands(prev => {
            const merged = [...prev];
            for (const rb of remote.brands!) {
              const idx = merged.findIndex(b => b.id === rb.id);
              if (idx >= 0) {
                merged[idx] = rb;
              } else {
                merged.push(rb);
              }
            }
            return merged;
          });
        } else if (remote.brand) {
          setBrands(prev => {
            const exists = prev.some(b => b.id === remote.brand!.id);
            if (exists) {
              return prev.map(b => b.id === remote.brand!.id ? remote.brand! : b);
            }
            return [...prev, remote.brand!];
          });
        }
        if (remote.approvedEdits) {
          setAllApprovedEdits(prev => {
            const seen = new Set(prev.map(e => e.id));
            const newEdits = remote.approvedEdits!.filter(e => !seen.has(e.id));
            return [...prev, ...newEdits];
          });
        }
        if (remote.drafts) {
          setAllDrafts(prev => {
            const seen = new Set(prev.map(d => d.id));
            const newDrafts = remote.drafts!.filter(d => !seen.has(d.id));
            return [...prev, ...newDrafts];
          });
        }
        if (remote.auditLogs) {
          setAllAuditLogs(prev => {
            const seen = new Set(prev.map(a => a.id));
            const newLogs = remote.auditLogs!.filter(a => !seen.has(a.id));
            return [...prev, ...newLogs];
          });
        }
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
      for (const b of brands) {
        await syncBrandToSupabase(b);
      }
      for (const d of allDrafts) {
        await syncDraftToSupabase(d);
      }
      for (const e of allApprovedEdits) {
        await syncApprovedEditToSupabase(e);
      }
      try {
        await syncKnowledgeEmbeddingsToSupabase(brand, approvedEdits);
      } catch {
        // Non-blocking pgvector sync fallback
      }
      return { success: true, message: 'All brands, rules, facts, drafts, approved edits, and vector embeddings synced to Supabase.' };
    } catch (err) {
      return { success: false, message: err instanceof Error ? err.message : 'Sync failed' };
    }
  };

  // Hydrate from localStorage on client mount
  useEffect(() => {
    try {
      let loadedBrands: BrandProfile[] = [];
      const savedBrands = localStorage.getItem(STORAGE_KEYS.BRANDS);
      if (savedBrands) {
        try {
          loadedBrands = JSON.parse(savedBrands) as BrandProfile[];
        } catch {}
      }

      // Backward compatibility: If no brands array saved yet, check single brand key
      if (loadedBrands.length === 0) {
        const savedSingleBrand = localStorage.getItem(STORAGE_KEYS.BRAND);
        if (savedSingleBrand) {
          try {
            const parsed = JSON.parse(savedSingleBrand) as BrandProfile;
            if (parsed.name === 'EcoSutra Wearables') parsed.name = 'EchoStream';
            loadedBrands = [parsed];
          } catch {}
        }
      }

      // Ensure EchoStream and Nuvia Skin baseline brands are always present
      if (!loadedBrands.some(b => b.id === INITIAL_BRAND_PROFILE.id || b.name.toLowerCase() === 'echostream')) {
        loadedBrands.unshift(JSON.parse(JSON.stringify(INITIAL_BRAND_PROFILE)));
      }
      if (!loadedBrands.some(b => b.id === NUVIA_BRAND_PROFILE.id || b.name.toLowerCase().includes('nuvia'))) {
        loadedBrands.push(JSON.parse(JSON.stringify(NUVIA_BRAND_PROFILE)));
      }

      // For baseline brands, ensure baseline prohibited terms are present
      loadedBrands = loadedBrands.map(b => {
        if (b.id === INITIAL_BRAND_PROFILE.id || b.name.toLowerCase() === 'echostream') {
          const existingTerms = new Set((b.prohibitedTerms || []).map(t => t.term.toLowerCase().trim()));
          const missingBaseline = INITIAL_BRAND_PROFILE.prohibitedTerms.filter(t => !existingTerms.has(t.term.toLowerCase().trim()));
          if (missingBaseline.length > 0) {
            return { ...b, prohibitedTerms: [...(b.prohibitedTerms || []), ...missingBaseline] };
          }
        }
        if (b.id === NUVIA_BRAND_PROFILE.id || b.name.toLowerCase().includes('nuvia')) {
          const existingTerms = new Set((b.prohibitedTerms || []).map(t => t.term.toLowerCase().trim()));
          const missingBaseline = NUVIA_BRAND_PROFILE.prohibitedTerms.filter(t => !existingTerms.has(t.term.toLowerCase().trim()));
          if (missingBaseline.length > 0) {
            return { ...b, prohibitedTerms: [...(b.prohibitedTerms || []), ...missingBaseline] };
          }
        }
        return b;
      });

      setBrands(loadedBrands);

      // Selected brand ID
      const savedSelectedBrandId = localStorage.getItem(STORAGE_KEYS.SELECTED_BRAND_ID);
      const initialSelectedId = (savedSelectedBrandId && loadedBrands.some(b => b.id === savedSelectedBrandId))
        ? savedSelectedBrandId
        : loadedBrands[0].id;
      setSelectedBrandId(initialSelectedId);

      // Drafts
      const savedDrafts = localStorage.getItem(STORAGE_KEYS.DRAFTS);
      if (savedDrafts) {
        try {
          const parsedDrafts = JSON.parse(savedDrafts) as Draft[];
          const hasNuviaDrafts = parsedDrafts.some(d => d.brandId === NUVIA_BRAND_PROFILE.id);
          const combinedDrafts = hasNuviaDrafts ? parsedDrafts : [...parsedDrafts, ...JSON.parse(JSON.stringify(NUVIA_DRAFTS))];
          const cleanedDrafts = combinedDrafts.map(d => {
            const seen = new Set<string>();
            const cleanedFindings = (d.findings || []).filter((f: Finding) => {
              const key = `${f.quote?.toLowerCase().trim()}:${f.issueType}`;
              if (seen.has(key)) return false;
              seen.add(key);
              if (f.status === 'Pending' && d.content && !d.content.toLowerCase().includes((f.quote || '').toLowerCase().trim())) {
                return false;
              }
              return true;
            });
            return { 
              ...d, 
              brandId: d.brandId || INITIAL_BRAND_PROFILE.id,
              findings: cleanedFindings 
            };
          });
          setAllDrafts(cleanedDrafts);
        } catch {}
      }

      const savedCurr = localStorage.getItem(STORAGE_KEYS.CURRENT_DRAFT);
      if (savedCurr) setCurrentDraftId(savedCurr);

      const savedRole = localStorage.getItem(STORAGE_KEYS.ROLE);
      if (savedRole) setUserRole(savedRole as UserRole);

      const savedComments = localStorage.getItem(STORAGE_KEYS.COMMENTS);
      if (savedComments) setAllComments(JSON.parse(savedComments));

      const savedAudit = localStorage.getItem(STORAGE_KEYS.AUDIT);
      if (savedAudit) setAllAuditLogs(JSON.parse(savedAudit));

      const savedEdits = localStorage.getItem(STORAGE_KEYS.APPROVED_EDITS);
      if (savedEdits) {
        const parsedEdits = JSON.parse(savedEdits) as ApprovedEdit[];
        const scopedEdits = parsedEdits.map(e => ({
          ...e,
          brandId: e.brandId || INITIAL_BRAND_PROFILE.id
        }));
        setAllApprovedEdits(scopedEdits);
      }
    } catch {
      // Fallback
    }
    setIsLoaded(true);
    refreshSupabaseStatus();
  }, []);

  // Sync state changes to localStorage
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(STORAGE_KEYS.BRANDS, JSON.stringify(brands));
      localStorage.setItem(STORAGE_KEYS.SELECTED_BRAND_ID, selectedBrandId);
      localStorage.setItem(STORAGE_KEYS.BRAND, JSON.stringify(brand));
      localStorage.setItem(STORAGE_KEYS.DRAFTS, JSON.stringify(allDrafts));
      localStorage.setItem(STORAGE_KEYS.CURRENT_DRAFT, currentDraftId);
      localStorage.setItem(STORAGE_KEYS.ROLE, userRole);
      localStorage.setItem(STORAGE_KEYS.COMMENTS, JSON.stringify(allComments));
      localStorage.setItem(STORAGE_KEYS.AUDIT, JSON.stringify(allAuditLogs));
      localStorage.setItem(STORAGE_KEYS.APPROVED_EDITS, JSON.stringify(allApprovedEdits));
    } catch {
      // Storage error safeguard
    }
  }, [brands, selectedBrandId, brand, allDrafts, currentDraftId, userRole, allComments, allAuditLogs, allApprovedEdits, isLoaded]);

  const selectBrand = (id: string) => {
    const targetBrand = brands.find(b => b.id === id);
    if (!targetBrand) return;
    setSelectedBrandId(id);
    try {
      localStorage.setItem(STORAGE_KEYS.SELECTED_BRAND_ID, id);
    } catch {}

    const brandDrafts = allDrafts.filter(d => d.brandId === id);
    if (brandDrafts.length > 0) {
      setCurrentDraftId(brandDrafts[0].id);
    } else {
      setCurrentDraftId('');
    }
  };

  const createBrand = (input: { name: string; description?: string }): BrandProfile => {
    const cleanName = input.name.trim();
    const newBrand: BrandProfile = {
      id: `brand-${Date.now()}`,
      name: cleanName,
      tagline: 'Consistent brands. Confident content.',
      description: input.description?.trim() || '',
      voiceSummary: 'Clear, authoritative, and compliant with company guidelines.',
      toneGuidelines: [],
      prohibitedTerms: [],
      approvedTerms: [],
      trustedFacts: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setBrands(prev => [...prev, newBrand]);
    setSelectedBrandId(newBrand.id);
    setCurrentDraftId('');

    try {
      localStorage.setItem(STORAGE_KEYS.SELECTED_BRAND_ID, newBrand.id);
    } catch {}

    syncBrandToSupabase(newBrand).catch(() => {});
    return newBrand;
  };

  const updateBrand = (updated: BrandProfile) => {
    setBrands(prev => prev.map(b => b.id === updated.id ? updated : b));
    syncBrandToSupabase(updated).catch(() => {});
  };

  const deleteBrand = (id: string): boolean => {
    if (brands.length <= 1) {
      return false;
    }

    const remainingBrands = brands.filter(b => b.id !== id);
    setBrands(remainingBrands);

    if (selectedBrandId === id) {
      const nextBrand = remainingBrands[0];
      setSelectedBrandId(nextBrand.id);
      try {
        localStorage.setItem(STORAGE_KEYS.SELECTED_BRAND_ID, nextBrand.id);
      } catch {}
      const nextDrafts = allDrafts.filter(d => d.brandId === nextBrand.id);
      setCurrentDraftId(nextDrafts[0]?.id || '');
    }

    setAllDrafts(prev => prev.filter(d => d.brandId !== id));
    setAllApprovedEdits(prev => prev.filter(e => e.brandId !== id));

    if (supabase) {
      Promise.allSettled([
        supabase.from('brands').delete().eq('id', id),
        supabase.from('trusted_facts').delete().eq('brand_id', id),
        supabase.from('terminology_rules').delete().eq('brand_id', id),
        supabase.from('tone_guidelines').delete().eq('brand_id', id),
        supabase.from('drafts').delete().eq('brand_id', id)
      ]).catch(() => {});
    }

    return true;
  };

  const restorePresetBrand = (preset: 'nuvia' | 'echostream'): BrandProfile => {
    const targetProfile = preset === 'nuvia' ? NUVIA_BRAND_PROFILE : INITIAL_BRAND_PROFILE;
    const targetDrafts = preset === 'nuvia' ? NUVIA_DRAFTS : INITIAL_DRAFTS.filter(d => d.brandId === INITIAL_BRAND_PROFILE.id);

    setBrands(prev => {
      const exists = prev.some(b => b.id === targetProfile.id || b.name.toLowerCase() === targetProfile.name.toLowerCase());
      if (exists) {
        return prev.map(b => (b.id === targetProfile.id || b.name.toLowerCase() === targetProfile.name.toLowerCase()) ? JSON.parse(JSON.stringify(targetProfile)) : b);
      }
      return [...prev, JSON.parse(JSON.stringify(targetProfile))];
    });

    setAllDrafts(prev => {
      const existingIds = new Set(prev.map(d => d.id));
      const newDrafts = targetDrafts.filter(d => !existingIds.has(d.id));
      return [...prev, ...JSON.parse(JSON.stringify(newDrafts))];
    });

    setSelectedBrandId(targetProfile.id);
    if (targetDrafts.length > 0) {
      setCurrentDraftId(targetDrafts[0].id);
    }

    try {
      localStorage.setItem(STORAGE_KEYS.SELECTED_BRAND_ID, targetProfile.id);
    } catch {}

    syncBrandToSupabase(targetProfile).catch(() => {});
    return targetProfile;
  };

  const importRules = (newRules: {
    trustedFacts?: TrustedFact[];
    prohibitedTerms?: ProhibitedTerm[];
    approvedTerms?: ApprovedTerm[];
    toneGuidelines?: ToneGuideline[];
  }) => {
    const currentBrand = brands.find(b => b.id === selectedBrandId) || brands[0];

    // Deduplicate prohibited terms by term name
    const existingProhibited = new Set((currentBrand.prohibitedTerms || []).map(t => t.term.toLowerCase().trim()));
    const dedupedProhibited = (newRules.prohibitedTerms || []).filter(t => !existingProhibited.has(t.term.toLowerCase().trim()));

    // Deduplicate approved terms by term name
    const existingApproved = new Set((currentBrand.approvedTerms || []).map(a => a.term.toLowerCase().trim()));
    const dedupedApproved = (newRules.approvedTerms || []).filter(a => !existingApproved.has(a.term.toLowerCase().trim()));

    // Deduplicate facts by claim or topic
    const existingFactClaims = new Set((currentBrand.trustedFacts || []).map(f => f.claimOrStat.toLowerCase().trim()));
    const dedupedFacts = (newRules.trustedFacts || []).filter(f => !existingFactClaims.has(f.claimOrStat.toLowerCase().trim()));

    // Deduplicate tone guidelines by attribute
    const existingToneAttrs = new Set((currentBrand.toneGuidelines || []).map(tg => tg.attribute.toLowerCase().trim()));
    const dedupedTone = (newRules.toneGuidelines || []).filter(tg => !existingToneAttrs.has(tg.attribute.toLowerCase().trim()));

    const updatedBrand: BrandProfile = {
      ...currentBrand,
      trustedFacts: [...dedupedFacts, ...(currentBrand.trustedFacts || [])],
      prohibitedTerms: [...dedupedProhibited, ...(currentBrand.prohibitedTerms || [])],
      approvedTerms: [...dedupedApproved, ...(currentBrand.approvedTerms || [])],
      toneGuidelines: [...dedupedTone, ...(currentBrand.toneGuidelines || [])],
      updatedAt: new Date().toISOString()
    };
    updateBrand(updatedBrand);

    const totalCount =
      dedupedFacts.length +
      dedupedProhibited.length +
      dedupedApproved.length +
      dedupedTone.length;

    if (currentDraftId) {
      const log: AuditLogEntry = {
        id: `audit-${Date.now()}`,
        draftId: currentDraftId,
        authorId: userRole === 'reviewer' ? 'user-reviewer-1' : 'user-creator-1',
        authorName: userRole === 'reviewer' ? 'Divyansh Chandra' : 'Aarav Sharma',
        authorRole: userRole,
        action: 'status_change',
        summary: `Imported ${totalCount} new rules from external document into brand knowledge base for ${currentBrand.name}`,
        timestamp: new Date().toISOString()
      };
      setAllAuditLogs(prev => [log, ...prev]);
    }
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

    setAllDrafts(prev => [newDraft, ...prev]);
    setCurrentDraftId(newDraft.id);
    syncDraftToSupabase(newDraft).catch(() => {});

    const log: AuditLogEntry = {
      id: `audit-${Date.now()}`,
      draftId: newDraft.id,
      authorId: 'user-creator-1',
      authorName: 'Aarav Sharma',
      authorRole: 'creator',
      action: 'create_draft',
      summary: `Created new draft "${newDraft.title}" for ${brand.name}`,
      timestamp: new Date().toISOString()
    };
    setAllAuditLogs(prev => [log, ...prev]);

    return newDraft;
  };

  const updateDraftContent = (id: string, newContent: string) => {
    setAllDrafts(prev => prev.map(d => {
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
    setAllDrafts(prev => prev.map(d => {
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
    setAllAuditLogs(prev => [log, ...prev]);

    if (note) {
      addComment(id, `[Status update to ${newStatus}] ${note}`);
    }
  };

  const setDraftFindings = (draftId: string, newFindings: Finding[]) => {
    setAllDrafts(prev => prev.map(d => {
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
    const draft = allDrafts.find(d => d.id === draftId);
    if (!draft) return;

    const finding = draft.findings.find(f => f.id === findingId);
    if (!finding) return;

    // Surgical replacement: replace exact quote with suggestedFix
    let updatedContent = draft.content;
    if (updatedContent.includes(finding.quote)) {
      updatedContent = updatedContent.replace(finding.quote, finding.suggestedFix);
    } else {
      // Robust fallback if quote has slight casing differences
      const lower = updatedContent.toLowerCase();
      const quoteLower = finding.quote.toLowerCase();
      const idx = lower.indexOf(quoteLower);
      if (idx !== -1) {
        updatedContent = updatedContent.slice(0, idx) + finding.suggestedFix + updatedContent.slice(idx + quoteLower.length);
      }
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

    setAllDrafts(prev => prev.map(d => d.id === draftId ? updatedDraft : d));
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
    setAllAuditLogs(prev => [log, ...prev]);

    // Record this approved edit into historical knowledge base with brandId
    const approvedEditRecord: ApprovedEdit = {
      id: `edit-${Date.now()}-${finding.id}`,
      brandId: brand.id,
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
    setAllApprovedEdits(prev => [
      approvedEditRecord, 
      ...prev.filter(e => e.originalText.toLowerCase() !== finding.quote.toLowerCase())
    ]);
    syncApprovedEditToSupabase(approvedEditRecord).catch(() => {});
  };

  const applyAllFindingFixes = (draftId: string): number => {
    const draft = allDrafts.find(d => d.id === draftId);
    if (!draft) return 0;

    const pendingWithFix = draft.findings.filter(f => f.status === 'Pending' && f.suggestedFix && f.suggestedFix.trim());
    if (pendingWithFix.length === 0) return 0;

    // Sort descending by startIndex so earlier string offsets aren't corrupted by replacements
    const sorted = [...pendingWithFix].sort((a, b) => b.startIndex - a.startIndex);

    let updatedContent = draft.content;
    const newApprovedEdits: ApprovedEdit[] = [];

    for (const f of sorted) {
      if (updatedContent.includes(f.quote)) {
        updatedContent = updatedContent.replace(f.quote, f.suggestedFix);
      } else {
        const lower = updatedContent.toLowerCase();
        const quoteLower = f.quote.toLowerCase();
        const idx = lower.indexOf(quoteLower);
        if (idx !== -1) {
          updatedContent = updatedContent.slice(0, idx) + f.suggestedFix + updatedContent.slice(idx + quoteLower.length);
        }
      }

      newApprovedEdits.push({
        id: `edit-${Date.now()}-${f.id}`,
        brandId: brand.id,
        draftId,
        findingId: f.id,
        originalText: f.quote,
        approvedChange: f.suggestedFix,
        reason: f.explanation,
        relatedRuleOrFact: f.sourceLink || 'Brand Guideline',
        approvedBy: userRole === 'reviewer' ? 'Divyansh Chandra (Brand Lead)' : 'Aarav Sharma (Creator)',
        approvedByRole: userRole,
        approvedAt: new Date().toISOString(),
        category: f.issueType,
        usageCount: 1
      });
    }

    const appliedIds = new Set(pendingWithFix.map(f => f.id));
    const updatedFindings = draft.findings.map(f => 
      appliedIds.has(f.id) ? { ...f, status: 'Accepted' as const } : f
    );

    const updatedDraft = {
      ...draft,
      content: updatedContent,
      findings: updatedFindings,
      updatedAt: new Date().toISOString()
    };

    setAllDrafts(prev => prev.map(d => d.id === draftId ? updatedDraft : d));
    syncDraftToSupabase(updatedDraft).catch(() => {});

    setAllApprovedEdits(prev => [...newApprovedEdits, ...prev]);
    for (const e of newApprovedEdits) {
      syncApprovedEditToSupabase(e).catch(() => {});
    }

    const log: AuditLogEntry = {
      id: `audit-${Date.now()}`,
      draftId,
      authorId: userRole === 'reviewer' ? 'user-reviewer-1' : 'user-creator-1',
      authorName: userRole === 'reviewer' ? 'Divyansh Chandra' : 'Aarav Sharma',
      authorRole: userRole,
      action: 'apply_fix',
      summary: `Batch applied ${pendingWithFix.length} safe fixes automatically`,
      timestamp: new Date().toISOString()
    };
    setAllAuditLogs(prev => [log, ...prev]);

    return pendingWithFix.length;
  };

  const recordApprovedEdit = (editInput: Omit<ApprovedEdit, 'id' | 'approvedAt'>) => {
    const newEdit: ApprovedEdit = {
      ...editInput,
      brandId: editInput.brandId || brand.id,
      id: `edit-${Date.now()}`,
      approvedAt: new Date().toISOString()
    };
    setAllApprovedEdits(prev => [newEdit, ...prev]);
    syncApprovedEditToSupabase(newEdit).catch(() => {});
  };

  const ignoreFinding = (draftId: string, findingId: string) => {
    setAllDrafts(prev => prev.map(d => {
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
    setAllAuditLogs(prev => [log, ...prev]);
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

    setAllComments(prev => [newComment, ...prev]);

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
    setAllAuditLogs(prev => [log, ...prev]);
  };

  const resetToDefaults = () => {
    try {
      localStorage.clear();
    } catch {}
    setBrands(JSON.parse(JSON.stringify(INITIAL_BRANDS)));
    setSelectedBrandId(INITIAL_BRAND_PROFILE.id);
    setAllDrafts(JSON.parse(JSON.stringify(INITIAL_DRAFTS)));
    setCurrentDraftId(INITIAL_DRAFTS[0].id);
    setUserRole('creator');
    setAllComments(JSON.parse(JSON.stringify(INITIAL_COMMENTS)));
    setAllAuditLogs(JSON.parse(JSON.stringify(INITIAL_AUDIT_LOGS)));
    setAllApprovedEdits(JSON.parse(JSON.stringify(INITIAL_APPROVED_EDITS)));
    setActiveFindingId(null);
  };

  return (
    <AppContext.Provider
      value={{
        brands,
        brand,
        selectedBrandId,
        selectBrand,
        createBrand,
        updateBrand,
        deleteBrand,
        drafts,
        currentDraftId,
        currentDraft,
        setCurrentDraftId,
        createDraft,
        updateDraftContent,
        updateDraftStatus,
        applyFindingFix,
        applyAllFindingFixes,
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
        syncToCloud,
        restorePresetBrand
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
