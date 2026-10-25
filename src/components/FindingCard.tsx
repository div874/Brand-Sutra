import React from 'react';
import { Finding } from '@/types';
import { IssueBadge } from './IssueBadge';
import { Check, X, BookmarkCheck, AlertTriangle, ArrowRight, Sparkles } from 'lucide-react';

interface FindingCardProps {
  finding: Finding;
  isActive?: boolean;
  onSelect?: () => void;
  onAccept?: () => void;
  onIgnore?: () => void;
}

export function FindingCard({
  finding,
  isActive = false,
  onSelect,
  onAccept,
  onIgnore
}: FindingCardProps) {
  const isResolved = finding.status !== 'Pending';

  return (
    <div
      onClick={onSelect}
      className={`relative rounded-xl p-4 transition-all duration-200 border cursor-pointer ${
        isResolved
          ? 'bg-slate-900/40 border-slate-800/80 opacity-60'
          : isActive
          ? 'bg-slate-800/90 border-indigo-500 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500'
          : 'glass-card hover:border-slate-700'
      }`}
    >
      {/* Top Header: Badge, Source Status, and Detection tag */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <IssueBadge type={finding.issueType} severity={finding.severity} />
        
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          {finding.detectedBy === 'ai' ? (
            <span className="flex items-center gap-1 text-[11px] bg-indigo-950/60 text-indigo-300 border border-indigo-800/60 px-2 py-0.5 rounded-full">
              <Sparkles className="w-3 h-3 text-indigo-400" /> AI Review
            </span>
          ) : (
            <span className="text-[11px] bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded-full">
              Rule Check
            </span>
          )}

          {isResolved && (
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
              finding.status === 'Accepted'
                ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}>
              {finding.status}
            </span>
          )}
        </div>
      </div>

      {/* Flagged Snippet Quote */}
      <div className="mb-3 p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80">
        <div className="text-[11px] uppercase tracking-wider font-semibold text-rose-400/90 mb-1 flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5" />
          Flagged in draft:
        </div>
        <p className="text-sm font-medium text-slate-200 italic">
          &ldquo;{finding.quote}&rdquo;
        </p>
      </div>

      {/* Explanation ("Why it matters") */}
      <div className="mb-3">
        <h4 className="text-xs font-semibold text-slate-300 mb-1">Why this matters:</h4>
        <p className="text-xs text-slate-400 leading-relaxed">
          {finding.explanation}
        </p>
      </div>

      {/* Approved Source Citation OR Verification Notice */}
      {finding.sourceLink && (
        <div className="mb-3.5 flex items-start gap-2 p-2 rounded-lg bg-indigo-950/30 border border-indigo-900/40 text-xs text-indigo-200">
          <BookmarkCheck className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-indigo-300">Approved Reference: </span>
            <span className="text-indigo-200/90">{finding.sourceLink}</span>
          </div>
        </div>
      )}

      {/* Suggested Surgical Correction */}
      {finding.suggestedFix && !isResolved && (
        <div className="mb-4 p-3 rounded-lg bg-emerald-950/20 border border-emerald-900/40">
          <div className="text-[11px] uppercase tracking-wider font-semibold text-emerald-400 mb-1.5 flex items-center gap-1.5">
            <ArrowRight className="w-3.5 h-3.5" />
            Suggested edit:
          </div>
          <p className="text-sm font-medium text-emerald-200">
            &ldquo;{finding.suggestedFix}&rdquo;
          </p>
        </div>
      )}

      {/* Action Buttons: Accept / Ignore */}
      {!isResolved && (
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onIgnore?.();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            Ignore
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAccept?.();
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm shadow-indigo-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Check className="w-3.5 h-3.5" />
            Apply Edit
          </button>
        </div>
      )}
    </div>
  );
}
