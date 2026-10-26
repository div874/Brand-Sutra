import React from 'react';
import { Finding, ApprovedEdit } from '@/types';
import { IssueBadge } from './IssueBadge';
import { Check, X, History } from 'lucide-react';

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
  const isResolved = finding.status !== 'Pending';

  return (
    <div
      onClick={onSelect}
      className={`rounded-lg p-4 border transition-colors cursor-pointer ${
        isResolved
          ? 'bg-[#121212] border-[#1f1f1f] opacity-50'
          : isActive
          ? 'bg-[#171717] border-[#525252]'
          : 'bg-[#121212] border-[#262626] hover:border-[#383838]'
      }`}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <IssueBadge type={finding.issueType} severity={finding.severity} />
        
        <span className="text-[11px] text-[#8a8a8a]">
          {isResolved ? finding.status : finding.detectedBy === 'ai' ? 'AI Check' : 'Rule Check'}
        </span>
      </div>

      {/* Flagged Text */}
      <div className="mb-2.5 p-2 rounded bg-[#0a0a0a] border border-[#262626]">
        <div className="text-[11px] text-[#8a8a8a] mb-0.5">Flagged text:</div>
        <p className="text-xs text-[#ededed] font-mono">
          &ldquo;{finding.quote}&rdquo;
        </p>
      </div>

      {/* Explanation */}
      <p className="text-xs text-[#a3a3a3] mb-2 leading-relaxed">
        {finding.explanation}
      </p>

      {/* Official Evidence Citation */}
      {finding.sourceLink && (
        <div className="text-[11px] text-[#737373] mb-3 p-2 rounded bg-[#0e0e0e] border border-[#222]">
          <span className="text-white font-medium">Official Evidence: </span> 
          <span className="text-[#a3a3a3]">{finding.sourceLink}</span>
        </div>
      )}

      {/* Historical Precedent (Kept strictly isolated from official rules) */}
      {historicalPrecedent && !isResolved && (
        <div className="mb-3 p-2.5 rounded bg-[#151515] border border-[#2a2a2a] text-[11px] space-y-1">
          <div className="flex items-center justify-between text-[#8a8a8a]">
            <span className="flex items-center gap-1.5 font-medium text-white">
              <History className="w-3.5 h-3.5 text-[#a3a3a3]" />
              Historical Precedent
            </span>
            <span className="text-[10px] text-[#737373] bg-[#0a0a0a] px-1.5 py-0.5 rounded border border-[#222]">
              Non-Rule Context
            </span>
          </div>
          <p className="text-[#a3a3a3] leading-relaxed">
            Approved by {historicalPrecedent.approvedBy}: <span className="text-white font-mono font-medium">&ldquo;{historicalPrecedent.approvedChange}&rdquo;</span>
          </p>
          <p className="text-[10px] text-[#525252] italic">
            *Historical correction surfaced for reviewer context; not a permanent brand rule.
          </p>
        </div>
      )}

      {/* Suggested Fix */}
      {finding.suggestedFix && !isResolved && (
        <div className="mb-3 p-2 rounded bg-[#171717] border border-[#333333]">
          <div className="text-[11px] text-[#8a8a8a] mb-0.5">Suggested replacement:</div>
          <p className="text-xs text-white font-medium">
            &ldquo;{finding.suggestedFix}&rdquo;
          </p>
        </div>
      )}

      {/* Action Controls */}
      {!isResolved && (
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1f1f1f]">
          <button
            id={`btn-ignore-${finding.id}`}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onIgnore?.();
            }}
            className="flex items-center gap-1 px-2.5 py-1 text-xs text-[#8a8a8a] hover:text-white rounded transition-colors"
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
