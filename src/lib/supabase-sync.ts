import { supabase, isSupabaseConfigured } from './supabase';
import { BrandProfile, Draft, Finding, ApprovedEdit, AuditLogEntry } from '@/types';

export interface SupabaseSyncStatus {
  isConfigured: boolean;
  connected: boolean;
  tablesReady: boolean;
  message: string;
}

/**
 * Checks connection and schema availability on the connected Supabase instance
 */
export async function checkSupabaseStatus(): Promise<SupabaseSyncStatus> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      isConfigured: false,
      connected: false,
      tablesReady: false,
      message: 'Supabase credentials not fully configured.'
    };
  }

  try {
    const { error } = await supabase.from('brands').select('id').limit(1);

    if (error) {
      if (error.message.includes('schema cache') || error.code === 'PGRST205' || error.message.includes('does not exist')) {
        return {
          isConfigured: true,
          connected: true,
          tablesReady: false,
          message: 'Connected to Supabase! Run the schema.sql script in your SQL Editor to create tables.'
        };
      }
      return {
        isConfigured: true,
        connected: false,
        tablesReady: false,
        message: `Supabase error: ${error.message}`
      };
    }

    return {
      isConfigured: true,
      connected: true,
      tablesReady: true,
      message: 'Supabase connected and synchronized.'
    };
  } catch (err) {
    return {
      isConfigured: true,
      connected: false,
      tablesReady: false,
      message: err instanceof Error ? err.message : 'Unknown connection error'
    };
  }
}

/**
 * Sync brand profile, facts, terminology, and tone pillars to Supabase
 */
export async function syncBrandToSupabase(brand: BrandProfile): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error: brandErr } = await supabase.from('brands').upsert({
      id: brand.id,
      name: brand.name,
      tagline: brand.tagline,
      description: brand.description,
      voice_summary: brand.voiceSummary,
      updated_at: new Date().toISOString()
    });

    if (brandErr) return false;

    // Sync trusted facts
    if (brand.trustedFacts && brand.trustedFacts.length > 0) {
      await supabase.from('trusted_facts').upsert(
        brand.trustedFacts.map(f => ({
          id: f.id,
          brand_id: brand.id,
          topic: f.topic,
          claim_or_stat: f.claimOrStat,
          source: f.source,
          source_url: f.sourceUrl || null,
          verified_date: f.verifiedDate,
          source_doc: f.sourceDoc || null,
          page_number: f.pageNumber || null
        }))
      );
    }

    // Sync terminology rules
    const terminologyRows = [
      ...brand.prohibitedTerms.map(t => ({
        id: t.id,
        brand_id: brand.id,
        term: t.term,
        is_prohibited: true,
        reason: t.reason,
        suggested_alternative: t.suggestedAlternative,
        severity: t.severity,
        category: 'Prohibited Term',
        source_doc: t.sourceDoc || null,
        page_number: t.pageNumber || null
      })),
      ...brand.approvedTerms.map(t => ({
        id: t.id,
        brand_id: brand.id,
        term: t.term,
        is_prohibited: false,
        reason: t.preferredUsage,
        suggested_alternative: null,
        severity: 'low',
        category: t.category || 'Approved Term',
        source_doc: t.sourceDoc || null,
        page_number: t.pageNumber || null
      }))
    ];

    if (terminologyRows.length > 0) {
      await supabase.from('terminology_rules').upsert(terminologyRows);
    }

    // Sync tone guidelines
    if (brand.toneGuidelines && brand.toneGuidelines.length > 0) {
      await supabase.from('tone_guidelines').upsert(
        brand.toneGuidelines.map(tg => ({
          id: `tone-${brand.id}-${tg.attribute.toLowerCase().replace(/\s+/g, '-')}`,
          brand_id: brand.id,
          attribute: tg.attribute,
          description: tg.description,
          do_example: tg.doExample,
          dont_example: tg.dontExample,
          source_doc: tg.sourceDoc || null,
          page_number: tg.pageNumber || null
        }))
      );
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Sync approved edit to Supabase
 */
export async function syncApprovedEditToSupabase(edit: ApprovedEdit): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('approved_edits').upsert({
      id: edit.id,
      draft_id: edit.draftId,
      finding_id: edit.findingId || null,
      original_text: edit.originalText,
      approved_change: edit.approvedChange,
      reason: edit.reason,
      related_rule_or_fact: edit.relatedRuleOrFact || null,
      approved_by: edit.approvedBy,
      approved_by_role: edit.approvedByRole,
      approved_at: edit.approvedAt,
      category: edit.category || null,
      usage_count: edit.usageCount || 1
    });
    return !error;
  } catch {
    return false;
  }
}

