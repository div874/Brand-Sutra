'use client';

import React, { useState } from 'react';
import { Finding, ApprovedEdit } from '@/types';
import { IssueBadge } from './IssueBadge';
import { Check, X, History, ChevronDown, ChevronUp, FileText, CheckCircle2, ShieldCheck, Cpu } from 'lucide-react';

interface FindingCardProps {
  finding: Finding;
  isActive?: boolean;
  historicalPrecedent?: ApprovedEdit;
  onSelect?: () => void;
  onAccept?: () => void;
  onIgnore?: () => void;
}

export function FindingCard({
  finding,
  isActive = false,
  historicalPrecedent,
  onSelect,
  onAccept,
  onIgnore
}: FindingCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isResolved = finding.status !== 'Pending';

  const primaryEvidence = finding.evidence && finding.evidence.length > 0 ? finding.evidence[0] : null;
  const secondaryEvidence = finding.evidence && finding.evidence.length > 1 ? finding.evidence.slice(1) : [];
  
  // Deduplicate secondary evidence if it essentially matches the primary snippet
  const filteredSecondary = secondaryEvidence.filter(
    (ev) => !primaryEvidence || ev.snippet !== primaryEvidence.snippet
  );

  const hasAdditionalContext = filteredSecondary.length > 0 || (historicalPrecedent && !isResolved);

  return (
    <div
      onClick={onSelect}
      className={`rounded-lg p-3.5 border transition-all text-left cursor-pointer ${
        isResolved
          ? 'bg-[#101010] border-[#1e1e1e] opacity-60'
          : isActive
          ? 'bg-[#161616] border-[#525252] shadow-sm'
          : 'bg-[#121212] border-[#262626] hover:border-[#383838]'
      }`}
    >
      {/* 1. Top Header: Issue Type, Severity, and Detection Provenance */}
      <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
        <div className="flex items-center gap-2">
          <IssueBadge type={finding.issueType} severity={finding.severity} />
          {isResolved && (
            <span className="text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#1f1f1f] border border-[#2e2e2e] text-[#a3a3a3]">
              {finding.status}
            </span>
          )}
        </div>

        <span className="text-[11px] text-[#737373] flex items-center gap-1 font-mono">
          {finding.detectedBy === 'ai' ? (
            <span className="text-[#d4d4d4] flex items-center gap-1 bg-[#1c1c1c] px-2 py-0.5 rounded border border-[#2e2e2e]">
              <Cpu className="w-3 h-3 text-[#a3a3a3]" />
              Groq AI Verified
            </span>
          ) : (
            <span className="text-[#a3a3a3] flex items-center gap-1 bg-[#171717] px-2 py-0.5 rounded border border-[#262626]">
              <ShieldCheck className="w-3 h-3 text-[#737373]" />
              Rule Engine
            </span>
          )}
        </span>
      </div>

      {/* 2. Flagged Problematic Text */}
      <div className="mb-2 p-2 rounded bg-[#0a0a0a] border border-[#222222]">
        <div className="text-[10px] uppercase font-bold tracking-wider text-[#737373] mb-1">
          Problematic Text
        </div>
        <p className="text-xs font-mono text-[#ededed] font-medium leading-relaxed">
          &ldquo;{finding.quote}&rdquo;
        </p>
      </div>

      {/* 3. Short Explanation */}
      <p className="text-xs text-[#a3a3a3] mb-2.5 leading-relaxed">
        {finding.explanation}
      </p>

      {/* 4. Primary Supporting Evidence */}
      {primaryEvidence ? (
        <div className="mb-2.5 p-2 rounded bg-[#0a0a0a] border border-[#242424] text-[11px] space-y-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 font-medium truncate">
              <span className={`px-1.5 py-0.2 rounded text-[10px] font-medium uppercase tracking-wider ${
                primaryEvidence.type === 'fact'
                  ? 'bg-[#222222] text-white border border-[#383838]'
                  : primaryEvidence.type === 'historical_edit'
                  ? 'bg-[#1c1c1c] text-[#d4d4d4] border border-[#303030]'
                  : 'bg-[#181818] text-[#a3a3a3] border border-[#2a2a2a]'
              }`}>
                {primaryEvidence.type === 'fact' ? 'Official Fact' : primaryEvidence.type === 'historical_edit' ? 'Precedent' : 'Brand Rule'}
              </span>
              <span className="text-[#ededed] truncate">{primaryEvidence.title}</span>
            </div>

            <span className="text-[10px] text-[#737373] bg-[#141414] px-1.5 py-0.5 rounded border border-[#262626] shrink-0 font-mono" title="Retrieval Engine Semantic + Keyword Match Score">
              {Math.round(primaryEvidence.relevanceScore * 100)}% match
            </span>
          </div>

          {(primaryEvidence.sourceDoc || primaryEvidence.verifiedDate || primaryEvidence.pageNumber) && (
            <div className="text-[10px] text-[#737373] flex items-center gap-1.5 flex-wrap">
              {primaryEvidence.sourceDoc && (
                <span>Source: <span className="text-[#a3a3a3]">{primaryEvidence.sourceDoc}</span></span>
              )}
              {primaryEvidence.pageNumber && (
                <span>• Page {primaryEvidence.pageNumber}</span>
              )}
              {primaryEvidence.verifiedDate && (
                <span>• Verified: {primaryEvidence.verifiedDate}</span>
              )}
            </div>
          )}

          <p className="text-[11px] text-[#8a8a8a] font-mono leading-relaxed bg-[#121212] p-1.5 rounded border border-[#1c1c1c]">
            {primaryEvidence.snippet}
          </p>
        </div>
      ) : finding.sourceLink ? (
        <div className="text-[11px] text-[#737373] mb-2.5 p-2 rounded bg-[#0e0e0e] border border-[#222]">
          <span className="text-white font-medium">Official Evidence: </span>
          <span className="text-[#a3a3a3]">{finding.sourceLink}</span>
        </div>
      ) : null}

      {/* 5. Suggested Correction */}
      {finding.suggestedFix && !isResolved && (
        <div className="mb-2.5 p-2 rounded bg-[#161616] border border-[#2d2d2d]">
          <div className="text-[10px] uppercase font-bold tracking-wider text-[#8a8a8a] mb-1">
            Suggested Replacement
          </div>
          <p className="text-xs text-white font-mono font-medium leading-relaxed bg-[#0a0a0a] p-1.5 rounded border border-[#222222]">
            &ldquo;{finding.suggestedFix}&rdquo;
          </p>
        </div>
      )}

      {/* 6. Secondary Evidence & Historical Precedent (Collapsible) */}
      {hasAdditionalContext && (
        <div className="mb-2.5 border-t border-[#1e1e1e] pt-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="flex items-center justify-between w-full text-[11px] text-[#737373] hover:text-[#d4d4d4] transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <FileText className="w-3 h-3" />
              <span>
                {filteredSecondary.length > 0
                  ? `${filteredSecondary.length} additional citation${filteredSecondary.length > 1 ? 's' : ''}`
                  : ''}
                {filteredSecondary.length > 0 && historicalPrecedent ? ' & ' : ''}
                {historicalPrecedent ? 'Historical Precedent' : ''}
              </span>
            </span>
            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          {isExpanded && (
            <div className="mt-2 space-y-2 pt-1">
              {filteredSecondary.map((ev) => (
                <div key={ev.id} className="p-2 rounded bg-[#0a0a0a] border border-[#1f1f1f] text-[11px] space-y-1">
                  <div className="flex items-center justify-between text-[#8a8a8a]">
                    <span className="font-medium text-[#d4d4d4]">{ev.title}</span>
                    <span className="text-[10px] font-mono text-[#737373]">
                      {Math.round(ev.relevanceScore * 100)}% match
                    </span>
                  </div>
                  {ev.sourceDoc && (
                    <div className="text-[10px] text-[#737373]">
                      Source: {ev.sourceDoc} {ev.pageNumber ? `(p.${ev.pageNumber})` : ''}
                    </div>
                  )}
                  <p className="text-[10px] font-mono text-[#737373] leading-relaxed">
                    {ev.snippet}
                  </p>
                </div>
              ))}

              {historicalPrecedent && !isResolved && (
                <div className="p-2 rounded bg-[#141414] border border-[#242424] text-[11px] space-y-1">
                  <div className="flex items-center justify-between text-[#8a8a8a]">
                    <span className="flex items-center gap-1.5 font-medium text-white">
                      <History className="w-3 h-3 text-[#8a8a8a]" />
                      Historical Precedent
                    </span>
                    <span className="text-[9px] uppercase font-mono text-[#737373] bg-[#0a0a0a] px-1 py-0.5 rounded border border-[#222]">
                      Context Only
                    </span>
                  </div>
                  <p className="text-[#a3a3a3] leading-relaxed">
                    Approved by {historicalPrecedent.approvedBy}: <span className="text-white font-mono font-medium">&ldquo;{historicalPrecedent.approvedChange}&rdquo;</span>
                  </p>
                  <p className="text-[9px] text-[#525252] italic">
                    *Historical correction surfaced for reviewer context; not a permanent brand rule.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 7. Action Controls: Apply Fix and Ignore */}
      {!isResolved && (
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1e1e1e]">
          <button
            id={`btn-ignore-${finding.id}`}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onIgnore?.();
            }}
            className="flex items-center gap-1 px-2.5 py-1 text-xs text-[#8a8a8a] hover:text-white bg-[#141414] hover:bg-[#1f1f1f] border border-[#262626] rounded transition-colors"
          >
            <X className="w-3 h-3" />
            Ignore
          </button>
          <button
            id={`btn-apply-fix-${finding.id}`}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAccept?.();
            }}
            className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-black bg-white hover:bg-[#d4d4d4] rounded transition-colors"
          >
            <Check className="w-3 h-3" />
            Apply Edit
          </button>
        </div>
      )}
    </div>
  );
}
