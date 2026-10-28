'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useApp } from '@/lib/store';
import { StatusBadge } from '@/components/StatusBadge';
import { FindingCard } from '@/components/FindingCard';
import { 
  Send, 
  CheckCircle2, 
  Sparkles, 
  AlertTriangle, 
  SlidersHorizontal,
  FileText,
  Plus,
  Award,
  Upload,
  Download,
  Copy,
  Check,
  X
} from 'lucide-react';
import { analyzeDraftContent } from '@/lib/retrieval-engine';
import { IssueSeverity, IssueType } from '@/types';

const getBrandSamples = (brandName: string) => {
  const lower = brandName.toLowerCase();
  if (lower.includes('nuvia')) {
    return [
      {
        id: 'nuvia-risky',
        label: 'Risky Ad Copy',
        title: 'Nuvia Skin - Risky Campaign Draft',
        content: `Introducing the world's best skincare. Our miracle cure provides an instant face lift and permanently removes all wrinkles. Guaranteed acne-free skin in 24 hours that erases scars and cures eczema. It is 100% organic and completely chemical-free.`
      },
      {
        id: 'nuvia-compliant',
        label: 'Compliant Routine',
        title: 'Nuvia Skin - Verified Daily Routine',
        content: `Formulated with 5% niacinamide and 2% hyaluronic acid, this targeted treatment visibly smooths the appearance of fine lines and helps clarify blemish-prone skin. Clinical study protocol NUV-2025-01 demonstrated 94% improvement in skin hydration over 14 days under ISO 17025 certification.`
      }
    ];
  }

  // Default to EchoStream / Audio
  return [
    {
      id: 'audio-risky',
      label: 'Risky Ad Copy',
      title: 'EchoStream Pro - Unaudited Ad Copy',
      content: `Experience revolutionary acoustic clarity with our newest wireless audio headphones. Made entirely from recycled plastic, these headphones offer 75-hour continuous battery life with quick charging. We guarantee unbreakable build quality that outlasts any competitor. It's the most eco-friendly audio gear on the market today.`
    },
    {
      id: 'audio-compliant',
      label: 'Compliant Launch',
      title: 'EchoStream Pro - Verified Product Announcement',
      content: `Experience thoughtful acoustic engineering with our newest wireless headphones. Crafted with 80% certified post-consumer recycled plastic, these headphones provide up to 48 hours of tested battery life. Designed for drop resilience up to 2 meters with repairable modular components.`
    }
  ];
};