/**
 * Sync draft and its findings to Supabase
 */
export async function syncDraftToSupabase(draft: Draft): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error: draftErr } = await supabase.from('drafts').upsert({
      id: draft.id,
      brand_id: draft.brandId,
      title: draft.title,
      content: draft.content,
      channel: draft.channel,
      target_audience: draft.targetAudience,
      creator_id: draft.creatorId,
      creator_name: draft.creatorName,
      reviewer_id: draft.reviewerId || null,
      reviewer_name: draft.reviewerName || null,
      review_status: draft.reviewStatus,
      version: draft.version,
      updated_at: draft.updatedAt
    });

    if (draftErr) return false;

    if (draft.findings && draft.findings.length > 0) {
      await supabase.from('findings').upsert(
        draft.findings.map(f => ({
          id: f.id,
          draft_id: draft.id,
          issue_type: f.issueType,
          severity: f.severity,
          quote: f.quote,
          start_index: f.startIndex,
          end_index: f.endIndex,
          explanation: f.explanation,
          source_link: f.sourceLink || null,
          suggested_fix: f.suggestedFix,
          status: f.status,
          evidence_type: f.evidenceType || null,
          detected_by: f.detectedBy || 'deterministic'
        }))
      );
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Sync audit log entry to Supabase
 */
export async function syncAuditLogToSupabase(log: AuditLogEntry): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('audit_logs').upsert({
      id: log.id,
      draft_id: log.draftId,
      author_id: log.authorId,
      author_name: log.authorName,
      author_role: log.authorRole,
      action: log.action,
      summary: log.summary,
      timestamp: log.timestamp
    });
    return !error;
  } catch {
    return false;
  }
}

/**
 * Fetch remote state from Supabase if tables exist
 */