export default function DashboardPage() {
  const {
    brand,
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
    comments,
    addComment,
    approvedEdits,
    activeFindingId,
    setActiveFindingId,
  } = useApp();

  const [commentText, setCommentText] = useState('');
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditMessage, setAuditMessage] = useState<string | null>(null);
  const [isFallbackActive, setIsFallbackActive] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [copiedCert, setCopiedCert] = useState(false);
  const [copiedCopy, setCopiedCopy] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'resolved'>('all');
  const [severityFilter, setSeverityFilter] = useState<IssueSeverity | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<IssueType | 'all'>('all');

  // Automatically recalculate compliance against the actual current draft content on edit/refresh
  React.useEffect(() => {
    if (!currentDraft || !currentDraft.content.trim()) return;

    // Scan current content against rules and facts
    const live = analyzeDraftContent(currentDraft.id, currentDraft.content, brand, approvedEdits);
    const lowerContent = currentDraft.content.toLowerCase();

    // Check which live violations are not in findings
    const currentFindingQuotes = new Set(currentDraft.findings.map(f => f.quote.toLowerCase().trim()));
    const unrecordedLive = live.filter(f => !currentFindingQuotes.has(f.quote.toLowerCase().trim()));

    // Check for stale pending findings whose text was edited away
    const staleFindings = currentDraft.findings.filter(f => 
      f.status === 'Pending' && !lowerContent.includes(f.quote.toLowerCase().trim())
    );

    // If there are unrecorded live violations in the text OR stale findings to clean up
    if (unrecordedLive.length > 0 || staleFindings.length > 0) {
      const validExisting = currentDraft.findings.filter(f => 
        lowerContent.includes(f.quote.toLowerCase().trim()) || f.status === 'Accepted'
      );
      setDraftFindings(currentDraft.id, [...validExisting, ...unrecordedLive]);
    }
  }, [currentDraft?.id, currentDraft?.content, brand, approvedEdits]);

  const handleRunAudit = async () => {
    if (!currentDraft || isAuditing) return;
    setIsAuditing(true);
    setAuditMessage(null);
    try {
      const res = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          draftId: currentDraft.id,
          content: currentDraft.content,
          brand,
          approvedEdits
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.findings) {
          setDraftFindings(currentDraft.id, data.findings);
        }
        
        setIsFallbackActive(Boolean(data.isFallback));

        if (data.isFallback) {
          setAuditMessage('Deterministic Engine Fallback: AI review was unavailable. Findings evaluated using local rule engine.');
        } else if (data.outcome === 'INSUFFICIENT_EVIDENCE') {
          setAuditMessage('Insufficient evidence: No matching brand rules or verified facts found for this content.');
        } else if (data.outcome === 'CLEAN') {
          setAuditMessage('Audit complete: 0 issues found. Content is 100% compliant with brand rules and trusted facts.');
        } else {
          setAuditMessage(data.summary || null);
        }
      } else {
        setIsFallbackActive(true);
        const freshFindings = analyzeDraftContent(currentDraft.id, currentDraft.content, brand, approvedEdits);
        setDraftFindings(currentDraft.id, freshFindings);
        setAuditMessage('Deterministic Engine Fallback: AI review endpoint unavailable. Evaluated via local rule engine.');
      }
    } catch {
      setIsFallbackActive(true);
      const freshFindings = analyzeDraftContent(currentDraft.id, currentDraft.content, brand, approvedEdits);
      setDraftFindings(currentDraft.id, freshFindings);
      setAuditMessage('Deterministic Engine Fallback: Network issue. Evaluated via local rule engine.');
    } finally {
      setIsAuditing(false);
    }
  };

  const handleApplyFix = (draftId: string, findingId: string) => {
    const finding = currentDraft?.findings.find(f => f.id === findingId);
    applyFindingFix(draftId, findingId);
    if (finding) {
      setActionFeedback(`Applied fix for: "${finding.quote}" → "${finding.suggestedFix}"`);
      setTimeout(() => setActionFeedback(null), 4500);
    }
  };

  const handleIgnore = (draftId: string, findingId: string) => {
    const finding = currentDraft?.findings.find(f => f.id === findingId);
    ignoreFinding(draftId, findingId);
    if (finding) {
      setActionFeedback(`Ignored issue: "${finding.quote}"`);
      setTimeout(() => setActionFeedback(null), 4500);
    }
  };

  const handleApplyAllFixes = () => {
    if (!currentDraft) return;
    const count = applyAllFindingFixes(currentDraft.id);
    if (count > 0) {
      setActionFeedback(`Applied ${count} safe brand-compliant replacements automatically!`);
      setTimeout(() => setActionFeedback(null), 5000);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentDraft) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text === 'string') {
        updateDraftContent(currentDraft.id, text);
        setActionFeedback(`Imported content from ${file.name}`);
        setTimeout(() => setActionFeedback(null), 4000);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleLoadSample = (sample: { id: string; label: string; title: string; content: string }) => {
    if (!currentDraft) return;
    updateDraftContent(currentDraft.id, sample.content);
    setActionFeedback(`Loaded sample draft: "${sample.label}"`);
    setTimeout(() => setActionFeedback(null), 4000);
  };

  const generateCertificateMarkdown = () => {
    if (!currentDraft) return '';
    const now = new Date().toLocaleString();
    const statusText = metrics.isCompliant ? 'APPROVED FOR PUBLICATION (CLEAN & COMPLIANT)' : 'PENDING REMEDIATION';
    const citedSources = Array.from(
      new Set(
        currentDraft.findings
          .flatMap(f => f.evidence?.map(e => `${e.title} — ${e.sourceDoc || 'Brand Guide'}${e.pageNumber ? ` (p.${e.pageNumber})` : ''}`) || [])
          .filter(Boolean)
      )
    );

    return `# Brand Sutra Compliance Clearance Certificate
**Brand:** ${brand.name}
**Draft Title:** ${currentDraft.title}
**Status:** ${statusText}
**Generated:** ${now}
**Audited By:** Brand Sutra AI Governance Engine

---

## 1. Compliance Summary
- **Overall Verdict:** ${metrics.isCompliant ? 'APPROVED FOR PUBLICATION' : 'NON-COMPLIANT'}
- **Review Progress:** ${metrics.progressPercent}% (${metrics.resolved}/${metrics.total} issues reviewed)
- **Active Copy Violations:** ${metrics.activeViolationsCount}
- **Accepted Fixes:** ${metrics.accepted}

---

## 2. Ground-Truth Evidence Cited
${citedSources.length > 0 ? citedSources.map(s => `- ${s}`).join('\n') : '- Official Brand Governance Rules & Verified Facts'}

---

## 3. Approved Final Copy
\`\`\`text
${currentDraft.content}
\`\`\`
`;
  };

  const handleDownloadCertificate = () => {
    const markdown = generateCertificateMarkdown();
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(currentDraft?.title || 'Draft').replace(/[^a-zA-Z0-9_-]/g, '_')}_compliance_certificate.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !currentDraft) return;
    addComment(currentDraft.id, commentText.trim());
    setCommentText('');
  };

  // Findings Breakdown Metrics & Live Content Compliance
  const metrics = useMemo(() => {
    if (!currentDraft) {
      return {
        total: 0,
        pending: 0,
        resolved: 0,
        accepted: 0,
        ignored: 0,
        high: 0,
        medium: 0,
        low: 0,
        progressPercent: 100,
        types: [] as IssueType[],
        isCompliant: true,
        activeViolationsCount: 0,
        ignoredViolationsStillInCopy: 0
      };
    }

    const total = currentDraft.findings.length;
    const pending = currentDraft.findings.filter(f => f.status === 'Pending').length;
    const accepted = currentDraft.findings.filter(f => f.status === 'Accepted').length;
    const ignored = currentDraft.findings.filter(f => f.status === 'Ignored').length;
    const resolved = total - pending;
    const high = currentDraft.findings.filter(f => f.severity === 'high' && f.status === 'Pending').length;
    const medium = currentDraft.findings.filter(f => f.severity === 'medium' && f.status === 'Pending').length;
    const low = currentDraft.findings.filter(f => f.severity === 'low' && f.status === 'Pending').length;
    const progressPercent = total > 0 ? Math.round((resolved / total) * 100) : 100;
    const types = Array.from(new Set(currentDraft.findings.map(f => f.issueType)));

    // Live scan against the actual current content in the editor
    const liveViolations = analyzeDraftContent(currentDraft.id, currentDraft.content, brand, approvedEdits);

    // Track any ignored findings whose non-compliant text is STILL present in the draft copy
    const lowerContent = currentDraft.content.toLowerCase();
    const ignoredStillPresent = currentDraft.findings.filter(f => 
      f.status === 'Ignored' && lowerContent.includes(f.quote.toLowerCase().trim())
    );

    // Content is ONLY Clean & Compliant if:
    // 1. Live scan against current text returns 0 violations
    // 2. No pending open findings exist
    // 3. No ignored violations remain present in the text
    const isCompliant = liveViolations.length === 0 && pending === 0 && ignoredStillPresent.length === 0;
    const activeViolationsCount = Math.max(liveViolations.length, pending + ignoredStillPresent.length);

    return { 
      total, 
      pending, 
      resolved, 
      accepted,
      ignored,
      high, 
      medium, 
      low, 
      progressPercent, 
      types,
      isCompliant,
      activeViolationsCount,
      ignoredViolationsStillInCopy: ignoredStillPresent.length
    };
  }, [currentDraft, brand, approvedEdits]);

  // Filtered Findings
  const displayedFindings = useMemo(() => {
    if (!currentDraft) return [];
    return currentDraft.findings.filter(f => {
      // Status filter
      if (statusFilter === 'pending' && f.status !== 'Pending') return false;
      if (statusFilter === 'resolved' && f.status === 'Pending') return false;
      // Severity filter
      if (severityFilter !== 'all' && f.severity !== severityFilter) return false;
      // Type filter
      if (typeFilter !== 'all' && f.issueType !== typeFilter) return false;
      return true;
    });
  }, [currentDraft, statusFilter, severityFilter, typeFilter]);

  if (!currentDraft) {
    return (
      <div className="max-w-xl mx-auto py-20 px-6 text-center space-y-4">
        <div className="w-12 h-12 rounded-xl bg-[#171717] border border-[#262626] mx-auto flex items-center justify-center text-white">
          <FileText className="w-6 h-6 text-[#a3a3a3]" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-white tracking-tight">
            No drafts yet for {brand.name}
          </h2>
          <p className="text-xs text-[#8a8a8a] max-w-md mx-auto">
            Create your first draft or upload brand guidelines in Rules & Facts to begin auditing content.
          </p>
        </div>
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            type="button"
            id="btn-create-first-draft"
            onClick={() => {
              createDraft({
                title: `${brand.name} Launch Announcement`,
                content: `Introducing our latest release, crafted with verified standards and uncompromising attention to detail.`,
                channel: 'Product Announcement'
              });
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white text-black text-xs font-semibold hover:bg-[#e5e5e5] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create First Draft</span>
          </button>
          <Link
            href="/rules"
            className="px-4 py-2 rounded-lg bg-[#171717] hover:bg-[#222222] border border-[#262626] text-xs font-medium text-white transition-colors"
          >
            Manage Rules & Facts →
          </Link>
        </div>
      </div>
    );
  }

  const draftComments = comments.filter(c => c.draftId === currentDraft.id);
  const wordsCount = currentDraft.content.split(/\s+/).filter(Boolean).length;
  const charsCount = currentDraft.content.length;
  const activeFinding = currentDraft.findings.find(f => f.id === activeFindingId);

  return (
    <div className="space-y-6">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#262626]">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-lg md:text-xl font-semibold text-white tracking-tight">
              {currentDraft.title}
            </h1>
            <StatusBadge status={currentDraft.reviewStatus} />
          </div>
          <div className="flex items-center gap-2 text-xs text-[#8a8a8a] mt-1 flex-wrap">
            <span>Author: <strong className="text-[#d4d4d4] font-normal">{currentDraft.creatorName}</strong></span>
            <span>•</span>
            <span>Channel: <strong className="text-[#d4d4d4] font-normal">{currentDraft.channel}</strong></span>
            {currentDraft.targetAudience && (
              <>
                <span>•</span>
                <span>Audience: <strong className="text-[#d4d4d4] font-normal">{currentDraft.targetAudience}</strong></span>
              </>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Draft switch */}
          <select
            value={currentDraftId}
            onChange={(e) => setCurrentDraftId(e.target.value)}
            className="text-xs bg-[#121212] border border-[#262626] rounded px-3 py-1.5 text-[#ededed] focus:border-[#525252] outline-none"
          >
            {drafts.map((d) => (
              <option key={d.id} value={d.id}>
                {d.title} ({d.reviewStatus})
              </option>
            ))}
          </select>

          {/* Quick Run Audit button in header */}
          <button
            id="btn-top-run-audit"
            type="button"
            disabled={isAuditing}
            onClick={handleRunAudit}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#ededed] bg-[#1a1a1a] hover:bg-[#262626] border border-[#333333] rounded transition-colors disabled:opacity-50"
            title="Trigger brand compliance audit"
          >
            <Sparkles className={`w-3 h-3 text-[#a3a3a3] ${isAuditing ? 'animate-spin' : ''}`} />
            <span>{isAuditing ? 'Auditing...' : 'Run Audit'}</span>
          </button>

          {/* File text import */}
          <label 
            id="btn-import-draft-file"
            title="Import text or markdown draft file"
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[#ededed] bg-[#1a1a1a] hover:bg-[#262626] border border-[#333333] rounded transition-colors cursor-pointer"
          >
            <Upload className="w-3 h-3 text-[#a3a3a3]" />
            <span>Import</span>
            <input 
              type="file" 
              accept=".txt,.md" 
              className="hidden" 
              onChange={handleFileUpload} 
            />
          </label>

          {/* Export Certificate button */}
          <button
            id="btn-export-certificate"
            type="button"
            onClick={() => setShowCertificateModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[#ededed] bg-[#1a1a1a] hover:bg-[#262626] border border-[#333333] rounded transition-colors"
            title="Export official compliance clearance certificate"
          >
            <Award className="w-3.5 h-3.5 text-[#d4af37]" />
            <span>Certificate</span>
          </button>

          {/* Role-based status action */}
          {userRole === 'creator' && currentDraft.reviewStatus !== 'In Review' && currentDraft.reviewStatus !== 'Approved' && (
            <button
              id="btn-submit-review"
              type="button"
              onClick={() => updateDraftStatus(currentDraft.id, 'In Review')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-black bg-white hover:bg-[#d4d4d4] rounded transition-colors"
            >
              <Send className="w-3 h-3" />
              Submit For Review
            </button>
          )}

          {userRole === 'reviewer' && (
            <div className="flex items-center gap-1.5">
              <button
                id="btn-request-changes"
                type="button"
                onClick={() => updateDraftStatus(currentDraft.id, 'Changes Requested')}
                className="px-2.5 py-1.5 text-xs font-medium text-[#d4d4d4] bg-[#1a1a1a] hover:bg-[#262626] border border-[#333333] rounded transition-colors"
              >
                Request Changes
              </button>
              <button
                id="btn-approve"
                type="button"
                onClick={() => updateDraftStatus(currentDraft.id, 'Approved')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-black bg-white hover:bg-[#d4d4d4] rounded transition-colors"
              >
                <CheckCircle2 className="w-3 h-3" />
                Approve Draft
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Action Feedback Banner */}
      {actionFeedback && (
        <div className="p-2.5 rounded text-xs bg-[#171717] border border-[#333333] text-white flex items-center justify-between transition-all">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#ededed]" />
            <span>{actionFeedback}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setActionFeedback(null)} 
            className="text-[11px] text-[#737373] hover:text-white ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* 2. Main 2-Column Responsive Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Draft Editor & Notes (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Editor Container */}
          <div className="rounded-lg bg-[#121212] border border-[#262626] p-4 space-y-3">
            <div className="flex items-center justify-between text-xs text-[#8a8a8a] pb-1 border-b border-[#1f1f1f] flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white">Draft Copy</span>
                <span>•</span>
                <span>{wordsCount} words</span>
                <span>•</span>
                <span>{charsCount} chars</span>
              </div>

              <button
                id="btn-recheck-draft"
                type="button"
                disabled={isAuditing}
                onClick={handleRunAudit}
                className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-black bg-white hover:bg-[#d4d4d4] rounded transition-all shadow-sm disabled:opacity-50"
                title="Evaluate draft against official evidence using Groq RAG pipeline"
              >
                <Sparkles className={`w-3.5 h-3.5 text-black ${isAuditing ? 'animate-spin' : ''}`} />
                <span>{isAuditing ? 'Auditing Draft...' : 'Run Brand Audit'}</span>
              </button>
            </div>

            {/* Audit Status / Fallback Notice */}
            {auditMessage && (
              <div className={`p-2.5 rounded text-xs flex items-center justify-between border ${
                isFallbackActive
                  ? 'bg-[#181512] border-[#423326] text-[#e0cfbe]'
                  : 'bg-[#171717] border-[#2a2a2a] text-[#a3a3a3]'
              }`}>
                <div className="flex items-center gap-2">
                  {isFallbackActive ? (
                    <AlertTriangle className="w-4 h-4 text-[#d4af37] shrink-0" />
                  ) : (
                    <FileText className="w-4 h-4 text-[#8a8a8a] shrink-0" />
                  )}
                  <span className="leading-relaxed">{auditMessage}</span>
                </div>
                <button 
                  type="button" 
                  onClick={() => {
                    setAuditMessage(null);
                    setIsFallbackActive(false);
                  }}
                  className="text-[10px] text-[#737373] hover:text-white ml-2 shrink-0"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Selected Finding Callout */}
            {activeFinding && activeFinding.status === 'Pending' && (
              <div className="p-2 rounded bg-[#161616] border border-[#333333] text-xs flex items-center justify-between">
                <div className="flex items-center gap-2 truncate">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[#8a8a8a] bg-[#0c0c0c] px-1.5 py-0.5 rounded border border-[#222]">
                    Selected Issue
                  </span>
                  <span className="text-[#ededed] font-mono truncate">
                    &ldquo;{activeFinding.quote}&rdquo;
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveFindingId(null)}
                  className="text-[10px] text-[#737373] hover:text-white ml-2 shrink-0"
                >
                  Clear Selection
                </button>
              </div>
            )}

            {/* Quick Sample Draft Presets */}
            <div className="flex items-center justify-between gap-2 pt-1 pb-1 flex-wrap">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] text-[#8a8a8a] font-mono">Sample Drafts:</span>
                {getBrandSamples(brand.name).map((sample) => (
                  <button
                    key={sample.id}
                    type="button"
                    onClick={() => handleLoadSample(sample)}
                    className="px-2 py-0.5 text-[11px] font-medium bg-[#171717] hover:bg-[#222222] border border-[#2a2a2a] hover:border-[#444] text-[#d4d4d4] rounded transition-colors"
                    title={`Load "${sample.title}"`}
                  >
                    {sample.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Textarea */}
            <textarea
              id="draft-content-textarea"
              value={currentDraft.content}
              onChange={(e) => updateDraftContent(currentDraft.id, e.target.value)}
              rows={12}
              className="w-full bg-[#0a0a0a] border border-[#262626] rounded p-3 text-sm leading-relaxed text-[#ededed] placeholder:text-[#525252] focus:border-[#525252] font-mono resize-y outline-none"
              placeholder="Paste or write your marketing draft here..."
            />
          </div>

          {/* Review Notes & Feedback */}
          <div className="rounded-lg bg-[#121212] border border-[#262626] p-4">
            <div className="flex items-center justify-between mb-3 text-xs">
              <span className="font-semibold text-white">
                Review Notes & Feedback ({draftComments.length})
              </span>
              <span className="text-[#737373]">
                {draftComments.length} note{draftComments.length === 1 ? '' : 's'} recorded
              </span>
            </div>

            <div className="space-y-2 mb-3 max-h-48 overflow-y-auto pr-1">
              {draftComments.length === 0 ? (
                <div className="text-xs text-[#737373] py-3 text-center border border-dashed border-[#222222] rounded">
                  No review notes yet. Add feedback or revision requests below.
                </div>
              ) : (
                draftComments.map((comm) => (
                  <div key={comm.id} className="text-xs p-2.5 rounded bg-[#0a0a0a] border border-[#242424] space-y-1">
                    <div className="flex items-center justify-between text-[#8a8a8a] text-[11px]">
                      <span className="font-medium text-[#d4d4d4]">{comm.authorName}</span>
                      <span suppressHydrationWarning className="text-[#737373]">
                        {new Date(comm.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-[#cccccc] leading-relaxed">{comm.content}</p>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleCommentSubmit} className="flex gap-2">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add reviewer guidance or draft feedback..."
                className="flex-1 bg-[#0a0a0a] border border-[#262626] rounded px-3 py-1.5 text-xs text-[#ededed] placeholder:text-[#525252] focus:border-[#525252] outline-none"
              />
              <button
                type="submit"
                disabled={!commentText.trim()}
                className="px-3.5 py-1.5 text-xs font-medium text-black bg-white hover:bg-[#d4d4d4] disabled:opacity-40 rounded transition-colors"
              >
                Send Note
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Audit Summary, Filters & Findings (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Audit Summary Card */}
          <div className="rounded-lg bg-[#121212] border border-[#262626] p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#a3a3a3]">
                  Audit Summary
                </h2>
                <div className="text-base font-semibold tracking-tight mt-0.5">
                  {metrics.isCompliant ? (
                    <span className="flex items-center gap-1.5 text-white">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      Clean & Compliant
                    </span>
                  ) : (
                    <div>
                      <span className="flex items-center gap-1.5 text-white">
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>Non-Compliant ({metrics.activeViolationsCount} Issue{metrics.activeViolationsCount === 1 ? '' : 's'})</span>
                      </span>
                      {metrics.ignoredViolationsStillInCopy > 0 && (
                        <p className="text-[10px] text-[#8a8a8a] font-normal mt-0.5">
                          ({metrics.ignoredViolationsStillInCopy} issue{metrics.ignoredViolationsStillInCopy === 1 ? '' : 's'} dismissed without fix)
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Review Progress Pill */}
              <div className="text-right">
                <span className="text-[11px] font-mono text-[#a3a3a3]">
                  Reviewed: {metrics.resolved} of {metrics.total} ({metrics.progressPercent}%)
                </span>
                <div className="w-28 h-1.5 bg-[#222222] rounded-full mt-1 overflow-hidden ml-auto">
                  <div 
                    className="h-full bg-white transition-all duration-300" 
                    style={{ width: `${metrics.progressPercent}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Severity Breakdown Bar */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#1f1f1f]">
              <div 
                onClick={() => setSeverityFilter(severityFilter === 'high' ? 'all' : 'high')}
                className={`p-2 rounded text-center border cursor-pointer transition-colors ${
                  severityFilter === 'high'
                    ? 'bg-[#222222] border-white text-white'
                    : 'bg-[#0a0a0a] border-[#222222] hover:border-[#383838] text-[#a3a3a3]'
                }`}
              >
                <div className="text-[10px] uppercase font-mono tracking-wider">High Severity</div>
                <div className="text-sm font-semibold text-white mt-0.5">{metrics.high}</div>
              </div>

              <div 
                onClick={() => setSeverityFilter(severityFilter === 'medium' ? 'all' : 'medium')}
                className={`p-2 rounded text-center border cursor-pointer transition-colors ${
                  severityFilter === 'medium'
                    ? 'bg-[#222222] border-white text-white'
                    : 'bg-[#0a0a0a] border-[#222222] hover:border-[#383838] text-[#a3a3a3]'
                }`}
              >
                <div className="text-[10px] uppercase font-mono tracking-wider">Medium</div>
                <div className="text-sm font-semibold text-white mt-0.5">{metrics.medium}</div>
              </div>

              <div 
                onClick={() => setSeverityFilter(severityFilter === 'low' ? 'all' : 'low')}
                className={`p-2 rounded text-center border cursor-pointer transition-colors ${
                  severityFilter === 'low'
                    ? 'bg-[#222222] border-white text-white'
                    : 'bg-[#0a0a0a] border-[#222222] hover:border-[#383838] text-[#a3a3a3]'
                }`}
              >
                <div className="text-[10px] uppercase font-mono tracking-wider">Low</div>
                <div className="text-sm font-semibold text-white mt-0.5">{metrics.low}</div>
              </div>
            </div>

            {/* Batch Fix Action */}
            {currentDraft.findings.filter(f => f.status === 'Pending' && Boolean(f.suggestedFix && f.suggestedFix.trim())).length > 0 && (
              <div className="pt-2 border-t border-[#1f1f1f]">
                <button
                  id="btn-apply-all-fixes"
                  type="button"
                  onClick={handleApplyAllFixes}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold text-black bg-white hover:bg-[#d4d4d4] rounded transition-all shadow-sm"
                >
                  <Sparkles className="w-3.5 h-3.5 text-black" />
                  <span>Apply All Safe Fixes ({currentDraft.findings.filter(f => f.status === 'Pending' && Boolean(f.suggestedFix && f.suggestedFix.trim())).length})</span>
                </button>
              </div>
            )}

            {/* Filter Toolbar */}
            <div className="pt-2 border-t border-[#1f1f1f] space-y-2">
              <div className="flex items-center justify-between text-[11px] text-[#737373]">
                <span className="flex items-center gap-1">
                  <SlidersHorizontal className="w-3 h-3" />
                  Filter Findings
                </span>
                {(statusFilter !== 'all' || severityFilter !== 'all' || typeFilter !== 'all') && (
                  <button
                    type="button"
                    onClick={() => {
                      setStatusFilter('all');
                      setSeverityFilter('all');
                      setTypeFilter('all');
                    }}
                    className="text-[10px] text-[#a3a3a3] hover:text-white underline underline-offset-2"
                  >
                    Reset Filters
                  </button>
                )}
              </div>

              {/* Status Pills */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                    statusFilter === 'all'
                      ? 'bg-white text-black font-medium'
                      : 'bg-[#171717] text-[#8a8a8a] hover:text-white border border-[#262626]'
                  }`}
                >
                  All ({metrics.total})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('pending')}
                  className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                    statusFilter === 'pending'
                      ? 'bg-white text-black font-medium'
                      : 'bg-[#171717] text-[#8a8a8a] hover:text-white border border-[#262626]'
                  }`}
                >
                  Open ({metrics.pending})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('resolved')}
                  className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                    statusFilter === 'resolved'
                      ? 'bg-white text-black font-medium'
                      : 'bg-[#171717] text-[#8a8a8a] hover:text-white border border-[#262626]'
                  }`}
                >
                  Resolved ({metrics.resolved})
                </button>
              </div>

              {/* Type Filter dropdown if multiple issue types present */}
              {metrics.types.length > 1 && (
                <div className="pt-1">
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value as any)}
                    className="w-full text-xs bg-[#0a0a0a] border border-[#262626] rounded px-2.5 py-1 text-[#ededed] focus:border-[#525252] outline-none"
                  >
                    <option value="all">All Issue Categories ({metrics.types.length})</option>
                    {metrics.types.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Findings List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs px-1 text-[#8a8a8a]">
              <span>
                Showing {displayedFindings.length} of {metrics.total} finding{metrics.total === 1 ? '' : 's'}
              </span>
              {statusFilter !== 'all' && (
                <span className="font-mono text-[11px]">
                  Filtered by: {statusFilter}
                </span>
              )}
            </div>

            {displayedFindings.length === 0 ? (
              <div className="rounded-lg bg-[#121212] border border-[#262626] p-8 text-center space-y-2">
                <CheckCircle2 className="w-6 h-6 text-[#ededed] mx-auto opacity-70" />
                <div className="text-xs font-medium text-white">
                  {metrics.isCompliant
                    ? 'All brand rules and verified facts are satisfied.'
                    : 'No findings match your current filters.'}
                </div>
                <p className="text-[11px] text-[#737373]">
                  {metrics.isCompliant
                    ? 'Draft adheres to verified brand rules and official lab benchmarks.'
                    : 'Try clearing the severity or status filter to see all findings.'}
                </p>
                {(statusFilter !== 'all' || severityFilter !== 'all' || typeFilter !== 'all') && (
                  <button
                    type="button"
                    onClick={() => {
                      setStatusFilter('all');
                      setSeverityFilter('all');
                      setTypeFilter('all');
                    }}
                    className="mt-2 text-xs text-white bg-[#1a1a1a] hover:bg-[#262626] border border-[#333333] px-3 py-1 rounded transition-colors"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            ) : (
              displayedFindings.map((finding) => {
                const matchingPrecedent = approvedEdits.find(e => 
                  e.originalText.toLowerCase().trim() === finding.quote.toLowerCase().trim() ||
                  e.findingId === finding.id ||
                  finding.quote.toLowerCase().includes(e.originalText.toLowerCase()) ||
                  e.originalText.toLowerCase().includes(finding.quote.toLowerCase())
                );

                return (
                  <FindingCard
                    key={finding.id}
                    finding={finding}
                    isActive={activeFindingId === finding.id}
                    historicalPrecedent={matchingPrecedent}
                    onSelect={() => setActiveFindingId(finding.id)}
                    onAccept={() => handleApplyFix(currentDraft.id, finding.id)}
                    onIgnore={() => handleIgnore(currentDraft.id, finding.id)}
                  />
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* Compliance Clearance Certificate Modal */}
      {showCertificateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#121212] border border-[#2a2a2a] rounded-xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-[#222]">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-[#d4af37]" />
                <h3 className="text-base font-semibold text-white tracking-tight">Compliance Clearance Certificate</h3>
              </div>
              <button
                onClick={() => setShowCertificateModal(false)}
                className="text-[#737373] hover:text-white transition-colors p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs text-[#a3a3a3]">
              <div className={`p-3.5 rounded-lg border flex items-center justify-between ${
                metrics.isCompliant
                  ? 'bg-emerald-950/30 border-emerald-800/50 text-emerald-300'
                  : 'bg-amber-950/30 border-amber-800/50 text-amber-300'
              }`}>
                <div className="flex items-center gap-2.5">
                  {metrics.isCompliant ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                  )}
                  <div>
                    <div className="font-semibold text-sm">
                      {metrics.isCompliant ? 'APPROVED FOR PUBLICATION' : 'PENDING REMEDIATION'}
                    </div>
                    <div className="text-[11px] opacity-80 mt-0.5">
                      {metrics.isCompliant
                        ? 'All claims verified against official brand rules and trusted facts.'
                        : `${metrics.activeViolationsCount} unresolved violation(s) remain in draft copy.`}
                    </div>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-black/40 border border-white/10">
                  {metrics.progressPercent}% REVIEWED
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div className="p-2.5 rounded bg-[#171717] border border-[#262626]">
                  <div className="text-[10px] uppercase font-mono text-[#737373]">Brand</div>
                  <div className="text-xs font-semibold text-white mt-0.5 truncate">{brand.name}</div>
                </div>
                <div className="p-2.5 rounded bg-[#171717] border border-[#262626]">
                  <div className="text-[10px] uppercase font-mono text-[#737373]">Word Count</div>
                  <div className="text-xs font-semibold text-white mt-0.5">{wordsCount} words</div>
                </div>
                <div className="p-2.5 rounded bg-[#171717] border border-[#262626]">
                  <div className="text-[10px] uppercase font-mono text-[#737373]">Accepted Edits</div>
                  <div className="text-xs font-semibold text-white mt-0.5">{metrics.accepted}</div>
                </div>
                <div className="p-2.5 rounded bg-[#171717] border border-[#262626]">
                  <div className="text-[10px] uppercase font-mono text-[#737373]">Active Issues</div>
                  <div className="text-xs font-semibold text-white mt-0.5">{metrics.activeViolationsCount}</div>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-white">Current Clean Copy</div>
                <div className="p-3 rounded bg-[#0a0a0a] border border-[#262626] text-[#e5e5e5] font-sans text-xs max-h-36 overflow-y-auto whitespace-pre-wrap leading-relaxed select-all">
                  {currentDraft.content}
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-white">Cited Ground-Truth Guidelines</div>
                <div className="p-3 rounded bg-[#0a0a0a] border border-[#262626] text-[#8a8a8a] text-[11px] max-h-32 overflow-y-auto space-y-1">
                  {currentDraft.findings.flatMap(f => f.evidence || []).length > 0 ? (
                    Array.from(new Set(currentDraft.findings.flatMap(f => f.evidence || []).map(e => `${e.title} — ${e.sourceDoc || 'Official Brand Guide'}${e.pageNumber ? ` (p.${e.pageNumber})` : ''}`))).map((cite, idx) => (
                      <div key={idx} className="flex items-start gap-1.5">
                        <span className="text-[#525252]">•</span>
                        <span>{cite}</span>
                      </div>
                    ))
                  ) : (
                    <div>Standard Brand Voice & Governance Rules</div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#222] flex items-center justify-between gap-3 flex-wrap bg-[#101010]">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(generateCertificateMarkdown());
                    setCopiedCert(true);
                    setTimeout(() => setCopiedCert(false), 2500);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#1a1a1a] hover:bg-[#262626] border border-[#333] text-[#d4d4d4] rounded transition-colors"
                >
                  {copiedCert ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCert ? 'Copied Markdown!' : 'Copy Certificate'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(currentDraft.content);
                    setCopiedCopy(true);
                    setTimeout(() => setCopiedCopy(false), 2500);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#1a1a1a] hover:bg-[#262626] border border-[#333] text-[#d4d4d4] rounded transition-colors"
                >
                  {copiedCopy ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCopy ? 'Copied Copy!' : 'Copy Clean Text'}</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadCertificate}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-black bg-white hover:bg-[#d4d4d4] rounded transition-colors shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download (.md)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