export async function fetchRemoteStateFromSupabase(): Promise<{
  brand?: BrandProfile;
  approvedEdits?: ApprovedEdit[];
  drafts?: Draft[];
  auditLogs?: AuditLogEntry[];
} | null> {
  if (!supabase) return null;
  try {
    const status = await checkSupabaseStatus();
    if (!status.tablesReady) return null;

    const [brandRes, factsRes, termRes, toneRes, editsRes, draftsRes, findingsRes, auditRes] = await Promise.all([
      supabase.from('brands').select('*').limit(1),
      supabase.from('trusted_facts').select('*'),
      supabase.from('terminology_rules').select('*'),
      supabase.from('tone_guidelines').select('*'),
      supabase.from('approved_edits').select('*').order('approved_at', { ascending: false }),
      supabase.from('drafts').select('*').order('created_at', { ascending: false }),
      supabase.from('findings').select('*'),
      supabase.from('audit_logs').select('*').order('timestamp', { ascending: false })
    ]);

    if (brandRes.error || !brandRes.data || brandRes.data.length === 0) {
      return null;
    }

    const brandData = brandRes.data[0];
    const facts = (factsRes.data || []).map(f => ({
      id: f.id,
      topic: f.topic,
      claimOrStat: f.claim_or_stat,
      source: f.source,
      sourceUrl: f.source_url || undefined,
      verifiedDate: f.verified_date,
      sourceDoc: f.source_doc || undefined,
      pageNumber: f.page_number || undefined
    }));

    const prohibitedTerms = (termRes.data || [])
      .filter(t => t.is_prohibited)
      .map(t => ({
        id: t.id,
        term: t.term,
        reason: t.reason || '',
        suggestedAlternative: t.suggested_alternative || '',
        severity: (t.severity || 'medium') as 'high' | 'medium' | 'low',
        category: t.category || 'Vocabulary',
        sourceDoc: t.source_doc || undefined,
        pageNumber: t.page_number || undefined
      }));

    const approvedTerms: import('@/types').ApprovedTerm[] = (termRes.data || [])
      .filter(t => !t.is_prohibited)
      .map(t => ({
        id: t.id,
        term: t.term,
        preferredUsage: t.reason || '',
        category: t.category || 'Approved Term',
        sourceDoc: t.source_doc || undefined,
        pageNumber: t.page_number || undefined
      }));

    const toneGuidelines: import('@/types').ToneGuideline[] = (toneRes.data || []).map(tg => ({
      attribute: tg.attribute,
      description: tg.description,
      doExample: tg.do_example,
      dontExample: tg.dont_example,
      sourceDoc: tg.source_doc || undefined,
      pageNumber: tg.page_number || undefined
    }));

    const fullBrand: BrandProfile = {
      id: brandData.id,
      name: brandData.name,
      tagline: brandData.tagline || '',
      description: brandData.description || '',
      voiceSummary: brandData.voice_summary,
      toneGuidelines,
      prohibitedTerms,
      approvedTerms,
      trustedFacts: facts,
      createdAt: brandData.created_at || new Date().toISOString(),
      updatedAt: brandData.updated_at
    };

    const allFindings = findingsRes.data || [];
    const drafts: Draft[] = (draftsRes.data || []).map(d => ({
      id: d.id,
      brandId: d.brand_id,
      title: d.title,
      content: d.content,
      channel: d.channel || 'Blog Post',
      targetAudience: d.target_audience || 'General Audience',
      creatorId: d.creator_id,
      creatorName: d.creator_name,
      reviewerId: d.reviewer_id || undefined,
      reviewerName: d.reviewer_name || undefined,
      reviewStatus: d.review_status,
      version: d.version || 1,
      createdAt: d.created_at,
      updatedAt: d.updated_at,
      findings: allFindings.filter(f => f.draft_id === d.id).map(f => ({
        id: f.id,
        draftId: f.draft_id,
        issueType: f.issue_type,
        severity: f.severity,
        quote: f.quote,
        startIndex: f.start_index,
        endIndex: f.end_index,
        explanation: f.explanation,
        sourceLink: f.source_link || undefined,
        suggestedFix: f.suggested_fix,
        status: f.status,
        evidenceType: f.evidence_type || 'official_rule',
        detectedBy: f.detected_by || 'deterministic',
        createdAt: f.created_at || new Date().toISOString()
      }))
    }));

    const approvedEdits: ApprovedEdit[] = (editsRes.data || []).map(e => ({
      id: e.id,
      draftId: e.draft_id,
      findingId: e.finding_id || undefined,
      originalText: e.original_text,
      approvedChange: e.approved_change,
      reason: e.reason,
      relatedRuleOrFact: e.related_rule_or_fact || undefined,
      approvedBy: e.approved_by,
      approvedByRole: e.approved_by_role as 'creator' | 'reviewer',
      approvedAt: e.approved_at,
      category: e.category || undefined,
      usageCount: e.usage_count || 1
    }));

    const auditLogs: AuditLogEntry[] = (auditRes.data || []).map(a => ({
      id: a.id,
      draftId: a.draft_id,
      authorId: a.author_id,
      authorName: a.author_name,
      authorRole: a.author_role as 'creator' | 'reviewer',
      action: a.action,
      summary: a.summary,
      timestamp: a.timestamp
    }));

    return {
      brand: fullBrand,
      drafts: drafts.length > 0 ? drafts : undefined,
      approvedEdits: approvedEdits.length > 0 ? approvedEdits : undefined,
      auditLogs: auditLogs.length > 0 ? auditLogs : undefined
    };
  } catch {
    return null;
  }
}
